"use client"

import { useEffect, useState } from "react"
import { usePathname, useParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Menu, ShieldCheck } from "lucide-react"

import { AgencySidebar } from "@/components/agency/AgencySidebar"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import api from "@/lib/api"
import {
    buildSessionUserKey,
    getActiveSessionUserKey,
    getPortalLoginPath,
    getTabSessionUserKey,
    hasSessionConflict,
    PORTAL_TYPE_KEY,
    STAFF_NAV_INTENT_KEY,
    STAFF_VERIFIED_PATH_KEY,
} from "@/lib/authSession"
import { useAuthStore } from "@/store/authStore"
import { toast } from "sonner"

type RouteAccessRule = {
    pattern: RegExp
    anyPermissions?: string[]
}

const routeAccessRules: RouteAccessRule[] = [
    { pattern: /^\/dashboard$/, anyPermissions: ["view_dashboard"] },
    { pattern: /^\/my-schedule$/ },
    { pattern: /^\/clients$/, anyPermissions: ["view_clients", "create_client"] },
    { pattern: /^\/projects$/, anyPermissions: ["view_projects", "create_project"] },
    { pattern: /^\/employees$/, anyPermissions: ["view_employee", "create_employee"] },
    { pattern: /^\/rbac$/, anyPermissions: ["manage_roles"] },
    { pattern: /^\/attendance$/, anyPermissions: ["view_attendance", "record_attendance", "mark_attendance"] },
    { pattern: /^\/shifts$/, anyPermissions: ["view_shifts", "manage_shifts"] },
    { pattern: /^\/deployments$/, anyPermissions: ["view_deployments", "manage_deployments"] },
    { pattern: /^\/incidents$/, anyPermissions: ["view_incidents", "report_incident", "manage_incidents"] },
    { pattern: /^\/leaves$/, anyPermissions: ["view_leaves", "apply_leave", "approve_leave"] },
]

const PERMISSION_ALIASES: Record<string, string[]> = {
    approve_leave: ["approve_leaves"],
    approve_leaves: ["approve_leave"],
    view_leaves: ["view_leave"],
    view_leave: ["view_leaves"],
    apply_leave: ["apply_leaves"],
    apply_leaves: ["apply_leave"],
}

function normalizeStaffPath(pathname: string | null | undefined, agencySlug: string) {
    if (!pathname) return "/"

    const agencyPrefix = `/${agencySlug}`
    const withoutAgency = pathname.startsWith(agencyPrefix)
        ? pathname.slice(agencyPrefix.length) || "/"
        : pathname

    if (!withoutAgency.startsWith("/staff")) {
        return withoutAgency
    }

    const normalized = withoutAgency.slice("/staff".length)
    return normalized || "/"
}

function getRouteRule(pathname: string | null | undefined, agencySlug: string) {
    const normalizedPath = normalizeStaffPath(pathname, agencySlug)
    return routeAccessRules.find((rule) => rule.pattern.test(normalizedPath))
}

function hasRoutePermission(userData: any, requiredPermissions: string[] = []) {
    if (!requiredPermissions.length) return true

    const actions = new Set(
        (userData?.permissions || []).map((value: string) => String(value || "").toLowerCase().trim())
    )

    return requiredPermissions.some((permission) => {
        const normalized = String(permission || "").toLowerCase().trim()
        if (!normalized) return false
        if (actions.has(normalized)) return true

        const aliases = PERMISSION_ALIASES[normalized] || []
        return aliases.some((alias) => actions.has(alias))
    })
}

