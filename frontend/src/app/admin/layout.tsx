"use client"

import { AdminSidebar } from "@/components/admin/AdminSidebar"
import { usePathname, useRouter } from "next/navigation"
import { useAuthStore } from "@/store/authStore"
import { useEffect, useState } from "react"
import api from "@/lib/api"
import { Menu, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const router = useRouter()
    const { user, isAuthenticated, logout, login } = useAuthStore()
    const [verifying, setVerifying] = useState(true)
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('sams_admin_sidebar_collapsed') === 'true'
        }
        return false
    })

    const toggleSidebarCollapse = () => {
        setSidebarCollapsed(prev => {
            const next = !prev
            localStorage.setItem('sams_admin_sidebar_collapsed', String(next))
            return next
        })
    }

    const isLoginPage = pathname?.split('/').some(segment => segment.toLowerCase() === 'login')

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
            <div className="h-screen w-screen flex items-center justify-center bg-black font-inter">
                <div className="flex flex-col items-center gap-6">
                    <div className="h-16 w-16 border-t-2 border-r-2 border-primary rounded-full animate-spin shadow-[0_0_20px_rgba(255,184,0,0.2)]"></div>
                    <p className="text-[10px] font-black text-primary/60 uppercase tracking-[0.5em] animate-pulse">Initializing Hypercore...</p>
                </div>
            </div>
        )
    }

    if (isLoginPage) {
        return <>{children}</>
    }

    return (
        <div className="flex h-screen bg-black font-inter p-2 sm:p-4 overflow-hidden selection:bg-primary/30">
            {/* Unified Container — sidebar + content as one panel */}
            <div className="flex flex-1 h-full rounded-[40px] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-white/5 bg-card/20 backdrop-blur-3xl">
                {/* Desktop Sidebar */}
                <div className={`hidden lg:flex shrink-0 z-20 transition-all duration-300 ${sidebarCollapsed ? 'w-24' : 'w-[22rem]'}`}>
                    <AdminSidebar collapsed={sidebarCollapsed} onToggleCollapse={toggleSidebarCollapse} />
                </div>

                <div className="flex-1 flex flex-col h-full overflow-hidden bg-black/40">
                {/* Mobile Header - Elevated */}
                <header className="lg:hidden flex items-center justify-between px-6 h-20 bg-black text-white rounded-3xl mx-2 mt-2 mb-2 sm:mx-4 sm:mt-4 sm:mb-4 shrink-0 z-30 shadow-2xl border border-white/5">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-gradient-to-tr from-[#D9A75B] via-[#FFB800] to-[#FFD700] rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(255,184,0,0.3)]">
                            <ShieldCheck className="h-5 w-5 text-black" />
                        </div>
                        <div>
                            <h1 className="text-sm font-black tracking-[0.2em] uppercase leading-none italic">SAMS <span className="text-primary not-italic">GLOBAL</span></h1>
                            <span className="text-[9px] text-primary/60 font-black uppercase tracking-[0.3em] mt-1.5 block">Infrastructure Control</span>
                        </div>
                    </div>
                    <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-white hover:bg-white/5 rounded-2xl h-12 w-12 border border-white/10 bg-white/5 transition-all">
                                <Menu className="h-6 w-6" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="p-0 border-none w-[85vw] max-w-xs bg-black overflow-hidden rounded-r-[48px]">
                            <SheetTitle className="sr-only">Admin Navigation Menu</SheetTitle>
                            <AdminSidebar onItemClick={() => setSidebarOpen(false)} />
                        </SheetContent>
                    </Sheet>
                </header>

                <main className="flex-1 overflow-y-auto scrollbar-hide relative">
                    <div className="p-6 sm:p-10 md:p-12 lg:p-14">
                        {children}
                    </div>
                </main>
            </div>
            </div>
        </div>
    )
}
