"use client"

import { AgencySidebar } from "@/components/agency/AgencySidebar"
import { usePathname, useParams, useRouter } from "next/navigation"
import { useAuthStore } from "@/store/authStore"
import { useEffect, useState } from "react"
import api from "@/lib/api"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { Menu, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"

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

    // Login page - no sidebar
    if (isLoginPage) {
        return <>{children}</>
    }

    // ✅ Valid staff - show content with sidebar
    return (
        <div className="flex h-screen w-full bg-[var(--background)] font-inter overflow-hidden selection:bg-primary/30">
            {/* Unified Container — sidebar + content as one panel */}
            <div className="flex flex-1 h-screen w-full overflow-hidden bg-white min-h-0">
                {/* Desktop Sidebar */}
                <div className={`hidden lg:flex sticky top-0 h-screen shrink-0 overflow-hidden z-20 transition-all duration-300 border-r border-slate-200 ${sidebarCollapsed ? 'w-20' : 'w-76'}`}>
                    <AgencySidebar collapsed={sidebarCollapsed} onToggleCollapse={toggleSidebarCollapse} />
                </div>

                <div className="flex-1 flex min-h-0 flex-col h-screen overflow-hidden">
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
                                <span className="text-[12px] text-slate-500 mt-1 block">Staff Portal</span>
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

                    <main className="flex-1 min-h-0 overflow-y-auto custom-scrollbar bg-[var(--background)]">
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
