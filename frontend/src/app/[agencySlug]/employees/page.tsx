"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import api from "@/lib/api"
import {
    PageHeader,
    CreateButton,
    StatCard,
    DataTable,
    PageLoading,
    StatusBadge,
    TableRowEmpty,
    RowViewButton,
    RowEditButton,
    ControlPanel,
    SectionHeading
} from "@/components/ui/design-system"
import { Badge } from "@/components/ui/badge"
import { useAuthStore } from "@/store/authStore"
import { usePermission } from "@/hooks/usePermission"
import { PermissionGuard } from "@/components/common/PermissionGuard"
import { motion, AnimatePresence } from "framer-motion"
import { FormModal } from "@/components/common/FormModal"
import { TableCell } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertModal } from "@/components/ui/alert-modal"
import {
    Users,
    UserCheck,
    Shield,
    Plus,
    Filter,
    ShieldCheck,
    Calculator,
    Wallet,
    Trash2,
    Mail,
    Phone,
    Settings2,
    Search,
    Building2,
    Lock,
    AlertTriangle,
    X,
} from "lucide-react"
import { toast } from "@/components/ui/sonner"
import { EmployeeForm } from "@/components/agency/EmployeeForm"
import { AssignProjectDialog } from "@/components/agency/AssignProjectDialog"
import { DesignationManager } from "@/components/agency/DesignationManager"
import { SearchBar } from "@/components/common/SearchBar"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const ROLE_RANK: Record<string, number> = {
    "agency admin": 4,
    "hr": 3,
    "supervisor": 2,
    "guard": 1,
}

const ROLE_DISPLAY_ORDER: Record<string, number> = {
    "agency admin": 5,
    "hr": 4,
    "supervisor": 3,
    "guard": 2,
}

const ROLE_ALIASES: Record<string, string> = {
    "agency admin": "agency admin",
    "hr": "hr",
    "human resources": "hr",
    "supervisor": "supervisor",
    "guard": "guard",
    "guards": "guard",
}

