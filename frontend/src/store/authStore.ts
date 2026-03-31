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
                        document.cookie.includes('token');
                    
                    if (hasAuthCookie) {
                        // Try to restore session from backend
                        try {
                            const response = await fetch('/api/auth/me', {
                                credentials: 'include',
                                headers: {
                                    'Content-Type': 'application/json',
                                }
                            });
                            
                            if (response.ok) {
                                const userData = await response.json();
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
