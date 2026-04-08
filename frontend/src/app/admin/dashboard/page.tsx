"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import api from "@/lib/api"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Eye, EyeOff, Plus, Building2, Shield, Users, Power, PowerOff, UserCog } from "lucide-react"
import { RowEditButton, RowDeleteButton, StatCard } from "@/components/ui/design-system"
import { FormModal } from "@/components/common/FormModal"
import { AgencyForm } from "@/components/admin/AgencyForm"
import { toast } from "@/components/ui/sonner"
import { Card } from "@/components/ui/card"
import { AlertModal } from "@/components/ui/alert-modal"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TableRowEmpty, TableRowLoading } from "@/components/ui/design-system"
import { Input } from "@/components/ui/input"

type AgencyAdmin = {
    id: string
    name?: string
    fullName?: string
    email: string
    isActive: boolean
    roleName?: string
}

type StaffRole = {
    id: string
    name: string
}

type AdminFormState = {
    name: string
    email: string
    password: string
    confirmPassword: string
}

const initialAdminFormState: AdminFormState = {
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
}

export default function AdminDashboard() {
    const [agencies, setAgencies] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [open, setOpen] = useState(false)
    const [editingAgency, setEditingAgency] = useState<any>(null)
    const [deleteModal, setDeleteModal] = useState<{ open: boolean, id: string, name: string }>({
        open: false,
        id: "",
        name: ""
    })
    const [isDeleting, setIsDeleting] = useState(false)
    const [toggleModal, setToggleModal] = useState<{ open: boolean, id: string, name: string, currentStatus: boolean }>({
        open: false, id: "", name: "", currentStatus: true
    })
    const [isToggling, setIsToggling] = useState(false)
    const [viewAdminsModal, setViewAdminsModal] = useState<{ open: boolean; agencyId: string; agencyName: string }>({
        open: false,
        agencyId: "",
        agencyName: "",
    })
    const [agencyAdmins, setAgencyAdmins] = useState<AgencyAdmin[]>([])
    const [isAdminsLoading, setIsAdminsLoading] = useState(false)
    const [promoteModal, setPromoteModal] = useState<{ open: boolean; admin: AgencyAdmin | null }>({ open: false, admin: null })
    const [demoteModal, setDemoteModal] = useState<{ open: boolean; admin: AgencyAdmin | null }>({ open: false, admin: null })
    const [adminDeleteModal, setAdminDeleteModal] = useState<{ open: boolean; admin: AgencyAdmin | null }>({ open: false, admin: null })
    const [suspendModal, setSuspendModal] = useState<{ open: boolean; admin: AgencyAdmin | null }>({ open: false, admin: null })
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
    const [demoteRoles, setDemoteRoles] = useState<StaffRole[]>([])
    const [selectedDemoteRoleId, setSelectedDemoteRoleId] = useState("")
    const [addAdminOpen, setAddAdminOpen] = useState(false)
    const [createAdminConfirmOpen, setCreateAdminConfirmOpen] = useState(false)
    const [demoteConfirmOpen, setDemoteConfirmOpen] = useState(false)
    const [adminFormState, setAdminFormState] = useState<AdminFormState>(initialAdminFormState)
    const [isCreatingAdmin, setIsCreatingAdmin] = useState(false)
    const [showAdminPassword, setShowAdminPassword] = useState(false)
    const [showAdminConfirmPassword, setShowAdminConfirmPassword] = useState(false)

    const agencyAdminCount = useMemo(
        () => agencyAdmins.filter((admin) => (admin.roleName || "").toLowerCase().trim() === "agency admin").length,
        [agencyAdmins],
    )
    const hasReachedAdminLimit = agencyAdminCount >= 2

    const isCreateAdminFormValid = useMemo(() => {
        const name = adminFormState.name.trim()
        const email = adminFormState.email.trim()
        const password = adminFormState.password
        const confirmPassword = adminFormState.confirmPassword
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

        return Boolean(
            name &&
            emailPattern.test(email) &&
            password &&
            confirmPassword &&
            password === confirmPassword,
        )
    }, [adminFormState])

    const selectedDemoteRoleName = useMemo(
        () => demoteRoles.find((role) => role.id === selectedDemoteRoleId)?.name || "selected position",
        [demoteRoles, selectedDemoteRoleId],
    )

    const fetchAgencies = async () => {
        try {
            const response = await api.get("/agencies", { params: { _t: Date.now() } })
            setAgencies(response.data)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!deleteModal.id) return
        setIsDeleting(true)
        try {
            await api.delete(`/agencies/${deleteModal.id}`)
            toast.success("Agency deleted successfully")
            setDeleteModal({ open: false, id: "", name: "" })
            fetchAgencies()
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to delete agency")
        } finally {
            setIsDeleting(false)
        }
    }

    const handleToggleStatus = async () => {
        if (!toggleModal.id) return
        setIsToggling(true)
        try {
            const res = await api.patch(`/agencies/${toggleModal.id}/toggle-status`)
            const newStatus = res.data.isActive
            setAgencies(prev => prev.map(a => a.id === toggleModal.id ? { ...a, isActive: newStatus } : a))
            toast.success(newStatus ? `${toggleModal.name} has been activated` : `${toggleModal.name} has been deactivated`)
            setToggleModal({ open: false, id: "", name: "", currentStatus: true })
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to update agency status")
        } finally {
            setIsToggling(false)
        }
    }

    useEffect(() => {
        fetchAgencies()
    }, [])

    const fetchAgencyAdmins = async (agencyId: string) => {
        setIsAdminsLoading(true)
        try {
            const response = await api.get(`/agencies/${agencyId}/admins`, { params: { _t: Date.now() } })
            const normalizedAdmins = (response.data || []).map((admin: AgencyAdmin) => ({
                ...admin,
                name: admin.name || admin.fullName || "Unknown",
            }))
            setAgencyAdmins(normalizedAdmins)
        } catch (error: any) {
            setAgencyAdmins([])
            toast.error(error?.response?.data?.message || "Failed to load agency admins")
        } finally {
            setIsAdminsLoading(false)
        }
    }

    const fetchDemoteRoles = async (agencyId: string) => {
        try {
            const response = await api.get(`/agencies/${agencyId}/staff-roles`, { params: { _t: Date.now() } })
            const roles = (response.data || []) as StaffRole[]
            const uniqueRoles = roles.filter((role, index, allRoles) => {
                const normalizedRoleName = role.name.trim().toLowerCase()
                return allRoles.findIndex((candidate) => candidate.name.trim().toLowerCase() === normalizedRoleName) === index
            })
            const demotableRoles = uniqueRoles.filter((role) => role.name.trim().toLowerCase() !== "staff")

            setDemoteRoles(demotableRoles)
            if (!demotableRoles.some((role) => role.id === selectedDemoteRoleId)) {
                setSelectedDemoteRoleId(demotableRoles[0]?.id || "")
            }
        } catch {
            setDemoteRoles([])
            setSelectedDemoteRoleId("")
        }
    }

    useEffect(() => {
        if (!viewAdminsModal.open || !viewAdminsModal.agencyId) {
            return
        }

        fetchAgencyAdmins(viewAdminsModal.agencyId)
        fetchDemoteRoles(viewAdminsModal.agencyId)
    }, [viewAdminsModal.open, viewAdminsModal.agencyId])

    const handlePromoteAdmin = async () => {
        if (!viewAdminsModal.agencyId || !promoteModal.admin) {
            return
        }

        setActionLoadingId(promoteModal.admin.id)
        try {
            await api.patch(`/agencies/${viewAdminsModal.agencyId}/admins/${promoteModal.admin.id}/promote`)
            toast.success("Agency Admin promoted successfully")
            setPromoteModal({ open: false, admin: null })
            await fetchAgencyAdmins(viewAdminsModal.agencyId)
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Failed to promote agency admin")
        } finally {
            setActionLoadingId(null)
        }
    }

    const requestDemoteAdminConfirmation = () => {
        if (!viewAdminsModal.agencyId || !demoteModal.admin) {
            return
        }

        if (!selectedDemoteRoleId) {
            toast.error("Please select a position for demotion")
            return
        }

        setDemoteConfirmOpen(true)
    }

    const handleDemoteAdmin = async () => {
        if (!viewAdminsModal.agencyId || !demoteModal.admin) {
            return
        }

        if (!selectedDemoteRoleId) {
            toast.error("Please select a position for demotion")
            return
        }

        setActionLoadingId(demoteModal.admin.id)
        try {
            await api.patch(`/agencies/${viewAdminsModal.agencyId}/admins/${demoteModal.admin.id}/demote`, {
                roleId: selectedDemoteRoleId,
            })
            toast.success("Agency Admin demoted successfully")
            setDemoteConfirmOpen(false)
            setDemoteModal({ open: false, admin: null })
            await fetchAgencyAdmins(viewAdminsModal.agencyId)
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Failed to demote agency admin")
        } finally {
            setActionLoadingId(null)
        }
    }

    const handleDeleteAdmin = async () => {
        if (!viewAdminsModal.agencyId || !adminDeleteModal.admin) {
            return
        }

        const deletingAdminId = adminDeleteModal.admin.id
        setActionLoadingId(deletingAdminId)
        try {
            await api.delete(`/agencies/${viewAdminsModal.agencyId}/admins/${deletingAdminId}`)
            toast.success("Agency Admin deleted successfully")
            setAgencyAdmins((prev) => prev.filter((admin) => admin.id !== deletingAdminId))
            setAdminDeleteModal({ open: false, admin: null })
            await fetchAgencyAdmins(viewAdminsModal.agencyId)
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Failed to delete agency admin")
        } finally {
            setActionLoadingId(null)
        }
    }

    const handleSuspendToggleAdmin = async () => {
        if (!viewAdminsModal.agencyId || !suspendModal.admin) {
            return
        }

        setActionLoadingId(suspendModal.admin.id)
        try {
            await api.patch(`/agencies/${viewAdminsModal.agencyId}/admins/${suspendModal.admin.id}/suspend`)
            toast.success(
                suspendModal.admin.isActive
                    ? "Admin account suspended"
                    : "Admin account activated",
            )
            setSuspendModal({ open: false, admin: null })
            await fetchAgencyAdmins(viewAdminsModal.agencyId)
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Failed to update admin status")
        } finally {
            setActionLoadingId(null)
        }
    }

    const resetAddAdminForm = () => {
        setAdminFormState(initialAdminFormState)
        setShowAdminPassword(false)
        setShowAdminConfirmPassword(false)
    }

    const validateCreateAdminForm = () => {
        if (!viewAdminsModal.agencyId) {
            toast.error("Agency id is missing")
            return false
        }

        if (hasReachedAdminLimit) {
            toast.error("Maximum 2 agency admins are allowed")
            return false
        }

        if (!adminFormState.name.trim() || !adminFormState.email.trim() || !adminFormState.password || !adminFormState.confirmPassword) {
            toast.error("All fields are required")
            return false
        }

        if (adminFormState.password !== adminFormState.confirmPassword) {
            toast.error("Passwords do not match")
            return false
        }

        return true
    }

    const openCreateAdminConfirmation = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        if (!validateCreateAdminForm()) {
            return
        }

        setCreateAdminConfirmOpen(true)
    }

    const handleCreateAdmin = async () => {
        if (!validateCreateAdminForm()) {
            return
        }

        setIsCreatingAdmin(true)
        try {
            await api.post(`/agencies/${viewAdminsModal.agencyId}/admins`, {
                name: adminFormState.name.trim(),
                email: adminFormState.email.trim(),
                password: adminFormState.password,
            })
            toast.success("Agency Admin created successfully")
            setCreateAdminConfirmOpen(false)
            setAddAdminOpen(false)
            resetAddAdminForm()
            await fetchAgencyAdmins(viewAdminsModal.agencyId)
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Failed to create agency admin")
        } finally {
            setIsCreatingAdmin(false)
        }
    }

    const closeViewAdminsModal = () => {
        setViewAdminsModal({ open: false, agencyId: "", agencyName: "" })
        setAgencyAdmins([])
        setIsAdminsLoading(false)
        setAddAdminOpen(false)
        setCreateAdminConfirmOpen(false)
        setDemoteConfirmOpen(false)
        resetAddAdminForm()
        setPromoteModal({ open: false, admin: null })
        setDemoteModal({ open: false, admin: null })
        setAdminDeleteModal({ open: false, admin: null })
        setSuspendModal({ open: false, admin: null })
        setActionLoadingId(null)
        setDemoteRoles([])
        setSelectedDemoteRoleId("")
    }

    const createdDateFormatter = useMemo(
        () => new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" }),
        [],
    )

    const agenciesWithFormattedCreatedAt = useMemo(
        () => agencies.map((agency) => ({
            ...agency,
            formattedCreatedAt: agency.createdAt ? createdDateFormatter.format(new Date(agency.createdAt)) : "",
        })),
        [agencies, createdDateFormatter],
    )

    const stats = [
        { title: "Total Agencies", value: agenciesWithFormattedCreatedAt.length.toString(), icon: Building2, color: "text-blue-600" },
        { title: "Active Deployments", value: agenciesWithFormattedCreatedAt.filter(a => a.isActive).length.toString(), icon: Shield, color: "text-emerald-600" },
        { title: "Platform Health", value: "Optimal", icon: Users, color: "text-purple-600" },
    ]

    return (
        <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 font-inter">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                        <span className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">System Level: Authoritative</span>
                    </div>
                    <h1 className="text-[28px] font-bold text-slate-900 mb-2 truncate">Infrastructure Command</h1>
                    <p className="text-[14px] text-slate-500 truncate flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary" />
                        Global Network Node Management
                    </p>
                </div>

                <FormModal
                    open={open}
                    onOpenChange={(val) => {
                        setOpen(val)
                        if (!val) setEditingAgency(null)
                    }}
                    title={editingAgency ? "Edit Agency" : "Create Agency"}
                    description={editingAgency
                        ? "Update agency details and access settings."
                        : "Provision a new agency portal and operational node."}
                    maxWidth={640}
                    trigger={
                        <Button
                            variant="primary"
                            size="cta"
                            onClick={() => {
                                setEditingAgency(null)
                                setOpen(true)
                            }}
                            className="w-full md:w-auto"
                        >
                            <Plus className="h-4 w-4" />
                            New Agency
                        </Button>
                    }
                >
                    <AgencyForm
                        initialData={editingAgency}
                        onSuccess={() => {
                            setOpen(false)
                            setEditingAgency(null)
                            fetchAgencies()
                        }}
                    />
                </FormModal>
            </div>

            {/* Stat Matrix */}
            <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
                {stats.map((stat) => (
                    <StatCard
                        key={stat.title}
                        title={stat.title}
                        value={stat.value}
                        icon={<stat.icon className="h-6 w-6" />}
                        color={stat.color.includes('blue') ? 'blue' : stat.color.includes('emerald') ? 'emerald' : 'violet'}
                        className="h-full"
                    />
                ))}
            </div>

            {/* Data Table */}
            <Card className="overflow-hidden">
                <div className="px-4 sm:px-6 py-5 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-[20px] font-semibold text-slate-900">Network Directory</h3>
                        <p className="text-[14px] text-slate-500 mt-1">Active infrastructure nodes and agency portals.</p>
                    </div>
                    <Badge variant="secondary">{agenciesWithFormattedCreatedAt.length} total</Badge>
                </div>
                <div className="overflow-x-auto scrollbar-hide">
                    <Table className="min-w-[800px]">
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="pl-4 sm:pl-6">Agency</TableHead>
                                <TableHead>Portal</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead className="text-right pr-4 sm:pr-6">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRowLoading colSpan={5} message="Loading agencies..." />
                            ) : agenciesWithFormattedCreatedAt.length === 0 ? (
                                <TableRowEmpty
                                    colSpan={5}
                                    title="No agencies found"
                                    description="Create your first agency."
                                    icon={<Building2 className="h-6 w-6 text-[#06b6d4]" />}
                                />
                            ) : (
                                agenciesWithFormattedCreatedAt.map((agency) => (
                                    <TableRow key={agency.id} className="group/row">
                                        <TableCell className="pl-4 sm:pl-6">
                                            <div className="flex flex-col gap-2">
                                                <span className="text-[14px] font-semibold text-slate-900">{agency.name}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[12px] text-slate-500">NODE_{agency.id.slice(-6).toUpperCase()}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                                                <code className="text-[12px] font-medium text-[#06b6d4] bg-cyan-50 px-3 py-1 rounded-lg border border-cyan-100">
                                                    /{agency.slug}
                                                </code>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={agency.isActive ? "success" : "destructive"}>
                                                {agency.isActive ? "Active" : "Inactive"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-slate-600">{agency.formattedCreatedAt}</TableCell>
                                        <TableCell className="pr-4 sm:pr-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="border-[#06b6d4] text-[#06b6d4] hover:bg-cyan-50 hover:text-[#0891b2]"
                                                    onClick={() => setViewAdminsModal({ open: true, agencyId: agency.id, agencyName: agency.name })}
                                                >
                                                    View Admins
                                                </Button>
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => setToggleModal({ open: true, id: agency.id, name: agency.name, currentStatus: agency.isActive })}
                                                >
                                                    {agency.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                                                    {agency.isActive ? "Deactivate" : "Activate"}
                                                </Button>
                                                <RowEditButton label="Edit" onClick={() => { setEditingAgency(agency); setOpen(true) }} />
                                                <RowDeleteButton label="Delete" onClick={() => setDeleteModal({ open: true, id: agency.id, name: agency.name })} />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            <FormModal
                open={viewAdminsModal.open}
                onOpenChange={(nextOpen) => {
                    if (!nextOpen) {
                        closeViewAdminsModal()
                    }
                }}
                title={`${viewAdminsModal.agencyName || "Agency"} Admins`}
                description="View administrator accounts for this agency."
                maxWidth={900}
            >
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {agencyAdminCount}/2 Agency Admins Active
                    </p>
                    <div className="flex items-center gap-3">
                        {hasReachedAdminLimit && (
                            <p className="text-xs font-semibold text-amber-700">Maximum 2 admins reached</p>
                        )}
                        <Button
                            size="sm"
                            className="bg-[#06b6d4] hover:bg-[#0891b2] text-white"
                            disabled={hasReachedAdminLimit || !viewAdminsModal.agencyId}
                            onClick={() => setAddAdminOpen(true)}
                        >
                            <Plus className="h-4 w-4" />
                            Add New Admin
                        </Button>
                    </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="h-12 px-5 text-xs font-semibold text-slate-500 uppercase">Name</TableHead>
                                <TableHead className="h-12 px-5 text-xs font-semibold text-slate-500 uppercase">Email</TableHead>
                                <TableHead className="h-12 px-5 text-xs font-semibold text-slate-500 uppercase">Role</TableHead>
                                <TableHead className="h-12 px-5 text-xs font-semibold text-slate-500 uppercase">Status</TableHead>
                                <TableHead className="h-12 px-5 text-right text-xs font-semibold text-slate-500 uppercase">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isAdminsLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="py-16 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="h-7 w-7 border-2 border-[#06b6d4] border-t-transparent rounded-full animate-spin" />
                                            <p className="text-sm text-slate-500">Loading admins...</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : agencyAdmins.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="py-16 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="h-12 w-12 rounded-xl bg-slate-50 flex items-center justify-center">
                                                <UserCog className="h-6 w-6 text-slate-300" />
                                            </div>
                                            <p className="text-sm font-semibold text-slate-500">No agency admins found</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                agencyAdmins.map((admin) => (
                                    <TableRow key={admin.id} className="hover:bg-slate-50">
                                        <TableCell className="px-5 py-4 text-sm font-semibold text-[#0f172a]">{admin.name || admin.fullName || "Unknown"}</TableCell>
                                        <TableCell className="px-5 py-4 text-sm text-slate-600">{admin.email}</TableCell>
                                        <TableCell className="px-5 py-4 text-sm text-slate-600">{admin.roleName || "Agency Admin"}</TableCell>
                                        <TableCell className="px-5 py-4">
                                            <span
                                                className={admin.isActive
                                                    ? "inline-flex items-center rounded-full bg-emerald-100 text-emerald-700 px-3 py-1 text-xs font-semibold"
                                                    : "inline-flex items-center rounded-full bg-red-100 text-red-700 px-3 py-1 text-xs font-semibold"
                                                }
                                            >
                                                {admin.isActive ? "Active" : "Suspended"}
                                            </span>
                                        </TableCell>
                                        <TableCell className="px-5 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="border-[#06b6d4] text-[#06b6d4] hover:bg-cyan-50"
                                                    disabled={actionLoadingId === admin.id}
                                                    onClick={() => setSuspendModal({ open: true, admin })}
                                                >
                                                    {admin.isActive ? "Suspend" : "Activate"}
                                                </Button>
                                                {(admin.roleName || "").toLowerCase().trim() === "agency admin" ? (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="border-red-300 text-red-600 hover:bg-red-50"
                                                        disabled={actionLoadingId === admin.id}
                                                        onClick={() => {
                                                            if (!selectedDemoteRoleId && demoteRoles.length) {
                                                                setSelectedDemoteRoleId(demoteRoles[0].id)
                                                            }
                                                            setDemoteModal({ open: true, admin })
                                                        }}
                                                    >
                                                        Demote
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="border-[#06b6d4] text-[#06b6d4] hover:bg-cyan-50"
                                                        disabled={actionLoadingId === admin.id}
                                                        onClick={() => setPromoteModal({ open: true, admin })}
                                                    >
                                                        Promote
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="border-red-300 text-red-600 hover:bg-red-50"
                                                    disabled={actionLoadingId === admin.id}
                                                    onClick={() => setAdminDeleteModal({ open: true, admin })}
                                                >
                                                    Delete
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
                <div className="pt-4 flex justify-end">
                    <Button variant="outline" onClick={closeViewAdminsModal}>Close</Button>
                </div>
            </FormModal>

            <FormModal
                open={addAdminOpen}
                onOpenChange={(nextOpen) => {
                    if (nextOpen && hasReachedAdminLimit) {
                        return
                    }
                    setAddAdminOpen(nextOpen)
                    if (!nextOpen) {
                        setCreateAdminConfirmOpen(false)
                        resetAddAdminForm()
                    }
                }}
                title={`Add Admin for ${viewAdminsModal.agencyName || "Agency"}`}
                description="Create a new Agency Admin account"
                maxWidth={560}
            >
                <form className="space-y-5" onSubmit={openCreateAdminConfirmation}>
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-[#0f172a]">Name <span className="text-[#06b6d4]">*</span></label>
                        <Input
                            value={adminFormState.name}
                            onChange={(e) => setAdminFormState((prev) => ({ ...prev, name: e.target.value }))}
                            placeholder="Enter full name"
                            required
                            className="h-11"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-[#0f172a]">Email <span className="text-[#06b6d4]">*</span></label>
                        <Input
                            type="email"
                            value={adminFormState.email}
                            onChange={(e) => setAdminFormState((prev) => ({ ...prev, email: e.target.value }))}
                            placeholder="admin@example.com"
                            required
                            className="h-11"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-[#0f172a]">Password <span className="text-[#06b6d4]">*</span></label>
                        <div className="relative">
                            <Input
                                type={showAdminPassword ? "text" : "password"}
                                value={adminFormState.password}
                                onChange={(e) => setAdminFormState((prev) => ({ ...prev, password: e.target.value }))}
                                placeholder="Enter password"
                                required
                                className="h-11 pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowAdminPassword((prev) => !prev)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-[#06b6d4]"
                                aria-label={showAdminPassword ? "Hide password" : "Show password"}
                            >
                                {showAdminPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-[#0f172a]">Confirm Password <span className="text-[#06b6d4]">*</span></label>
                        <div className="relative">
                            <Input
                                type={showAdminConfirmPassword ? "text" : "password"}
                                value={adminFormState.confirmPassword}
                                onChange={(e) => setAdminFormState((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                                placeholder="Re-enter password"
                                required
                                className="h-11 pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowAdminConfirmPassword((prev) => !prev)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-[#06b6d4]"
                                aria-label={showAdminConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                            >
                                {showAdminConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                    <div className="pt-2 flex justify-end gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            className="h-11 px-6"
                            disabled={isCreatingAdmin}
                            onClick={() => {
                                setAddAdminOpen(false)
                                resetAddAdminForm()
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="h-11 px-6 bg-[#06b6d4] hover:bg-[#0891b2] text-white"
                            disabled={isCreatingAdmin || !isCreateAdminFormValid || hasReachedAdminLimit}
                        >
                            {isCreatingAdmin ? "Creating..." : "Create Admin"}
                        </Button>
                    </div>
                </form>
            </FormModal>

            <AlertModal
                isOpen={createAdminConfirmOpen}
                onClose={() => setCreateAdminConfirmOpen(false)}
                onConfirm={handleCreateAdmin}
                loading={isCreatingAdmin}
                title="Create New Agency Admin?"
                description={
                    <div className="space-y-1 text-left">
                        <p>This will create an admin account for this agency.</p>
                        <p><span className="font-semibold text-slate-700">Name:</span> {adminFormState.name.trim()}</p>
                        <p><span className="font-semibold text-slate-700">Email:</span> {adminFormState.email.trim()}</p>
                    </div>
                }
                variant="primary"
                confirmText="Confirm Create"
                cancelText="Cancel"
            />

            <AlertModal
                isOpen={promoteModal.open}
                onClose={() => setPromoteModal({ open: false, admin: null })}
                onConfirm={handlePromoteAdmin}
                loading={Boolean(actionLoadingId && promoteModal.admin?.id === actionLoadingId)}
                title={`Promote ${promoteModal.admin?.name || promoteModal.admin?.fullName || "this user"} to Agency Admin?`}
                description="They will regain full agency admin access."
                variant="primary"
                confirmText="Confirm Promote"
                cancelText="Cancel"
            />

            <AlertModal
                isOpen={demoteModal.open}
                onClose={() => setDemoteModal({ open: false, admin: null })}
                onConfirm={requestDemoteAdminConfirmation}
                loading={false}
                title={`Demote ${demoteModal.admin?.name || demoteModal.admin?.fullName || "this user"} from Agency Admin?`}
                description={
                    <div className="space-y-3 text-left">
                        <p>They will lose all admin access. Select the staff position to assign.</p>
                        <div className="space-y-1.5">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Demote To Position</p>
                            <Select value={selectedDemoteRoleId} onValueChange={setSelectedDemoteRoleId}>
                                <SelectTrigger className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700">
                                    <SelectValue placeholder="Select position" />
                                </SelectTrigger>
                                <SelectContent>
                                    {demoteRoles.map((role) => (
                                        <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                }
                variant="danger"
                confirmText="Continue"
                cancelText="Cancel"
            />

            <AlertModal
                isOpen={demoteConfirmOpen}
                onClose={() => setDemoteConfirmOpen(false)}
                onConfirm={handleDemoteAdmin}
                loading={Boolean(actionLoadingId && demoteModal.admin?.id === actionLoadingId)}
                title="Confirm Demotion?"
                description={`This will remove admin access and assign ${demoteModal.admin?.name || demoteModal.admin?.fullName || "this user"} to ${selectedDemoteRoleName}.`}
                variant="danger"
                confirmText="Confirm Demote"
                cancelText="Back"
            />

            <AlertModal
                isOpen={adminDeleteModal.open}
                onClose={() => setAdminDeleteModal({ open: false, admin: null })}
                onConfirm={handleDeleteAdmin}
                loading={Boolean(actionLoadingId && adminDeleteModal.admin?.id === actionLoadingId)}
                title={`Delete ${adminDeleteModal.admin?.name || adminDeleteModal.admin?.fullName || "this user"}'s account?`}
                description="This action is permanent and cannot be undone."
                variant="danger"
                confirmText="Confirm Delete"
                cancelText="Cancel"
            />

            <AlertModal
                isOpen={suspendModal.open}
                onClose={() => setSuspendModal({ open: false, admin: null })}
                onConfirm={handleSuspendToggleAdmin}
                loading={Boolean(actionLoadingId && suspendModal.admin?.id === actionLoadingId)}
                title={`${suspendModal.admin?.isActive ? "Suspend" : "Activate"} ${suspendModal.admin?.name || suspendModal.admin?.fullName || "this user"}?`}
                description="Suspended accounts cannot login."
                variant="primary"
                confirmText={suspendModal.admin?.isActive ? "Suspend" : "Activate"}
                cancelText="Cancel"
            />

            {/* Modals styling similarly updated in their components */}
            <AlertModal
                isOpen={toggleModal.open}
                onClose={() => setToggleModal({ ...toggleModal, open: false })}
                onConfirm={handleToggleStatus}
                loading={isToggling}
                title={toggleModal.currentStatus ? "Deactivate agency" : "Activate agency"}
                variant={toggleModal.currentStatus ? "danger" : "success"}
                description={
                    toggleModal.currentStatus
                        ? `Deactivate ${toggleModal.name}? Users will not be able to access the portal until reactivated.`
                        : `Activate ${toggleModal.name}? Users will regain portal access immediately.`
                }
                confirmText={toggleModal.currentStatus ? "Deactivate" : "Activate"}
            />

            <AlertModal
                isOpen={deleteModal.open}
                onClose={() => setDeleteModal({ ...deleteModal, open: false })}
                onConfirm={handleDelete}
                loading={isDeleting}
                title="Delete agency"
                variant="danger"
                description={`Are you sure you want to delete ${deleteModal.name}? This action cannot be undone.`}
                confirmText="Delete"
            />
        </div>
    )
}
