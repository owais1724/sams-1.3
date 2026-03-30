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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
    const [editConfirmModal, setEditConfirmModal] = useState(false)
    const [createConfirmModal, setCreateConfirmModal] = useState(false)
    const [statusConfirmModal, setStatusConfirmModal] = useState<{ open: boolean; id: string; status: string; clientName: string }>({
        open: false,
        id: "",
        status: "",
        clientName: "",
    })

    // Form state
    const [form, setForm] = useState({
        clientId: "",
        shiftId: "",
        startDate: "",
        endDate: "",
        notes: "",
        guardIds: [] as string[],
    })

    // Form errors state
    const [formErrors, setFormErrors] = useState({
        clientId: "",
        shiftId: "",
        startDate: "",
        endDate: "",
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
        if (!isAdmin && !hasPermission('view_deployments')) {
            toast.error("RBAC Violation: Unauthorized access to Deployments portal. You have been isolated and logged out.");
            useAuthStore.getState().clearLocalAuth();
            window.location.href = `/${agencySlug}/staff-login`;
            return;
        }
        fetchData()
    }, [isAdmin, agencySlug])

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        
        // Reset errors
        setFormErrors({ clientId: "", shiftId: "", startDate: "", endDate: "" })
        
        // Validate required fields
        const errors: any = {}
        if (!form.clientId) errors.clientId = "This field is required"
        if (!form.shiftId) errors.shiftId = "This field is required"
        if (!form.startDate) errors.startDate = "This field is required"
        if (!form.endDate) errors.endDate = "This field is required"
        
        if (Object.keys(errors).length > 0) {
            setFormErrors(errors)
            toast.error("Please fill all required fields")
            return
        }

        // Validate guard shift assignments
        if (form.guardIds.length > 0) {
            try {
                console.log("Validating deployment for guards:", form.guardIds)
                console.log("Deployment shift ID:", form.shiftId)
                console.log("Deployment period:", form.startDate, "to", form.endDate)
                
                for (const guardId of form.guardIds) {
                    console.log("Checking guard:", guardId)
                    // Get all assignments without date filter first
                    const assignmentRes = await api.get(`/shift-assignments?employeeId=${guardId}`)
                    const assignments = assignmentRes.data
                    console.log("Guard assignments:", assignments)
                    
                    // Check if guard has any assignments at all
                    if (assignments.length > 0) {
                        console.log("Guard has existing assignments, checking for conflicts...")
                        
                        // Get the most recent assignment to determine guard's primary shift
                        const sortedAssignments = assignments.sort((a: any, b: any) => 
                            new Date(b.date).getTime() - new Date(a.date).getTime()
                        )
                        const mostRecentAssignment = sortedAssignments[0]
                        console.log("Most recent assignment:", mostRecentAssignment)
                        
                        // If guard is assigned to a different shift, block deployment
                        if (mostRecentAssignment.shiftId !== form.shiftId) {
                            console.log("Guard assigned to different shift! Blocking deployment.")
                            const guard = guards.find(g => g.id === guardId)
                            toast.error(`${guard?.fullName || 'Guard'} is assigned to ${mostRecentAssignment.shift?.name || 'another shift'} and cannot be deployed to a different shift.`)
                            return
                        }
                    } else {
                        console.log("No assignments found for guard, allowing deployment to any shift.")
                    }
                    
                    // Also check for date-specific conflicts if assignments exist
                    for (const assignment of assignments) {
                        console.log("Checking assignment:", assignment)
                        if (assignment.status === 'SCHEDULED' || assignment.status === 'COMPLETED') {
                            const assignmentDate = new Date(assignment.date)
                            const deploymentStart = new Date(form.startDate)
                            const deploymentEnd = new Date(form.endDate)
                            
                            console.log("Assignment date:", assignmentDate)
                            console.log("Deployment period:", deploymentStart, "to", deploymentEnd)
                            
                            // Check if deployment period overlaps with assignment date
                            if (assignmentDate >= deploymentStart && assignmentDate <= deploymentEnd) {
                                console.log("Date overlap detected!")
                                console.log("Assignment shift ID:", assignment.shiftId)
                                console.log("Deployment shift ID:", form.shiftId)
                                console.log("Assignment shift name:", assignment.shift?.name)
                                // Check if it's a different shift
                                if (assignment.shiftId !== form.shiftId) {
                                    console.log("Shift mismatch! Blocking deployment.")
                                    const guard = guards.find(g => g.id === guardId)
                                    toast.error(`${guard?.fullName || 'Guard'} is already assigned to ${assignment.shift?.name || 'another shift'} on ${assignment.date.toLocaleDateString()}. Cannot deploy to different shift.`)
                                    return
                                } else {
                                    console.log("Same shift, allowing deployment.")
                                }
                            }
                        }
                    }
                }
                console.log("Validation passed, allowing deployment.")
            } catch (err: any) {
                console.error("Validation error:", err)
                toast.error("Failed to validate guard assignments")
                return
            }
        }

        setShowCreate(false)
        setCreateConfirmModal(true)
    }

    const handleCreateConfirm = async () => {
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
            setCreateConfirmModal(false)
            setShowCreate(false)
            setForm({ clientId: "", shiftId: "", startDate: "", endDate: "", notes: "", guardIds: [] })
            setFormErrors({ clientId: "", shiftId: "", startDate: "", endDate: "" })
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

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingDeployment) return
        if (!editForm.clientId || !editForm.shiftId || !editForm.startDate || !editForm.endDate) {
            toast.error("Please fill all required fields")
            return
        }
        // Show confirmation modal
        setEditConfirmModal(true)
    }

    const handleEdit = async () => {
        if (!editingDeployment) return
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
            setEditConfirmModal(false)
            fetchData()
        } catch (err: any) {
            toast.error(err.message || "Failed to update deployment")
        } finally {
            setSaving(false)
        }
    }

    const closeStatusConfirmModal = () => {
        setStatusConfirmModal({ open: false, id: "", status: "", clientName: "" })
    }

    const handleStatusChange = (id: string, status: string, clientName: string) => {
        setStatusConfirmModal({ open: true, id, status, clientName })
    }

    const handleConfirmedStatusChange = async () => {
        if (!statusConfirmModal.id || !statusConfirmModal.status) return
        try {
            await api.patch(`/deployments/${statusConfirmModal.id}/status`, { status: statusConfirmModal.status })
            toast.success(`Status updated to ${statusConfirmModal.status}`)
            closeStatusConfirmModal()
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

            <div className="grid gap-4 grid-cols-2 sm:gap-6 md:grid-cols-4">
                <StatCard title="Total Deployments" value={stats.total} icon={<Shield className="text-teal-700" />} color="teal" />
                <StatCard title="Active" value={stats.active} icon={<MapPin className="text-emerald-700" />} color="emerald" />
                <StatCard title="Planned" value={stats.planned} icon={<Calendar className="text-slate-700" />} color="slate" />
                <StatCard title="Guards Deployed" value={stats.totalGuards} icon={<Users className="text-teal-700" />} color="teal" />
            </div>

            <ControlPanel count={filtered.length} totalLabel="Deployments">
                <div className="flex items-center gap-3 flex-1 flex-wrap">
                    <Input
                        placeholder="Search by site or shift..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="h-10 rounded-xl bg-white border border-border w-full sm:max-w-xs text-slate-900 placeholder:text-slate-400"
                    />
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="h-10 rounded-xl bg-white border border-border px-3 text-sm text-slate-900 focus:ring-0"
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
                        <TableRow key={dep.id} className="group">
                            <TableCell className="py-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 bg-slate-50 border border-border rounded-xl flex items-center justify-center">
                                        <MapPin className="h-4 w-4 text-slate-500" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-900">{dep.client.name}</p>
                                        {dep._count?.incidents ? (
                                            <span className="text-[10px] text-orange-400 font-bold flex items-center gap-1">
                                                <AlertTriangle className="h-3 w-3" /> {dep._count.incidents} incident{dep._count.incidents > 1 ? "s" : ""}
                                            </span>
                                        ) : null}
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell>
                                <div>
                                    <p className="font-semibold text-slate-900">{dep.shift.name}</p>
                                    <p className="text-[12px] text-slate-500">{dep.shift.startTime} – {dep.shift.endTime}</p>
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-1">
                                    <span className="font-semibold text-slate-900">{dep.guards.length}</span>
                                    {canManage && (
                                        <button
                                            onClick={() => setShowAssign(dep.id)}
                                            className="ml-2 text-[12px] font-semibold text-primary hover:underline"
                                        >
                                            Manage
                                        </button>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell className="text-slate-600">
                                {new Date(dep.startDate).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-slate-600">
                                {new Date(dep.endDate).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                                <span className={cn(
                                    "inline-flex items-center px-3 py-1 rounded-full font-semibold text-[12px] border",
                                    deploymentStatusColors[dep.status] || "bg-slate-100 text-slate-600"
                                )}>
                                    {dep.status}
                                </span>
                            </TableCell>
                            <TableCell>
                                {canManage && (
                                    <div className="flex items-center gap-1">
                                        {["planned", "active"].includes(dep.status) && (
                                            <RowEditButton onClick={() => openEdit(dep)} />
                                        )}
                                        {dep.status === "planned" && (
                                            <Button type="button" variant="ghost" size="sm" className="text-xs font-bold text-emerald-600 hover:bg-emerald-50"
                                                onClick={() => handleStatusChange(dep.id, "active", dep.client.name)}>
                                                Activate
                                            </Button>
                                        )}
                                        {dep.status === "active" && (
                                            <Button type="button" variant="ghost" size="sm" className="text-xs font-bold text-blue-600 hover:bg-blue-50"
                                                onClick={() => handleStatusChange(dep.id, "completed", dep.client.name)}>
                                                Complete
                                            </Button>
                                        )}
                                        {["planned", "active"].includes(dep.status) && (
                                            <Button type="button" variant="ghost" size="sm" className="text-xs font-bold text-rose-600 hover:bg-rose-50"
                                                onClick={() => handleStatusChange(dep.id, "cancelled", dep.client.name)}>
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
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black">Create Deployment</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreate} className="space-y-6 mt-2">
                        <FormCard>
                            <FormHeader title="Deployment Details" color="blue" />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase tracking-wider text-slate-500">Client Site <span className="text-cyan-500">*</span></Label>
                                    <Select 
                                        value={form.clientId} 
                                        onValueChange={(v) => {
                                            setForm(p => ({ ...p, clientId: v }))
                                            if (formErrors.clientId) setFormErrors(p => ({ ...p, clientId: "" }))
                                        }}
                                    >
                                        <SelectTrigger className={cn("h-10 rounded-xl bg-slate-50 border-slate-200", formErrors.clientId && "border-red-500 border-2")}>
                                            <SelectValue placeholder="Select Client" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border-slate-200 bg-white p-2">
                                            {clients.map(c => (
                                                <SelectItem key={c.id} value={c.id} className="py-3 font-medium rounded-lg hover:bg-cyan-50 focus:bg-cyan-50">
                                                    {c.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {formErrors.clientId && <p className="text-xs text-red-500 font-semibold">{formErrors.clientId}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase tracking-wider text-slate-500">Shift <span className="text-cyan-500">*</span></Label>
                                    <Select 
                                        value={form.shiftId} 
                                        onValueChange={(v) => {
                                            setForm(p => ({ ...p, shiftId: v }))
                                            if (formErrors.shiftId) setFormErrors(p => ({ ...p, shiftId: "" }))
                                        }}
                                    >
                                        <SelectTrigger className={cn("h-10 rounded-xl bg-slate-50 border-slate-200", formErrors.shiftId && "border-red-500 border-2")}>
                                            <SelectValue placeholder="Select Shift" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border-slate-200 bg-white p-2">
                                            {shifts.map(s => (
                                                <SelectItem key={s.id} value={s.id} className="py-3 font-medium rounded-lg hover:bg-cyan-50 focus:bg-cyan-50">
                                                    {s.name} ({s.startTime} – {s.endTime})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {formErrors.shiftId && <p className="text-xs text-red-500 font-semibold">{formErrors.shiftId}</p>}
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase tracking-wider text-slate-500">Start Date <span className="text-cyan-500">*</span></Label>
                                    <Input
                                        type="date"
                                        min={new Date().toISOString().split('T')[0]}
                                        value={form.startDate}
                                        onChange={e => {
                                            const selectedDate = e.target.value
                                            const today = new Date().toISOString().split('T')[0]
                                            
                                            if (selectedDate < today) {
                                                toast.error("Past dates are not allowed")
                                                return
                                            }
                                            
                                            setForm(p => ({ ...p, startDate: selectedDate }))
                                            if (formErrors.startDate) setFormErrors(p => ({ ...p, startDate: "" }))
                                            
                                            // If end date is before new start date, clear it
                                            if (form.endDate && selectedDate > form.endDate) {
                                                setForm(p => ({ ...p, endDate: "" }))
                                            }
                                        }}
                                        className={cn("h-10 rounded-xl bg-slate-50", formErrors.startDate && "border-red-500 border-2")}
                                        required
                                    />
                                    {formErrors.startDate && <p className="text-xs text-red-500 font-semibold">{formErrors.startDate}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase tracking-wider text-slate-500">End Date <span className="text-cyan-500">*</span></Label>
                                    <Input
                                        type="date"
                                        min={form.startDate || new Date().toISOString().split('T')[0]}
                                        value={form.endDate}
                                        onChange={e => {
                                            const selectedDate = e.target.value
                                            const today = new Date().toISOString().split('T')[0]
                                            
                                            if (selectedDate < today) {
                                                toast.error("Past dates are not allowed")
                                                return
                                            }
                                            
                                            if (form.startDate && selectedDate < form.startDate) {
                                                toast.error("End date cannot be before start date")
                                                return
                                            }
                                            
                                            setForm(p => ({ ...p, endDate: selectedDate }))
                                            if (formErrors.endDate) setFormErrors(p => ({ ...p, endDate: "" }))
                                        }}
                                        className={cn("h-10 rounded-xl bg-slate-50", formErrors.endDate && "border-red-500 border-2")}
                                        required
                                    />
                                    {formErrors.endDate && <p className="text-xs text-red-500 font-semibold">{formErrors.endDate}</p>}
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
                                                className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
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
                                <p className="text-xs font-bold text-cyan-600 mt-2">{form.guardIds.length} guard(s) selected</p>
                            )}
                        </FormCard>

                        <div className="flex justify-center">
                            <SubmitButton 
                                label="Create Deployment" 
                                loading={saving}
                                disabled={!form.clientId || !form.shiftId || !form.startDate || !form.endDate || saving}
                            />
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Deployment Dialog */}
            <Dialog open={!!editingDeployment} onOpenChange={(open) => { if (!open) setEditingDeployment(null) }}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black">Edit Deployment</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleEditSubmit} className="space-y-6 mt-2">
                        <FormCard>
                            <FormHeader title="Deployment Details" color="blue" />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase tracking-wider text-slate-500">Client Site *</Label>
                                    <Select 
                                        value={editForm.clientId} 
                                        onValueChange={(v) => setEditForm(p => ({ ...p, clientId: v }))}
                                    >
                                        <SelectTrigger className="h-10 rounded-xl bg-slate-50 border-slate-200">
                                            <SelectValue placeholder="Select Client" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border-slate-200 bg-white p-2">
                                            {clients.map(c => (
                                                <SelectItem key={c.id} value={c.id} className="py-3 font-medium rounded-lg hover:bg-cyan-50 focus:bg-cyan-50">
                                                    {c.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase tracking-wider text-slate-500">Shift *</Label>
                                    <Select 
                                        value={editForm.shiftId} 
                                        onValueChange={(v) => setEditForm(p => ({ ...p, shiftId: v }))}
                                    >
                                        <SelectTrigger className="h-10 rounded-xl bg-slate-50 border-slate-200">
                                            <SelectValue placeholder="Select Shift" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border-slate-200 bg-white p-2">
                                            {shifts.map(s => (
                                                <SelectItem key={s.id} value={s.id} className="py-3 font-medium rounded-lg hover:bg-cyan-50 focus:bg-cyan-50">
                                                    {s.name} ({s.startTime} – {s.endTime})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase tracking-wider text-slate-500">Start Date *</Label>
                                    <Input
                                        type="date"
                                        min={new Date().toISOString().split('T')[0]}
                                        value={editForm.startDate}
                                        onChange={e => {
                                            const selectedDate = e.target.value
                                            const today = new Date().toISOString().split('T')[0]
                                            
                                            if (selectedDate < today) {
                                                toast.error("Past dates are not allowed")
                                                return
                                            }
                                            
                                            setEditForm(p => ({ ...p, startDate: selectedDate }))
                                            
                                            // If end date is before new start date, clear it
                                            if (editForm.endDate && selectedDate > editForm.endDate) {
                                                setEditForm(p => ({ ...p, endDate: "" }))
                                            }
                                        }}
                                        className="h-10 rounded-xl bg-slate-50"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase tracking-wider text-slate-500">End Date *</Label>
                                    <Input
                                        type="date"
                                        min={editForm.startDate || new Date().toISOString().split('T')[0]}
                                        value={editForm.endDate}
                                        onChange={e => {
                                            const selectedDate = e.target.value
                                            const today = new Date().toISOString().split('T')[0]
                                            
                                            if (selectedDate < today) {
                                                toast.error("Past dates are not allowed")
                                                return
                                            }
                                            
                                            if (editForm.startDate && selectedDate < editForm.startDate) {
                                                toast.error("End date cannot be before start date")
                                                return
                                            }
                                            
                                            setEditForm(p => ({ ...p, endDate: selectedDate }))
                                        }}
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
                        <div className="flex justify-center">
                            <SubmitButton 
                                label="Update Deployment" 
                                loading={saving}
                                disabled={!editForm.clientId || !editForm.shiftId || !editForm.startDate || !editForm.endDate || saving}
                            />
                        </div>
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

            {/* Status Change Confirmation Modal */}
            <AlertModal
                isOpen={statusConfirmModal.open}
                onClose={closeStatusConfirmModal}
                onConfirm={handleConfirmedStatusChange}
                loading={saving}
                title={
                    statusConfirmModal.status === "active"
                        ? "Activate Deployment"
                        : statusConfirmModal.status === "completed"
                            ? "Complete Deployment"
                            : "Cancel Deployment"
                }
                description={`Are you sure you want to mark "${statusConfirmModal.clientName}" as ${statusConfirmModal.status}?`}
                variant={statusConfirmModal.status === "cancelled" ? "danger" : "primary"}
                confirmText={
                    statusConfirmModal.status === "active"
                        ? "Activate"
                        : statusConfirmModal.status === "completed"
                            ? "Complete"
                            : "Cancel Deployment"
                }
                cancelText="Cancel"
            />

            {/* Create Confirmation Modal */}
            <AlertModal
                isOpen={createConfirmModal}
                onClose={() => {
                    setCreateConfirmModal(false)
                    setShowCreate(true)
                }}
                onConfirm={handleCreateConfirm}
                loading={saving}
                title="Create Deployment"
                description="Are you sure you want to create this deployment?"
                variant="primary"
                confirmText="Create"
                cancelText="Cancel"
            />

            {/* Edit Confirmation Modal */}
            <AlertModal
                isOpen={editConfirmModal}
                onClose={() => setEditConfirmModal(false)}
                onConfirm={handleEdit}
                loading={saving}
                title="Save Changes"
                description="Are you sure you want to save changes to this deployment?"
                variant="primary"
                confirmText="Save Changes"
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
            <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto bg-white rounded-[40px] border-none shadow-2xl">
                <DialogHeader className="pr-12">
                    <DialogTitle className="text-2xl font-black text-slate-900">Manage Guards</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 mt-2">
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
                                        className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
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
                                className="mt-3 w-full bg-[#06b6d4] hover:bg-[#0891b2] text-white font-black rounded-xl h-11"
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

