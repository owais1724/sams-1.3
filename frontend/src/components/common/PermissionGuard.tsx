import React from 'react';
import { usePermission } from '@/hooks/usePermission';

interface PermissionGuardProps {
    permission?: string | string[];
    allPermissions?: string[];
    fallback?: React.ReactNode;
    children?: React.ReactNode;
}

/**
 * A wrapper component that only renders its children if the user has the required permission(s).
 */
export function PermissionGuard({
    permission,
    allPermissions,
    fallback = null,
    children
}: PermissionGuardProps) {
    const { hasPermission, hasAllPermissions } = usePermission();

    if (allPermissions) {
        if (hasAllPermissions(allPermissions)) {
            return <>{children}</>;
        }
        return <>{fallback}</>;
    }

    if (permission) {
        if (hasPermission(permission)) {
            return <>{children}</>;
        }
        return <>{fallback}</>;
    }

    // If no permission specified, show nothing by default (or fix as needed)
    return <>{children}</>;
}
