import axios from 'axios';
import type { AxiosInstance } from 'axios';

const AUTH_BASE_URL = import.meta.env.VITE_AUTH_API_URL || 'https://api-info.altensor.com/api';

/**
 * Dedicated Axios Client for AltensorAuthService
 */
export const authClient: AxiosInstance = axios.create({
    baseURL: AUTH_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 15000,
});

authClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken') || localStorage.getItem('authToken');
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

export default authClient;
