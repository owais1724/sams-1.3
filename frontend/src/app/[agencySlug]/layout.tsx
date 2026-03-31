"use client"

import { AgencySidebar } from "@/components/agency/AgencySidebar"
import { usePathname, useParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { useAuthStore } from "@/store/authStore"
import { useEffect, useState } from "react"
import api from "@/lib/api"
import { Menu, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { toast } from "sonner"
import {
    buildSessionUserKey,
    getActiveSessionUserKey,
    getPortalLoginPath,
    getTabSessionUserKey,
    hasSessionConflict,
    PORTAL_TYPE_KEY,
    getCookie,
} from "@/lib/authSession"

type PortalType = "agency" | "staff"

type RouteAccessRule = {
    pattern: RegExp
    portal?: PortalType
    anyPermissions?: string[]
}

const routeAccessRules: RouteAccessRule[] = [
    { pattern: /^\/staff\/dashboard$/, portal: "staff", anyPermissions: ["view_dashboard"] },
    { pattern: /^\/staff\/my-schedule$/, portal: "staff" },
    { pattern: /^\/dashboard$/, anyPermissions: ["view_dashboard"] },
    { pattern: /^\/clients$/, anyPermissions: ["view_clients"] },
    { pattern: /^\/projects$/, anyPermissions: ["view_projects"] },
    { pattern: /^\/employees$/, anyPermissions: ["view_employee"] },
    { pattern: /^\/rbac$/, anyPermissions: ["manage_roles"] },
    { pattern: /^\/attendance$/, anyPermissions: ["view_attendance", "record_attendance", "mark_attendance"] },
    { pattern: /^\/shifts$/, anyPermissions: ["view_shifts", "manage_shifts"] },
    { pattern: /^\/deployments$/, anyPermissions: ["view_deployments", "manage_deployments"] },
    { pattern: /^\/incidents$/, anyPermissions: ["view_incidents", "report_incident", "manage_incidents"] },
    { pattern: /^\/leaves$/, anyPermissions: ["view_leaves", "apply_leave", "approve_leave"] },
    { pattern: /^\/payroll$/, anyPermissions: ["view_payroll", "manage_payroll"] },
    { pattern: /^\/platform-agencies$/, anyPermissions: ["view_agencies", "create_agency", "edit_agency", "delete_agency"] },
    { pattern: /^\/audit-logs$/, anyPermissions: ["view_reports"] },
]

function normalizeAgencyPath(pathname: string | null | undefined, agencySlug: string) {
    if (!pathname) return "/"
    const prefix = `/${agencySlug}`
    if (!pathname.startsWith(prefix)) return pathname
    const normalized = pathname.slice(prefix.length)
    return normalized || "/"
}

function getRouteRule(pathname: string | null | undefined, agencySlug: string) {
    const normalizedPath = normalizeAgencyPath(pathname, agencySlug)
    return routeAccessRules.find((rule) => rule.pattern.test(normalizedPath))
}

function hasRoutePermission(userData: any, requiredPermissions: string[] = []) {
    if (!requiredPermissions.length) return true

    const isSuperAdmin = userData?.role?.toLowerCase()?.includes('super admin');
    const isAgencyAdmin = !userData?.employeeId && !isSuperAdmin;
    
    if (isAgencyAdmin || isSuperAdmin) return true

    return requiredPermissions.some((permission) =>
        userData?.permissions?.includes(permission)
    )
}

function getSafeRouteForUser(userData: any, agencySlug: string) {
    const permissions: string[] = userData?.permissions || []

    const isStaffUser = Boolean(userData?.employeeId);
    if (isStaffUser) {
        return permissions.includes("view_dashboard")
            ? `/${agencySlug}/staff/dashboard`
            : `/${agencySlug}/staff/my-schedule`
    }

    return `/${agencySlug}/dashboard`
}

export default function AgencyLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const { agencySlug } = useParams()
    const currentAgencySlug = (Array.isArray(agencySlug) ? agencySlug[0] : agencySlug) || ""
    
    // ✅ CRITICAL: Check staff paths FIRST before any other logic
    const isLoginPage = pathname?.split('/').some(segment => segment.toLowerCase() === 'login') || pathname?.includes('staff-login')
    const isStaffPath = pathname?.includes('/staff') || pathname?.includes('staff-login')
    
    // ✅ CRITICAL: Return immediately for staff paths - don't run ANY agency checks
    if (isStaffPath) {
        return <>{children}</>
    }
    
    const { user, login, clearLocalAuth, initialize } = useAuthStore()
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

    const tabPortalType = typeof window !== 'undefined' ? sessionStorage.getItem(PORTAL_TYPE_KEY) : null
    const expectedUserKey = typeof window !== 'undefined' ? getTabSessionUserKey() : null
    const activeUserKey = typeof window !== 'undefined' ? getActiveSessionUserKey() : null
    const hasTabSessionMismatch = !isLoginPage && hasSessionConflict(expectedUserKey, activeUserKey)

    // Initialize auth from cookies on mount
    useEffect(() => {
        initialize()
    }, [initialize])

    useEffect(() => {
        let isActive = true;

        // ✅ ABSOLUTE FIRST CHECK: Skip login pages
        if (isLoginPage) {
            setVerifying(false)
            return
        }

        if (hasTabSessionMismatch) {
            clearLocalAuth();
            toast.error("Session changed in another tab. Please sign in again.");
            window.location.href = getPortalLoginPath(pathname || "/", currentAgencySlug, tabPortalType);
            return;
        }

        // ── Per-tab Session Isolation ──
        // Only check portal type if it's explicitly set (not null/undefined)
        if (tabPortalType && tabPortalType !== 'agency' && tabPortalType !== 'staff') {
            clearLocalAuth();
            window.location.href = getPortalLoginPath(pathname || "/", currentAgencySlug, tabPortalType);
            return;
        }

        const verifySession = async () => {
            setVerifying(true);
            try {
                const response = await api.get('/auth/me');
                const userData = response.data;
                const currentStoredUser = useAuthStore.getState().user;
                const currentTabUserKey = buildSessionUserKey(currentStoredUser);
                const responseUserKey = buildSessionUserKey(userData);
                const hasStoredUserMismatch = Boolean(
                    currentTabUserKey &&
                    responseUserKey &&
                    currentTabUserKey !== responseUserKey
                );

                // Check user type
                const isStaffUser = Boolean(userData?.employeeId)
                const isSuperAdmin = userData?.role?.toLowerCase()?.includes('super admin')
                
                console.log('[AgencyLayout] User check:', {
                    email: userData.email,
                    role: userData.role,
                    employeeId: userData.employeeId,
                    isStaff: isStaffUser,
                    isSuperAdmin: isSuperAdmin
                })
                
                // Check agency match
                const userAgency = userData.agencySlug?.toLowerCase()?.trim() || "";
                const currentAgency = currentAgencySlug?.toLowerCase()?.trim() || "";
                
                // Block super admins
                if (isSuperAdmin) {
                    console.warn(`[AgencyLayout] Super admin blocked from agency portal`)
                    toast.error("Unauthorized access. You have been logged out.")
                    isActive = false;
                    clearLocalAuth();
                    if (!isLoginPage) {
                        window.location.href = '/admin/login';
                    }
                    return;
                }
                
                // Check agency mismatch
                if (userAgency !== currentAgency) {
                    console.warn(`[AgencyLayout] Agency mismatch: ${userAgency} !== ${currentAgency}`)
                    toast.error("Unauthorized access. Wrong agency.")
                    isActive = false;
                    clearLocalAuth();
                    if (!isLoginPage) {
                        window.location.href = getPortalLoginPath(pathname || "/", currentAgencySlug, tabPortalType);
                    }
                    return;
                }
                
                // Check session mismatch
                if (hasStoredUserMismatch) {
                    console.warn(`[AgencyLayout] Session mismatch detected`)
                    toast.error("Session conflict detected. Please sign in again.")
                    isActive = false;
                    clearLocalAuth();
                    if (!isLoginPage) {
                        window.location.href = getPortalLoginPath(pathname || "/", currentAgencySlug, tabPortalType);
                    }
                    return;
                }

                // ✅ Block staff users (users with employeeId)
                // Agency portal is ONLY for agency admins (users without employeeId)
                // Skip this check for staff paths and login pages
                if (isStaffUser && !isStaffPath && !isLoginPage) {
                    console.warn(`[AgencyLayout] Staff user blocked - has employeeId: ${userData.employeeId}`)
                    toast.error("Unauthorized access to Agency Admin portal.")
                    isActive = false;
                    clearLocalAuth();
                    if (!isLoginPage) {
                        window.location.href = `/${currentAgencySlug}/staff-login`;
                    }
                    return;
                }

                const routeRule = getRouteRule(pathname, currentAgencySlug);
                const routePermissionDenied =
                    Boolean(routeRule) && !hasRoutePermission(userData, routeRule?.anyPermissions);

                if (routePermissionDenied) {
                    const safeRoute = getSafeRouteForUser(userData, currentAgencySlug);
                    if (pathname !== safeRoute) {
                        toast.error("Access denied for this page.");
                        window.location.href = safeRoute;
                        return;
                    }
                }

                if (isActive) {
                    login(userData);
                }
            } catch (error) {
                console.error("Agency session verification failed", error);
                isActive = false;
                clearLocalAuth();
                if (!isLoginPage) {
                    window.location.href = getPortalLoginPath(pathname || "/", currentAgencySlug, tabPortalType);
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

        verifySession();

        window.addEventListener('pageshow', handlePageShow);

        // ✅ Poll for cookie changes every 2 seconds to detect session changes from other tabs
        const cookieCheckInterval = setInterval(() => {
            const activeUserKey = typeof window !== 'undefined' ? getCookie('sams_active_user_key') : null
            const tabUserKey = typeof window !== 'undefined' ? sessionStorage.getItem('sams_tab_user_key') : null
            
            if (activeUserKey && tabUserKey && activeUserKey !== tabUserKey) {
                console.log('[AgencyLayout] Session conflict detected via polling')
                verifySession()
            }
        }, 2000)

        return () => {
            window.removeEventListener('pageshow', handlePageShow)
            clearInterval(cookieCheckInterval)
        }
    }, [clearLocalAuth, currentAgencySlug, hasTabSessionMismatch, isLoginPage, login, pathname, tabPortalType]);

    // ✅ Show spinner while verifying (only for agency admin pages)
    if (verifying || hasTabSessionMismatch) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-[var(--background)]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#06b6d4]"></div>
            </div>
        )
    }

    // Step 6 debug log
    console.log('Navigation check - User:', user?.role, 'Loading:', verifying, 'Path:', pathname)

    // Login page - no sidebar
    if (isLoginPage) {
        return <>{children}</>
    }

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
                            <span className="text-[12px] text-slate-500 mt-1 block">Agency Portal</span>
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






