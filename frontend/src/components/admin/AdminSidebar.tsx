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
        <div className="flex h-full w-full flex-col bg-black text-white relative z-20 font-inter">
            {/* Logo Section */}
            <div className={cn(
                "flex h-28 items-center justify-between border-b border-white/5 gap-3 relative overflow-hidden group shrink-0 transition-all duration-300",
                collapsed ? "px-3" : "px-8"
            )}>
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
                <div className={cn("flex items-center gap-4 relative z-10 w-full", collapsed && "justify-center")}>
                    <div className="h-12 w-12 bg-gradient-to-tr from-[#D9A75B] via-[#FFB800] to-[#FFD700] rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(255,184,0,0.2)] transform -rotate-3 group-hover:rotate-0 transition-all duration-500 shrink-0">
                        <ShieldCheck className="h-7 w-7 text-black" />
                    </div>
                    <div className={cn(
                        "flex-1 min-w-0 transition-all duration-300",
                        collapsed ? "w-0 opacity-0 overflow-hidden" : "w-auto opacity-100"
                    )}>
                        <h1 className="text-xl font-black tracking-[0.2em] text-white leading-tight truncate uppercase italic">SAMS <span className="text-primary not-italic">GLOBAL</span></h1>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_#FFB800]" />
                            <span className="text-[10px] text-primary/80 font-black uppercase tracking-[0.3em] truncate">Infrastructure Core</span>
                        </div>
                    </div>
                    {onItemClick && (
                        <button
                            onClick={onItemClick}
                            className="lg:hidden relative z-20 flex items-center justify-center h-10 w-10 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all shrink-0"
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
                        className="flex items-center justify-center h-9 w-9 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-primary hover:bg-white/10 hover:border-primary/20 transition-all group"
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
                    <SidebarSectionLabel collapsed={collapsed} className="text-primary/50 text-[10px] tracking-[0.4em]">Strategic Control</SidebarSectionLabel>
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
                                className="hover:bg-primary/5 transition-all duration-300"
                            />
                        ))}
                    </nav>
                </div>
            </div>

            {/* User Profile Section */}
            <div className={cn(
                "bg-black/40 backdrop-blur-3xl border border-white/5 mb-10 rounded-[40px] shadow-2xl shrink-0 group/profile overflow-hidden relative transition-all duration-500",
                collapsed ? "mx-3 p-4" : "mx-6 p-8"
            )}>
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-transparent opacity-0 group-hover/profile:opacity-100 transition-opacity duration-700" />
                <div className="relative z-10">
                    <div className={cn(
                        "mb-6 flex items-center gap-5 px-1 transition-all duration-300",
                        collapsed && "justify-center px-0 mb-4"
                    )}>
                        <div className="relative group/avatar">
                            <div className={cn(
                                "rounded-2xl bg-gradient-to-br from-[#D9A75B] to-[#FFB800] flex items-center justify-center font-black shadow-[0_0_20px_rgba(255,184,0,0.2)] border border-white/20 uppercase transition-all duration-500 group-hover/avatar:scale-110 group-hover/avatar:rotate-3 text-black",
                                collapsed ? "h-12 w-12 text-sm" : "h-14 w-14 text-xl"
                            )}>
                                {user?.fullName?.charAt(0) || "S"}
                            </div>
                            <div className="absolute -bottom-1 -right-1 h-5 w-5 bg-emerald-500 border-4 border-black rounded-full shadow-[0_0_10px_rgba(16,185,129,0.4)]" />
                        </div>
                        <div className={cn(
                            "flex-1 min-w-0 transition-all duration-500",
                            collapsed ? "w-0 opacity-0 overflow-hidden" : "w-auto opacity-100"
                        )}>
                            <p className="text-base font-black text-white truncate tracking-wide leading-none mb-2 italic">ROOT_SYS</p>
                            <div className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 px-3 py-1 rounded-full shadow-inner">
                                <Shield className="h-2.5 w-2.5 text-primary" />
                                <span className="text-[9px] text-primary font-black uppercase tracking-[0.2em]">Authority LV_9</span>
                            </div>
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
                        className="h-14 bg-white/5 hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 border border-white/5 hover:border-rose-500/20 font-black uppercase tracking-[0.3em] text-[10px] rounded-2xl transition-all duration-300"
                    />
                </div>
            </div>
        </div>
    )
}
