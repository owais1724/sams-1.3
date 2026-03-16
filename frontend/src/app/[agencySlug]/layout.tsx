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
                if (userData.role === 'Super Admin' || userData.agencySlug !== agencySlug) {
                    console.warn(`Access denied. Rule violation: User from ${userData.agencySlug || 'Super Admin'} tried to enter ${agencySlug}`);
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
            <div className="h-screen w-screen flex items-center justify-center bg-black">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D9A75B]"></div>
            </div>
        )
    }

    if (isLoginPage) {
        return <>{children}</>
    }

    return (
        <div className="flex h-screen bg-black font-inter p-2 sm:p-4 overflow-hidden selection:bg-[#D9A75B]/30">
            {/* Unified Container — sidebar + content as one panel */}
            <div className="flex flex-1 h-full rounded-2xl sm:rounded-[40px] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-white/5 bg-[#0A0A0A]">
                {/* Desktop Sidebar */}
                <div className={`hidden lg:flex shrink-0 z-20 transition-all duration-300 border-r border-white/5 ${sidebarCollapsed ? 'w-20' : 'w-76'}`}>
                    <AgencySidebar collapsed={sidebarCollapsed} onToggleCollapse={toggleSidebarCollapse} />
                </div>

                <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Mobile Header - Elevated */}
                <header className="lg:hidden flex items-center justify-between px-4 sm:px-6 h-16 sm:h-20 bg-white/[0.02] text-white border-b border-white/5 shrink-0 z-30 backdrop-blur-3xl">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="h-10 w-10 bg-gradient-to-tr from-[#D9A75B] to-[#FFB800] rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(217,167,91,0.3)]">
                            <ShieldCheck className="h-5 w-5 text-black" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-sm font-black tracking-[0.2em] uppercase leading-none truncate max-w-[150px] italic">
                                {user?.agencyName || 'SAMS Ops'}
                            </h1>
                            <span className="text-[9px] text-[#D9A75B]/60 font-black uppercase tracking-widest mt-1.5 block">
                                Operations Node
                            </span>
                        </div>
                    </div>
                    <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-2xl h-12 w-12 border border-white/10 bg-white/5">
                                <Menu className="h-5 w-5" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="p-0 border-none w-[85vw] max-w-xs bg-black overflow-hidden ring-1 ring-white/10">
                            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                            <AgencySidebar onItemClick={() => setSidebarOpen(false)} />
                        </SheetContent>
                    </Sheet>
                </header>

                <main className="flex-1 overflow-y-auto custom-scrollbar">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={pathname}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className="p-4 sm:p-6 md:p-10 lg:p-12"
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
