import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

/**
 * API Client
 *
 * Uses /api/* prefix which is reverse-proxied by Next.js to the backend.
 * This makes all requests appear same-domain to the browser, so HTTP-only
 * cookies work on ALL browsers including Safari iOS (no ITP blocking).
 *
 * NEXT_PUBLIC_API_URL must be set to "/api" in production.
 * In development, keep it as "http://localhost:3001" and the rewrites in
 * next.config.ts will handle the proxy if NEXT_PUBLIC_API_URL is not set.
 */
const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // Always send cookies — now same-domain so mobile works
});

// ── Response interceptor: handle 401 globally ─────────────────────────────────
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Skip canceled/aborted requests (React strict-mode unmount, AbortController)
        if (error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError') {
            return Promise.reject(error);
        }

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
                console.warn(`[API] 401 at ${method} ${url}. Session expired.`);

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
