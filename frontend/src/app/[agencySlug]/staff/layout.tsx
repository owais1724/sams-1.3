"use client"

import { usePathname, useRouter, useParams } from "next/navigation"
import { useAuthStore } from "@/store/authStore"
import { useEffect, useState } from "react"
import api from "@/lib/api"
import { toast } from "sonner"

export default function StaffLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const router = useRouter()
    const { agencySlug } = useParams()
    const { user, isAuthenticated, logout, login } = useAuthStore()
    const [verifying, setVerifying] = useState(true)

    const isLoginPage = pathname?.includes('staff-login') || pathname?.includes('/login')

    useEffect(() => {
        let isActive = true;

        const verifySession = async () => {
            setVerifying(true);
            
            try {
                const response = await api.get('/auth/me');
                const userData = response.data;

                if (!userData) {
                    window.location.href = `/${agencySlug}/staff-login`;
                    return;
                }

                console.log('Staff layout role check:', userData.role);
                console.log('Is authenticated:', !!userData);
                console.log('User permissions:', userData.permissions);

                // STRICT: Only allow Guard, HR, and Staff roles (NO Agency Admin, NO Supervisor)
                // Case-insensitive role check
                const userRole = userData.role?.toLowerCase() || '';
                const staffOnlyRoles = ['guard', 'hr', 'staff'];
                const hasCorrectRole = staffOnlyRoles.includes(userRole);
                
                console.log('[Staff Layout] Role check:', {
                    userRole,
                    hasCorrectRole,
                    agencyMatch: userData.agencySlug === agencySlug
                });
                
                if (!hasCorrectRole || userData.agencySlug !== agencySlug) {
                    console.warn(`Staff portal access denied. Role: ${userData.role}, Agency: ${userData.agencySlug}`);
                    toast.error("Unauthorized access. You have been logged out.");
                    isActive = false;
                    await api.post('/auth/logout').catch(() => { });
                    logout();
                    if (!isLoginPage) {
                        window.location.href = `/${agencySlug}/staff-login`;
                    }
                    return;
                }

                console.log('[Staff Layout] Access granted');

                if (isActive) {
                    login(userData);
                }
            } catch (error) {
                console.error("Staff session verification failed", error);
                isActive = false;
                logout();
                if (!isLoginPage) {
                    window.location.href = `/${agencySlug}/staff-login`;
                }
            } finally {
                if (isActive) {
                    setVerifying(false);
                }
            }
        };

        if (isLoginPage) {
            setVerifying(false);
        } else {
            verifySession();
        }
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

    return <>{children}</>
}
