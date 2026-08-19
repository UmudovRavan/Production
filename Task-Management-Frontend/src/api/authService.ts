import authClient from './authClient';
import httpClient from './httpClient';
import type {
    LoginRequest,
    TokenResponse,
    UserInfoDto,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    AuthMessageResponse,
    RegisterRequest,
    RegisterResponse,
    UpdateProfileRequest,
    UpdateProfileResponse,
} from '../dto';

export const authService = {
    /**
     * Authenticate with email, password, and tenantSlug
     */
    async login(data: LoginRequest): Promise<TokenResponse> {
        const response = await authClient.post<TokenResponse>('/auth/login', data);
        if (response.data.accessToken) {
            this.setTokens(response.data.accessToken, response.data.refreshToken);
            if (data.tenantSlug) {
                this.setLastTenantSlug(data.tenantSlug);
            }
        }
        return response.data;
    },

    /**
     * Register a new user/tenant
     */
    async register(data: RegisterRequest): Promise<RegisterResponse> {
        const response = await authClient.post<RegisterResponse>('/tenant/register', data);
        return response.data;
    },

    /**
     * Refresh access token using stored refresh token (Token Rotation)
     */
    async refreshToken(): Promise<TokenResponse> {
        const refreshToken = this.getRefreshToken();
        if (!refreshToken) {
            throw new Error('No refresh token available');
        }

        const response = await authClient.post<TokenResponse>('/auth/refresh', {
            refreshToken,
        });

        if (response.data.accessToken) {
            this.setTokens(response.data.accessToken, response.data.refreshToken);
        }
        return response.data;
    },

    /**
     * Get current authenticated user info, permissions, and active modules
     */
    async getMe(): Promise<UserInfoDto> {
        const response = await authClient.get<UserInfoDto>('/auth/me');
        return response.data;
    },

    /**
     * Logout from current device
     */
    async logout(): Promise<void> {
        const refreshToken = this.getRefreshToken();
        try {
            if (refreshToken) {
                await authClient.post('/auth/logout', { refreshToken });
            }
        } catch {
            // Silently proceed with local cleanup
        } finally {
            this.clearTokens();
        }
    },

    /**
     * Logout from all devices
     */
    async logoutAll(): Promise<void> {
        try {
            await authClient.post('/auth/logout-all');
        } catch {
            // Silently proceed
        } finally {
            this.clearTokens();
        }
    },

    /**
     * Request OTP for password reset
     */
    async forgotPassword(data: ForgotPasswordRequest): Promise<AuthMessageResponse> {
        const response = await authClient.post<AuthMessageResponse>('/auth/forgot-password', data);
        return response.data;
    },

    /**
     * Helper to send reset OTP
     */
    async sendResetOtp(email: string, tenantSlug?: string): Promise<AuthMessageResponse> {
        const slug = tenantSlug || this.getLastTenantSlug() || 'demo-tenant';
        return this.forgotPassword({ email, tenantSlug: slug });
    },

    /**
     * Reset password using OTP
     */
    async resetPassword(data: ResetPasswordRequest): Promise<AuthMessageResponse> {
        const payload = {
            email: data.email,
            tenantSlug: data.tenantSlug || this.getLastTenantSlug() || 'demo-tenant',
            otp: data.otp || data.token || '',
            newPassword: data.newPassword,
        };
        const response = await authClient.post<AuthMessageResponse>('/auth/reset-password', payload);
        return response.data;
    },

    /**
     * Profile Management (TMS local profile endpoints)
     */
    async updateProfile(data: UpdateProfileRequest): Promise<UpdateProfileResponse> {
        const response = await httpClient.put<UpdateProfileResponse>('/Authorize/Profile', data);
        return response.data;
    },

    async uploadProfilePicture(fileOrFormData: File | FormData): Promise<{ profilePictureUrl?: string; token?: string }> {
        let formData: FormData;
        if (fileOrFormData instanceof FormData) {
            formData = fileOrFormData;
        } else {
            formData = new FormData();
            formData.append('file', fileOrFormData);
        }
        const response = await httpClient.post<{ profilePictureUrl?: string; token?: string }>('/Authorize/ProfilePicture', formData);
        return response.data;
    },

    async removeProfilePicture(): Promise<{ token?: string } | void> {
        const response = await httpClient.delete<{ token?: string }>('/Authorize/ProfilePicture');
        return response.data;
    },

    // ── Token Storage Helpers ─────────────────────────────────────

    setTokens(accessToken: string, refreshToken?: string): void {
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('authToken', accessToken);
        localStorage.setItem('token', accessToken);
        if (refreshToken) {
            localStorage.setItem('refreshToken', refreshToken);
        }
    },

    setToken(token: string): void {
        this.setTokens(token);
    },

    getAccessToken(): string | null {
        return (
            localStorage.getItem('accessToken') ||
            localStorage.getItem('authToken') ||
            localStorage.getItem('token')
        );
    },

    getToken(): string | null {
        return this.getAccessToken();
    },

    getRefreshToken(): string | null {
        return localStorage.getItem('refreshToken');
    },

    isAuthenticated(): boolean {
        return !!this.getAccessToken();
    },

    clearTokens(): void {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('authToken');
        localStorage.removeItem('token');
        localStorage.removeItem('currentUser');
    },

    clearToken(): void {
        this.clearTokens();
    },

    setLastTenantSlug(slug: string): void {
        localStorage.setItem('lastTenantSlug', slug.trim());
    },

    getLastTenantSlug(): string {
        return localStorage.getItem('lastTenantSlug') || '';
    },
};

export default authService;
