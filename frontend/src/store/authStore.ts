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
            storage: createJSONStorage(() => (typeof window !== 'undefined' ? localStorage : undefined)),
            partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
        }
    )
);
