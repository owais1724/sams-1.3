"use client"

import { AgencySidebar } from "@/components/agency/AgencySidebar"
import { usePathname, useRouter, useParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { useAuthStore } from "@/store/authStore"
import { useEffect, useState } from "react"
import api from "@/lib/api"
import { Menu, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

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

    const isLoginPage = pathname?.split('/').some(segment => segment.toLowerCase() === 'login') || pathname?.includes('staff-login')

    useEffect(() => {
        let isActive = true;
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
            <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0d5c56]"></div>
            </div>
        )
    }

    if (isLoginPage) {
        return <>{children}</>
    }

    return (
        <div className="flex h-screen bg-slate-50 font-outfit overflow-hidden">
            {/* Desktop Sidebar */}
            <div className="hidden lg:flex w-72 shrink-0 border-r border-white/5 shadow-2xl z-20">
                <AgencySidebar />
            </div>

            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* Mobile Header */}
                <header className="lg:hidden flex items-center justify-between px-6 h-16 bg-[#0d5c56] text-white border-b border-white/5 shrink-0 z-30 shadow-md">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-[#14B8A6] rounded-lg flex items-center justify-center shadow-lg shadow-teal-500/20">
                            <ShieldCheck className="h-4 w-4 text-white" />
                        </div>
                        <h1 className="text-sm font-black tracking-tight uppercase">Sentinel</h1>
                    </div>
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-xl">
                                <Menu className="h-6 w-6" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="p-0 border-none w-72 bg-[#0d5c56]">
                            <AgencySidebar />
                        </SheetContent>
                    </Sheet>
                </header>

                <main className="flex-1 overflow-y-auto">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={pathname}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className="p-3 sm:p-6 md:p-10"
                        >
                            {children}
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>
        </div>
    )
}
