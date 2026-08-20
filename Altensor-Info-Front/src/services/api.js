const API_BASE_URL = import.meta.env.VITE_CRM_API_URL || 'https://api-crm.altensor.com/api';
const AUTH_API_URL = import.meta.env.VITE_AUTH_API_URL || 'https://api-info.altensor.com/api';
const TASK_MGMT_API_URL = import.meta.env.VITE_TMS_API_URL || 'https://api-tms.altensor.com/api';

export const getAuthToken = () =>
  localStorage.getItem('accessToken') || localStorage.getItem('token') || localStorage.getItem('authToken');

export const getRefreshToken = () => localStorage.getItem('refreshToken');

export const setAuthToken = (accessToken, refreshToken = null) => {
  if (accessToken) {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('token', accessToken);
    localStorage.setItem('authToken', accessToken);
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }
  } else {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('currentUser');
  }
};

export const parseJwt = (token) => {
  try {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    const email = payload.email || payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] || '';
    const name = payload.name || payload.unique_name || (email ? email.split('@')[0] : 'User');
    
    // Roles
    let rawRoles = payload.roles || payload.role || payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || [];
    if (typeof rawRoles === 'string') rawRoles = [rawRoles];
    else if (!Array.isArray(rawRoles)) rawRoles = [];
    const roles = rawRoles.filter(Boolean);

    // Permissions
    let rawPerms = payload.permissions || payload.permission || [];
    if (typeof rawPerms === 'string') rawPerms = [rawPerms];
    else if (!Array.isArray(rawPerms)) rawPerms = [];
    const permissions = rawPerms.filter(Boolean);

    // Modules (can be 'modules', 'module', single string or array, e.g. 'tms', 'crm')
    let rawModules = payload.modules || payload.module || [];
    if (typeof rawModules === 'string') rawModules = [rawModules];
    else if (!Array.isArray(rawModules)) rawModules = [];
    const modules = rawModules.filter(Boolean).map(m => String(m).trim().toLowerCase());

    return {
      id: payload.sub || payload.nameid,
      email,
      username: name,
      name,
      roles,
      role: roles[0] || 'User',
      permissions,
      modules,
      tenantId: payload.tenant_id,
      tenantSlug: payload.tenant_slug,
      tenantName: payload.tenant_name,
      tenantStatus: payload.tenant_status,
      avatarUrl: payload.profilePictureUrl || null,
    };
  } catch {
    return null;
  }
};

export const isTokenExpired = (token) => {
  try {
    if (!token) return true;
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    if (!payload.exp) return false;
    // 10 second buffer for clock skew
    return Date.now() >= (payload.exp * 1000) - 10000;
  } catch {
    return true;
  }
};

export const setCurrentUser = (user) => {
  if (user) {
    localStorage.setItem('currentUser', JSON.stringify(user));
  } else {
    localStorage.removeItem('currentUser');
  }
};

export const getCurrentUser = () => {
  const user = localStorage.getItem('currentUser');
  if (user) {
    try {
      return JSON.parse(user);
    } catch {}
  }
  const token = getAuthToken();
  return token ? parseJwt(token) : null;
};

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

async function request(endpoint, method = 'GET', body = null, isRetry = false) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    method,
    headers,
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (response.status === 401 && !isRetry) {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((newToken) => {
          return request(endpoint, method, body, true);
        });
      }

      isRefreshing = true;
      try {
        const refreshResponse = await fetch(`${AUTH_API_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshResponse.ok) {
          const tokenData = await refreshResponse.json();
          setAuthToken(tokenData.accessToken, tokenData.refreshToken);
          const user = parseJwt(tokenData.accessToken);
          if (user) setCurrentUser(user);

          processQueue(null, tokenData.accessToken);
          return await request(endpoint, method, body, true);
        } else {
          processQueue(new Error('Refresh failed'), null);
          setAuthToken(null);
        }
      } catch (err) {
        processQueue(err, null);
        setAuthToken(null);
      } finally {
        isRefreshing = false;
      }
    }
  }

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = 'Xəta baş verdi';
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.message || errorJson.title || errorText;
    } catch {
      errorMessage = errorText || `Xəta kodu: ${response.status}`;
    }
    throw new Error(errorMessage);
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return await response.json();
  }
  return null;
}

export const authApi = {
  login: async (email, password, tenantSlug = 'demo-tenant') => {
    const response = await fetch(`${AUTH_API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, tenantSlug }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let msg = 'Giriş uğursuz oldu';
      try {
        const errJson = JSON.parse(errorText);
        msg = errJson.message || errJson.title || errorText;
      } catch {}
      throw new Error(msg);
    }

    const data = await response.json();
    if (data && data.accessToken) {
      setAuthToken(data.accessToken, data.refreshToken);
      const user = parseJwt(data.accessToken);
      if (user) setCurrentUser(user);
    }
    return data;
  },

  refreshToken: async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) throw new Error('No refresh token');

    const response = await fetch(`${AUTH_API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) throw new Error('Failed to refresh token');
    const data = await response.json();
    setAuthToken(data.accessToken, data.refreshToken);
    const user = parseJwt(data.accessToken);
    if (user) setCurrentUser(user);
    return data;
  },

  getMe: async () => {
    const token = getAuthToken();
    const response = await fetch(`${AUTH_API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Failed to get user profile');
    return await response.json();
  },

  logout: async () => {
    const refreshToken = getRefreshToken();
    const token = getAuthToken();
    try {
      if (refreshToken) {
        await fetch(`${AUTH_API_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ refreshToken }),
        });
      }
    } catch {}
    setAuthToken(null);
  },
};

export const usersApi = {
  getMe: async () => {
    const token = getAuthToken();
    if (!token) return null;
    try {
      const response = await fetch(`${AUTH_API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        const existing = getCurrentUser() || {};
        const rawModules = data.modules || data.Modules || existing.modules || [];
        const modules = (Array.isArray(rawModules) ? rawModules : [rawModules])
          .filter(Boolean)
          .map((m) => String(m).trim().toLowerCase());

        const updated = {
          ...existing,
          id: data.id || existing.id,
          email: data.email || existing.email,
          name: data.fullName || data.name || existing.name,
          username: data.fullName || data.name || existing.username,
          tenantId: data.tenantId || existing.tenantId,
          tenantSlug: data.tenantSlug || existing.tenantSlug,
          tenantName: data.tenantName || existing.tenantName,
          tenantStatus: data.tenantStatus || existing.tenantStatus,
          roles: data.roles || existing.roles || [],
          permissions: data.permissions || existing.permissions || [],
          modules,
        };
        setCurrentUser(updated);
        return updated;
      }
    } catch (err) {
      console.warn('getMe fetch warning:', err);
    }
    return getCurrentUser();
  },
};
