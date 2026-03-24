# RBAC Implementation Guide

## Overview
This application implements Role-Based Access Control (RBAC) to ensure users can only access pages and features they have permission for.

## How It Works

### 1. PermissionGuard Component
Located at: `frontend/src/components/common/PermissionGuard.tsx`

This component wraps pages and checks if the user has required permissions. If not, it:
- Shows an error toast
- Logs out the user
- Redirects to the login page

### 2. Usage Example

```tsx
import { PermissionGuard } from "@/components/common/PermissionGuard"

export default function EmployeesPage() {
    // ... your page logic

    return (
        <PermissionGuard requiredPermissions={['view_employee', 'create_employee']}>
            <div>
                {/* Your page content */}
            </div>
        </PermissionGuard>
    )
}
```

### 3. Props

- `requiredPermissions`: Array of permission strings. User needs ANY one of these permissions.
- `requireAll`: Boolean (default: false). If true, user must have ALL permissions in the array.

### 4. Pages That Need Protection

Apply PermissionGuard to these pages:

| Page | Required Permissions |
|------|---------------------|
| `/employees` | `['view_employee', 'create_employee']` |
| `/projects` | `['view_projects', 'create_project']` |
| `/clients` | `['view_clients', 'create_client']` |
| `/shifts` | `['view_shifts', 'manage_shifts']` |
| `/deployments` | `['view_deployments', 'manage_deployments']` |
| `/incidents` | `['view_incidents', 'report_incident']` |
| `/leaves` | `['view_leaves', 'apply_leave']` |
| `/payroll` | `['view_payroll', 'manage_payroll']` |
| `/rbac` | `['manage_roles']` |
| `/attendance` | No guard needed (all users can mark attendance) |
| `/dashboard` | `['view_dashboard']` |

### 5. Admins Bypass All Checks

Users with roles containing "admin" automatically bypass all permission checks.

### 6. Testing

To test RBAC:
1. Create a user with limited permissions
2. Log in as that user
3. Try to access a page by copying the URL directly
4. You should be logged out and redirected to login

## Implementation Status

- ✅ PermissionGuard component created
- ✅ Employees page protected
- ⏳ Other pages need to be wrapped with PermissionGuard

## Next Steps

Wrap all remaining pages with PermissionGuard using the table above as reference.
