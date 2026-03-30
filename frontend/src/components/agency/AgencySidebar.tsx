"use client"

import { useState } from "react"
import { useParams, usePathname } from "next/navigation"
import {
    AlertTriangle,
    BarChart3,
    Briefcase,
    Building,
    Calendar,
    CalendarDays,
    ChevronsLeft,
    ChevronsRight,
    Clock,
    Key,
    MapPin,
    Shield,
    ShieldCheck,
    Users,
    Wallet,
} from "lucide-react"

import api from "@/lib/api"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/store/authStore"
import { SidebarItem, SidebarLogout } from "@/components/ui/design-system"
import { AlertModal } from "@/components/ui/alert-modal"

interface AgencySidebarProps {
    onItemClick?: () => void
    collapsed?: boolean
    onToggleCollapse?: () => void
}

type SidebarNavItem = {
    name: string
    href: string
    icon: any
    permissions?: string[]
    staffOnly?: boolean
    agencyOnly?: boolean
}

export function AgencySidebar({ onItemClick, collapsed = false, onToggleCollapse }: AgencySidebarProps) {
    const { agencySlug } = useParams()
    const pathname = usePathname()
    const { user, logout } = useAuthStore()

    const role = user?.role?.toLowerCase() || ""
    const isStaff = ["guard", "hr", "staff", "supervisor"].includes(role)
    const isAdmin = role.includes("admin")

    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
    const [loggingOut, setLoggingOut] = useState(false)

    const handleLogout = async () => {
        setLoggingOut(true)
        try {
            if (onItemClick) onItemClick()
            await api.post("/auth/logout")
        } catch (e) {}
        logout()
        window.location.replace(isStaff ? `/${agencySlug}/staff-login` : `/${agencySlug}/login`)
    }

    const allItems: SidebarNavItem[] = [
        {
            name: "Dashboard",
            href: isStaff ? `/${agencySlug}/staff/dashboard` : `/${agencySlug}/dashboard`,
            icon: BarChart3,
            permissions: ["view_dashboard"],
        },
        {
            name: "Clients",
            href: `/${agencySlug}/clients`,
            icon: Building,
            permissions: ["view_clients", "create_client"],
            agencyOnly: true,
        },
        {
            name: "Projects",
            href: `/${agencySlug}/projects`,
            icon: Briefcase,
            permissions: ["view_projects", "create_project"],
            agencyOnly: true,
        },
        {
            name: "Employees",
            href: `/${agencySlug}/employees`,
            icon: Users,
            permissions: ["view_employee", "create_employee"],
            agencyOnly: true,
        },
        {
            name: "Access Control",
            href: `/${agencySlug}/rbac`,
            icon: Key,
            permissions: ["manage_roles"],
            agencyOnly: true,
        },
        {
            name: "Attendance",
            href: `/${agencySlug}/attendance`,
            icon: Clock,
            permissions: ["view_attendance", "record_attendance", "mark_attendance"],
        },
        {
            name: "Shifts",
            href: `/${agencySlug}/shifts`,
            icon: Shield,
            permissions: ["view_shifts", "manage_shifts"],
            agencyOnly: true,
        },
        {
            name: "Deployments",
            href: `/${agencySlug}/deployments`,
            icon: MapPin,
            permissions: ["view_deployments", "manage_deployments"],
            agencyOnly: true,
        },
        {
            name: "Incidents",
            href: `/${agencySlug}/incidents`,
            icon: AlertTriangle,
            permissions: ["view_incidents", "report_incident", "manage_incidents"],
        },
        {
            name: "Payroll",
            href: `/${agencySlug}/payroll`,
            icon: Wallet,
            permissions: ["view_payroll", "manage_payroll"],
            agencyOnly: true,
        },
        {
            name: "Leaves",
            href: `/${agencySlug}/leaves`,
            icon: CalendarDays,
            permissions: ["view_leaves", "apply_leave", "approve_leave"],
        },
        {
            name: "My Schedule",
            href: `/${agencySlug}/my-schedule`,
            icon: Calendar,
            staffOnly: true,
        },
    ]

    const sidebarItems = allItems.filter((item) => {
        // Staff-only items are hidden from non-staff
        if (item.staffOnly && !isStaff) return false

        // Admin sees everything
        if (isAdmin) return true

        // For all other items, if there are specific permissions required, check them.
        // This makes the sidebar dynamic for both Agency Admin and Staff based on their permissions.
        if (item.permissions && item.permissions.length > 0) {
            return item.permissions.some((perm) => user?.permissions?.includes(perm))
        }

        // If no permissions are specified, show it (except maybe for agencyOnly/staffOnly conflicts)
        if (item.agencyOnly && isStaff) return false
        
        return true
    })

    return (
        <aside
            className={cn(
                "sticky top-0 flex h-screen w-full flex-col overflow-hidden bg-white text-[#222831] border-r border-[#e5e7eb]",
                collapsed ? "px-2" : "px-3"
            )}
        >
            <div className={cn("flex h-16 items-center justify-between border-b border-[#e5e7eb]", collapsed ? "px-1" : "px-2")}>
                <div className={cn("flex items-center gap-2 min-w-0", collapsed && "justify-center w-full")}>
                    <div className="h-9 w-9 rounded-xl bg-[#3bb18c] text-white flex items-center justify-center shrink-0">
                        <ShieldCheck className="h-4 w-4" />
                    </div>
                    {!collapsed && (
                        <div className="min-w-0">
                            <p className="text-base font-bold leading-none truncate">{user?.agencyName || "Agency Portal"}</p>
                            <p className="text-[11px] text-[#6b7280] mt-1 uppercase tracking-wider">Command</p>
                        </div>
                    )}
                </div>
                {onToggleCollapse && (
                    <button
                        onClick={onToggleCollapse}
                        className="h-8 w-8 rounded-lg border border-[#d1d5db] bg-white/80 hover:bg-white flex items-center justify-center shrink-0"
                        aria-label="Toggle sidebar"
                    >
                        {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
                    </button>
                )}
            </div>

            <div className="flex-1 pt-2 space-y-0.5 overflow-hidden">
                {sidebarItems.map((item) => (
                    <SidebarItem
                        key={item.name}
                        name={item.name}
                        href={item.href}
                        icon={item.icon}
                        isActive={pathname === item.href}
                        onClick={onItemClick}
                        collapsed={collapsed}
                        className={cn(
                            "py-2",
                            pathname === item.href
                                ? "text-white hover:text-white hover:bg-[#06b6d4]"
                                : "text-[#3b4a63] hover:text-[#0e7490] hover:bg-[#ecfeff]"
                        )}
                    />
                ))}
            </div>

            <div className="border-t border-[#e5e7eb] py-2">
                {!collapsed && (
                    <div className="mb-2 px-2">
                        <p className="text-[15px] font-semibold truncate">{user?.fullName || "User"}</p>
                        <p className="text-[12px] uppercase tracking-wider text-[#6b7280] truncate">{user?.role || "operator"}</p>
                    </div>
                )}
                <SidebarLogout
                    onClick={() => setShowLogoutConfirm(true)}
                    collapsed={collapsed}
                    className="h-11 bg-[#ecfeff] hover:bg-[#06b6d4] text-[#0e7490] hover:text-white border border-[#bae6fd] font-bold uppercase tracking-widest"
                />
            </div>

            <AlertModal
                isOpen={showLogoutConfirm}
                onClose={() => setShowLogoutConfirm(false)}
                onConfirm={handleLogout}
                loading={loggingOut}
                title="Sign Out?"
                description="Are you sure you want to sign out? Any unsaved changes will be lost."
                variant="primary"
                confirmText="Sign Out"
                cancelText="Stay"
            />
        </aside>
    )
}
