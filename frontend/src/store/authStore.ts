import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

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
            },
            logout: () => {
                set({ user: null, isAuthenticated: false });
                // Clear all auth cookies
                if (typeof document !== 'undefined') {
                    document.cookie = 'userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                    document.cookie = 'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                    document.cookie = 'user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                    document.cookie = 'sams-auth-v2=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                }
                try {
                    if (typeof window !== 'undefined') {
                        sessionStorage.removeItem('sams_portal_type');
                        sessionStorage.removeItem('sams-auth-v2');
                        localStorage.removeItem('sams-auth-v2');
                    }
                } catch (e) { /* ignore */ }
            },
        }),
        {
            name: 'sams-auth-v2',
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
