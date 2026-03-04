"use client"

import Link from "next/link"
import { useParams, usePathname } from "next/navigation"
import {
    BarChart3,
    Building,
    Briefcase,
    Users,
    Key,
    Clock,
    CalendarDays,
    Wallet,
    ShieldCheck
} from "lucide-react"
import { cn } from "@/lib/utils"

import { useAuthStore } from "@/store/authStore"
import { useEffect, useState } from "react"
import api from "@/lib/api"
import { SidebarItem, SidebarLogout, SidebarSectionLabel } from "@/components/ui/design-system"

export function AgencySidebar({ onItemClick }: { onItemClick?: () => void }) {
    const { agencySlug } = useParams()
    const pathname = usePathname()
    const { user, login, logout } = useAuthStore()
    const [loading, setLoading] = useState(!user) // only show skeleton on first ever load

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await api.get('/auth/me')
                login(response.data)
            } catch (error) {
                console.error("Failed to fetch profile", error)
            } finally {
                setLoading(false)
            }
        }

        // Re-fetch permissions on every route change.
        // The layout stays mounted in Next.js, so we use pathname as a trigger
        // to ensure admin's permission changes are reflected without re-login.
        fetchProfile()
    }, [pathname, login])

    const isStaff = user?.role && !user.role.toLowerCase().includes('admin');

    const allNavItems = [
        {
            name: "Dashboard",
            href: isStaff ? `/${agencySlug}/staff/dashboard` : `/${agencySlug}/dashboard`,
            icon: BarChart3
        },
        {
            name: "Clients",
            href: `/${agencySlug}/clients`,
            icon: Building,
            permissions: ["view_clients", "create_client"]
        },
        {
            name: "Projects",
            href: `/${agencySlug}/projects`,
            icon: Briefcase,
            permissions: ["view_projects", "create_project"]
        },
        {
            name: "Employees",
            href: `/${agencySlug}/employees`,
            icon: Users,
            permissions: ["view_employee", "create_employee"]
        },
        {
            name: "Access Control",
            href: `/${agencySlug}/rbac`,
            icon: Key,
            permissions: ["manage_roles"]
        },
        {
            name: "Attendance",
            href: `/${agencySlug}/attendance`,
            icon: Clock,
            permissions: ["view_attendance", "mark_attendance"]
        },
        {
            name: "Leaves",
            href: `/${agencySlug}/leaves`,
            icon: CalendarDays,
            permissions: ["view_leaves", "apply_leave", "approve_leave"]
        },
        {
            name: "Payroll",
            href: `/${agencySlug}/payroll`,
            icon: Wallet,
            permissions: ["view_payroll", "manage_payroll"]
        },
        {
            name: "Audit Logs",
            href: `/${agencySlug}/audit-logs`,
            icon: ShieldCheck,
            permissions: ["view_audit_logs"]
        },
    ]

    const navItems = allNavItems.filter(item => {
        if (user?.role?.toLowerCase().includes('admin')) return true
        if (!item.permissions || item.permissions.length === 0) return true
        return item.permissions.some(p => user?.permissions?.includes(p))
    })

    if (loading) {
        return (
            <div className="flex h-screen w-64 flex-col bg-[#0d5c56] border-r border-white/5 animate-pulse">
                <div className="h-16 border-b border-white/5" />
                <div className="flex-1 py-6 px-4 space-y-4">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="h-10 bg-white/5 rounded-xl" />
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="flex h-full w-full flex-col bg-gradient-to-b from-[#0d5c56] to-[#06423d] text-white border-r border-white/5 relative z-20 font-outfit shadow-[10px_0_50px_-5px_rgba(0,0,0,0.3)]">
            {/* Logo Section */}
            <div className="flex h-24 items-center px-8 border-b border-white/5 gap-4 relative overflow-hidden group">
                <div className="absolute inset-0 bg-white/[0.02] transform skew-y-12 translate-y-12 group-hover:translate-y-10 transition-transform duration-700" />
                <div className="h-12 w-12 bg-gradient-to-tr from-[#14B8A6] to-emerald-400 rounded-2xl flex items-center justify-center shadow-xl shadow-teal-500/30 transform rotate-3 group-hover:rotate-6 transition-transform">
                    <ShieldCheck className="h-7 w-7 text-white" />
                </div>
                <div className="relative z-10 font-outfit">
                    <h1 className="text-xl font-black tracking-[0.15em] text-white leading-tight">SENTINEL</h1>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[10px] text-teal-300/60 font-black uppercase tracking-[0.2em]">Security SaaS</span>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto pt-10 px-5 space-y-10 scrollbar-hide">
                <div>
                    <SidebarSectionLabel>Core Operations</SidebarSectionLabel>
                    <nav className="space-y-2 mt-4">
                        {navItems.map((item) => (
                            <SidebarItem
                                key={item.name}
                                name={item.name}
                                href={item.href}
                                icon={item.icon}
                                isActive={pathname === item.href}
                                onClick={onItemClick}
                                className="text-teal-100/60 hover:text-white hover:bg-white/5"
                            />
                        ))}
                    </nav>
                </div>
            </div>

            {/* User Profile Section */}
            <div className="p-6 bg-black/20 border-t border-white/5 mx-5 mb-5 rounded-[32px] shadow-inner">
                <div className="mb-5 flex items-center gap-4 px-1">
                    <div className="relative group/avatar">
                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-[#14B8A6] to-emerald-400 flex items-center justify-center text-base font-black shadow-xl shadow-teal-500/20 border-2 border-white/10 uppercase transition-transform group-hover/avatar:scale-105">
                            {user?.fullName?.charAt(0) || "U"}
                        </div>
                        <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-emerald-500 border-2 border-[#0d5c56] rounded-full shadow-lg" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-white truncate leading-none">{user?.fullName}</p>
                        <div className="px-2 py-0.5 rounded-full bg-white/5 w-fit mt-1.5 border border-white/5">
                            <p className="text-[9px] text-teal-300/80 font-black truncate tracking-widest uppercase">{user?.role}</p>
                        </div>
                    </div>
                </div>

                <SidebarLogout
                    onClick={async () => {
                        if (onItemClick) onItemClick()
                        await api.post("/auth/logout")
                        logout()
                        window.location.replace(isStaff ? `/${agencySlug}/staff-login` : `/${agencySlug}/login`)
                    }}
                    className="h-12 bg-white/5 hover:bg-rose-500 text-teal-100 hover:text-white border border-white/5 font-black uppercase tracking-widest text-[10px]"
                />
            </div>
        </div>
    )
}
