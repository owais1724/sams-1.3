"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ShieldCheck, LayoutDashboard, Building, Users, Key, Wallet, Shield } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/store/authStore"
import api from "@/lib/api"
import { SidebarItem, SidebarLogout, SidebarSectionLabel } from "@/components/ui/design-system"
import { Badge } from "@/components/ui/badge"

const navItems = [
    { name: "Platform Control", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Global Agencies", href: "/admin/agencies", icon: Building },
    { name: "System Integrity", href: "/admin/audit-logs", icon: Shield },
]

export function AdminSidebar({ onItemClick }: { onItemClick?: () => void }) {
    const pathname = usePathname()
    const { user, logout } = useAuthStore()

    return (
        <div className="flex h-full w-full flex-col bg-gradient-to-b from-[#0d5c56] to-[#06423d] text-white relative z-20 font-outfit shadow-[10px_0_50px_-5px_rgba(0,0,0,0.3)]">
            {/* Logo Section */}
            <div className="flex h-24 items-center px-8 border-b border-white/5 gap-4 relative overflow-hidden group shrink-0">
                <div className="absolute inset-0 bg-white/[0.02] transform skew-y-12 translate-y-12 group-hover:translate-y-10 transition-transform duration-700" />
                <div className="h-12 w-12 bg-gradient-to-tr from-[#14B8A6] to-emerald-400 rounded-2xl flex items-center justify-center shadow-xl shadow-teal-500/30 transform rotate-3 group-hover:rotate-6 transition-transform shrink-0">
                    <ShieldCheck className="h-7 w-7 text-white" />
                </div>
                <div className="relative z-10 font-outfit truncate">
                    <h1 className="text-xl font-black tracking-[0.15em] text-white leading-tight">SAMS ADMIN</h1>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[10px] text-teal-300/60 font-black uppercase tracking-[0.2em] truncate">Platform Master</span>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto pt-10 px-5 space-y-10 scrollbar-hide">
                <div>
                    <SidebarSectionLabel>Core Control</SidebarSectionLabel>
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
            <div className="p-6 bg-black/20 border-t border-white/5 mx-5 mb-8 rounded-[32px] shadow-inner shrink-0 group/profile overflow-hidden relative">
                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover/profile:opacity-100 transition-opacity" />
                <div className="relative z-10">
                    <div className="mb-5 flex items-center gap-4 px-1">
                        <div className="relative group/avatar">
                            <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-[#14B8A6] to-emerald-400 flex items-center justify-center text-base font-black shadow-xl shadow-teal-500/20 border-2 border-white/10 uppercase transition-transform group-hover/avatar:scale-105">
                                {user?.fullName?.charAt(0) || "S"}
                            </div>
                            <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-emerald-500 border-2 border-[#0d5c56] rounded-full shadow-lg" />
                        </div>
                        <div className="flex-1 min-w-0">
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
                        className="h-12 bg-white/5 hover:bg-rose-500 text-teal-100 hover:text-white border border-white/5 font-black uppercase tracking-widest text-[10px]"
                    />
                </div>
            </div>
        </div>
    )
}
