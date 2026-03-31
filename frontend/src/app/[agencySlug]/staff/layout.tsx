"use client"

import { usePathname, useParams, useRouter } from "next/navigation"
import { useAuthStore } from "@/store/authStore"
import { useEffect, useState } from "react"
import api from "@/lib/api"
import { toast } from "sonner"

const STAFF_ROLES = ['guard', 'hr', 'staff', 'supervisor']

export default function StaffLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const router = useRouter()
    const { agencySlug } = useParams()
    const currentAgencySlug = (Array.isArray(agencySlug) ? agencySlug[0] : agencySlug) || ""
    const { user, login, clearLocalAuth, isAuthenticated } = useAuthStore()
    const [isLoading, setIsLoading] = useState(true)

    const isLoginPage = pathname?.includes('staff-login') || pathname?.includes('/login')

    useEffect(() => {
        // Skip check on login pages
        if (isLoginPage) {
            setIsLoading(false)
            return
        }

        const verifyStaffAccess = async () => {
            try {
                // Fetch current user session
                const response = await api.get('/auth/me')
                const userData = response.data
                
                // Normalize role for comparison
                const role = userData.role?.toLowerCase()?.trim() || ""
                
                // Check agency match
                const userAgency = userData.agencySlug?.toLowerCase()?.trim() || ""
                const currentAgency = currentAgencySlug?.toLowerCase()?.trim() || ""
                
                if (userAgency !== currentAgency) {
                    console.warn(`[StaffLayout] Agency mismatch: ${userAgency} !== ${currentAgency}`)
                    toast.error("Unauthorized access. Wrong agency.")
                    clearLocalAuth()
                    router.push(`/${currentAgencySlug}/staff-login`)
                    return
                }
                
                // ✅ CRITICAL: Only block if role is NOT a staff role
                // Staff navigating within /staff/ should ALWAYS be allowed
                if (!STAFF_ROLES.includes(role)) {
                    console.warn(`[StaffLayout] Non-staff role blocked: ${role}`)
                    toast.error("Unauthorized access to Staff portal.")
                    clearLocalAuth()
                    router.push(`/${currentAgencySlug}/login`)
                    return
                }

                // ✅ Valid staff user - update store and allow access
                login(userData)
            } catch (error) {
                console.error('[StaffLayout] Session verification failed:', error)
                clearLocalAuth()
                router.push(`/${currentAgencySlug}/staff-login`)
            } finally {
                setIsLoading(false)
            }
        }

        verifyStaffAccess()
    }, [clearLocalAuth, currentAgencySlug, isLoginPage, login, router])
    
    // ✅ Show spinner while loading - never show blank screen
    if (isLoading && !isLoginPage) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-white">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
            </div>
        )
    }

    // ✅ Show nothing while redirecting
    if (!isAuthenticated && !isLoginPage) {
        return null
    }

    // ✅ Valid staff or login page - show content
    return <>{children}</>
}
