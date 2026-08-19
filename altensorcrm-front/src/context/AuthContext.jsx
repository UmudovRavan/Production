import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAuthToken, setAuthToken, getCurrentUser, setCurrentUser, parseJwt, authApi } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const urlToken = searchParams.get('token') || searchParams.get('accessToken');
      const urlRefreshToken = searchParams.get('refreshToken');

      if (urlToken) {
        setAuthToken(urlToken, urlRefreshToken);
        const parsed = parseJwt(urlToken);
        if (parsed) {
          setCurrentUser(parsed);
        }

        // Clean URL parameters cleanly
        searchParams.delete('token');
        searchParams.delete('accessToken');
        searchParams.delete('refreshToken');
        const newSearch = searchParams.toString();
        const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '') + window.location.hash;
        window.history.replaceState({}, document.title, newUrl);
        return urlToken;
      }
    }
    return getAuthToken();
  });

  const [user, setUser] = useState(() => {
    const existing = getCurrentUser();
    if (existing) return existing;
    const currentToken = getAuthToken();
    return currentToken ? parseJwt(currentToken) : null;
  });

  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(token));
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const currentToken = getAuthToken();
    if (currentToken) {
      const parsedUser = parseJwt(currentToken);
      setToken(currentToken);
      setUser(parsedUser);
      setIsAuthenticated(true);
    } else {
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
    }
    setAuthChecked(true);
  }, []);

  const login = async (email, password, tenantSlug = 'demo-tenant') => {
    const data = await authApi.login(email, password, tenantSlug);
    if (data && data.accessToken) {
      setToken(data.accessToken);
      const userObj = parseJwt(data.accessToken);
      setUser(userObj);
      setIsAuthenticated(true);
    }
    return data;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.warn('Logout error:', err);
    } finally {
      setAuthToken(null);
      setCurrentUser(null);
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const hasModule = (moduleCode) => {
    if (!user?.modules || user.modules.length === 0) return false;
    return user.modules.some((m) => m.toLowerCase() === moduleCode.toLowerCase());
  };

  const hasPermission = (permissionCode) => {
    if (!user?.permissions || user.permissions.length === 0) return false;
    return user.permissions.includes(permissionCode);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated,
        authChecked,
        login,
        logout,
        setToken,
        setUser,
        hasModule,
        hasPermission,
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

export default AuthContext;
