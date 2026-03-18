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



    ShieldCheck,



    Shield,



    X,



    ChevronsLeft,



    ChevronsRight,



    MapPin,



    AlertTriangle,



    Calendar,



} from "lucide-react"



import { cn } from "@/lib/utils"







import { useAuthStore } from "@/store/authStore"



import { useEffect, useState } from "react"



import api from "@/lib/api"



import { SidebarItem, SidebarLogout, SidebarSectionLabel } from "@/components/ui/design-system"



import { Badge } from "@/components/ui/badge"







interface AgencySidebarProps {



    onItemClick?: () => void



    collapsed?: boolean



    onToggleCollapse?: () => void



}







export function AgencySidebar({ onItemClick, collapsed = false, onToggleCollapse }: AgencySidebarProps) {



    const { agencySlug } = useParams()



    const pathname = usePathname()



    const { user, login, logout } = useAuthStore()



    const [loading, setLoading] = useState(!user)







    const isStaff = user?.role === "staff";



    const sidebarItems = [



        {
            name: "Dashboard",
            href: isStaff ? `/${agencySlug}/staff/dashboard` : `/${agencySlug}/dashboard`,
            icon: BarChart3,
            permissions: ["view_dashboard"]
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



            permissions: ["view_attendance", "record_attendance"]



        },



        {



            name: "Shifts",



            href: `/${agencySlug}/shifts`,



            icon: Shield,



            permissions: ["view_shifts", "manage_shifts"]



        },



        {



            name: "Deployments",



            href: `/${agencySlug}/deployments`,



            icon: MapPin,



            permissions: ["view_deployments", "manage_deployments"]



        },



        {



            name: "Incidents",



            href: `/${agencySlug}/incidents`,



            icon: AlertTriangle,



            permissions: ["view_incidents", "report_incident", "manage_incidents"]



        },



        {
            name: "My Schedule",
            href: `/${agencySlug}/my-schedule`,
            icon: Calendar,
            permissions: [] // Show to all staff - they need to see their deployments
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



    ];







    return (
        <div className="flex h-full w-full flex-col bg-[var(--sidebar)] text-white relative z-20 font-inter">
            {/* Logo Section */}
            <div className={cn(
                "flex h-24 items-center justify-between border-b border-white/10 gap-3 relative overflow-hidden group shrink-0 transition-all duration-300",
                collapsed ? "px-3" : "px-8"
            )}>
                <div className={cn("flex items-center gap-4 relative z-10 w-full", collapsed && "justify-center")}>
                    <div className="h-11 w-11 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center shadow-sm shrink-0">
                        <ShieldCheck className="h-6 w-6 text-[#06b6d4]" />
                    </div>
                    <div className={cn(
                        "flex-1 min-w-0 transition-all duration-300",
                        collapsed ? "w-0 opacity-0 overflow-hidden" : "w-auto opacity-100"
                    )}>
                        <h1 className="text-lg font-bold text-white leading-tight truncate uppercase">
                            {user?.agencyName || 'SAMS Ops'}
                        </h1>
                        <p className="text-[12px] text-[#94a3b8] truncate">Agency Portal</p>
                    </div>
                    {onItemClick && (
                        <button
                            onClick={onItemClick}
                            className="lg:hidden relative z-20 flex items-center justify-center h-10 w-10 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-all shrink-0"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Collapse Toggle Button */}
            {onToggleCollapse && (
                <div className={cn("hidden lg:flex px-6 pt-4 transition-all duration-300", collapsed && "justify-center px-3")}>
                    <button
                        onClick={onToggleCollapse}
                        className="flex items-center justify-center h-9 w-9 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-all group"
                        title={collapsed ? "Expand Sidebar" : "Retract Sidebar"}
                    >
                        {collapsed ? <ChevronsRight className="h-5 w-5" /> : <ChevronsLeft className="h-5 w-5 transition-transform group-hover:-translate-x-0.5" />}
                    </button>
                </div>
            )}

            {/* Navigation */}
            <div className={cn(
                "flex-1 overflow-y-auto pt-6 space-y-1 scrollbar-hide transition-all duration-300",
                collapsed ? "px-3" : "px-6"
            )}>
                {sidebarItems
                    .filter(item => {
                        // If no permissions required, show to everyone
                        if (!item.permissions || item.permissions.length === 0) return true;
                        
                        // Agency Admin has all permissions automatically
                        if (user?.role === 'Agency Admin') return true;
                        
                        // Check if user has ANY of the required permissions
                        return item.permissions.some(p => user?.permissions?.includes(p));
                    })
                    .map(item => (
                        <SidebarItem
                            key={item.name}
                            {...item}
                            collapsed={collapsed}
                            isActive={pathname === item.href}
                            onClick={onItemClick}
                        />
                    ))}
            </div>

            {/* User Profile Section */}
            <div className={cn(
                "border border-white/10 bg-white/5 mb-6 rounded-xl shrink-0 overflow-hidden relative transition-colors mx-4",
                collapsed ? "p-3 mx-2" : "p-6 mx-6"
            )}>
                <div className="relative z-10">
                    <div className={cn(
                        "mb-4 flex items-center gap-4 px-1 transition-all duration-300",
                        collapsed && "justify-center px-0 mb-3"
                    )}>
                        <div className="relative group/avatar">
                            <div className={cn(
                                "rounded-xl bg-white/10 border border-white/10 flex items-center justify-center font-bold text-white shadow-sm uppercase",
                                collapsed ? "h-11 w-11 text-sm" : "h-12 w-12 text-base"
                            )}>
                                {user?.fullName?.charAt(0) || "A"}
                            </div>
                        </div>
                        <div className={cn(
                            "flex-1 min-w-0 transition-all duration-500",
                            collapsed ? "w-0 opacity-0 overflow-hidden" : "w-auto opacity-100"
                        )}>
                            <p className="text-sm font-semibold text-white truncate leading-none">{user?.fullName}</p>
                            <p className="text-[12px] text-[#94a3b8] truncate mt-1">{user?.role}</p>
                        </div>
                    </div>

                    <SidebarLogout
                        onClick={async () => {
                            if (onItemClick) onItemClick()
                            try {
                                await api.post("/auth/logout")
                            } catch (e) { }
                            logout()
                            // Force redirect to login page based on origin portal
                            if (typeof window !== 'undefined') {
                                const isStaffRoute = pathname?.includes('/staff') || pathname?.includes('my-schedule')
                                window.location.replace(`/${agencySlug}/${isStaffRoute ? 'staff-login' : 'login'}`)
                            }
                        }}
                        collapsed={collapsed}
                        className="h-11 text-[14px] font-black uppercase tracking-widest italic bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-lg shadow-red-500/5"
                    />
                </div>
            </div>
        </div>
    )
}




