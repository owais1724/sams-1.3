"use client"

import { AdminSidebar } from "@/components/admin/AdminSidebar"
import { usePathname, useRouter } from "next/navigation"
import { useAuthStore } from "@/store/authStore"
import { useEffect, useState } from "react"
import api from "@/lib/api"
import { Menu, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const router = useRouter()
    const { user, isAuthenticated, logout, login } = useAuthStore()
    const [verifying, setVerifying] = useState(true)

    const isLoginPage = pathname === "/admin/login"

    useEffect(() => {
        const verifySession = async () => {
            setVerifying(true);
            try {
                // Always check the server on mount or pageshow, even if we think we aren't authenticated locally
                // this ensures that if a cookie is present but the store is empty, we sync up
                // and if the store thinks we are authenticated but the cookie is gone, we logout.
                const response = await api.get('/auth/me');
                if (response.data.role !== 'Super Admin') {
                    throw new Error('Not a super admin');
                }
                login(response.data);
            } catch (error) {
                console.error("Session verification failed", error);
                logout();
                if (!isLoginPage) {
                    router.push('/admin/login');
                }
            } finally {
                setVerifying(false);
            }
        };

        const handlePageShow = (event: PageTransitionEvent) => {
            if (event.persisted) {
                // If the page was restored from bfcache, force a re-verification
                verifySession();
            }
        };

        if (isLoginPage) {
            setVerifying(false);
        } else {
            verifySession();
        }

        window.addEventListener('pageshow', handlePageShow);
        return () => window.removeEventListener('pageshow', handlePageShow);
    }, [isLoginPage, router, logout, login]);

    if (verifying) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        )
    }

    if (isLoginPage) {
        return <>{children}</>
    }

    return (
        <div className="flex h-screen bg-gray-50 font-outfit overflow-hidden">
            {/* Desktop Sidebar */}
            <div className="hidden lg:flex w-64 shrink-0 border-r border-slate-800 shadow-2xl z-20">
                <AdminSidebar />
            </div>

            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* Mobile Header */}
                <header className="lg:hidden flex items-center justify-between px-6 h-16 bg-[#0f172a] text-white border-b border-slate-800 shrink-0 z-30 shadow-md">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <Shield className="h-5 w-5 text-white" />
                        </div>
                        <h1 className="text-sm font-black tracking-tight uppercase">SAMS Admin</h1>
                    </div>
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-xl">
                                <Menu className="h-6 w-6" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="p-0 border-none w-64 bg-[#0f172a]">
                            <AdminSidebar />
                        </SheetContent>
                    </Sheet>
                </header>

                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    {children}
                </main>
            </div>
        </div>
    )
}
