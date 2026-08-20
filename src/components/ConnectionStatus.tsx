import React, { useState, useEffect, useCallback } from 'react';
import { connectionMonitor, ConnectionState, ConnectionInfo } from '../utils/connectionMonitor';
import { Wifi, WifiOff, AlertTriangle, RefreshCw } from 'lucide-react';

export function ConnectionStatus() {
  const [info, setInfo] = useState<ConnectionInfo>(connectionMonitor.getState());
  const [showReconnected, setShowReconnected] = useState(false);
  const [prevConnected, setPrevConnected] = useState(connectionMonitor.isConnected());

  useEffect(() => {
    connectionMonitor.start();
    const unsub = connectionMonitor.subscribe((state, newInfo) => {
      setInfo(newInfo);

      if (state === 'connected' && !prevConnected) {
        setShowReconnected(true);
        setTimeout(() => setShowReconnected(false), 4000);
      }
      setPrevConnected(state === 'connected');
    });
    return () => {
      unsub();
    };
  }, []);

  const getStatusColor = () => {
    switch (info.state) {
      case 'connected': return 'text-emerald-400';
      case 'degraded': return 'text-amber-400';
      case 'disconnected': return 'text-rose-400';
    }
  };

  const getDotColor = () => {
    switch (info.state) {
      case 'connected': return 'bg-emerald-400';
      case 'degraded': return 'bg-amber-400';
      case 'disconnected': return 'bg-rose-400 animate-pulse';
    }
  };

  const getLabel = () => {
    switch (info.state) {
      case 'connected': return 'Conectado';
      case 'degraded': return 'Degradado';
      case 'disconnected': return 'Sin conexión';
    }
  };

  const getIcon = () => {
    switch (info.state) {
      case 'connected': return <Wifi className="w-3 h-3" />;
      case 'degraded': return <AlertTriangle className="w-3 h-3" />;
      case 'disconnected': return <WifiOff className="w-3 h-3" />;
    }
  };

  return (
    <>
      <div
        className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium transition-all duration-300 ${getStatusColor()}`}
        title={`Estado: ${getLabel()} | Latencia: ${info.latency}ms | Fallos: ${info.consecutiveFailures}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${getDotColor()}`} />
        {getIcon()}
        <span className="hidden md:inline">{getLabel()}</span>
      </div>

      {showReconnected && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-500/90 text-white px-4 py-2 rounded-xl text-xs font-bold backdrop-blur-sm border border-emerald-400 shadow-lg flex items-center gap-2 animate-bounce">
          <RefreshCw className="w-3 h-3" />
          Servidor reconectado exitosamente
        </div>
      )}
    </>
  );
}
