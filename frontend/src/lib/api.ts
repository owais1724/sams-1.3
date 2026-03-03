import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

const TOKEN_KEY = 'sams_access_token';

/** Save token received from login response (used by mobile as fallback) */
export function saveToken(token: string) {
    try {
        if (typeof window !== 'undefined') {
            localStorage.setItem(TOKEN_KEY, token);
        }
    } catch (e) { /* ignore */ }
}

/** Remove token on logout */
export function clearToken() {
    try {
        if (typeof window !== 'undefined') {
            localStorage.removeItem(TOKEN_KEY);
        }
    } catch (e) { /* ignore */ }
}

/** Read stored token */
function getToken(): string | null {
    try {
        if (typeof window !== 'undefined') {
            return localStorage.getItem(TOKEN_KEY);
        }
    } catch (e) { /* ignore */ }
    return null;
}

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // Sends cookies on desktop browsers
});

// ── Request interceptor: attach Bearer token for mobile ───────────────────────
// Desktop browsers send the HttpOnly cookie automatically via withCredentials.
// Mobile browsers (Safari iOS) block cross-domain SameSite=None cookies (ITP),
// so we fall back to a stored token sent as an Authorization header.
api.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
});

// ── Response interceptor: handle 401 globally ─────────────────────────────────
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;
        const url = error.config?.url || 'Unknown URL';
        const method = error.config?.method?.toUpperCase() || 'UNKNOWN';

        const message =
            error.response?.data?.message ||
            error.message ||
            "An unexpected error occurred";

        // Auto-logout on 401 — but NOT for the login request itself
        if (status === 401) {
            const isLoginRequest = url.includes('/auth/login');

            if (!isLoginRequest) {
                console.warn(`[API] 401 at ${method} ${url}. Clearing session.`);

                clearToken();
                useAuthStore.getState().logout();

                const isLoginPage = typeof window !== 'undefined' && (
                    window.location.pathname.includes('/login') ||
                    window.location.pathname.includes('/staff-login')
                );

                if (typeof window !== 'undefined' && !isLoginPage) {
                    const path = window.location.pathname;
                    const agencySlug = path.split('/')[1];

                    if (path.includes('/staff')) {
                        window.location.href = `/${agencySlug}/staff-login`;
                    } else if (path.includes('/admin')) {
                        window.location.href = '/admin/login';
                    } else {
                        if (agencySlug && agencySlug !== 'admin') {
                            window.location.href = `/${agencySlug}/login`;
                        } else {
                            window.location.href = '/';
                        }
                    }
                }
            }
        }

        if (status !== 401 && status !== 403) {
            console.error(`[API] ${method} ${url} Error:`, message);
        }

        const customError = new Error(Array.isArray(message) ? message.join(', ') : message) as any;
        customError.status = status;
        customError.response = error.response;
        customError.extractedMessage = customError.message;
        customError.config = error.config;

        return Promise.reject(customError);
    }
);

export default api;
