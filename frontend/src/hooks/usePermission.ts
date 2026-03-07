import { useAuthStore } from "@/store/authStore";

export function usePermission() {
    const { user } = useAuthStore();

    const isAdmin = user?.role === 'Super Admin' || user?.role?.toLowerCase().includes('admin');

    const hasPermission = (permission: string | string[]) => {
        if (!user) return false;
        if (isAdmin) return true;

        if (Array.isArray(permission)) {
            return permission.some(p => user.permissions?.includes(p));
        }

        return user.permissions?.includes(permission);
    };

    const hasAllPermissions = (permissions: string[]) => {
        if (!user) return false;
        if (isAdmin) return true;

        return permissions.every(p => user.permissions?.includes(p));
    };

    return {
        hasPermission,
        hasAllPermissions,
        isAdmin,
        permissions: user?.permissions || [],
        user
    };
}
