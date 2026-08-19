const ACCESS_TOKEN_KEY = 'altensor_access_token';
const REFRESH_TOKEN_KEY = 'altensor_refresh_token';
const API_URL_KEY = 'altensor_api_url';
export const DEFAULT_API_URL = 'http://31.57.77.199:5051';

export const storage = {
  getAccessToken: (): string | null => localStorage.getItem(ACCESS_TOKEN_KEY),
  setAccessToken: (token: string) => localStorage.setItem(ACCESS_TOKEN_KEY, token),
  removeAccessToken: () => localStorage.removeItem(ACCESS_TOKEN_KEY),

  getRefreshToken: (): string | null => localStorage.getItem(REFRESH_TOKEN_KEY),
  setRefreshToken: (token: string) => localStorage.setItem(REFRESH_TOKEN_KEY, token),
  removeRefreshToken: () => localStorage.removeItem(REFRESH_TOKEN_KEY),

  getApiUrl: (): string => {
    const saved = localStorage.getItem(API_URL_KEY);
    if (!saved || saved.includes('localhost') || saved.includes('127.0.0.1') || saved.includes(':8085')) {
      localStorage.setItem(API_URL_KEY, DEFAULT_API_URL);
      return DEFAULT_API_URL;
    }
    return saved.replace(/\/+$/, '');
  },
  setApiUrl: (url: string) => localStorage.setItem(API_URL_KEY, url.trim().replace(/\/+$/, '')),

  clearAuth: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
};