const normalizeRoleName = (name?: string | null) =>
    (name || "")
        .toLowerCase()
        .replace(/[^a-z\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim()

const getCanonicalRoleName = (name?: string | null) => {
    const normalized = normalizeRoleName(name)
    if (!normalized) return ""

    if (ROLE_ALIASES[normalized]) return ROLE_ALIASES[normalized]

    if (normalized.includes("agency") && normalized.includes("admin")) return "agency admin"
    if (normalized.includes("human resource") || /(^|\s)hr(\s|$)/.test(normalized)) return "hr"
    if (normalized.includes("supervisor")) return "supervisor"
    if (normalized.includes("guard")) return "guard"

    return normalized
}

const getRoleRank = (name?: string | null) => ROLE_RANK[getCanonicalRoleName(name)] ?? 0
const getRoleDisplayOrder = (name?: string | null) => ROLE_DISPLAY_ORDER[getCanonicalRoleName(name)] ?? 0

export default function EmployeesPage() {
    const router = useRouter()
    const params = useParams<{ agencySlug?: string | string[] }>()
    const currentAgencySlug = Array.isArray(params?.agencySlug) ? params.agencySlug[0] : params?.agencySlug
    const { user, logout } = useAuthStore()
    const [employees, setEmployees] = useState<any[]>([])
    const [designations, setDesignations] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [editingEmployee, setEditingEmployee] = useState<any | null>(null)
    const [openEnroll, setOpenEnroll] = useState(false)

    // Profile State
    const [profileDialog, setProfileDialog] = useState<{ open: boolean, employee: any | null }>({
        open: false,
        employee: null
    })

    const [deleting, setDeleting] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [roleActionLoading, setRoleActionLoading] = useState<"promote" | "demote" | null>(null)
    const [roleActionConfirm, setRoleActionConfirm] = useState<{ open: boolean, action: "promote" | "demote" | null, roleId: string }>({
        open: false,
        action: null,
        roleId: "",
    })
    const [roles, setRoles] = useState<any[]>([])
    const [selectedPromoteRoleId, setSelectedPromoteRoleId] = useState("")
    const [selectedDemoteRoleId, setSelectedDemoteRoleId] = useState("")
    const [showSelfDemotionModal, setShowSelfDemotionModal] = useState(false)
    const [selfDemotionLoggingOut, setSelfDemotionLoggingOut] = useState(false)
    
    // Assignment Dialog State
    const [assignDialog, setAssignDialog] = useState<{ open: boolean, employee: any | null }>({
        open: false,
        employee: null
    })

    const { hasPermission, isAdmin } = usePermission();
    const canManageRoles = hasPermission('manage_roles')
    const canPromoteEmployee = hasPermission('promote_employee') || isAdmin
    const canDemoteEmployee = hasPermission('demote_employee') || isAdmin
    const canAccessRoleActions = canManageRoles || canPromoteEmployee || canDemoteEmployee

    const fetchData = async () => {
        if (!user) return
        try {
            const [empRes, desRes, rolesRes] = await Promise.allSettled([
                hasPermission('view_employee') ? api.get("/employees") : Promise.resolve({ data: [] }),
                hasPermission(['view_employee', 'create_employee', 'edit_employee', 'manage_roles']) ? api.get("/designations") : Promise.resolve({ data: [] }),
                canAccessRoleActions ? api.get("/roles") : Promise.resolve({ data: [] })
            ])

            if (empRes.status === 'fulfilled') setEmployees(empRes.value.data)
            if (desRes.status === 'fulfilled') setDesignations(desRes.value.data)
            if (rolesRes.status === 'fulfilled') setRoles(rolesRes.value.data)
        } catch (error) {
            toast.error("Failed to load operational roster.")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (user) fetchData()
    }, [user, canAccessRoleActions])

    const handleDeleteEmployee = async () => {
        if (!profileDialog.employee) return
        setShowDeleteModal(true)
    }

    const confirmDeleteEmployee = async () => {
        if (!profileDialog.employee) return
        setDeleting(true)
        try {
            await api.delete(`/employees/${profileDialog.employee.id}`)
            toast.success("Employee record deleted.")
            setProfileDialog({ open: false, employee: null })
            fetchData()
        } catch (error: any) {
            const backendMessage = error?.response?.data?.message
            const message = Array.isArray(backendMessage)
                ? backendMessage.join(", ")
                : backendMessage || error?.message || "Termination failed."
            toast.error(message)
        } finally {
            setDeleting(false)
            setShowDeleteModal(false)
        }
    }

    const handleRoleAction = async (action: "promote" | "demote", roleId: string) => {
        if (!profileDialog.employee) return
        if (!roleId) {
            toast.error(`Please select a role to ${action}.`)
            return
        }

        setRoleActionLoading(action)
        try {
            const response = await api.patch(`/employees/${profileDialog.employee.id}/${action}`, { roleId })
            if (action === "demote") {
                if (response?.data?.selfDemotion) {
                    setShowSelfDemotionModal(true)
                    return
                }

                toast.success("Employee demoted successfully")
            } else {
                toast.success(response?.data?.message || "Employee promoted successfully")
            }

            const updatedUser = response?.data?.user
            if (updatedUser) {
                setProfileDialog((prev) => ({
                    open: true,
                    employee: prev.employee
                        ? {
                            ...prev.employee,
                            user: updatedUser,
                        }
                        : prev.employee,
                }))
            }

            await fetchData()
        } catch (error: any) {
            const backendMessage = error?.response?.data?.message
            const message = Array.isArray(backendMessage)
                ? backendMessage.join(", ")
                : backendMessage || error?.message || `Failed to ${action} employee.`
            toast.error(message)
        } finally {
            setRoleActionLoading(null)
        }
    }

    const openRoleActionConfirm = (action: "promote" | "demote", roleId: string) => {
        if (!roleId) {
            toast.error(`Please select a role to ${action}.`)
            return
        }

        setRoleActionConfirm({
            open: true,
            action,
            roleId,
        })
    }

    const handleSelfDemotionLogout = async () => {
        if (selfDemotionLoggingOut) return

        setSelfDemotionLoggingOut(true)
        try {
            await api.post("/auth/logout")
        } catch { }

        logout()
        if (currentAgencySlug) {
            window.location.replace(`/${currentAgencySlug}/staff-login`)
            return
        }

        router.replace("/")
    }

    const handleViewEmployee = (emp: any) => {
        setProfileDialog({ open: true, employee: emp })
    }

    const visibleEmployees = employees.filter((emp: any) => Boolean(emp.user))
    const userRoleName = getCanonicalRoleName(profileDialog.employee?.user?.role?.name)
    const designationRoleName = getCanonicalRoleName(profileDialog.employee?.designation?.name)
    const currentRoleName = getRoleRank(userRoleName) > 0 ? userRoleName : designationRoleName || userRoleName
    const currentRoleRank = getRoleRank(currentRoleName)
    const currentRoleId = profileDialog.employee?.user?.role?.id

    const roleCandidates = roles.filter((role) => {
        const roleKey = getCanonicalRoleName(role.name)
        if (!(roleKey in ROLE_RANK)) return false
        if (currentRoleId && role.id === currentRoleId) return false
        if (!currentRoleId && roleKey === currentRoleName) return false
        return true
    })

    const promotableRoles = roleCandidates
        .filter((role) => getRoleRank(role.name) > currentRoleRank)
        .sort((a, b) => {
            const rankDiff = getRoleRank(a.name) - getRoleRank(b.name)
            if (rankDiff !== 0) return rankDiff
            const orderDiff = getRoleDisplayOrder(a.name) - getRoleDisplayOrder(b.name)
            if (orderDiff !== 0) return orderDiff
            return a.name.localeCompare(b.name)
        })

    const demotableRoles = roleCandidates
        .filter((role) => getRoleRank(role.name) < currentRoleRank)
        .sort((a, b) => {
            const rankDiff = getRoleRank(b.name) - getRoleRank(a.name)
            if (rankDiff !== 0) return rankDiff
            const orderDiff = getRoleDisplayOrder(b.name) - getRoleDisplayOrder(a.name)
            if (orderDiff !== 0) return orderDiff
            return a.name.localeCompare(b.name)
        })

    const availablePromotableRoles = canPromoteEmployee
        ? promotableRoles.filter((role) => isAdmin || getCanonicalRoleName(role.name) !== "agency admin")
        : []
    const canDemoteCurrentEmployee = canDemoteEmployee && (isAdmin || currentRoleName !== "agency admin")
    const isProfileDialogOpen = profileDialog.open && Boolean(profileDialog.employee)

    const confirmedTargetRole = roles.find((role) => role.id === roleActionConfirm.roleId)
    const confirmedTargetRoleName = confirmedTargetRole?.name || "the selected role"
    const profileEmployee = profileDialog.employee
    const profilePermissions = profileEmployee?.user?.role?.permissions ?? []
    const profileSalary = profileEmployee?.basicSalary != null
        ? `${profileEmployee?.salaryCurrency || ""} ${Number(profileEmployee.basicSalary).toLocaleString()}`.trim()
        : "Not set"

    useEffect(() => {
        if (!profileDialog.open) return

        if (!availablePromotableRoles.some((role) => role.id === selectedPromoteRoleId)) {
            setSelectedPromoteRoleId(availablePromotableRoles[0]?.id || "")
        }

        if (!demotableRoles.some((role) => role.id === selectedDemoteRoleId)) {
            setSelectedDemoteRoleId(demotableRoles[0]?.id || "")
        }
    }, [profileDialog.open, availablePromotableRoles, demotableRoles, selectedPromoteRoleId, selectedDemoteRoleId])

    const filteredEmployees = visibleEmployees.filter((emp: any) =>
        emp.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.employeeCode?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (loading) return <PageLoading message="Synchronizing Employees..." />

    return (
        <div className="space-y-10 pb-20">
            <PageHeader
                title="Employee"
                titleHighlight="Directory"
                subtitle="High-fidelity lifecycle management and deployment of agency security staff."
                action={
                    <PermissionGuard permission="create_employee">
                        <CreateButton
                            label="Add Employee"
                            icon={<Plus className="h-4 w-4" />}
                            onClick={() => { setEditingEmployee(null); setOpenEnroll(true) }}
                        />
                    </PermissionGuard>
                }
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Total Employees" value={visibleEmployees.length} icon={<Users className="text-teal-700" />} color="teal" />
                <StatCard title="Active Status" value={visibleEmployees.filter((e: any) => e.status === 'ACTIVE').length} icon={<UserCheck className="text-green-700" />} color="emerald" />
                <StatCard title="Designations" value={designations.length} icon={<Shield className="text-sky-700" />} color="blue" />
            </div>

            <Tabs defaultValue="staff" className="space-y-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <TabsList className="bg-white rounded-2xl p-2 h-auto border border-border w-fit">
                        <TabsTrigger value="staff" className="rounded-xl font-semibold text-[16px] leading-none data-[state=active]:bg-primary data-[state=active]:text-white px-6 py-3 text-slate-600">
                            <Users className="h-4 w-4 mr-2" />
                            Active Employees
                        </TabsTrigger>
                        <TabsTrigger value="designations" className="rounded-xl font-semibold text-[16px] leading-none data-[state=active]:bg-primary data-[state=active]:text-white px-6 py-3 text-slate-600">
                            <Settings2 className="h-4 w-4 mr-2" />
                            Designations
                        </TabsTrigger>
                    </TabsList>

                    <ControlPanel count={filteredEmployees.length} totalLabel="Registered Employees" className="mb-0 flex-1 md:max-w-xl">
                        <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search employee by name or ID..." className="bg-white border border-border text-slate-900 placeholder:text-slate-400" />
                    </ControlPanel>
                </div>

                <TabsContent value="staff" className="mt-0 outline-none">
                    <DataTable columns={['Employee Profile', 'Role / Designation', 'Monthly Salary', 'Status', 'Actions']}>
                        <AnimatePresence mode="popLayout">
                            {filteredEmployees.length === 0 ? (
                                <TableRowEmpty
                                    colSpan={5}
                                    title="No Record Identified"
                                    description="Register new employee to initialize the database."
                                    icon={<Users className="h-10 w-10 text-slate-300" />}
                                />
                            ) : (
                                filteredEmployees.map((emp, idx) => (
                                    <motion.tr
                                        key={emp.id}
                                        initial={{ opacity: 0, scale: 0.98 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.98 }}
                                        transition={{ duration: 0.2, delay: idx * 0.03 }}
                                        className="group transition-colors"
                                    >
                                        <TableCell className="py-4">
                                            <div className="flex items-center gap-4">
                                                <Avatar className="h-12 w-12 rounded-xl border border-border shadow-sm transition-all group-hover:scale-105 bg-white">
                                                    <AvatarFallback className="bg-slate-100 text-slate-700 font-semibold uppercase">
                                                        {emp.fullName?.slice(0, 2)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0">
                                                    <div className="font-semibold text-slate-900 leading-tight truncate">{emp.fullName}</div>
                                                    <div className="text-[12px] text-slate-500 mt-1">{emp.employeeCode || `ID: ${emp.id.slice(-6).toUpperCase()}`}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center border border-cyan-100 shadow-sm">
                                                    <ShieldCheck className="h-4.5 w-4.5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-slate-900 text-[14px] truncate">{emp.user?.role?.name || emp.designation?.name || "Unranked"}</p>
                                                    <p className="text-[12px] font-medium text-slate-500">Current access role</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-slate-900 text-sm">{emp.salaryCurrency} {emp.basicSalary?.toLocaleString()}</span>
                                                <span className="text-[12px] text-slate-500">Monthly salary</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge status={emp.status || "ACTIVE"} />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <RowViewButton
                                                    onClick={() => handleViewEmployee(emp)}
                                                />
                                                <PermissionGuard permission="edit_project">
                                                    <Button
                                                        onClick={() => setAssignDialog({ open: true, employee: emp })}
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-9 px-3 rounded-xl border-blue-200 hover:bg-blue-50 hover:border-blue-300 transition-all"
                                                    >
                                                        <Building2 className="h-3.5 w-3.5 mr-2 text-blue-600" />
                                                        <span className="text-xs font-bold">Assign</span>
                                                    </Button>
                                                </PermissionGuard>
                                                <PermissionGuard permission="edit_employee">
                                                    <RowEditButton onClick={() => { setEditingEmployee(emp); setOpenEnroll(true) }} />
                                                </PermissionGuard>
                                            </div>
                                        </TableCell>
                                    </motion.tr>
                                ))
                            )}
                        </AnimatePresence>
                    </DataTable>
                </TabsContent>

                <TabsContent value="designations" className="mt-0 outline-none">
                    <DesignationManager
                        onUpdate={() => fetchData()}
                        designations={designations}
                    />
                </TabsContent>
            </Tabs>

            <FormModal
                open={openEnroll}
                onOpenChange={(v) => { setOpenEnroll(v); if (!v) setEditingEmployee(null) }}
                title={editingEmployee ? `Update Agent Identity` : "Enroll Personnel"}
                description={editingEmployee
                    ? "Modify established credentials and mission parameters."
                    : "Initialize identity sequence for new security personnel."}
                maxWidth={640}
            >
                <EmployeeForm
                    designations={designations}
                    refetchDesignations={fetchData}
                    initialData={editingEmployee}
                    onSuccess={() => {
                        setOpenEnroll(false)
                        setEditingEmployee(null)
                        fetchData()
                    }}
                />
            </FormModal>

            {isProfileDialogOpen && (
                <div
                    className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={() => {
                        if (showSelfDemotionModal) return
                        setProfileDialog({ open: false, employee: null })
                    }}
                >
                    <div
                        data-employee-profile-dialog="true"
                        className="relative w-[calc(100vw-2rem)] max-w-[640px] max-h-[92vh] overflow-y-auto rounded-[32px] bg-white shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {!showSelfDemotionModal && (
                            <button
                                type="button"
                                aria-label="Close employee profile"
                                onClick={() => setProfileDialog({ open: false, employee: null })}
                                className="absolute right-4 top-4 z-20 rounded-lg bg-slate-100 text-slate-700 border-2 border-slate-300 hover:bg-slate-200 hover:border-slate-400 transition-colors p-2 shadow-lg"
                            >
                                <X className="h-4 w-4 stroke-[3]" />
                            </button>
                        )}

                        <div className="bg-white p-5 sm:p-8 text-slate-900 relative overflow-hidden border-b border-slate-100">
                            <div className="relative flex items-center gap-4 sm:gap-6">
                                <Avatar className="h-16 w-16 sm:h-24 sm:w-24 border-4 border-slate-100 shadow-2xl rounded-[24px] sm:rounded-[32px] overflow-hidden shrink-0">
                                    <AvatarFallback className="bg-primary text-white text-xl sm:text-3xl font-black uppercase">
                                        {profileEmployee?.fullName?.slice(0, 2)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                    <div className="px-3 py-1 rounded-full bg-primary/20 text-primary text-[10px] font-black uppercase tracking-[0.2em] w-fit mb-3 border border-primary/20">Operational Profile</div>
                                    <h2 className="text-xl sm:text-3xl font-black tracking-tight leading-none truncate pr-12">{profileEmployee?.fullName}</h2>
                                    <p className="text-slate-500 font-black text-[10px] mt-2 uppercase tracking-[0.3em]">{profileEmployee?.employeeCode || 'DEEPLAYED_OPERATOR'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-5 sm:p-8 space-y-7 bg-white">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
                                {[
                                    { icon: <ShieldCheck />, label: 'Role / Designation', value: profileEmployee?.user?.role?.name || profileEmployee?.designation?.name || "UNSET" },
                                    { icon: <Wallet />, label: 'Monthly Salary', value: profileSalary },
                                    { icon: <Mail />, label: 'Email', value: profileEmployee?.email || "NOT_SET", truncate: true },
                                    { icon: <Phone />, label: 'Phone Number', value: profileEmployee?.phoneNumber || "NOT_SET" },
                                ].map((item) => (
                                    <div key={item.label} className="space-y-2">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                            <span className="text-primary">{item.icon}</span> {item.label}
                                        </p>
                                        <p className={cn("text-[13px] font-black text-slate-900 tracking-tight", item.truncate && "truncate")}>{item.value}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-4">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Lock className="h-3 w-3 text-primary" /> Active Permissions
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {profilePermissions.map((p: any) => (
                                        <Badge key={p.id} variant="secondary" className="bg-slate-50 text-slate-600 border border-slate-100 font-bold text-[9px] uppercase px-3 py-1">
                                            {p.permission?.name?.replaceAll('_', ' ')}
                                        </Badge>
                                    ))}
                                    {profilePermissions.length === 0 && (
                                        <p className="text-[11px] text-slate-400 italic font-medium">No external permissions granted to this node.</p>
                                    )}
                                </div>
                            </div>

                            <div className="pt-6 border-t border-slate-50 flex flex-col gap-4">
                                <div className="flex flex-col">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee Management</p>
                                    <p className="text-[11px] text-slate-400 font-medium font-italic">Record deletion requires confirmation.</p>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {canPromoteEmployee && (
                                        <div className="space-y-2 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-3">
                                            <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Promote To</p>
                                            <Select value={selectedPromoteRoleId} onValueChange={setSelectedPromoteRoleId}>
                                                <SelectTrigger className="h-10 bg-white border-emerald-200 text-slate-900">
                                                    <SelectValue placeholder={availablePromotableRoles.length ? "Select role" : "No higher role available"} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {availablePromotableRoles.map((role) => (
                                                        <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Button
                                                variant="outline"
                                                disabled={roleActionLoading !== null || !selectedPromoteRoleId}
                                                onClick={() => openRoleActionConfirm("promote", selectedPromoteRoleId)}
                                                className="w-full rounded-xl border-emerald-300 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-400 font-semibold"
                                            >
                                                {roleActionLoading === "promote" ? "Promoting..." : "Promote"}
                                            </Button>
                                        </div>
                                    )}

                                    {canDemoteCurrentEmployee && (
                                        <div className="space-y-2 rounded-2xl border border-amber-100 bg-amber-50/40 p-3">
                                            <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">Demote To</p>
                                            <Select value={selectedDemoteRoleId} onValueChange={setSelectedDemoteRoleId}>
                                                <SelectTrigger className="h-10 bg-white border-amber-200 text-slate-900">
                                                    <SelectValue placeholder={demotableRoles.length ? "Select role" : "No lower role available"} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {demotableRoles.map((role) => (
                                                        <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Button
                                                variant="outline"
                                                disabled={roleActionLoading !== null || !selectedDemoteRoleId}
                                                onClick={() => openRoleActionConfirm("demote", selectedDemoteRoleId)}
                                                className="w-full rounded-xl border-amber-300 text-amber-700 hover:bg-amber-100 hover:border-amber-400 font-semibold"
                                            >
                                                {roleActionLoading === "demote" ? "Demoting..." : "Demote"}
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                    <div className="text-[11px] text-slate-500">
                                        Roles are fetched from your configured role/designation list.
                                    </div>
                                    <PermissionGuard permission="delete_employee">
                                        <Button
                                            variant="destructive"
                                            disabled={deleting}
                                            onClick={handleDeleteEmployee}
                                            className="bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border-none rounded-2xl font-black text-[10px] px-8 h-12 shadow-xl shadow-rose-100 transition-all active:scale-95"
                                        >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            {deleting ? "DELETING..." : "DELETE RECORD"}
                                        </Button>
                                    </PermissionGuard>
                                </div>
                            </div>
                        </div>

                        {showSelfDemotionModal && (
                            <div className="absolute inset-0 z-30 bg-slate-900/55 backdrop-blur-sm flex items-center justify-center p-4">
                                <div className="w-full max-w-md rounded-[28px] bg-white shadow-2xl border border-slate-100 p-7 text-center">
                                    <div className="mx-auto mb-5 h-16 w-16 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center">
                                        <AlertTriangle className="h-8 w-8 text-amber-600" />
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Your role has been changed</h3>
                                    <p className="mt-3 text-sm font-semibold text-slate-600 leading-relaxed">
                                        You have been demoted back to Staff. You will be logged out automatically. Please login through the Staff portal.
                                    </p>
                                    <Button
                                        type="button"
                                        onClick={handleSelfDemotionLogout}
                                        disabled={selfDemotionLoggingOut}
                                        className="mt-7 w-full h-12 rounded-2xl bg-[#06b6d4] hover:bg-cyan-600 text-white font-black"
                                    >
                                        {selfDemotionLoggingOut ? "Logging out..." : "Logout Now"}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <AlertModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={confirmDeleteEmployee}
                loading={deleting}
                title="DELETE EMPLOYEE RECORD"
                variant="danger"
                description={`Are you sure you want to delete ${profileDialog.employee?.fullName}? This action is irreversible and will remove all employment history.`}
                confirmText="Delete Record"
            />

            <AlertModal
                isOpen={roleActionConfirm.open}
                onClose={() => setRoleActionConfirm({ open: false, action: null, roleId: "" })}
                onConfirm={async () => {
                    if (!roleActionConfirm.action || !roleActionConfirm.roleId) return
                    await handleRoleAction(roleActionConfirm.action, roleActionConfirm.roleId)
                    setRoleActionConfirm({ open: false, action: null, roleId: "" })
                }}
                loading={roleActionLoading !== null}
                title={roleActionConfirm.action === "demote" ? "CONFIRM DEMOTION" : "CONFIRM PROMOTION"}
                variant={roleActionConfirm.action === "demote" ? "danger" : "success"}
                description={
                    roleActionConfirm.action === "demote"
                        ? `Are you sure you want to demote ${profileDialog.employee?.fullName} to ${confirmedTargetRoleName}?`
                        : `Are you sure you want to promote ${profileDialog.employee?.fullName} to ${confirmedTargetRoleName}?`
                }
                confirmText={roleActionConfirm.action === "demote" ? "Confirm Demotion" : "Confirm Promotion"}
            />

            {/* Assign Project Dialog */}
            <AssignProjectDialog
                employee={assignDialog.employee}
                open={assignDialog.open}
                onOpenChange={(open) => !open && setAssignDialog({ open: false, employee: null })}
                onSuccess={fetchData}
            />

        </div>
    )
}
