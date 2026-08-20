import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { storage } from '../utils/storage';
import { decodeJwt } from '../utils/jwt';
import { authApi } from '../api/authApi';
import {
  TokenResponse,
  LoginRequest,
  UserInfoDto,
  DecodedJwt
} from '../types/auth.types';
import { useToast } from './ToastContext';

interface AuthContextType {
  accessToken: string | null;
  refreshToken: string | null;
  decodedToken: DecodedJwt | null;
  user: UserInfoDto | null;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  isTenantAdmin: boolean;
  expiresInSeconds: number;
  progressPercent: number;
  loading: boolean;
  login: (data: LoginRequest) => Promise<TokenResponse>;
  refreshTokens: () => Promise<TokenResponse | null>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  fetchMe: () => Promise<UserInfoDto | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accessToken, setAccessToken] = useState<string | null>(storage.getAccessToken());
  const [refreshToken, setRefreshToken] = useState<string | null>(storage.getRefreshToken());
  const [user, setUser] = useState<UserInfoDto | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [expiresInSeconds, setExpiresInSeconds] = useState<number>(0);
  const [initialDuration, setInitialDuration] = useState<number>(900);
  const isRefreshingRef = useRef<boolean>(false);

  const { showToast } = useToast();

  const decodedToken = useMemo(() => {
    return accessToken ? decodeJwt(accessToken) : null;
  }, [accessToken]);

  const isSuperAdmin = useMemo(() => {
    if (!decodedToken?.payload) return false;
    const roles = decodedToken.payload.role;
    if (Array.isArray(roles)) return roles.includes('PlatformSuperAdmin');
    return roles === 'PlatformSuperAdmin';
  }, [decodedToken]);

  const isTenantAdmin = useMemo(() => {
    if (!decodedToken?.payload) return false;
    const roles = decodedToken.payload.role;
    if (Array.isArray(roles)) {
      return roles.includes('TenantAdmin') || roles.includes('PlatformSuperAdmin');
    }
    return roles === 'TenantAdmin' || roles === 'PlatformSuperAdmin';
  }, [decodedToken]);

  const isAuthenticated = Boolean(accessToken && decodedToken);

  // Set up token update helper
  const handleAuthSuccess = useCallback((tokens: TokenResponse) => {
    storage.setAccessToken(tokens.accessToken);
    storage.setRefreshToken(tokens.refreshToken);
    setAccessToken(tokens.accessToken);
    setRefreshToken(tokens.refreshToken);
  }, []);

  // Refresh token
  const refreshTokens = useCallback(async (): Promise<TokenResponse | null> => {
    if (isRefreshingRef.current) return null;
    const currentRefresh = storage.getRefreshToken();
    if (!currentRefresh) {
      return null;
    }
    isRefreshingRef.current = true;
    try {
      const response = await authApi.refresh({ refreshToken: currentRefresh });
      handleAuthSuccess(response);
      return response;
    } catch (err: any) {
      console.warn('Auto-refresh error:', err.message);
      return null;
    } finally {
      isRefreshingRef.current = false;
    }
  }, [handleAuthSuccess]);

  // Sync token countdown and proactive background refresh
  useEffect(() => {
    if (!decodedToken?.payload?.exp) {
      setExpiresInSeconds(0);
      return;
    }

    const exp = decodedToken.payload.exp;
    const iat = decodedToken.payload.iat || (exp - 900);
    const duration = Math.max(exp - iat, 60);
    setInitialDuration(duration);

    const updateTimer = () => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = Math.max(0, exp - now);
      setExpiresInSeconds(remaining);

      // Proactive background auto-refresh when less than 90 seconds remain
      if (remaining > 0 && remaining <= 90 && !isRefreshingRef.current && storage.getRefreshToken()) {
        refreshTokens();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [decodedToken, refreshTokens]);

  const progressPercent = useMemo(() => {
    if (initialDuration <= 0 || expiresInSeconds <= 0) return 0;
    const pct = (expiresInSeconds / initialDuration) * 100;
    return Math.min(100, Math.max(0, pct));
  }, [expiresInSeconds, initialDuration]);

  // Listen to background token events from apiClient
  useEffect(() => {
    const handleTokensRefreshed = (e: any) => {
      const tokens = e.detail;
      if (tokens?.accessToken) {
        setAccessToken(tokens.accessToken);
        if (tokens.refreshToken) {
          setRefreshToken(tokens.refreshToken);
        }
      }
    };

    const handleSessionExpired = () => {
      storage.clearAuth();
      setAccessToken(null);
      setRefreshToken(null);
      setUser(null);
      showToast('error', 'Sessiyanın vaxtı bitdi. Zəhmət olmasa yenidən daxil olun.', 'Sessiya Bitdi');
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key === 'altensor_access_token' ||
        e.key === 'accessToken' ||
        e.key === 'authToken' ||
        e.key === 'token'
      ) {
        const newToken = storage.getAccessToken();
        const newRefresh = storage.getRefreshToken();
        if (newToken) {
          setAccessToken(newToken);
          setRefreshToken(newRefresh);
        } else {
          setAccessToken(null);
          setRefreshToken(null);
          setUser(null);
        }
      }
    };

    window.addEventListener('auth-tokens-refreshed', handleTokensRefreshed);
    window.addEventListener('auth-session-expired', handleSessionExpired);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('auth-tokens-refreshed', handleTokensRefreshed);
      window.removeEventListener('auth-session-expired', handleSessionExpired);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [showToast]);

  // Fetch current user info
  const fetchMe = useCallback(async (): Promise<UserInfoDto | null> => {
    if (!storage.getAccessToken()) return null;
    try {
      const info = await authApi.getMe();
      setUser(info);
      return info;
    } catch (err: any) {
      console.warn('Failed to fetch /me:', err.message);
      return null;
    }
  }, []);

  // Login
  const login = useCallback(
    async (data: LoginRequest): Promise<TokenResponse> => {
      setLoading(true);
      try {
        const response = await authApi.login(data);
        handleAuthSuccess(response);
        showToast('success', 'Uğurla daxil oldunuz!', 'Giriş Tamamlandı');
        setTimeout(() => {
          fetchMe();
        }, 100);
        return response;
      } catch (err: any) {
        showToast('error', err.message || 'Giriş zamanı xəta baş verdi', 'Giriş Xətası');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchMe, handleAuthSuccess, showToast]
  );

  // Logout
  const logout = useCallback(async () => {
    const rToken = storage.getRefreshToken();
    try {
      await authApi.logout(rToken || undefined);
    } catch {
      // ignore network failure on logout
    } finally {
      storage.clearAuth();
      setAccessToken(null);
      setRefreshToken(null);
      setUser(null);
      showToast('info', 'Sistemdən çıxış edildi', 'Çıxış');
    }
  }, [showToast]);

  // Logout all devices
  const logoutAll = useCallback(async () => {
    try {
      await authApi.logoutAll();
      showToast('success', 'Bütün cihazlardakı aktiv sessiyalar ləğv edildi.', 'Tam Çıxış');
    } catch (err: any) {
      showToast('error', err.message || 'Xəta baş verdi', 'Çıxış Xətası');
    } finally {
      storage.clearAuth();
      setAccessToken(null);
      setRefreshToken(null);
      setUser(null);
    }
  }, [showToast]);

  // Initial load
  useEffect(() => {
    if (accessToken) {
      fetchMe();
    }
  }, [accessToken, fetchMe]);

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        refreshToken,
        decodedToken,
        user,
        isAuthenticated,
        isSuperAdmin,
        isTenantAdmin,
        expiresInSeconds,
        progressPercent,
        loading,
        login,
        refreshTokens,
        logout,
        logoutAll,
        fetchMe
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
