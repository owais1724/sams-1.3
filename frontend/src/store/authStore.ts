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
    login: (user: User) => void;
    clearLocalAuth: () => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            isAuthenticated: false,
            login: (user) => {
                set({ user, isAuthenticated: true });
                // Store role in cookie for middleware access
                if (typeof document !== 'undefined' && user.role) {
                    document.cookie = `userRole=${user.role}; path=/; max-age=86400; SameSite=Lax`;
                }
                setActiveSessionUser(user);
                setTabSessionUser(user);
            },
            clearLocalAuth: () => {
                set({ user: null, isAuthenticated: false });
                try {
                    clearTabSessionStorage();
                } catch { /* ignore */ }
            },
            logout: () => {
                set({ user: null, isAuthenticated: false });
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
