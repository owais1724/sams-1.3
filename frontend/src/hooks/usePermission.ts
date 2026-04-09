import { useAuthStore } from "@/store/authStore";

const PERMISSION_ALIASES: Record<string, string[]> = {
    approve_leave: ["approve_leaves"],
    approve_leaves: ["approve_leave"],
    view_leaves: ["view_leave"],
    view_leave: ["view_leaves"],
    apply_leave: ["apply_leaves"],
    apply_leaves: ["apply_leave"],
};

export function usePermission() {
    const { user } = useAuthStore();

    const isAdmin = user?.role === 'Super Admin' || user?.role?.toLowerCase().includes('admin');

    const permissionSet = new Set((user?.permissions || []).map((p) => String(p).toLowerCase().trim()));

    const hasSinglePermission = (value: string) => {
        const normalized = String(value || "").toLowerCase().trim();
        if (!normalized) return false;

        if (permissionSet.has(normalized)) {
            return true;
        }

        const aliases = PERMISSION_ALIASES[normalized] || [];
        return aliases.some((alias) => permissionSet.has(alias));
    };

    const hasPermission = (permission: string | string[]) => {
        if (!user) return false;
        if (isAdmin) return true;

        if (Array.isArray(permission)) {
            return permission.some((p) => hasSinglePermission(p));
        }

        return hasSinglePermission(permission);
    };

    const hasAllPermissions = (permissions: string[]) => {
        if (!user) return false;
        if (isAdmin) return true;

        return permissions.every((permission) => hasSinglePermission(permission));
    };

    return {
        hasPermission,
        hasAllPermissions,
        isAdmin,
        permissions: user?.permissions || [],
        user
    };
}
