"use client"

import { AdminSidebar } from "@/components/admin/AdminSidebar"
import { usePathname, useRouter } from "next/navigation"
import { useAuthStore } from "@/store/authStore"
import { useEffect, useState } from "react"
import api from "@/lib/api"
import { Menu, ShieldCheck } from "lucide-react"
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

    const isLoginPage = pathname?.split('/').some(segment => segment.toLowerCase() === 'login')

    const [sidebarOpen, setSidebarOpen] = useState(false)

    useEffect(() => {
        let isActive = true;

        // ── Per-tab Session Isolation ──
        // sessionStorage is per-tab. If this tab doesn't have the 'admin' flag,
        // we block automatic cookie-based login to prevent session leakage across tabs
        // when a URL is copy-pasted.
        const tabPortalType = typeof window !== 'undefined' ? sessionStorage.getItem('sams_portal_type') : null;
        if (!isLoginPage && tabPortalType !== 'admin') {
            logout();
            window.location.href = '/admin/login';
            return;
        }

        const verifySession = async () => {
            setVerifying(true);
            try {
                const response = await api.get('/auth/me');
                if (response.data.role !== 'Super Admin') {
                    // Explicitly clear session if role mismatch
                    isActive = false;
                    await api.post('/auth/logout').catch(() => { });
                    logout();
                    window.location.href = '/admin/login';
                    return;
                }

                if (isActive) {
                    login(response.data);
                }
            } catch (error) {
                console.error("Session verification failed", error);
                isActive = false;
                logout();
                if (!isLoginPage) {
                    window.location.href = '/admin/login';
                }
            } finally {
                if (isActive) {
                    setVerifying(false);
                }
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
        <div className="flex h-screen bg-slate-100 font-outfit p-4 gap-4 overflow-hidden">
            {/* Desktop Sidebar - The Floating Island */}
            <div className="hidden lg:flex w-76 shrink-0 z-20">
                <div className="w-full h-full rounded-[40px] overflow-hidden shadow-[20px_0_60px_-15px_rgba(0,0,0,0.1)]">
                    <AdminSidebar />
                </div>
            </div>

            <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Mobile Header - Elevated */}
                <header className="lg:hidden flex items-center justify-between px-6 h-20 bg-[#0d5c56] text-white rounded-[32px] mb-4 shrink-0 z-30 shadow-xl shadow-black/10">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-gradient-to-tr from-[#14B8A6] to-emerald-400 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/20">
                            <ShieldCheck className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-sm font-black tracking-[0.1em] uppercase leading-none">Sentinel</h1>
                            <span className="text-[9px] text-teal-300/60 font-black uppercase tracking-widest mt-1 block">Platform Admin</span>
                        </div>
                    </div>
                    <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-2xl h-12 w-12 border border-white/5 bg-white/5">
                                <Menu className="h-5 w-5" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="p-0 border-none w-[85vw] max-w-xs bg-[#0d5c56] overflow-hidden rounded-r-[40px]">
                            <AdminSidebar onItemClick={() => setSidebarOpen(false)} />
                        </SheetContent>
                    </Sheet>
                </header>

                <main className="flex-1 overflow-y-auto bg-white rounded-[40px] shadow-sm border border-slate-200/50">
                    <div className="p-6 md:p-10 lg:p-12">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    )
}
