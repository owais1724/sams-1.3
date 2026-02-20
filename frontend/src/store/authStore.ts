import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface User {
    id: string;
    email: string;
    fullName: string;
    role: string | null;
    agencyId: string | null;
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
            },
            logout: () => {
                set({ user: null, isAuthenticated: false });
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
                        return localStorage;
                    }
                } catch (e) {
                    console.warn('LocalStorage access blocked or unavailable:', e);
                }
                return dummyStorage;
            }),
            partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
        }
    )
);
