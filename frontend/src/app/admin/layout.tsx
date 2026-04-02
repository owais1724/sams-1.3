"use client"

import { AdminSidebar } from "@/components/admin/AdminSidebar"
import { usePathname } from "next/navigation"
import { useAuthStore } from "@/store/authStore"
import { useEffect, useState } from "react"
import api from "@/lib/api"
import { Menu, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { toast } from "sonner"
import {
    buildSessionUserKey,
    getActiveSessionUserKey,
    getPortalLoginPath,
    getTabSessionUserKey,
    hasSessionConflict,
    PORTAL_TYPE_KEY,
} from "@/lib/authSession"

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const { login, clearLocalAuth } = useAuthStore()
    const [verifying, setVerifying] = useState(true)
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

    // Load sidebar state from localStorage after mount to avoid hydration mismatch
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('sams_admin_sidebar_collapsed')
            if (saved === 'true') {
                setSidebarCollapsed(true)
            }
        }
    }, [])

    const toggleSidebarCollapse = () => {
        setSidebarCollapsed(prev => {
            const next = !prev
            if (typeof window !== 'undefined') {
                localStorage.setItem('sams_admin_sidebar_collapsed', String(next))
            }
            return next
        })
    }

    const isLoginPage = pathname?.split('/').some(segment => segment.toLowerCase() === 'login')
    const tabPortalType = typeof window !== 'undefined' ? sessionStorage.getItem(PORTAL_TYPE_KEY) : null
    const expectedUserKey = typeof window !== 'undefined' ? getTabSessionUserKey() : null
    const activeUserKey = typeof window !== 'undefined' ? getActiveSessionUserKey() : null
    const hasTabSessionMismatch = !isLoginPage && hasSessionConflict(expectedUserKey, activeUserKey)

    const forceLogout = async (targetPath = '/admin/login') => {
        if (typeof window === 'undefined') {
            return
        }

        try {
            await api.post('/auth/logout')
        } catch {
            // Ignore logout API failures and still clear local auth state.
        }

        clearLocalAuth()
        window.location.replace(targetPath)
    }

    useEffect(() => {
        let isActive = true;

        if (hasTabSessionMismatch) {
            toast.error("Session changed in another tab. Please sign in again.");
            void forceLogout(getPortalLoginPath(pathname || "/", null, tabPortalType));
            return;
        }

        // ── Per-tab Session Isolation ──
        // sessionStorage is per-tab. If this tab doesn't have the 'admin' flag,
        // we block automatic cookie-based login to prevent session leakage across tabs
        // when a URL is copy-pasted.
        if (!isLoginPage && tabPortalType !== 'admin') {
            void forceLogout('/admin/login');
            return;
        }

        const verifySession = async () => {
            setVerifying(true);
            try {
                const response = await api.get('/auth/me');
                const currentStoredUser = useAuthStore.getState().user;
                const currentTabUserKey = buildSessionUserKey(currentStoredUser);
                const responseUserKey = buildSessionUserKey(response.data);
                const hasStoredUserMismatch = Boolean(
                    currentTabUserKey &&
                    responseUserKey &&
                    currentTabUserKey !== responseUserKey
                );

                if (hasStoredUserMismatch) {
                    toast.error("Session conflict detected. Please sign in again with appropriate credentials.");
                    isActive = false;
                    void forceLogout('/admin/login');
                    return;
                }

                if (response.data.role !== 'Super Admin') {
                    // Explicitly clear session if role mismatch
                    toast.error("Unauthorized access. You have been logged out.");
                    isActive = false;
                    void forceLogout('/admin/login');
                    return;
                }

                if (isActive) {
                    login(response.data);
                }
            } catch (error) {
                console.error("Session verification failed", error);
                isActive = false;
                if (!isLoginPage) {
                    void forceLogout('/admin/login');
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
    }, [hasTabSessionMismatch, isLoginPage, login, pathname, tabPortalType]);

    if (verifying || hasTabSessionMismatch) {
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
        <div className="flex min-h-screen w-full bg-[var(--background)] font-inter overflow-hidden selection:bg-primary/30">
            {/* Unified Container — sidebar + content as one panel */}
            <div className="flex flex-1 min-h-screen w-full overflow-hidden bg-white">
                {/* Desktop Sidebar */}
                <div className={`hidden lg:flex sticky top-0 self-start h-screen shrink-0 z-20 transition-all duration-300 border-r border-slate-200 ${sidebarCollapsed ? 'w-24' : 'w-[22rem]'}`}>
                    <AdminSidebar collapsed={sidebarCollapsed} onToggleCollapse={toggleSidebarCollapse} />
                </div>

                <div className="flex-1 flex flex-col min-h-screen overflow-hidden bg-[var(--background)]">
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
                    <div className="h-full w-full p-4 sm:p-6 md:p-8">
                        {children}
                    </div>
                </main>
            </div>
            </div>
        </div>
    )
}
