"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Shield, LayoutDashboard } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/store/authStore"
import api from "@/lib/api"
import { SidebarItem, SidebarLogout } from "@/components/ui/design-system"

const navItems = [
    { name: "Platform Control", href: "/admin/dashboard", icon: LayoutDashboard },
]

export function AdminSidebar({ onItemClick }: { onItemClick?: () => void }) {
    const pathname = usePathname()
    const logout = useAuthStore(state => state.logout)

    return (
        <div className="flex h-full w-full flex-col bg-gradient-to-b from-[#0f172a] to-[#020617] text-slate-300 border-r border-slate-800 font-outfit shadow-[10px_0_50px_-5px_rgba(0,0,0,0.5)]">
            {/* Logo Section */}
            <div className="flex h-20 items-center px-8 border-b border-white/[0.03] gap-4 relative overflow-hidden group">
                <div className="absolute inset-0 bg-white/[0.01] transform -skew-y-12 translate-y-12 group-hover:translate-y-10 transition-transform duration-700" />
                <div className="h-10 w-10 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-xl flex items-center justify-center shadow-xl shadow-blue-500/20 transform -rotate-3 group-hover:rotate-0 transition-transform">
                    <Shield className="h-6 w-6 text-white" />
                </div>
                <div className="relative z-10">
                    <h1 className="text-lg font-black tracking-[0.2em] text-white leading-none">SENTINEL</h1>
                    <span className="text-[9px] text-blue-400 font-black uppercase tracking-[0.2em] mt-1 block opacity-80">Platform Master</span>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto pt-10 px-5 space-y-1 scrollbar-hide">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500/60 px-5 mb-4">Core Control</p>
                <nav className="space-y-2 mt-4">
                    {navItems.map((item) => (
                        <SidebarItem
                            key={item.name}
                            name={item.name}
                            href={item.href}
                            icon={item.icon}
                            isActive={pathname === item.href}
                            onClick={onItemClick}
                            className="text-slate-400 hover:text-white hover:bg-white/[0.03]"
                        />
                    ))}
                </nav>
            </div>

            {/* Profile / Logout Section */}
            <div className="p-6 bg-black/20 border-t border-white/[0.03] mx-5 mb-6 rounded-[32px] shadow-inner">
                <SidebarLogout
                    onClick={async () => {
                        if (onItemClick) onItemClick()
                        try {
                            await api.post("/auth/logout")
                        } catch (e) {
                            console.error("Server logout failed", e)
                        }
                        logout()
                        window.location.replace('/')
                    }}
                    className="h-12 bg-white/[0.03] hover:bg-rose-500/10 hover:text-rose-400 text-slate-400 border border-white/[0.03] font-black uppercase tracking-widest text-[10px]"
                />
            </div>
        </div>
    )
}
