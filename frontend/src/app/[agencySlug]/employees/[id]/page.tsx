"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, ShieldCheck, Mail, UserCog, UserX, UserCheck, Trash2 } from "lucide-react"

import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import { AlertModal } from "@/components/ui/alert-modal"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/sonner"
import { usePermission } from "@/hooks/usePermission"

type ActionType = "promote" | "demote" | "suspend" | "activate" | "delete"

type PortalNotice = {
    title: string
    message: string
}

const ROLE_RANK: Record<string, number> = {
    "agency admin": 4,
    "hr": 3,
    "supervisor": 2,
    "guard": 1,
}

const normalizeRoleName = (name?: string | null) => (name || "").toLowerCase().trim()

export default function EmployeeDetailPage() {
    const params = useParams<{ agencySlug?: string | string[]; id?: string | string[] }>()
    const router = useRouter()
    const { hasPermission } = usePermission()

    const agencySlug = useMemo(() => {
        const value = params?.agencySlug
        return Array.isArray(value) ? value[0] : value
    }, [params])

    const employeeId = useMemo(() => {
        const value = params?.id
        return Array.isArray(value) ? value[0] : value
    }, [params])

    const [employee, setEmployee] = useState<any | null>(null)
    const [roles, setRoles] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState(false)
    const [confirmAction, setConfirmAction] = useState<ActionType | null>(null)
    const [showPromotePicker, setShowPromotePicker] = useState(false)
    const [showDemotePicker, setShowDemotePicker] = useState(false)
    const [selectedPromoteRoleId, setSelectedPromoteRoleId] = useState<string>("")
    const [selectedDemoteRoleId, setSelectedDemoteRoleId] = useState<string>("")
    const [portalNotice, setPortalNotice] = useState<PortalNotice | null>(null)
    const [agencyAdminCount, setAgencyAdminCount] = useState(0)

    const canManageRoles = hasPermission("manage_roles")

    const fetchEmployee = async () => {
        if (!employeeId) {
            setLoading(false)
            return
        }

        try {
            setLoading(true)
            const response = await api.get("/employees")
            const found = (response.data || []).find((emp: any) => emp.id === employeeId)
            setEmployee(found || null)
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Failed to load employee details")
        } finally {
            setLoading(false)
        }
    }

    const fetchAgencyAdminCount = async (agencyId?: string) => {
        if (!agencyId || !canManageRoles) {
            setAgencyAdminCount(0)
            return
        }

        try {
            const response = await api.get(`/agencies/${agencyId}/admins`)
            const count = (response.data || []).filter(
                (admin: any) => normalizeRoleName(admin?.roleName) === "agency admin",
            ).length
            setAgencyAdminCount(count)
        } catch {
            setAgencyAdminCount(0)
        }
    }

    const fetchRoles = async () => {
        if (!canManageRoles) {
            return
        }

        try {
            const response = await api.get("/roles")
            setRoles(response.data || [])
        } catch {
            setRoles([])
        }
    }

    useEffect(() => {
        fetchEmployee()
    }, [employeeId])

    useEffect(() => {
        fetchRoles()
    }, [canManageRoles])

    useEffect(() => {
        fetchAgencyAdminCount(employee?.agencyId)
    }, [employee?.agencyId, canManageRoles])

    const roleName = employee?.user?.role?.name || "Staff"
    const normalizedRole = normalizeRoleName(roleName)
    const isAgencyAdmin = normalizedRole === "agency admin" || normalizedRole === "agencyadmin"
    const accountIsActive = employee?.user?.isActive ?? true
    const currentRoleRank = ROLE_RANK[normalizedRole] ?? 0

    const roleCandidates = roles.filter((role) => {
        if (role.id === employee?.user?.role?.id) return false
        const roleKey = normalizeRoleName(role.name)
        return roleKey in ROLE_RANK
    })

    const promotableRoles = roleCandidates.filter((role) => {
        const roleRank = ROLE_RANK[normalizeRoleName(role.name)] ?? -1
        return roleRank > currentRoleRank
    })

    const demotableRoles = roleCandidates.filter((role) => {
        const roleRank = ROLE_RANK[normalizeRoleName(role.name)] ?? -1
        return roleRank < currentRoleRank
    })

    const selectedPromoteRole = promotableRoles.find((role) => role.id === selectedPromoteRoleId)
    const selectedDemoteRole = demotableRoles.find((role) => role.id === selectedDemoteRoleId)
    const hasReachedAdminLimit = agencyAdminCount >= 2
    const hasPromotableAgencyAdminRole = promotableRoles.some(
        (role) => normalizeRoleName(role.name) === "agency admin",
    )
    const selectedPromoteRoleIsAgencyAdmin = normalizeRoleName(selectedPromoteRole?.name) === "agency admin"
    const disablePromoteTrigger = hasReachedAdminLimit && hasPromotableAgencyAdminRole && promotableRoles.every(
        (role) => normalizeRoleName(role.name) === "agency admin",
    )

    useEffect(() => {
        if (!showPromotePicker) {
            return
        }

        if (!promotableRoles.length) {
            setSelectedPromoteRoleId("")
            return
        }

        if (!promotableRoles.some((role) => role.id === selectedPromoteRoleId)) {
            setSelectedPromoteRoleId(promotableRoles[0].id)
        }
    }, [showPromotePicker, promotableRoles, selectedPromoteRoleId])

    useEffect(() => {
        if (!showDemotePicker) {
            return
        }

        if (!demotableRoles.length) {
            setSelectedDemoteRoleId("")
            return
        }

        if (!demotableRoles.some((role) => role.id === selectedDemoteRoleId)) {
            setSelectedDemoteRoleId(demotableRoles[0].id)
        }
    }, [showDemotePicker, demotableRoles, selectedDemoteRoleId])

    const actionMeta = (() => {
        const name = employee?.fullName || "this employee"

        switch (confirmAction) {
            case "promote":
                return {
                    title: `Promote ${name} to ${selectedPromoteRole?.name || "selected role"}?`,
                    description: "They will be assigned the selected role permissions.",
                    confirmText: "Promote",
                    variant: "primary" as const,
                }
            case "demote":
                return {
                    title: `Demote ${name} to ${selectedDemoteRole?.name || "selected role"}?`,
                    description: "They will be assigned the selected lower role permissions.",
                    confirmText: "Demote",
                    variant: "danger" as const,
                }
            case "suspend":
                return {
                    title: `Suspend ${name}?`,
                    description: "They won't be able to login.",
                    confirmText: "Suspend",
                    variant: "danger" as const,
                }
            case "activate":
                return {
                    title: `Activate ${name}'s account?`,
                    description: "Suspended accounts cannot login.",
                    confirmText: "Activate",
                    variant: "primary" as const,
                }
            case "delete":
                return {
                    title: `Delete ${name}? This cannot be undone.`,
                    description: "This action is permanent and cannot be reversed.",
                    confirmText: "Delete",
                    variant: "danger" as const,
                }
            default:
                return null
        }
    })()

    const runAction = async () => {
        if (!employee || !employeeId || !confirmAction) {
            return
        }

        setActionLoading(true)
        try {
            if (confirmAction === "promote") {
                if (!selectedPromoteRoleId) {
                    toast.error("Please select a role first")
                    setActionLoading(false)
                    return
                }
                const response = await api.patch(`/employees/${employeeId}/promote`, {
                    roleId: selectedPromoteRoleId,
                })
                if (response?.data?.portalSwitch) {
                    setPortalNotice({
                        title: `${employee.fullName} has been promoted to Agency Admin!`,
                        message: "They must logout and login through the Agency Admin portal.",
                    })
                } else {
                    toast.success(response?.data?.message || "Role updated successfully")
                }
                setShowPromotePicker(false)
                await fetchEmployee()
                await fetchAgencyAdminCount(employee?.agencyId)
            } else if (confirmAction === "demote") {
                if (!selectedDemoteRoleId) {
                    toast.error("Please select a role first")
                    setActionLoading(false)
                    return
                }
                const response = await api.patch(`/employees/${employeeId}/demote`, {
                    roleId: selectedDemoteRoleId,
                })
                if (response?.data?.portalSwitch) {
                    setPortalNotice({
                        title: `${employee.fullName} has been demoted to Staff.`,
                        message: "They must logout and login through the Staff portal.",
                    })
                } else {
                    toast.success(response?.data?.message || "Role updated successfully")
                }
                setShowDemotePicker(false)
                await fetchEmployee()
                await fetchAgencyAdminCount(employee?.agencyId)
            } else if (confirmAction === "suspend" || confirmAction === "activate") {
                await api.patch(`/employees/${employeeId}/suspend`)
                toast.success(confirmAction === "suspend" ? "Employee account suspended" : "Employee account activated")
                await fetchEmployee()
            } else if (confirmAction === "delete") {
                await api.delete(`/employees/${employeeId}`)
                toast.success("Employee deleted successfully")
                router.push(`/${agencySlug}/employees`)
            }
        } catch (error: any) {
            const apiMessage = error?.response?.data?.message
            if (confirmAction === "promote" && typeof apiMessage === "string" && apiMessage.includes("maximum of 2 Agency Admins")) {
                toast.error("Cannot promote - this agency already has 2 Agency Admins")
            } else {
                toast.error(apiMessage || "Action failed")
            }
        } finally {
            setActionLoading(false)
            setConfirmAction(null)
        }
    }

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center bg-[#f8fafc] font-inter">
                <div className="h-9 w-9 border-2 border-[#06b6d4] border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    if (!employee) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-10 font-inter text-[#0f172a]">
                <div className="rounded-2xl border border-slate-200 bg-[#ffffff] p-8 text-center space-y-4">
                    <h1 className="text-2xl font-bold">Employee not found</h1>
                    <p className="text-slate-500">The employee record may have been removed or is not accessible.</p>
                    <Button asChild className="bg-[#06b6d4] hover:bg-[#0891b2] text-white">
                        <Link href={`/${agencySlug}/employees`}>Back to Employees</Link>
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-[#f8fafc] min-h-screen font-inter text-[#0f172a]">
            <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
                <div className="flex items-center justify-between">
                    <Button asChild variant="outline" className="border-slate-200 bg-white hover:bg-cyan-50 hover:text-[#06b6d4] hover:border-[#06b6d4] transition-colors">
                        <Link href={`/${agencySlug}/employees`}>
                            <ArrowLeft className="h-4 w-4" />
                            Back to Employees
                        </Link>
                    </Button>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-[#ffffff] p-6 sm:p-8 shadow-sm space-y-7">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Employee Detail</h1>
                        <p className="text-sm text-slate-500 mt-1">View profile and manage account access.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="space-y-1">
                            <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Name</p>
                            <p className="text-base font-semibold">{employee.fullName}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Email</p>
                            <p className="text-base font-semibold break-all">{employee.email || "Not set"}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Designation</p>
                            <p className="text-base font-semibold">{employee.designation?.name || "Unassigned"}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Current Role</p>
                            <p className="text-base font-semibold">{roleName}</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Status</p>
                        <span
                            className={accountIsActive
                                ? "inline-flex items-center rounded-full bg-emerald-100 text-emerald-700 px-3 py-1 text-xs font-semibold"
                                : "inline-flex items-center rounded-full bg-red-100 text-red-700 px-3 py-1 text-xs font-semibold"
                            }
                        >
                            {accountIsActive ? "Active" : "Suspended"}
                        </span>
                    </div>

                    {canManageRoles && (
                        <div className="pt-6 border-t border-slate-200 space-y-4">
                            <h2 className="text-lg font-bold">Actions</h2>
                            <div className="flex flex-wrap gap-3">
                                {!isAgencyAdmin && promotableRoles.length > 0 && (
                                    <>
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setShowPromotePicker((prev) => !prev)
                                                setShowDemotePicker(false)
                                            }}
                                            disabled={disablePromoteTrigger}
                                            title={disablePromoteTrigger ? "Maximum 2 admins reached" : undefined}
                                            className="border-[#06b6d4] text-[#06b6d4] hover:bg-cyan-50"
                                        >
                                            <ShieldCheck className="h-4 w-4" />
                                            Promote
                                        </Button>
                                        {showPromotePicker && (
                                            <div className="flex items-center gap-2">
                                                <Select value={selectedPromoteRoleId} onValueChange={setSelectedPromoteRoleId}>
                                                    <SelectTrigger className="h-10 min-w-[190px] rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700">
                                                        <SelectValue placeholder="Select role" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {promotableRoles.map((role) => (
                                                            <SelectItem
                                                                key={role.id}
                                                                value={role.id}
                                                                disabled={hasReachedAdminLimit && normalizeRoleName(role.name) === "agency admin"}
                                                            >
                                                                {role.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <Button
                                                    variant="outline"
                                                    onClick={() => setConfirmAction("promote")}
                                                    disabled={!selectedPromoteRoleId || (hasReachedAdminLimit && selectedPromoteRoleIsAgencyAdmin)}
                                                    className="border-[#06b6d4] text-[#06b6d4] hover:bg-cyan-50"
                                                >
                                                    Continue
                                                </Button>
                                            </div>
                                        )}
                                        {hasReachedAdminLimit && hasPromotableAgencyAdminRole && (
                                            <p className="text-xs font-semibold text-amber-700">Maximum 2 admins reached</p>
                                        )}
                                    </>
                                )}

                                {demotableRoles.length > 0 && (
                                    <>
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setShowDemotePicker((prev) => !prev)
                                                setShowPromotePicker(false)
                                            }}
                                            className="border-red-300 text-red-600 hover:bg-red-50"
                                        >
                                            <UserX className="h-4 w-4" />
                                            Demote
                                        </Button>
                                        {showDemotePicker && (
                                            <div className="flex items-center gap-2">
                                                <Select value={selectedDemoteRoleId} onValueChange={setSelectedDemoteRoleId}>
                                                    <SelectTrigger className="h-10 min-w-[190px] rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700">
                                                        <SelectValue placeholder="Select role" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {demotableRoles.map((role) => (
                                                            <SelectItem key={role.id} value={role.id}>
                                                                {role.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <Button
                                                    variant="outline"
                                                    onClick={() => setConfirmAction("demote")}
                                                    disabled={!selectedDemoteRoleId}
                                                    className="border-red-300 text-red-600 hover:bg-red-50"
                                                >
                                                    Continue
                                                </Button>
                                            </div>
                                        )}
                                    </>
                                )}

                                <Button
                                    variant="outline"
                                    onClick={() => setConfirmAction(accountIsActive ? "suspend" : "activate")}
                                    className={accountIsActive
                                        ? "border-red-300 text-red-600 hover:bg-red-50"
                                        : "border-[#06b6d4] text-[#06b6d4] hover:bg-cyan-50"
                                    }
                                >
                                    {accountIsActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                                    {accountIsActive ? "Suspend Account" : "Activate Account"}
                                </Button>

                                <Button
                                    variant="danger-solid"
                                    onClick={() => setConfirmAction("delete")}
                                    className="bg-red-600 hover:bg-red-700 text-white"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    Delete Employee
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <AlertModal
                isOpen={Boolean(confirmAction)}
                onClose={() => setConfirmAction(null)}
                onConfirm={runAction}
                loading={actionLoading}
                title={actionMeta?.title || "Confirm Action"}
                description={actionMeta?.description || "Please confirm this action."}
                variant={actionMeta?.variant || "primary"}
                confirmText={actionMeta?.confirmText || "Confirm"}
                cancelText="Cancel"
            />

            <AlertModal
                isOpen={Boolean(portalNotice)}
                onClose={() => setPortalNotice(null)}
                onConfirm={() => setPortalNotice(null)}
                title={portalNotice?.title || "Role updated"}
                description={portalNotice?.message || "Please log out and sign in to continue."}
                variant="warning"
                confirmText="Understood"
                cancelText="Close"
            />
        </div>
    )
}
