import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../api';
import { parseJwtToken, isTokenExpired } from '../utils';
import type { UserInfo } from '../utils';
import type { TokenResponse } from '../dto';

interface AuthContextType {
    user: UserInfo | null;
    isAuthenticated: boolean;
    authChecked: boolean;
    roles: string[];
    permissions: string[];
    modules: string[];
    tenantSlug?: string;
    tenantName?: string;
    tenantStatus?: string;
    hasModule: (moduleCode: string) => boolean;
    hasPermission: (permissionCode: string) => boolean;
    hasRole: (roleName: string) => boolean;
    login: (tokenOrResponse: TokenResponse | string) => void;
    logout: () => Promise<void>;
    refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [authState, setAuthState] = useState<{
        user: UserInfo | null;
        isAuthenticated: boolean;
        authChecked: boolean;
    }>(() => {
        try {
            // 1. Read token & refreshToken from URL query string if present (SSO transfer)
            const urlParams = new URLSearchParams(window.location.search);
            const urlToken = urlParams.get('token') || urlParams.get('accessToken');
            const urlRefreshToken = urlParams.get('refreshToken');
            const urlTenant = urlParams.get('tenant') || urlParams.get('tenantSlug');

            let activeToken: string | null = null;

            if (urlTenant) {
                authService.setLastTenantSlug(urlTenant);
            }

            if (urlToken) {
                authService.setTokens(urlToken, urlRefreshToken || undefined);
                activeToken = urlToken;

                // Strip token parameters from URL cleanly
                urlParams.delete('token');
                urlParams.delete('accessToken');
                urlParams.delete('refreshToken');
                urlParams.delete('tenant');
                urlParams.delete('tenantSlug');
                const newSearch = urlParams.toString();
                const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '') + window.location.hash;
                window.history.replaceState({}, document.title, newUrl);
            } else {
                activeToken = authService.getAccessToken();
            }

            // 2. Validate token
            if (activeToken && !isTokenExpired(activeToken)) {
                const parsedUser = parseJwtToken(activeToken);
                if (parsedUser) {
                    return {
                        user: parsedUser,
                        isAuthenticated: true,
                        authChecked: true,
                    };
                }
            }

            // If token invalid but we have a refreshToken, keep authChecked false until refresh attempt
            if (activeToken && isTokenExpired(activeToken) && authService.getRefreshToken()) {
                return {
                    user: parseJwtToken(activeToken),
                    isAuthenticated: false,
                    authChecked: false,
                };
            }

            if (activeToken) {
                authService.clearTokens();
            }

            return {
                user: null,
                isAuthenticated: false,
                authChecked: true,
            };
        } catch (error) {
            console.error('Error during auth initialization:', error);
            return {
                user: null,
                isAuthenticated: false,
                authChecked: true,
            };
        }
    });

    // Handle silent token refresh on initial load if access token is expired but refresh token exists
    useEffect(() => {
        if (!authState.authChecked) {
            authService
                .refreshToken()
                .then((tokens) => {
                    const parsed = parseJwtToken(tokens.accessToken);
                    setAuthState({
                        user: parsed,
                        isAuthenticated: !!parsed,
                        authChecked: true,
                    });
                })
                .catch(() => {
                    authService.clearTokens();
                    setAuthState({
                        user: null,
                        isAuthenticated: false,
                        authChecked: true,
                    });
                });
        }
    }, [authState.authChecked]);

    // Listen to storage events across multiple browser tabs
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'accessToken' || e.key === 'authToken') {
                const newToken = authService.getAccessToken();
                if (newToken && !isTokenExpired(newToken)) {
                    const parsed = parseJwtToken(newToken);
                    setAuthState({
                        user: parsed,
                        isAuthenticated: true,
                        authChecked: true,
                    });
                } else if (!newToken) {
                    setAuthState({
                        user: null,
                        isAuthenticated: false,
                        authChecked: true,
                    });
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const login = useCallback((tokenOrResponse: TokenResponse | string) => {
        const token = typeof tokenOrResponse === 'string' ? tokenOrResponse : tokenOrResponse.accessToken;
        const refreshToken = typeof tokenOrResponse === 'object' ? tokenOrResponse.refreshToken : undefined;

        authService.setTokens(token, refreshToken);
        const parsedUser = parseJwtToken(token);

        if (parsedUser?.tenantSlug) {
            authService.setLastTenantSlug(parsedUser.tenantSlug);
        }

        setAuthState({
            user: parsedUser,
            isAuthenticated: true,
            authChecked: true,
        });
    }, []);

    const logout = useCallback(async () => {
        try {
            await authService.logout();
        } catch (error) {
            console.error('Logout error:', error);
            authService.clearTokens();
        } finally {
            setAuthState({
                user: null,
                isAuthenticated: false,
                authChecked: true,
            });
        }
    }, []);

    const refreshToken = useCallback(async () => {
        try {
            const data = await authService.refreshToken();
            const parsedUser = parseJwtToken(data.accessToken);
            setAuthState({
                user: parsedUser,
                isAuthenticated: true,
                authChecked: true,
            });
        } catch (error) {
            console.error('Token refresh error:', error);
            await logout();
            throw error;
        }
    }, [logout]);

    const hasModule = useCallback(
        (moduleCode: string): boolean => {
            if (!authState.user?.modules || !Array.isArray(authState.user.modules) || authState.user.modules.length === 0) return false;
            return authState.user.modules.some((m) => String(m).trim().toLowerCase() === String(moduleCode).trim().toLowerCase());
        },
        [authState.user]
    );

    const hasPermission = useCallback(
        (permissionCode: string): boolean => {
            if (!authState.user?.permissions || !Array.isArray(authState.user.permissions) || authState.user.permissions.length === 0) return false;
            return authState.user.permissions.some((p) => String(p).trim().toLowerCase() === String(permissionCode).trim().toLowerCase());
        },
        [authState.user]
    );

    const hasRole = useCallback(
        (roleName: string): boolean => {
            if (!authState.user?.roles || !Array.isArray(authState.user.roles) || authState.user.roles.length === 0) return false;
            return authState.user.roles.some((r) => String(r).trim().toLowerCase() === String(roleName).trim().toLowerCase());
        },
        [authState.user]
    );

    return (
        <AuthContext.Provider
            value={{
                user: authState.user,
                isAuthenticated: authState.isAuthenticated,
                authChecked: authState.authChecked,
                roles: authState.user?.roles || [],
                permissions: authState.user?.permissions || [],
                modules: authState.user?.modules || [],
                tenantSlug: authState.user?.tenantSlug,
                tenantName: authState.user?.tenantName,
                tenantStatus: authState.user?.tenantStatus,
                hasModule,
                hasPermission,
                hasRole,
                login,
                logout,
                refreshToken,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthContext;
