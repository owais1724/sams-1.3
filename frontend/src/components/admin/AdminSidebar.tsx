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
        <div className="flex h-full w-full flex-col bg-white border-r border-[#e2e8f0] relative z-20 font-inter">
            {/* Logo Section */}
            <div className={cn(
                "flex h-16 items-center justify-between border-b border-[#e2e8f0] gap-3 relative overflow-hidden group shrink-0 transition-all duration-300",
                collapsed ? "px-3" : "px-5"
            )}>
                <div className={cn("flex items-center gap-3 relative z-10 w-full", collapsed && "justify-center")}>
                    <div className="h-9 w-9 rounded-lg bg-[#ecfeff] border border-[#06b6d4]/20 flex items-center justify-center shadow-sm shrink-0">
                        <ShieldCheck className="h-5 w-5 text-[#06b6d4]" />
                    </div>
                    <div className={cn(
                        "flex-1 min-w-0 transition-all duration-300",
                        collapsed ? "w-0 opacity-0 overflow-hidden" : "w-auto opacity-100"
                    )}>
                        <h1 className="text-sm font-bold text-[#0f172a] leading-tight truncate">SAMS GLOBAL</h1>
                        <p className="text-[11px] text-[#64748b] truncate">Strategic Administration</p>
                    </div>
                    {onItemClick && (
                        <button
                            onClick={onItemClick}
                            className="lg:hidden relative z-20 flex items-center justify-center h-8 w-8 rounded-lg bg-[#f1f5f9] border border-[#e2e8f0] text-[#64748b] hover:text-[#0f172a] hover:bg-[#e2e8f0] transition-all shrink-0"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Collapse Toggle Button */}
            {onToggleCollapse && (
                <div className={cn("hidden lg:flex px-4 pt-3 transition-all duration-300", collapsed && "justify-center px-3")}>
                    <button
                        onClick={onToggleCollapse}
                        className="flex items-center justify-center h-8 w-8 rounded-lg bg-[#f1f5f9] border border-[#e2e8f0] text-[#64748b] hover:text-[#0f172a] hover:bg-[#e2e8f0] transition-all group"
                        title={collapsed ? "Expand Command Hub" : "Retract Command Hub"}
                    >
                        {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />}
                    </button>
                </div>
            )}

            {/* Navigation */}
            <div className={cn(
                "flex-1 overflow-y-auto space-y-8 scrollbar-hide transition-all duration-300",
                onToggleCollapse ? "pt-3" : "pt-6",
                collapsed ? "px-3" : "px-4"
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
                "border-t border-[#e2e8f0] bg-white mb-4 shrink-0 overflow-hidden relative transition-colors",
                collapsed ? "mx-2 p-3" : "mx-4 p-4"
            )}>
                <div className="relative z-10">
                    <div className={cn(
                        "mb-3 flex items-center gap-3 transition-all duration-300",
                        collapsed && "justify-center mb-2"
                    )}>
                        <div className="relative group/avatar">
                            <div className={cn(
                                "rounded-lg bg-[#ecfeff] border border-[#06b6d4]/20 flex items-center justify-center font-bold text-[#06b6d4] shadow-sm uppercase",
                                collapsed ? "h-9 w-9 text-xs" : "h-10 w-10 text-sm"
                            )}>
                                {user?.fullName?.charAt(0) || "S"}
                            </div>
                        </div>
                        <div className={cn(
                            "flex-1 min-w-0 transition-all duration-500",
                            collapsed ? "w-0 opacity-0 overflow-hidden" : "w-auto opacity-100"
                        )}>
                            <p className="text-xs font-semibold text-[#0f172a] truncate leading-none">Super Admin</p>
                            <p className="text-[11px] text-[#64748b] truncate mt-1">Administrator</p>
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
                        className="h-9 text-[12px] font-black uppercase tracking-widest italic bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-lg shadow-red-500/5"
                    />
                </div>
            </div>
        </div>
    )
}
