"use client"

import { AgencySidebar } from "@/components/agency/AgencySidebar"
import { usePathname, useRouter, useParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { useAuthStore } from "@/store/authStore"
import { useEffect, useState } from "react"
import api from "@/lib/api"
import { Menu, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { toast } from "sonner"

export default function AgencyLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const router = useRouter()
    const { agencySlug } = useParams()
    const { user, isAuthenticated, logout, login } = useAuthStore()
    const [verifying, setVerifying] = useState(true)
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('sams_sidebar_collapsed') === 'true'
        }
        return false
    })

    const toggleSidebarCollapse = () => {
        setSidebarCollapsed(prev => {
            const next = !prev
            localStorage.setItem('sams_sidebar_collapsed', String(next))
            return next
        })
    }

    const isLoginPage = pathname?.split('/').some(segment => segment.toLowerCase() === 'login') || pathname?.includes('staff-login')

    useEffect(() => {
        let isActive = true;

        // ── Per-tab Session Isolation ──
        // sessionStorage is per-tab. If this tab doesn't have the 'agency' flag,
        // we block automatic cookie-based login to prevent session leakage across tabs
        // when a URL is copy-pasted.
        const tabPortalType = typeof window !== 'undefined' ? sessionStorage.getItem('sams_portal_type') : null;
        if (!isLoginPage && tabPortalType !== 'agency') {
            logout();
            if (pathname?.includes('/staff')) {
                window.location.href = `/${agencySlug}/staff-login`;
            } else {
                window.location.href = `/${agencySlug}/login`;
            }
            return;
        }

        const verifySession = async () => {
            setVerifying(true);
            try {
                const response = await api.get('/auth/me');
                const userData = response.data;

                // Strict boundary check: User must belong to this specific agency.
                // Super Admins are explicitly NOT allowed in the Agency portal to maintain strict RBAC.
                // Only allow Agency Admin and Supervisor roles
                const allowedRoles = ['Agency Admin', 'Supervisor'];
                const hasCorrectRole = allowedRoles.includes(userData.role);
                
                if (userData.role === 'Super Admin' || userData.agencySlug !== agencySlug || !hasCorrectRole) {
                    console.warn(`Access denied. Role: ${userData.role}, Agency: ${userData.agencySlug}`);
                    toast.error("Unauthorized access. You have been logged out.");
                    // Force hard redirect immediately and stop rendering
                    isActive = false;
                    await api.post('/auth/logout').catch(() => { });
                    logout();
                    if (!isLoginPage) {
                        window.location.href = `/${agencySlug}/login`;
                    }
                    return;
                }

                if (isActive) {
                    login(userData);
                }
            } catch (error) {
                console.error("Agency session verification failed", error);
                isActive = false;
                logout();
                if (!isLoginPage) {
                    if (pathname?.includes('/staff')) {
                        window.location.href = `/${agencySlug}/staff-login`;
                    } else {
                        window.location.href = `/${agencySlug}/login`;
                    }
                }
            } finally {
                if (isActive) {
                    setVerifying(false);
                }
            }
        };


        const handlePageShow = (event: PageTransitionEvent) => {
            if (event.persisted) {
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
    }, [isLoginPage, router, logout, login, agencySlug, pathname]);

    if (verifying) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-[var(--background)]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#06b6d4]"></div>
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
                <div className={`hidden lg:flex shrink-0 z-20 transition-all duration-300 border-r border-slate-200 ${sidebarCollapsed ? 'w-20' : 'w-76'}`}>
                    <AgencySidebar collapsed={sidebarCollapsed} onToggleCollapse={toggleSidebarCollapse} />
                </div>

                <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
                {/* Mobile Header - Elevated */}
                <header className="lg:hidden flex items-center justify-between px-4 sm:px-6 h-16 sm:h-20 bg-white text-slate-900 border-b border-border shrink-0 z-30">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="h-10 w-10 bg-cyan-50 border border-cyan-100 rounded-xl flex items-center justify-center">
                            <ShieldCheck className="h-5 w-5 text-[#06b6d4]" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-sm font-semibold leading-none truncate max-w-[180px]">
                                {user?.agencyName || 'SAMS Ops'}
                            </h1>
                            <span className="text-[12px] text-slate-500 mt-1 block">Agency Portal</span>
                        </div>
                    </div>
                    <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10 border border-border bg-white hover:bg-slate-50 text-slate-700">
                                <Menu className="h-5 w-5" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="p-0 border-none w-[85vw] max-w-xs bg-[var(--sidebar)] overflow-hidden">
                            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                            <AgencySidebar onItemClick={() => setSidebarOpen(false)} />
                        </SheetContent>
                    </Sheet>
                </header>

                <main className="flex-1 overflow-y-auto custom-scrollbar bg-[var(--background)]">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={pathname}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className="h-full w-full p-4 sm:p-6 md:p-8"
                        >
                            {children}
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>
            </div>
        </div>
    )
}
