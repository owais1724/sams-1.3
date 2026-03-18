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
            <div className="h-screen w-screen flex items-center justify-center bg-[var(--background)] font-inter">
                <div className="flex flex-col items-center gap-6">
                    <div className="h-12 w-12 border-t-2 border-r-2 border-primary rounded-full animate-spin"></div>
                    <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider animate-pulse">Loading admin portal...</p>
                </div>
            </div>
        )
    }

    if (isLoginPage) {
        return <>{children}</>
    }

    return (
        <div className="flex h-screen bg-[var(--background)] font-inter p-2 sm:p-4 overflow-hidden selection:bg-primary/30">
            {/* Unified Container — sidebar + content as one panel */}
            <div className="flex flex-1 h-full rounded-2xl sm:rounded-[28px] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.1)] border border-border bg-white">
                {/* Desktop Sidebar */}
                <div className={`hidden lg:flex shrink-0 z-20 transition-all duration-300 ${sidebarCollapsed ? 'w-24' : 'w-[22rem]'}`}>
                    <AdminSidebar collapsed={sidebarCollapsed} onToggleCollapse={toggleSidebarCollapse} />
                </div>

                <div className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--background)]">
                {/* Mobile Header - Elevated */}
                <header className="lg:hidden flex items-center justify-between px-4 sm:px-6 h-16 sm:h-20 bg-white text-slate-900 border-b border-border shrink-0 z-30">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-cyan-50 border border-cyan-100 rounded-xl flex items-center justify-center">
                            <ShieldCheck className="h-5 w-5 text-[#06b6d4]" />
                        </div>
                        <div>
                            <h1 className="text-sm font-semibold leading-none">SAMS GLOBAL</h1>
                            <span className="text-[12px] text-slate-500 mt-1 block">Strategic Administration</span>
                        </div>
                    </div>
                    <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10 border border-border bg-white hover:bg-slate-50 text-slate-700">
                                <Menu className="h-6 w-6" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="p-0 border-none w-[85vw] max-w-xs bg-[var(--sidebar)] overflow-hidden">
                            <SheetTitle className="sr-only">Admin Navigation Menu</SheetTitle>
                            <AdminSidebar onItemClick={() => setSidebarOpen(false)} />
                        </SheetContent>
                    </Sheet>
                </header>

                <main className="flex-1 overflow-y-auto scrollbar-hide relative">
                    <div className="p-4 sm:p-6 md:p-10 lg:p-12">
                        {children}
                    </div>
                </main>
            </div>
            </div>
        </div>
    )
}
