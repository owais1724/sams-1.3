"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Shield, LogOut, LayoutDashboard } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/store/authStore"
import api from "@/lib/api"

const navItems = [
    { name: "Platform Control", href: "/admin/dashboard", icon: LayoutDashboard },
]

export function AdminSidebar() {
    const pathname = usePathname()
    const logout = useAuthStore(state => state.logout)

    return (
        <div className="flex h-full w-full flex-col bg-[#0f172a] text-slate-300 border-r border-slate-800 font-outfit">
            <div className="flex h-16 items-center px-6 border-b border-slate-800">
                <h1 className="text-xl font-bold text-white tracking-widest uppercase">SAMS Admin</h1>
            </div>
            <div className="flex-1 overflow-y-auto py-6 px-3">
                <nav className="space-y-1">
                    {navItems.map((item) => (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-all",
                                pathname === item.href
                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                                    : "hover:bg-slate-800 hover:text-white"
                            )}
                        >
                            <item.icon className="mr-3 h-5 w-5" />
                            {item.name}
                        </Link>
                    ))}
                </nav>
            </div>
            <div className="border-t border-slate-800 p-4">
                <button
                    onClick={async () => {
                        try {
                            await api.post("/auth/logout")
                        } catch (e) {
                            console.error("Server logout failed", e)
                        }
                        logout()
                        window.location.replace('/')
                    }}
                    className="flex w-full items-center rounded-lg px-4 py-3 text-sm font-semibold text-slate-400 hover:bg-slate-800 hover:text-white transition-all active:scale-[0.98]"
                >
                    <LogOut className="mr-3 h-5 w-5" />
                    Sign Out
                </button>
            </div>
        </div>
    )
}
