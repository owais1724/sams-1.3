"use client"

import { AdminSidebar } from "@/components/admin/AdminSidebar"
import { usePathname, useRouter } from "next/navigation"
import { useAuthStore } from "@/store/authStore"
import { useEffect, useState } from "react"
import api from "@/lib/api"

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
        <div className="flex h-screen bg-gray-50">
            <AdminSidebar />
            <main className="flex-1 overflow-y-auto p-8">
                {children}
            </main>
        </div>
    )
}
