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
        <div className="flex h-full w-full flex-col bg-gradient-to-b from-[#0d5c56] to-[#06423d] text-white relative z-20 font-outfit">
            {/* Logo Section */}
            <div className={cn(
                "flex h-24 items-center justify-between border-b border-white/5 gap-3 relative overflow-hidden group shrink-0 transition-all duration-300",
                collapsed ? "px-3" : "px-6 lg:px-8"
            )}>
                <div className="absolute inset-0 bg-white/[0.02] transform skew-y-12 translate-y-12 group-hover:translate-y-10 transition-transform duration-700" />
                <div className={cn("flex items-center gap-3 relative z-10 w-full", collapsed && "justify-center")}>
                    <div className="h-10 w-10 lg:h-12 lg:w-12 bg-gradient-to-tr from-[#14B8A6] to-emerald-400 rounded-xl lg:rounded-2xl flex items-center justify-center shadow-xl shadow-teal-500/30 transform rotate-3 group-hover:rotate-6 transition-transform shrink-0">
                        <ShieldCheck className="h-6 w-6 lg:h-7 lg:w-7 text-white" />
                    </div>
                    <div className={cn(
                        "font-outfit flex-1 min-w-0 transition-all duration-300",
                        collapsed ? "w-0 opacity-0 overflow-hidden" : "w-auto opacity-100"
                    )}>
                        <h1 className="text-lg lg:text-xl font-black tracking-[0.15em] text-white leading-tight truncate">SAMS GLOBAL</h1>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <div className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-[9px] text-teal-300/60 font-black uppercase tracking-[0.2em] truncate">System Infrastructure</span>
                        </div>
                    </div>
                    {onItemClick && (
                        <button
                            onClick={onItemClick}
                            className="lg:hidden relative z-20 flex items-center justify-center h-8 w-8 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all shrink-0 ml-2"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Collapse Toggle Button */}
            {onToggleCollapse && (
                <div className={cn("hidden lg:flex px-5 pt-4 transition-all duration-300", collapsed && "justify-center px-3")}>
                    <button
                        onClick={onToggleCollapse}
                        className="flex items-center justify-center h-8 w-8 rounded-lg bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all"
                        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                    >
                        {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
                    </button>
                </div>
            )}

            {/* Navigation */}
            <div className={cn(
                "flex-1 overflow-y-auto space-y-10 scrollbar-hide transition-all duration-300",
                onToggleCollapse ? "pt-4" : "pt-10",
                collapsed ? "px-2" : "px-5"
            )}>
                <div>
                    <SidebarSectionLabel collapsed={collapsed}>Core Control</SidebarSectionLabel>
                    <nav className="space-y-2 mt-4">
                        {navItems.map((item) => (
                            <SidebarItem
                                key={item.name}
                                name={item.name}
                                href={item.href}
                                icon={item.icon}
                                isActive={pathname === item.href}
                                onClick={onItemClick}
                                collapsed={collapsed}
                                className="text-teal-100/60 hover:text-white hover:bg-white/5"
                            />
                        ))}
                    </nav>
                </div>
            </div>

            {/* User Profile Section */}
            <div className={cn(
                "bg-black/20 border-t border-white/5 mb-8 rounded-[32px] shadow-inner shrink-0 group/profile overflow-hidden relative transition-all duration-300",
                collapsed ? "mx-2 p-3" : "mx-5 p-6"
            )}>
                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover/profile:opacity-100 transition-opacity" />
                <div className="relative z-10">
                    <div className={cn(
                        "mb-5 flex items-center gap-4 px-1 transition-all duration-300",
                        collapsed && "justify-center px-0 mb-3"
                    )}>
                        <div className="relative group/avatar">
                            <div className={cn(
                                "rounded-2xl bg-gradient-to-tr from-[#14B8A6] to-emerald-400 flex items-center justify-center font-black shadow-xl shadow-teal-500/20 border-2 border-white/10 uppercase transition-all group-hover/avatar:scale-105",
                                collapsed ? "h-10 w-10 text-sm" : "h-12 w-12 text-base"
                            )}>
                                {user?.fullName?.charAt(0) || "S"}
                            </div>
                            <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-emerald-500 border-2 border-[#0d5c56] rounded-full shadow-lg" />
                        </div>
                        <div className={cn(
                            "flex-1 min-w-0 transition-all duration-300",
                            collapsed ? "w-0 opacity-0 overflow-hidden" : "w-auto opacity-100"
                        )}>
                            <p className="text-sm font-black text-white truncate leading-none mb-1.5">{user?.fullName || 'Super Admin'}</p>
                            <Badge className="bg-white/10 text-teal-300 border-white/5 text-[8px] font-black uppercase tracking-widest px-2 py-0.5">
                                Root Authority
                            </Badge>
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
                        className="h-12 bg-white/5 hover:bg-rose-500 text-teal-100 hover:text-white border border-white/5 font-black uppercase tracking-widest text-[10px]"
                    />
                </div>
            </div>
        </div>
    )
}
