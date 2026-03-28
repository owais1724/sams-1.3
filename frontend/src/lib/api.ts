import axios from 'axios';
import {
    getActiveSessionUserKey,
    getPortalLoginPath,
    getTabSessionUserKey,
    hasSessionConflict,
} from '@/lib/authSession';
import { useAuthStore } from '@/store/authStore';

/**
 * API Client
 *
 * Uses /api/* prefix which is reverse-proxied by Next.js to the backend.
 * This makes all requests appear same-domain to the browser, so HTTP-only
 * cookies work on all browsers including Safari iOS.
 */
const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

function redirectToLogin(portalType?: string | null) {
    if (typeof window === 'undefined') return;

    const path = window.location.pathname;
    const agencySlug = path.split('/')[1];
    const resolvedPortalType = portalType ?? sessionStorage.getItem('sams_portal_type');
    const loginPath = getPortalLoginPath(path, agencySlug, resolvedPortalType);

    if (path !== loginPath) {
        window.location.href = loginPath;
    }
}

api.interceptors.request.use((config) => {
    if (typeof window === 'undefined') {
        return config;
    }

    const url = config.url || '';
    const bypassConflictCheck =
        url.includes('/auth/login') ||
        url.includes('/auth/logout');

    if (!bypassConflictCheck) {
        const expectedUserKey = getTabSessionUserKey();
        const activeUserKey = getActiveSessionUserKey();
        const portalType = sessionStorage.getItem('sams_portal_type');

        if (hasSessionConflict(expectedUserKey, activeUserKey)) {
            useAuthStore.getState().clearLocalAuth();
            redirectToLogin(portalType);

            const conflictError = new Error('Session changed in another tab. Please sign in again.') as any;
            conflictError.code = 'ERR_SESSION_CONFLICT';
            conflictError.status = 401;
            conflictError.sessionConflict = true;

            return Promise.reject(conflictError);
        }
    }

    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError') {
            return Promise.reject(error);
        }

        const status = error.response?.status;
        const url = error.config?.url || 'Unknown URL';
        const method = error.config?.method?.toUpperCase() || 'UNKNOWN';
        const message =
            error.response?.data?.message ||
            error.message ||
            'An unexpected error occurred';

        if (status === 401) {
            const isLoginRequest = url.includes('/auth/login');

            if (!isLoginRequest) {
                console.warn(`[API] 401 at ${method} ${url}. Session expired.`);
                const portalType = typeof window !== 'undefined'
                    ? sessionStorage.getItem('sams_portal_type')
                    : null;
                useAuthStore.getState().clearLocalAuth();

                const isLoginPage = typeof window !== 'undefined' && (
                    window.location.pathname.includes('/login') ||
                    window.location.pathname.includes('/staff-login')
                );

                if (typeof window !== 'undefined' && !isLoginPage) {
                    redirectToLogin(portalType);
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
