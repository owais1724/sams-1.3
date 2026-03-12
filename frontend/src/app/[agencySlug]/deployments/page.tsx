"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import api from "@/lib/api"
import {
    Shield,
    Plus,
    MapPin,
    Clock,
    Users,
    Calendar,
    ChevronDown,
    X,
    AlertTriangle,
} from "lucide-react"
import {
    PageHeader,
    StatCard,
    PageLoading,
    DataTable,
    TableRowEmpty,
    TableRowLoading,
    StatusBadge,
    CreateButton,
    RowEditButton,
    RowDeleteButton,
    ControlPanel,
    FormCard,
    FormHeader,
    SubmitButton,
} from "@/components/ui/design-system"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { TableCell, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "@/components/ui/sonner"
import { useAuthStore } from "@/store/authStore"
import { usePermission } from "@/hooks/usePermission"
import { AlertModal } from "@/components/ui/alert-modal"
import { cn } from "@/lib/utils"

interface Deployment {
    id: string
    clientId: string
    shiftId: string
    startDate: string
    endDate: string
    status: string
    notes?: string
    client: { id: string; name: string }
    shift: { id: string; name: string; startTime: string; endTime: string }
    guards: { id: string; user: { id: string; fullName: string; email: string } }[]
    _count?: { incidents: number }
}

interface Client {
    id: string
    name: string
}

interface Shift {
    id: string
    name: string
    startTime: string
    endTime: string
    isActive: boolean
}

interface Guard {
    id: string
    fullName: string
    email: string
}

const deploymentStatusColors: Record<string, string> = {
    planned: "bg-blue-50 text-blue-700 border-blue-100",
    active: "bg-emerald-50 text-emerald-700 border-emerald-100",
    completed: "bg-slate-100 text-slate-600 border-slate-200",
    cancelled: "bg-rose-50 text-rose-700 border-rose-100",
}

export default function DeploymentsPage() {
    const { agencySlug } = useParams()
    const { user } = useAuthStore()
    const [deployments, setDeployments] = useState<Deployment[]>([])
    const [clients, setClients] = useState<Client[]>([])
    const [shifts, setShifts] = useState<Shift[]>([])
    const [guards, setGuards] = useState<Guard[]>([])
    const [loading, setLoading] = useState(true)
    const [showCreate, setShowCreate] = useState(false)
    const [showAssign, setShowAssign] = useState<string | null>(null)
    const [editingDeployment, setEditingDeployment] = useState<Deployment | null>(null)
    const [saving, setSaving] = useState(false)
    const [search, setSearch] = useState("")
    const [statusFilter, setStatusFilter] = useState("")
    const [deleteId, setDeleteId] = useState<string | null>(null)
    const [deleting, setDeleting] = useState(false)

    // Form state
    const [form, setForm] = useState({
        clientId: "",
        shiftId: "",
        startDate: "",
        endDate: "",
        notes: "",
        guardIds: [] as string[],
    })

    // Edit form state
    const [editForm, setEditForm] = useState({
        clientId: "",
        shiftId: "",
        startDate: "",
        endDate: "",
        notes: "",
    })

    const isAdmin = user?.role?.toLowerCase().includes('admin')
    const { hasPermission } = usePermission()
    const canManage = isAdmin || hasPermission('manage_deployments')

    const fetchData = async () => {
        setLoading(true)
        try {
            const [depRes, cliRes, shiftRes, empRes] = await Promise.allSettled([
                api.get("/deployments"),
                api.get("/clients"),
                api.get("/shifts"),
                api.get("/employees"),
            ])
            if (depRes.status === "fulfilled") setDeployments(depRes.value.data)
            if (cliRes.status === "fulfilled") setClients(cliRes.value.data)
            if (shiftRes.status === "fulfilled") setShifts(shiftRes.value.data.filter((s: Shift) => s.isActive))
            if (empRes.status === "fulfilled") {
                const employees = empRes.value.data
                setGuards(employees
                    .filter((e: any) => e.user)
                    .map((e: any) => ({ id: e.user.id, fullName: e.user.fullName || e.fullName, email: e.user.email || e.email }))
                )
            }
        } catch {
            toast.error("Failed to load deployments")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.clientId || !form.shiftId || !form.startDate || !form.endDate) {
            toast.error("Please fill all required fields")
            return
        }
        setSaving(true)
        try {
            await api.post("/deployments", {
                clientId: form.clientId,
                shiftId: form.shiftId,
                startDate: form.startDate,
                endDate: form.endDate,
                notes: form.notes,
                guardIds: form.guardIds,
            })
            toast.success("Deployment created successfully")
            setShowCreate(false)
            setForm({ clientId: "", shiftId: "", startDate: "", endDate: "", notes: "", guardIds: [] })
            fetchData()
        } catch (err: any) {
            toast.error(err.message || "Failed to create deployment")
        } finally {
            setSaving(false)
        }
    }

    const openEdit = (dep: Deployment) => {
        setEditForm({
            clientId: dep.clientId,
            shiftId: dep.shiftId,
            startDate: dep.startDate.slice(0, 10),
            endDate: dep.endDate.slice(0, 10),
            notes: dep.notes || "",
        })
        setEditingDeployment(dep)
    }

    const handleEdit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingDeployment) return
        if (!editForm.clientId || !editForm.shiftId || !editForm.startDate || !editForm.endDate) {
            toast.error("Please fill all required fields")
            return
        }
        setSaving(true)
        try {
            await api.patch(`/deployments/${editingDeployment.id}`, {
                clientId: editForm.clientId,
                shiftId: editForm.shiftId,
                startDate: editForm.startDate,
                endDate: editForm.endDate,
                notes: editForm.notes,
            })
            toast.success("Deployment updated successfully")
            setEditingDeployment(null)
            fetchData()
        } catch (err: any) {
            toast.error(err.message || "Failed to update deployment")
        } finally {
            setSaving(false)
        }
    }

    const handleStatusChange = async (id: string, status: string) => {
        try {
            await api.patch(`/deployments/${id}/status`, { status })
            toast.success(`Status updated to ${status}`)
            fetchData()
        } catch (err: any) {
            toast.error(err.message || "Failed to update status")
        }
    }

    const handleDelete = async () => {
        if (!deleteId) return
        setDeleting(true)
        try {
            await api.delete(`/deployments/${deleteId}`)
            toast.success("Deployment deleted")
            setDeleteId(null)
            fetchData()
        } catch (err: any) {
            toast.error(err.message || "Failed to delete deployment")
        } finally {
            setDeleting(false)
        }
    }

    const handleAssignGuards = async (deploymentId: string, guardIds: string[]) => {
        try {
            await api.post(`/deployments/${deploymentId}/guards`, { guardIds })
            toast.success("Guards assigned successfully")
            setShowAssign(null)
            fetchData()
        } catch (err: any) {
            toast.error(err.message || "Failed to assign guards")
        }
    }

    const handleRemoveGuard = async (deploymentId: string, guardId: string) => {
        try {
            await api.delete(`/deployments/${deploymentId}/guards/${guardId}`)
            toast.success("Guard removed from deployment")
            fetchData()
        } catch (err: any) {
            toast.error(err.message || "Failed to remove guard")
        }
    }

    const toggleGuard = (guardId: string) => {
        setForm(prev => ({
            ...prev,
            guardIds: prev.guardIds.includes(guardId)
                ? prev.guardIds.filter(id => id !== guardId)
                : [...prev.guardIds, guardId],
        }))
    }

    const filtered = deployments.filter(d => {
        const matchSearch = !search || d.client.name.toLowerCase().includes(search.toLowerCase()) ||
            d.shift.name.toLowerCase().includes(search.toLowerCase())
        const matchStatus = !statusFilter || d.status === statusFilter
        return matchSearch && matchStatus
    })

    if (loading) return <PageLoading message="Loading Deployments..." />

    const stats = {
        total: deployments.length,
        active: deployments.filter(d => d.status === "active").length,
        planned: deployments.filter(d => d.status === "planned").length,
        totalGuards: deployments.reduce((sum, d) => sum + d.guards.length, 0),
    }

    return (
        <div className="space-y-10 pb-20">
            <PageHeader
                title="Deployment"
                titleHighlight="Management"
                subtitle="Manage guard deployments to client sites with shift assignments."
                action={canManage ? (
                    <CreateButton
                        onClick={() => setShowCreate(true)}
                        label="New Deployment"
                        icon={<Plus className="h-4 w-4" />}
                    />
                ) : undefined}
            />

            <div className="grid gap-6 md:grid-cols-4">
                <StatCard title="Total Deployments" value={stats.total} icon={<Shield />} color="teal" />
                <StatCard title="Active" value={stats.active} icon={<MapPin />} color="emerald" />
                <StatCard title="Planned" value={stats.planned} icon={<Calendar />} color="blue" />
                <StatCard title="Guards Deployed" value={stats.totalGuards} icon={<Users />} color="violet" />
            </div>

            <ControlPanel count={filtered.length} totalLabel="Deployments">
                <div className="flex items-center gap-3 flex-1">
                    <Input
                        placeholder="Search by site or shift..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="h-10 rounded-xl bg-slate-50 border-slate-200 max-w-xs"
                    />
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="h-10 rounded-xl bg-slate-50 border border-slate-200 px-3 text-sm"
                    >
                        <option value="">All Status</option>
                        <option value="planned">Planned</option>
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>
            </ControlPanel>

            <DataTable columns={["Site", "Shift", "Guards", "Start Date", "End Date", "Status", "Actions"]}>
                {filtered.length === 0 ? (
                    <TableRowEmpty
                        colSpan={7}
                        title="No Deployments Found"
                        description="Create your first deployment to assign guards to client sites."
                        icon={<Shield className="h-8 w-8" />}
                    />
                ) : (
                    filtered.map(dep => (
                        <TableRow key={dep.id} className="group hover:bg-slate-50/50">
                            <TableCell className="px-4 sm:px-8 py-5">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 bg-teal-50 rounded-xl flex items-center justify-center">
                                        <MapPin className="h-4 w-4 text-teal-600" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900">{dep.client.name}</p>
                                        {dep._count?.incidents ? (
                                            <span className="text-[10px] text-orange-600 font-bold flex items-center gap-1">
                                                <AlertTriangle className="h-3 w-3" /> {dep._count.incidents} incident{dep._count.incidents > 1 ? "s" : ""}
                                            </span>
                                        ) : null}
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell>
                                <div>
                                    <p className="font-bold text-slate-700">{dep.shift.name}</p>
                                    <p className="text-xs text-slate-400">{dep.shift.startTime} – {dep.shift.endTime}</p>
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-1">
                                    <span className="font-bold text-slate-700">{dep.guards.length}</span>
                                    {canManage && (
                                        <button
                                            onClick={() => setShowAssign(dep.id)}
                                            className="ml-2 text-[10px] font-black text-primary uppercase tracking-wider hover:underline"
                                        >
                                            Manage
                                        </button>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell className="text-sm text-slate-600">
                                {new Date(dep.startDate).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-sm text-slate-600">
                                {new Date(dep.endDate).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                                <span className={cn(
                                    "inline-flex items-center px-3 py-1 rounded-lg font-bold text-[10px] uppercase tracking-wide border",
                                    deploymentStatusColors[dep.status] || "bg-slate-100 text-slate-600"
                                )}>
                                    {dep.status}
                                </span>
                            </TableCell>
                            <TableCell className="px-4 sm:px-8">
                                {canManage && (
                                    <div className="flex items-center gap-1">
                                        {["planned", "active"].includes(dep.status) && (
                                            <RowEditButton onClick={() => openEdit(dep)} />
                                        )}
                                        {dep.status === "planned" && (
                                            <Button variant="ghost" size="sm" className="text-xs font-bold text-emerald-600 hover:bg-emerald-50"
                                                onClick={() => handleStatusChange(dep.id, "active")}>
                                                Activate
                                            </Button>
                                        )}
                                        {dep.status === "active" && (
                                            <Button variant="ghost" size="sm" className="text-xs font-bold text-blue-600 hover:bg-blue-50"
                                                onClick={() => handleStatusChange(dep.id, "completed")}>
                                                Complete
                                            </Button>
                                        )}
                                        {["planned", "active"].includes(dep.status) && (
                                            <Button variant="ghost" size="sm" className="text-xs font-bold text-rose-600 hover:bg-rose-50"
                                                onClick={() => handleStatusChange(dep.id, "cancelled")}>
                                                Cancel
                                            </Button>
                                        )}
                                        {dep.status !== "active" && (
                                            <RowDeleteButton onClick={() => setDeleteId(dep.id)} />
                                        )}
                                    </div>
                                )}
                            </TableCell>
                        </TableRow>
                    ))
                )}
            </DataTable>

            {/* Create Deployment Dialog */}
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black">Create Deployment</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreate} className="space-y-6 mt-4">
                        <FormCard>
                            <FormHeader title="Deployment Details" color="blue" />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase tracking-wider text-slate-500">Client Site *</Label>
                                    <select
                                        value={form.clientId}
                                        onChange={e => setForm(p => ({ ...p, clientId: e.target.value }))}
                                        className="w-full h-10 rounded-xl bg-slate-50 border border-slate-200 px-3 text-sm"
                                        required
                                    >
                                        <option value="">Select Client</option>
                                        {clients.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase tracking-wider text-slate-500">Shift *</Label>
                                    <select
                                        value={form.shiftId}
                                        onChange={e => setForm(p => ({ ...p, shiftId: e.target.value }))}
                                        className="w-full h-10 rounded-xl bg-slate-50 border border-slate-200 px-3 text-sm"
                                        required
                                    >
                                        <option value="">Select Shift</option>
                                        {shifts.map(s => (
                                            <option key={s.id} value={s.id}>{s.name} ({s.startTime} – {s.endTime})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase tracking-wider text-slate-500">Start Date *</Label>
                                    <Input
                                        type="date"
                                        value={form.startDate}
                                        onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))}
                                        className="h-10 rounded-xl bg-slate-50"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase tracking-wider text-slate-500">End Date *</Label>
                                    <Input
                                        type="date"
                                        value={form.endDate}
                                        onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))}
                                        className="h-10 rounded-xl bg-slate-50"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-black uppercase tracking-wider text-slate-500">Notes</Label>
                                <Textarea
                                    value={form.notes}
                                    onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                                    className="rounded-xl bg-slate-50"
                                    placeholder="Optional deployment notes..."
                                    rows={2}
                                />
                            </div>
                        </FormCard>

                        <FormCard>
                            <FormHeader title="Assign Guards" color="emerald" />
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {guards.length === 0 ? (
                                    <p className="text-sm text-slate-400 py-4 text-center">No guards available</p>
                                ) : (
                                    guards.map(g => (
                                        <label key={g.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={form.guardIds.includes(g.id)}
                                                onChange={() => toggleGuard(g.id)}
                                                className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                            />
                                            <div>
                                                <p className="text-sm font-bold text-slate-700">{g.fullName}</p>
                                                <p className="text-xs text-slate-400">{g.email}</p>
                                            </div>
                                        </label>
                                    ))
                                )}
                            </div>
                            {form.guardIds.length > 0 && (
                                <p className="text-xs font-bold text-teal-600 mt-2">{form.guardIds.length} guard(s) selected</p>
                            )}
                        </FormCard>

                        <SubmitButton label="Create Deployment" loading={saving} />
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Deployment Dialog */}
            <Dialog open={!!editingDeployment} onOpenChange={(open) => { if (!open) setEditingDeployment(null) }}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black">Edit Deployment</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleEdit} className="space-y-6 mt-4">
                        <FormCard>
                            <FormHeader title="Deployment Details" color="blue" />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase tracking-wider text-slate-500">Client Site *</Label>
                                    <select
                                        value={editForm.clientId}
                                        onChange={e => setEditForm(p => ({ ...p, clientId: e.target.value }))}
                                        className="w-full h-10 rounded-xl bg-slate-50 border border-slate-200 px-3 text-sm"
                                        required
                                    >
                                        <option value="">Select Client</option>
                                        {clients.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase tracking-wider text-slate-500">Shift *</Label>
                                    <select
                                        value={editForm.shiftId}
                                        onChange={e => setEditForm(p => ({ ...p, shiftId: e.target.value }))}
                                        className="w-full h-10 rounded-xl bg-slate-50 border border-slate-200 px-3 text-sm"
                                        required
                                    >
                                        <option value="">Select Shift</option>
                                        {shifts.map(s => (
                                            <option key={s.id} value={s.id}>{s.name} ({s.startTime} – {s.endTime})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase tracking-wider text-slate-500">Start Date *</Label>
                                    <Input
                                        type="date"
                                        value={editForm.startDate}
                                        onChange={e => setEditForm(p => ({ ...p, startDate: e.target.value }))}
                                        className="h-10 rounded-xl bg-slate-50"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase tracking-wider text-slate-500">End Date *</Label>
                                    <Input
                                        type="date"
                                        value={editForm.endDate}
                                        onChange={e => setEditForm(p => ({ ...p, endDate: e.target.value }))}
                                        className="h-10 rounded-xl bg-slate-50"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-black uppercase tracking-wider text-slate-500">Notes</Label>
                                <Textarea
                                    value={editForm.notes}
                                    onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))}
                                    className="rounded-xl bg-slate-50"
                                    placeholder="Optional deployment notes..."
                                    rows={2}
                                />
                            </div>
                        </FormCard>
                        <SubmitButton label="Update Deployment" loading={saving} />
                    </form>
                </DialogContent>
            </Dialog>

            {/* Assign Guards Dialog */}
            <AssignGuardsDialog
                open={!!showAssign}
                onClose={() => setShowAssign(null)}
                deployment={deployments.find(d => d.id === showAssign)}
                guards={guards}
                onAssign={handleAssignGuards}
                onRemove={handleRemoveGuard}
            />

            {/* Delete Confirmation Modal */}
            <AlertModal
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={handleDelete}
                loading={deleting}
                title="Delete Deployment"
                description="Are you sure you want to delete this deployment? This action cannot be undone."
                variant="danger"
                confirmText="Delete"
                cancelText="Cancel"
            />
        </div>
    )
}

function AssignGuardsDialog({
    open,
    onClose,
    deployment,
    guards,
    onAssign,
    onRemove,
}: {
    open: boolean
    onClose: () => void
    deployment?: Deployment
    guards: Guard[]
    onAssign: (deploymentId: string, guardIds: string[]) => void
    onRemove: (deploymentId: string, guardId: string) => void
}) {
    const [selected, setSelected] = useState<string[]>([])

    if (!deployment) return null

    const assignedIds = deployment.guards.map(g => g.user.id)
    const available = guards.filter(g => !assignedIds.includes(g.id))

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl font-black">Manage Guards</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 mt-4">
                    {/* Currently assigned */}
                    <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3">
                            Assigned Guards ({deployment.guards.length})
                        </h4>
                        {deployment.guards.length === 0 ? (
                            <p className="text-sm text-slate-400">No guards assigned yet</p>
                        ) : (
                            <div className="space-y-2">
                                {deployment.guards.map(g => (
                                    <div key={g.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                        <div>
                                            <p className="text-sm font-bold text-slate-700">{g.user.fullName}</p>
                                            <p className="text-xs text-slate-400">{g.user.email}</p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => onRemove(deployment.id, g.user.id)}
                                            className="text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Available guards */}
                    <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3">
                            Available Guards ({available.length})
                        </h4>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {available.map(g => (
                                <label key={g.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selected.includes(g.id)}
                                        onChange={() => {
                                            setSelected(prev =>
                                                prev.includes(g.id) ? prev.filter(id => id !== g.id) : [...prev, g.id]
                                            )
                                        }}
                                        className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                    />
                                    <div>
                                        <p className="text-sm font-bold text-slate-700">{g.fullName}</p>
                                        <p className="text-xs text-slate-400">{g.email}</p>
                                    </div>
                                </label>
                            ))}
                        </div>
                        {selected.length > 0 && (
                            <Button
                                className="mt-3 w-full"
                                onClick={() => {
                                    onAssign(deployment.id, selected)
                                    setSelected([])
                                }}
                            >
                                Assign {selected.length} Guard(s)
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
