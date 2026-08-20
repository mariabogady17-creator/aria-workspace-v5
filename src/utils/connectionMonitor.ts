type ConnectionState = 'connected' | 'degraded' | 'disconnected';
type ConnectionListener = (state: ConnectionState, info: ConnectionInfo) => void;

interface ConnectionInfo {
  state: ConnectionState;
  lastCheck: number;
  latency: number;
  consecutiveFailures: number;
  serverAlive: boolean;
}

class ConnectionMonitor {
  private state: ConnectionState = 'connected';
  private listeners: ConnectionListener[] = [];
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private pollInterval = 10000;
  private baseInterval = 10000;
  private maxInterval = 30000;
  private consecutiveFailures = 0;
  private lastCheck = Date.now();
  private latency = 0;
  private serverAlive = true;
  private started = false;
  private abortController: AbortController | null = null;

  start() {
    if (this.started) return;
    this.started = true;

    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);

    if (navigator.onLine) {
      this.startPolling();
    } else {
      this.setState('disconnected');
    }
  }

  stop() {
    this.started = false;
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  subscribe(listener: ConnectionListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  getState(): ConnectionInfo {
    return {
      state: this.state,
      lastCheck: this.lastCheck,
      latency: this.latency,
      consecutiveFailures: this.consecutiveFailures,
      serverAlive: this.serverAlive,
    };
  }

  isConnected(): boolean {
    return this.state !== 'disconnected';
  }

  private handleOnline = () => {
    this.consecutiveFailures = 0;
    this.pollInterval = this.baseInterval;
    this.checkHealth();
  };

  private handleOffline = () => {
    this.setState('disconnected');
  };

  private setState(newState: ConnectionState) {
    if (this.state === newState) return;
    const prev = this.state;
    this.state = newState;
    const info = this.getInfo();
    this.listeners.forEach(l => l(newState, info));
    console.log(`[ConnectionMonitor] ${prev} → ${newState}`);
  }

  private getInfo(): ConnectionInfo {
    return {
      state: this.state,
      lastCheck: this.lastCheck,
      latency: this.latency,
      consecutiveFailures: this.consecutiveFailures,
      serverAlive: this.serverAlive,
    };
  }

  private startPolling() {
    if (this.pollTimer) clearTimeout(this.pollTimer);
    this.pollTimer = setTimeout(() => {
      this.checkHealth();
    }, this.pollInterval);
  }

  private async checkHealth() {
    if (!this.started) return;

    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();
    const timeoutId = setTimeout(() => this.abortController?.abort(), 5000);

    const startTime = Date.now();
    try {
      const res = await fetch('/api/health', {
        method: 'GET',
        signal: this.abortController.signal,
        cache: 'no-store',
      });
      clearTimeout(timeoutId);

      this.latency = Date.now() - startTime;
      this.lastCheck = Date.now();
      this.consecutiveFailures = 0;
      this.serverAlive = true;

      if (res.ok) {
        this.setState(navigator.onLine ? 'connected' : 'degraded');
      } else {
        this.consecutiveFailures++;
        this.updateStateOnFailure();
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err?.name === 'AbortError') {
        this.consecutiveFailures++;
      } else {
        this.consecutiveFailures++;
      }
      this.lastCheck = Date.now();
      this.updateStateOnFailure();
    }

    if (this.started) {
      this.pollTimer = setTimeout(() => this.checkHealth(), this.pollInterval);
    }
  }

  private updateStateOnFailure() {
    this.serverAlive = false;

    if (this.consecutiveFailures >= 3) {
      this.pollInterval = Math.min(this.pollInterval * 2, this.maxInterval);
      this.setState('disconnected');
    } else if (this.consecutiveFailures >= 1) {
      this.setState('degraded');
    }
  }
}

export const connectionMonitor = new ConnectionMonitor();
export type { ConnectionState, ConnectionInfo };
