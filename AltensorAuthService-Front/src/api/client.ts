import { storage } from '../utils/storage';
import { HttpLogEntry } from '../types/log.types';

type LogListener = (entry: HttpLogEntry) => void;
const logListeners: Set<LogListener> = new Set();

export const registerLogListener = (listener: LogListener) => {
  logListeners.add(listener);
  return () => logListeners.delete(listener);
};

const notifyLogs = (entry: HttpLogEntry) => {
  logListeners.forEach((listener) => {
    try {
      listener(entry);
    } catch (e) {
      console.error('Error notifying log listener:', e);
    }
  });
};

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
  skipLogs?: boolean;
  _isRetry?: boolean;
}

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// Single active refresh promise to handle concurrent 401s seamlessly
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const currentRefresh = storage.getRefreshToken();
      if (!currentRefresh) {
        return null;
      }

      const baseUrl = storage.getApiUrl().replace(/\/+$/, '');
      const response = await fetch(`${baseUrl}/api/Auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: currentRefresh })
      });

      if (!response.ok) {
        storage.clearAuth();
        window.dispatchEvent(new CustomEvent('auth-session-expired'));
        return null;
      }

      const data = await response.json();
      if (data && data.accessToken) {
        storage.setAccessToken(data.accessToken);
        if (data.refreshToken) {
          storage.setRefreshToken(data.refreshToken);
        }
        window.dispatchEvent(new CustomEvent('auth-tokens-refreshed', { detail: data }));
        return data.accessToken;
      }
      return null;
    } catch (e) {
      console.error('Failed to auto-refresh access token:', e);
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function apiClient<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const baseUrl = storage.getApiUrl().replace(/\/+$/, '');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = `${baseUrl}${cleanEndpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (!options.skipAuth) {
    const token = storage.getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const startTime = performance.now();
  const method = (options.method || 'GET').toUpperCase() as HttpLogEntry['method'];
  let reqBodyParsed: any = undefined;

  if (options.body && typeof options.body === 'string') {
    try {
      reqBodyParsed = JSON.parse(options.body);
    } catch {
      reqBodyParsed = options.body;
    }
  }

  const logId = Math.random().toString(36).substring(2, 9);
  let status = 0;
  let responseData: any = null;
  let errorMsg = '';

  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers
    });

    status = response.status;
    const durationMs = Math.round(performance.now() - startTime);

    // If 401 Unauthorized occurs on an authenticated endpoint and we haven't retried yet:
    if (
      status === 401 &&
      !options.skipAuth &&
      !options._isRetry &&
      !cleanEndpoint.includes('/api/Auth/login') &&
      !cleanEndpoint.includes('/api/Auth/refresh')
    ) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        // Retry original request with newly refreshed token
        return apiClient<T>(endpoint, {
          ...options,
          _isRetry: true,
          headers: {
            ...headers,
            Authorization: `Bearer ${newToken}`
          }
        });
      }
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json().catch(() => null);
    } else {
      const text = await response.text().catch(() => '');
      responseData = text ? { message: text } : null;
    }

    if (!options.skipLogs) {
      notifyLogs({
        id: logId,
        timestamp: new Date().toISOString(),
        method,
        url: cleanEndpoint,
        status,
        durationMs,
        requestHeaders: headers,
        requestBody: reqBodyParsed,
        responseBody: responseData
      });
    }

    if (!response.ok) {
      const message =
        responseData?.message ||
        responseData?.title ||
        responseData?.error ||
        (typeof responseData === 'string' ? responseData : `HTTP Xətası: ${response.status}`);
      throw new ApiError(status, message, responseData);
    }

    return responseData as T;
  } catch (err: any) {
    const durationMs = Math.round(performance.now() - startTime);
    errorMsg = err.message || 'Şəbəkə xətası və ya serverə qoşulmaq mümkün olmadı.';

    if (!options.skipLogs && status === 0) {
      notifyLogs({
        id: logId,
        timestamp: new Date().toISOString(),
        method,
        url: cleanEndpoint,
        status: 0,
        durationMs,
        requestHeaders: headers,
        requestBody: reqBodyParsed,
        error: errorMsg
      });
    }

    if (err instanceof ApiError) {
      throw err;
    }

    throw new ApiError(0, errorMsg);
  }
}
