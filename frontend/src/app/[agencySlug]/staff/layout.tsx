"use client"

import { usePathname, useParams } from "next/navigation"
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
    const { agencySlug } = useParams()
    const currentAgencySlug = (Array.isArray(agencySlug) ? agencySlug[0] : agencySlug) || ""
    const { login, clearLocalAuth } = useAuthStore()
    const [verifying, setVerifying] = useState(true)

    const isLoginPage = pathname?.includes('staff-login') || pathname?.includes('/login')

    useEffect(() => {
        if (isLoginPage) {
            setVerifying(false)
            return
        }

        const verifyStaffPortal = async () => {
            try {
                const response = await api.get('/auth/me')
                const userData = response.data
                
                const userRoleName = userData.role?.toLowerCase() || ""
                const agencyAdminRoles = ['agency admin', 'supervisor']
                const staffRoles = ['guard', 'hr', 'staff']
                
                // Staff layout ONLY allows staff roles.
                // Agency Admins / Supervisors are BLOCKED from this path.
                const isAgencyAdmin = agencyAdminRoles.includes(userRoleName)
                const isCorrectSlug = userData.agencySlug === currentAgencySlug

                if (isAgencyAdmin || !isCorrectSlug || !staffRoles.includes(userRoleName)) {
                    console.warn(`[StaffLayout] Restricted role ${userRoleName} blocked from Staff portal.`)
                    toast.error("Unauthorized access to Staff portal. You have been logged out.")
                    clearLocalAuth()
                    window.location.href = `/${currentAgencySlug}/login`
                    return
                }

                login(userData)
            } catch (error) {
                clearLocalAuth()
                window.location.href = `/${currentAgencySlug}/login`
            } finally {
                setVerifying(false)
            }
        }

        verifyStaffPortal()
    }, [clearLocalAuth, currentAgencySlug, isLoginPage, login])
    
    if (verifying && !isLoginPage) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-white">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
            </div>
        )
    }

    return <>{children}</>
}
