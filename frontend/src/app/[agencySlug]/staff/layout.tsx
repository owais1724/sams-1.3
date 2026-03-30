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
                const normalizeSlug = (v: unknown) => (v ?? "").toString().trim().toLowerCase()
                const isCorrectSlug = normalizeSlug(userData.agencySlug) === normalizeSlug(currentAgencySlug)
                // Allow access if: has employeeId OR does not have admin role
                const isBlockedRole = userRoleName.includes('admin') || userRoleName.includes('super admin')
                const isStaffRole = userData.employeeId || !isBlockedRole

                if (!isCorrectSlug || !isStaffRole) {
                    console.warn(`[StaffLayout] Unauthorized: slug=${isCorrectSlug}, staffRole=${isStaffRole}, role=${userRoleName}`)
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

