import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
    ACTIVE_USER_KEY_COOKIE,
    AUTH_STORE_KEY,
    clearCookie,
    clearTabSessionStorage,
    setActiveSessionUser,
    setTabSessionUser,
} from '@/lib/authSession';

export function getCsrfTokenFromCookie() {
    if (typeof document === 'undefined') {
        return null;
    }

    const cookies = document.cookie ? document.cookie.split('; ') : [];
    const prefix = 'csrf_token=';
    const match = cookies.find((cookie) => cookie.startsWith(prefix));

    if (!match) {
        return null;
    }

    return decodeURIComponent(match.slice(prefix.length));
}

export function withCsrfHeaders(
    method: string | undefined,
    headers?: HeadersInit,
): Headers {
    const normalizedMethod = (method || 'GET').toUpperCase();
    const nextHeaders = new Headers(headers);

    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(normalizedMethod)) {
        const csrfToken = getCsrfTokenFromCookie();

        if (csrfToken) {
            nextHeaders.set('x-csrf-token', csrfToken);
        }
    }

    return nextHeaders;
}

interface User {
    id: string;
    email: string;
    fullName: string;
    role: string | null;
    agencyId: string | null;
    agencySlug?: string | null;
    agencyName?: string | null;
    employeeId: string | null;
    permissions: string[];
}

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    initialize: () => Promise<void>;
    login: (user: User) => void;
    clearLocalAuth: () => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            isAuthenticated: false,
            isLoading: true,
            
            initialize: async () => {
                set({ isLoading: true });
                
                // Check if already initialized
                const currentUser = get().user;
                if (currentUser) {
                    set({ isLoading: false, isAuthenticated: true });
                    return;
                }

                // Check if we have auth cookies
                if (typeof document !== 'undefined') {
                    const hasAuthCookie = 
                        document.cookie.includes('access_token') || 
                        document.cookie.includes('token') ||
                        document.cookie.includes('userRole');
                    
                    if (hasAuthCookie) {
                        console.log('[AuthStore] Auth cookies found, restoring session from backend...');
                        // Try to restore session from backend
                        try {
                            const response = await fetch('/api/auth/me', {
                                credentials: 'include',
                                headers: withCsrfHeaders('GET', {
                                    'Content-Type': 'application/json',
                                }),
                                cache: 'no-store'
                            });
                            
                            if (response.ok) {
                                const userData = await response.json();
                                console.log('[AuthStore] Session restored successfully:', userData.email);
                                set({ 
                                    user: userData, 
                                    isAuthenticated: true, 
                                    isLoading: false 
                                });
                                
                                // Store in cookies for middleware
                                if (userData.role) {
                                    document.cookie = `userRole=${userData.role}; path=/; max-age=86400; SameSite=Lax`;
                                }
                                setActiveSessionUser(userData);
                                setTabSessionUser(userData);
                                return;
                            } else {
                                console.warn('[AuthStore] Failed to restore session, status:', response.status);
                            }
                        } catch (error) {
                            console.warn('[AuthStore] Failed to restore session:', error);
                        }
                    }
                }

                set({ isLoading: false, isAuthenticated: false });
            },
            
            login: (user) => {
                set({ user, isAuthenticated: true, isLoading: false });
                // Store role in cookie for middleware access
                if (typeof document !== 'undefined' && user.role) {
                    document.cookie = `userRole=${user.role}; path=/; max-age=86400; SameSite=Lax`;
                }
                setActiveSessionUser(user);
                setTabSessionUser(user);
            },
            clearLocalAuth: () => {
                set({ user: null, isAuthenticated: false, isLoading: false });
                try {
                    clearTabSessionStorage();
                } catch { /* ignore */ }
            },
            logout: () => {
                set({ user: null, isAuthenticated: false, isLoading: false });
                // Clear all auth cookies
                if (typeof document !== 'undefined') {
                    clearCookie('userRole');
                    clearCookie('access_token');
                    clearCookie('token');
                    clearCookie('user');
                    clearCookie(AUTH_STORE_KEY);
                }
                try {
                    clearCookie(ACTIVE_USER_KEY_COOKIE);
                    clearTabSessionStorage();
                } catch { /* ignore */ }
            },
        }),
        {
            name: AUTH_STORE_KEY,
            storage: createJSONStorage(() => {
                const dummyStorage = {
                    getItem: () => null,
                    setItem: () => { },
                    removeItem: () => { },
                };
                try {
                    if (typeof window !== 'undefined') {
                        return sessionStorage;
                    }
                } catch (e) {
                    console.warn('SessionStorage access blocked or unavailable:', e);
                }
                return dummyStorage;
            }),
            partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
        }
    )
);
