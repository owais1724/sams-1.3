"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Eye, EyeOff, Plus, Shield, UserCog } from "lucide-react"

import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AlertModal } from "@/components/ui/alert-modal"
import { FormModal } from "@/components/common/FormModal"
import { toast } from "@/components/ui/sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

type AgencyAdmin = {
    id: string
    name?: string
    fullName?: string
    email: string
    isActive: boolean
    roleName?: string
}

type AdminFormState = {
    name: string
    email: string
    password: string
    confirmPassword: string
}

type StaffRole = {
    id: string
    name: string
}

const initialFormState: AdminFormState = {
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
}

export default function AgencyAdminsPage() {
    const params = useParams<{ agencyId?: string | string[] }>()
    const agencyId = useMemo(() => {
        const value = params?.agencyId
        return Array.isArray(value) ? value[0] : value
    }, [params])

    const [agencyName, setAgencyName] = useState("Agency")
    const [admins, setAdmins] = useState<AgencyAdmin[]>([])
    const [loading, setLoading] = useState(true)

    const [addOpen, setAddOpen] = useState(false)
    const [formState, setFormState] = useState<AdminFormState>(initialFormState)
    const [isCreating, setIsCreating] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    const [demoteModal, setDemoteModal] = useState<{ open: boolean; admin: AgencyAdmin | null }>({ open: false, admin: null })
    const [promoteModal, setPromoteModal] = useState<{ open: boolean; admin: AgencyAdmin | null }>({ open: false, admin: null })
    const [deleteModal, setDeleteModal] = useState<{ open: boolean; admin: AgencyAdmin | null }>({ open: false, admin: null })
    const [suspendModal, setSuspendModal] = useState<{ open: boolean; admin: AgencyAdmin | null }>({ open: false, admin: null })
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
    const [demoteRoles, setDemoteRoles] = useState<StaffRole[]>([])
    const [selectedDemoteRoleId, setSelectedDemoteRoleId] = useState("")

    const agencyAdminCount = useMemo(
        () => admins.filter((admin) => (admin.roleName || "").toLowerCase().trim() === "agency admin").length,
        [admins],
    )
    const hasReachedAdminLimit = agencyAdminCount >= 2

    const isCreateFormValid = useMemo(() => {
        const name = formState.name.trim()
        const email = formState.email.trim()
        const password = formState.password
        const confirmPassword = formState.confirmPassword
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

        return Boolean(
            name &&
            emailPattern.test(email) &&
            password &&
            confirmPassword &&
            password === confirmPassword,
        )
    }, [formState])

    const fetchAgencyAdmins = async () => {
        if (!agencyId) {
            setLoading(false)
            return
        }

        try {
            setLoading(true)
            const [adminsResponse, agenciesResponse] = await Promise.all([
                api.get(`/agencies/${agencyId}/admins`, { params: { _t: Date.now() } }),
                api.get("/agencies", { params: { _t: Date.now() } }),
            ])

            const normalizedAdmins = (adminsResponse.data || []).map((admin: AgencyAdmin) => ({
                ...admin,
                name: admin.name || admin.fullName || "Unknown",
            }))
            setAdmins(normalizedAdmins)

            const currentAgency = (agenciesResponse.data || []).find((agency: any) => agency.id === agencyId)
            if (currentAgency?.name) {
                setAgencyName(currentAgency.name)
            }
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Failed to load agency admins")
        } finally {
            setLoading(false)
        }
    }

    const fetchDemoteRoles = async () => {
        if (!agencyId) {
            setDemoteRoles([])
            setSelectedDemoteRoleId("")
            return
        }

        try {
            const response = await api.get(`/agencies/${agencyId}/staff-roles`, { params: { _t: Date.now() } })
            const roles = (response.data || []) as StaffRole[]
            setDemoteRoles(roles)
            if (!roles.some((role) => role.id === selectedDemoteRoleId)) {
                setSelectedDemoteRoleId(roles[0]?.id || "")
            }
        } catch {
            setDemoteRoles([])
            setSelectedDemoteRoleId("")
        }
    }

    useEffect(() => {
        fetchAgencyAdmins()
        fetchDemoteRoles()
    }, [agencyId])

    const resetAddForm = () => {
        setFormState(initialFormState)
        setShowPassword(false)
        setShowConfirmPassword(false)
    }

    const handleCreateAdmin = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        if (!agencyId) {
            toast.error("Agency id is missing")
            return
        }

        if (!formState.name.trim() || !formState.email.trim() || !formState.password || !formState.confirmPassword) {
            toast.error("All fields are required")
            return
        }

        if (formState.password !== formState.confirmPassword) {
            toast.error("Passwords do not match")
            return
        }

        setIsCreating(true)
        try {
            await api.post(`/agencies/${agencyId}/admins`, {
                name: formState.name.trim(),
                email: formState.email.trim(),
                password: formState.password,
            })
            toast.success("Agency Admin created successfully")
            setAddOpen(false)
            resetAddForm()
            await fetchAgencyAdmins()
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Failed to create agency admin")
        } finally {
            setIsCreating(false)
        }
    }

    const handleDemote = async () => {
        if (!agencyId || !demoteModal.admin) {
            return
        }

        if (!selectedDemoteRoleId) {
            toast.error("Please select a position for demotion")
            return
        }

        setActionLoadingId(demoteModal.admin.id)
        try {
            await api.patch(`/agencies/${agencyId}/admins/${demoteModal.admin.id}/demote`, {
                roleId: selectedDemoteRoleId,
            })
            toast.success("Agency Admin demoted successfully")
            setDemoteModal({ open: false, admin: null })
            await fetchAgencyAdmins()
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Failed to demote agency admin")
        } finally {
            setActionLoadingId(null)
        }
    }

    const handlePromote = async () => {
        if (!agencyId || !promoteModal.admin) {
            return
        }

        setActionLoadingId(promoteModal.admin.id)
        try {
            await api.patch(`/agencies/${agencyId}/admins/${promoteModal.admin.id}/promote`)
            toast.success("Agency Admin promoted successfully")
            setPromoteModal({ open: false, admin: null })
            await fetchAgencyAdmins()
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Failed to promote agency admin")
        } finally {
            setActionLoadingId(null)
        }
    }

    const handleDelete = async () => {
        if (!agencyId || !deleteModal.admin) {
            return
        }

        const deletingAdminId = deleteModal.admin.id
        setActionLoadingId(deletingAdminId)
        try {
            await api.delete(`/agencies/${agencyId}/admins/${deletingAdminId}`)
            toast.success("Agency Admin deleted successfully")
            setAdmins((prev) => prev.filter((admin) => admin.id !== deletingAdminId))
            setDeleteModal({ open: false, admin: null })
            await fetchAgencyAdmins()
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Failed to delete agency admin")
        } finally {
            setActionLoadingId(null)
        }
    }

    const handleSuspendToggle = async () => {
        if (!agencyId || !suspendModal.admin) {
            return
        }

        setActionLoadingId(suspendModal.admin.id)
        try {
            await api.patch(`/agencies/${agencyId}/admins/${suspendModal.admin.id}/suspend`)
            toast.success(
                suspendModal.admin.isActive
                    ? "Admin account suspended"
                    : "Admin account activated",
            )
            setSuspendModal({ open: false, admin: null })
            await fetchAgencyAdmins()
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Failed to update admin status")
        } finally {
            setActionLoadingId(null)
        }
    }

    return (
        <div className="font-inter bg-[#f8fafc] min-h-screen text-[#0f172a]">
            <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                            <Link href="/admin/agencies" className="hover:text-[#06b6d4] transition-colors">Agencies</Link>
                            <span>/</span>
                            <span>Agency Admins</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight mt-2">{agencyName} Admins</h1>
                        <p className="text-sm text-slate-500 mt-1">Manage agency administrator accounts and status.</p>
                    </div>

                    <FormModal
                        open={addOpen}
                        onOpenChange={(open) => {
                            if (open && hasReachedAdminLimit) {
                                return
                            }
                            setAddOpen(open)
                            if (!open) {
                                resetAddForm()
                            }
                        }}
                        title="Add New Admin"
                        description="Create a new Agency Admin account"
                        maxWidth={560}
                        trigger={
                            <div className="flex flex-col items-end gap-1">
                                <Button
                                    className="h-11 px-6 bg-[#06b6d4] hover:bg-[#0891b2] text-white font-bold rounded-xl disabled:opacity-60"
                                    disabled={hasReachedAdminLimit}
                                    title={hasReachedAdminLimit ? "Maximum 2 admins reached" : undefined}
                                >
                                    <Plus className="h-4 w-4" />
                                    Add New Admin
                                </Button>
                                {hasReachedAdminLimit && (
                                    <p className="text-xs font-semibold text-amber-700">Maximum 2 admins reached</p>
                                )}
                            </div>
                        }
                    >
                        <form className="space-y-5" onSubmit={handleCreateAdmin}>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-[#0f172a]">Name <span className="text-[#06b6d4]">*</span></label>
                                <Input
                                    value={formState.name}
                                    onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
                                    placeholder="Enter full name"
                                    required
                                    className="h-11"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-[#0f172a]">Email <span className="text-[#06b6d4]">*</span></label>
                                <Input
                                    type="email"
                                    value={formState.email}
                                    onChange={(e) => setFormState((prev) => ({ ...prev, email: e.target.value }))}
                                    placeholder="admin@example.com"
                                    required
                                    className="h-11"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-[#0f172a]">Password <span className="text-[#06b6d4]">*</span></label>
                                <div className="relative">
                                    <Input
                                        type={showPassword ? "text" : "password"}
                                        value={formState.password}
                                        onChange={(e) => setFormState((prev) => ({ ...prev, password: e.target.value }))}
                                        placeholder="Enter password"
                                        required
                                        className="h-11 pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((prev) => !prev)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-[#06b6d4]"
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-[#0f172a]">Confirm Password <span className="text-[#06b6d4]">*</span></label>
                                <div className="relative">
                                    <Input
                                        type={showConfirmPassword ? "text" : "password"}
                                        value={formState.confirmPassword}
                                        onChange={(e) => setFormState((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                                        placeholder="Re-enter password"
                                        required
                                        className="h-11 pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-[#06b6d4]"
                                        aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                                    >
                                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="pt-2 flex justify-end gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="h-11 px-6"
                                    disabled={isCreating}
                                    onClick={() => {
                                        setAddOpen(false)
                                        resetAddForm()
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className="h-11 px-6 bg-[#06b6d4] hover:bg-[#0891b2] text-white"
                                    disabled={isCreating || !isCreateFormValid}
                                >
                                    {isCreating ? "Creating..." : "Create Admin"}
                                </Button>
                            </div>
                        </form>
                    </FormModal>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-[#ffffff] overflow-hidden shadow-sm">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="h-12 px-5 text-xs font-semibold text-slate-500 uppercase">Name</TableHead>
                                <TableHead className="h-12 px-5 text-xs font-semibold text-slate-500 uppercase">Email</TableHead>
                                <TableHead className="h-12 px-5 text-xs font-semibold text-slate-500 uppercase">Status</TableHead>
                                <TableHead className="h-12 px-5 text-right text-xs font-semibold text-slate-500 uppercase">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="h-7 w-7 border-2 border-[#06b6d4] border-t-transparent rounded-full animate-spin" />
                                            <p className="text-sm text-slate-500">Loading admins...</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : admins.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="h-12 w-12 rounded-xl bg-slate-50 flex items-center justify-center">
                                                <Shield className="h-6 w-6 text-slate-300" />
                                            </div>
                                            <p className="text-sm font-semibold text-slate-500">No Agency Admins found</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                admins.map((admin) => (
                                    <TableRow key={admin.id} className="hover:bg-slate-50">
                                        <TableCell className="px-5 py-4 text-sm font-semibold text-[#0f172a]">{admin.name || admin.fullName || "Unknown"}</TableCell>
                                        <TableCell className="px-5 py-4 text-sm text-slate-600">{admin.email}</TableCell>
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
                                                    variant="danger-solid"
                                                    size="sm"
                                                    className="bg-red-600 hover:bg-red-700 text-white"
                                                    disabled={actionLoadingId === admin.id}
                                                    onClick={() => setDeleteModal({ open: true, admin })}
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
            </div>

            <AlertModal
                isOpen={promoteModal.open}
                onClose={() => setPromoteModal({ open: false, admin: null })}
                onConfirm={handlePromote}
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
                onConfirm={handleDemote}
                loading={Boolean(actionLoadingId && demoteModal.admin?.id === actionLoadingId)}
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
                confirmText="Confirm Demote"
                cancelText="Cancel"
            />

            <AlertModal
                isOpen={deleteModal.open}
                onClose={() => setDeleteModal({ open: false, admin: null })}
                onConfirm={handleDelete}
                loading={Boolean(actionLoadingId && deleteModal.admin?.id === actionLoadingId)}
                title={`Delete ${deleteModal.admin?.name || deleteModal.admin?.fullName || "this user"}'s account?`}
                description="This action is permanent and cannot be undone."
                variant="danger"
                confirmText="Confirm Delete"
                cancelText="Cancel"
            />

            <AlertModal
                isOpen={suspendModal.open}
                onClose={() => setSuspendModal({ open: false, admin: null })}
                onConfirm={handleSuspendToggle}
                loading={Boolean(actionLoadingId && suspendModal.admin?.id === actionLoadingId)}
                title={`${suspendModal.admin?.isActive ? "Suspend" : "Activate"} ${suspendModal.admin?.name || suspendModal.admin?.fullName || "this user"}?`}
                description="Suspended accounts cannot login."
                variant="primary"
                confirmText={suspendModal.admin?.isActive ? "Suspend" : "Activate"}
                cancelText="Cancel"
            />
        </div>
    )
}
