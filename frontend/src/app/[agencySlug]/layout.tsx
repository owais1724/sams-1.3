"use client"

import { AgencySidebar } from "@/components/agency/AgencySidebar"
import { usePathname, useRouter, useParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { useAuthStore } from "@/store/authStore"
import { useEffect, useState } from "react"
import api from "@/lib/api"

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
        const verifySession = async () => {
            setVerifying(true);
            try {
                const response = await api.get('/auth/me');
                const userData = response.data;

                // If Super Admin occupies this agency space, resolve the context agency ID
                if (userData.role === 'Super Admin' && !userData.agencyId && agencySlug) {
                    try {
                        const agencyRes = await api.get(`/agencies/slug/${agencySlug}`);
                        userData.agencyId = agencyRes.data.id;
                        userData.agencySlug = agencyRes.data.slug;
                    } catch (agencyError) {
                        console.error("Failed to resolve agency context for Super Admin", agencyError);
                    }
                }

                login(userData);
            } catch (error) {
                console.error("Agency session verification failed", error);
                logout();
                if (!isLoginPage) {
                    // Determine which login page to send to
                    if (pathname?.includes('/staff')) {
                        router.push(`/${agencySlug}/staff-login`);
                    } else {
                        router.push(`/${agencySlug}/login`);
                    }
                }
            } finally {
                setVerifying(false);
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
        <div className="flex h-screen bg-slate-50 font-outfit">
            <AgencySidebar />
            <main className="flex-1 overflow-y-auto">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={pathname}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="p-10"
                    >
                        {children}
                    </motion.div>
                </AnimatePresence>
            </main>
        </div>
    )
}