export default function StaffLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const { agencySlug } = useParams()
    const currentAgencySlug = (Array.isArray(agencySlug) ? agencySlug[0] : agencySlug) || ""
    const { user, login, clearLocalAuth, isAuthenticated, isLoading: authLoading, initialize } = useAuthStore()

    const [isLoading, setIsLoading] = useState(true)
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [verifying, setVerifying] = useState(false)
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

    // Load sidebar state from localStorage after mount to avoid hydration mismatch
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem("sams_sidebar_collapsed")
            if (saved === "true") {
                setSidebarCollapsed(true)
            }
        }
    }, [])

    const toggleSidebarCollapse = () => {
        setSidebarCollapsed((prev) => {
            const next = !prev
            if (typeof window !== 'undefined') {
                localStorage.setItem("sams_sidebar_collapsed", String(next))
            }
            return next
        })
    }

    const isLoginPage = pathname?.includes("staff-login") || pathname?.includes("/login")
    const tabPortalType = typeof window !== "undefined" ? sessionStorage.getItem(PORTAL_TYPE_KEY) : null
    const expectedUserKey = typeof window !== "undefined" ? getTabSessionUserKey() : null
    const activeUserKey = typeof window !== "undefined" ? getActiveSessionUserKey() : null
    const hasTabSessionMismatch = !isLoginPage && hasSessionConflict(expectedUserKey, activeUserKey)

    const forceLogout = async (targetPath?: string) => {
        if (typeof window === "undefined") {
            return
        }

        try {
            await api.post("/auth/logout")
        } catch {
            // Ignore logout API failures and still clear the local tab state.
        }

        clearLocalAuth()
        sessionStorage.removeItem(STAFF_NAV_INTENT_KEY)
        sessionStorage.removeItem(STAFF_VERIFIED_PATH_KEY)
        window.location.replace(targetPath || `/${currentAgencySlug}/staff-login`)
    }

    const verifyStaffAccess = async () => {
        if (verifying) return // Prevent concurrent verifications
        setVerifying(true)
        
        try {
            const normalizedCurrentPath = normalizeStaffPath(pathname, currentAgencySlug)

            const response = await api.get("/auth/me")
            const userData = response.data

            console.log("[StaffLayout] User check:", {
                email: userData?.email,
                role: userData?.role,
                employeeId: userData?.employeeId,
                path: pathname,
            })

            // Check if this tab belongs to a different user
            const tabUserKey = getTabSessionUserKey()
            const currentUserKey = buildSessionUserKey(userData)
            
            if (tabUserKey && currentUserKey && tabUserKey !== currentUserKey) {
                console.warn("[StaffLayout] Different user detected in this tab")
                toast.error("Unauthorized access. You have been logged out.")
                void forceLogout()
                return
            }

            const isStaffUser = Boolean(userData?.employeeId)
            const isSuperAdmin = userData?.role?.toLowerCase()?.includes("super admin")
            const userAgency = userData?.agencySlug?.toLowerCase()?.trim() || ""
            const currentAgency = currentAgencySlug?.toLowerCase()?.trim() || ""

            if (userAgency !== currentAgency) {
                console.warn(`[StaffLayout] Agency mismatch: ${userAgency} !== ${currentAgency}`)
                toast.error("Unauthorized access. Wrong agency.")
                void forceLogout()
                return
            }

            if (isSuperAdmin) {
                console.warn("[StaffLayout] Super admin blocked from staff portal")
                toast.error("Unauthorized access.")
                void forceLogout("/admin/login")
                return
            }

            if (!isStaffUser) {
                console.warn("[StaffLayout] Non-staff user blocked from staff portal")
                toast.error("Unauthorized access to Staff portal.")
                void forceLogout(`/${currentAgencySlug}/login`)
                return
            }

            const routeRule = getRouteRule(pathname, currentAgencySlug)
            const routePermissionDenied =
                Boolean(routeRule) && !hasRoutePermission(userData, routeRule?.anyPermissions)

            if (routePermissionDenied) {
                console.warn(`[StaffLayout] Route permission denied for ${pathname}`)
                toast.error("Unauthorized staff URL access detected. Please sign in again.")
                void forceLogout()
                return
            }

            const currentUserKey2 = buildSessionUserKey(userData)
            if (currentUserKey2) {
                sessionStorage.setItem("sams_tab_user_key", currentUserKey2)
            }

            sessionStorage.setItem(STAFF_VERIFIED_PATH_KEY, normalizedCurrentPath)
            sessionStorage.removeItem(STAFF_NAV_INTENT_KEY)

            login(userData)
        } catch (error) {
            console.error("[StaffLayout] Session verification failed:", error)
            void forceLogout()
        } finally {
            setIsLoading(false)
            setVerifying(false)
        }
    }

    useEffect(() => {
        initialize()
    }, [initialize])

    useEffect(() => {
        if (authLoading) {
            return
        }

        if (isLoginPage) {
            setIsLoading(false)
            return
        }

        if (hasTabSessionMismatch) {
            toast.error("Session changed in another tab. Please sign in again.")
            void forceLogout(getPortalLoginPath(pathname || "/", currentAgencySlug, tabPortalType))
            return
        }

        // Only verify once on initial load
        if (!isAuthenticated) {
            verifyStaffAccess()
        } else {
            // On subsequent navigations, just check tab user key locally (no API call)
            const tabUserKey = getTabSessionUserKey()
            const currentUserKey = buildSessionUserKey(user)
            
            if (tabUserKey && currentUserKey && tabUserKey !== currentUserKey) {
                console.warn("[StaffLayout] Different user detected via local check")
                toast.error("Unauthorized access. You have been logged out.")
                void forceLogout()
                return
            }
            
            // Check permissions locally without API call
            const routeRule = getRouteRule(pathname, currentAgencySlug)
            const routePermissionDenied =
                Boolean(routeRule) && !hasRoutePermission(user, routeRule?.anyPermissions)

            if (routePermissionDenied) {
                console.warn(`[StaffLayout] Route permission denied for ${pathname}`)
                toast.error("Access denied. You don't have permission for this page.")
                window.location.href = `/${currentAgencySlug}/staff/my-schedule`
                return
            }

            sessionStorage.setItem(STAFF_VERIFIED_PATH_KEY, normalizeStaffPath(pathname, currentAgencySlug))
            sessionStorage.removeItem(STAFF_NAV_INTENT_KEY)
            
            setIsLoading(false)
        }
    }, [
        authLoading,
        isLoginPage,
        hasTabSessionMismatch,
        isAuthenticated,
        pathname,
        user,
    ])

    if ((isLoading || hasTabSessionMismatch) && !isLoginPage) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-white">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
            </div>
        )
    }

    if (!isAuthenticated && !isLoginPage) {
        return null
    }

    if (isLoginPage) {
        return <>{children}</>
    }

    return (
        <div className="flex h-screen w-full bg-[var(--background)] font-inter overflow-hidden selection:bg-primary/30">
            <div className="flex flex-1 h-screen w-full overflow-hidden bg-white min-h-0">
                <div className={`hidden lg:flex sticky top-0 h-screen shrink-0 overflow-hidden z-20 transition-all duration-300 border-r border-slate-200 ${sidebarCollapsed ? "w-20" : "w-76"}`}>
                    <AgencySidebar collapsed={sidebarCollapsed} onToggleCollapse={toggleSidebarCollapse} />
                </div>

                <div className="flex-1 flex min-h-0 flex-col h-screen overflow-hidden">
                    <header className="lg:hidden flex items-center justify-between px-4 sm:px-6 h-16 sm:h-20 bg-white text-slate-900 border-b border-border shrink-0 z-30">
                        <div className="flex items-center gap-3 sm:gap-4">
                            <div className="h-10 w-10 bg-cyan-50 border border-cyan-100 rounded-xl flex items-center justify-center">
                                <ShieldCheck className="h-5 w-5 text-[#06b6d4]" />
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-sm font-semibold leading-none truncate max-w-[180px]">
                                    {user?.agencyName || "SAMS Ops"}
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
