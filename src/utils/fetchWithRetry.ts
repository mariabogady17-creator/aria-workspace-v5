interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  timeout?: number;
  retryOn?: (error: any, status: number) => boolean;
}

function isRetryableError(error: any, status?: number): boolean {
  if (status) {
    if (status === 429 || status >= 500) return true;
    if (status >= 200 && status < 300) return false;
  }
  const msg = String(error?.message || error || '');
  if (/Failed to fetch|NetworkError|ECONNRESET|ECONNREFUSED|timeout|aborted/i.test(msg)) return true;
  return false;
}

export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryOpts: RetryOptions = {}
): Promise<Response> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 8000,
    timeout = 15000,
    retryOn = isRetryableError,
  } = retryOpts;

  let lastError: any;
  let lastStatus = 0;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
      const jitter = delay * 0.1 * Math.random();
      await new Promise(resolve => setTimeout(resolve, delay + jitter));
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const mergedOptions: RequestInit = {
      ...options,
      signal: controller.signal,
    };

    try {
      const response = await fetch(url, mergedOptions);
      clearTimeout(timeoutId);
      lastStatus = response.status;

      if (response.ok) return response;

      if (response.status === 401 || response.status === 403 || response.status === 404) {
        return response;
      }

      if (retryOn(null, response.status) && attempt < maxRetries) {
        continue;
      }

      return response;
    } catch (err: any) {
      clearTimeout(timeoutId);
      lastError = err;
      lastStatus = 0;

      if (err?.name === 'AbortError') {
        if (attempt < maxRetries && retryOn(err, 0)) {
          continue;
        }
        throw new Error('Request timeout - el servidor no responde');
      }

      if (attempt < maxRetries && retryOn(err, 0)) {
        continue;
      }

      throw err;
    }
  }

  if (lastStatus > 0) {
    return fetch(url, options);
  }
  throw lastError || new Error('Network error after retries');
}
