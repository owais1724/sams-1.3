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

export function AdminSidebar() {
    const pathname = usePathname()
    const logout = useAuthStore(state => state.logout)

    return (
        <div className="flex h-full w-full flex-col bg-[#0f172a] text-slate-300 border-r border-slate-800 font-outfit">
            <div className="flex h-16 items-center px-6 border-b border-slate-800 gap-3">
                <div className="h-9 w-9 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Shield className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-lg font-bold text-white tracking-widest uppercase">Admin</h1>
            </div>
            <div className="flex-1 overflow-y-auto py-6 px-3">
                <nav className="space-y-1">
                    {navItems.map((item) => (
                        <SidebarItem
                            key={item.name}
                            name={item.name}
                            href={item.href}
                            icon={item.icon}
                            isActive={pathname === item.href}
                            className="text-slate-400 hover:text-white"
                        />
                    ))}
                </nav>
            </div>
            <div className="border-t border-slate-800 p-4">
                <SidebarLogout
                    onClick={async () => {
                        try {
                            await api.post("/auth/logout")
                        } catch (e) {
                            console.error("Server logout failed", e)
                        }
                        logout()
                        window.location.replace('/')
                    }}
                />
            </div>
        </div>
    )
}
