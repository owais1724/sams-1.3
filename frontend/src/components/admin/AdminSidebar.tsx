"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ShieldCheck, LayoutDashboard, Building, Users, Key, Wallet, Shield, X, ChevronsLeft, ChevronsRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/store/authStore"
import api from "@/lib/api"
import { SidebarItem, SidebarLogout, SidebarSectionLabel } from "@/components/ui/design-system"
import { Badge } from "@/components/ui/badge"

const navItems = [
    { name: "Platform Control", href: "/admin/dashboard", icon: LayoutDashboard },
]

interface AdminSidebarProps {
    onItemClick?: () => void
    collapsed?: boolean
    onToggleCollapse?: () => void
}

export function AdminSidebar({ onItemClick, collapsed = false, onToggleCollapse }: AdminSidebarProps) {
    const pathname = usePathname()
    const { user, logout } = useAuthStore()

    return (
        <div className="flex h-full w-full flex-col bg-[var(--sidebar)] text-white relative z-20 font-inter">
            {/* Logo Section */}
            <div className={cn(
                "flex h-24 items-center justify-between border-b border-white/10 gap-3 relative overflow-hidden group shrink-0 transition-all duration-300",
                collapsed ? "px-3" : "px-8"
            )}>
                <div className={cn("flex items-center gap-4 relative z-10 w-full", collapsed && "justify-center")}>
                    <div className="h-11 w-11 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center shadow-sm shrink-0">
                        <ShieldCheck className="h-6 w-6 text-[#0d9488]" />
                    </div>
                    <div className={cn(
                        "flex-1 min-w-0 transition-all duration-300",
                        collapsed ? "w-0 opacity-0 overflow-hidden" : "w-auto opacity-100"
                    )}>
                        <h1 className="text-lg font-bold text-white leading-tight truncate">SAMS GLOBAL</h1>
                        <p className="text-[12px] text-[var(--sidebar-foreground)] truncate">Strategic Administration</p>
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
                        title={collapsed ? "Expand Command Hub" : "Retract Command Hub"}
                    >
                        {collapsed ? <ChevronsRight className="h-5 w-5" /> : <ChevronsLeft className="h-5 w-5 transition-transform group-hover:-translate-x-0.5" />}
                    </button>
                </div>
            )}

            {/* Navigation */}
            <div className={cn(
                "flex-1 overflow-y-auto space-y-12 scrollbar-hide transition-all duration-300",
                onToggleCollapse ? "pt-4" : "pt-10",
                collapsed ? "px-3" : "px-6"
            )}>
                <div>
                    <SidebarSectionLabel collapsed={collapsed}>Strategic Control</SidebarSectionLabel>
                    <nav className="space-y-3 mt-4">
                        {navItems.map((item) => (
                            <SidebarItem
                                key={item.name}
                                name={item.name}
                                href={item.href}
                                icon={item.icon}
                                isActive={pathname === item.href}
                                onClick={onItemClick}
                                collapsed={collapsed}
                                className="transition-colors"
                            />
                        ))}
                    </nav>
                </div>
            </div>

            {/* User Profile Section */}
            <div className={cn(
                "border border-white/10 bg-white/5 mb-6 rounded-xl shrink-0 overflow-hidden relative transition-colors",
                collapsed ? "mx-3 p-4" : "mx-6 p-6"
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
                                {user?.fullName?.charAt(0) || "S"}
                            </div>
                        </div>
                        <div className={cn(
                            "flex-1 min-w-0 transition-all duration-500",
                            collapsed ? "w-0 opacity-0 overflow-hidden" : "w-auto opacity-100"
                        )}>
                            <p className="text-sm font-semibold text-white truncate leading-none">Super Admin</p>
                            <p className="text-[12px] text-[var(--sidebar-foreground)] truncate mt-1">Administrator</p>
                        </div>
                    </div>

                    <SidebarLogout
                        onClick={async () => {
                            if (onItemClick) onItemClick()
                            try {
                                await api.post("/auth/logout")
                            } catch (e) { }
                            logout()
                            window.location.replace('/admin/login')
                        }}
                        collapsed={collapsed}
                        className="h-11 text-[14px] font-medium bg-white/5 border border-white/10 text-white/90 hover:bg-white/10"
                    />
                </div>
            </div>
        </div>
    )
}
