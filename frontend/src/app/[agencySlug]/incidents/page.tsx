"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import api from "@/lib/api"
import {
    AlertTriangle,
    Plus,
    Shield,
    Clock,
    FileWarning,
    Eye,
    MessageSquare,
    CheckCircle2,
    XCircle,
} from "lucide-react"
import {
    PageHeader,
    StatCard,
    PageLoading,
    DataTable,
    TableRowEmpty,
    CreateButton,
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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/sonner"
import { useAuthStore } from "@/store/authStore"
import { Pagination } from "@/components/ui/Pagination"
import { cn } from "@/lib/utils"

interface Incident {
    id: string
    title: string
    description?: string
    type?: string
    severity: number
    status: string
    reviewNotes?: string
    resolution?: string
    createdAt: string
    reporter: { id: string; fullName: string; email: string }
    deployment?: {
        id: string
        client: { name: string }
        shift?: { name: string }
    }
}

interface Deployment {
    id: string
    client: { name: string }
    shift: { name: string }
    status: string
}

const INCIDENT_TYPES = [
    { value: "theft", label: "Theft" },
    { value: "trespassing", label: "Trespassing" },
    { value: "vandalism", label: "Vandalism" },
    { value: "medical", label: "Medical Emergency" },
    { value: "fire", label: "Fire" },
    { value: "assault", label: "Assault" },
    { value: "suspicious_activity", label: "Suspicious Activity" },
    { value: "equipment_damage", label: "Equipment Damage" },
    { value: "other", label: "Other" },
]

const severityLabels: Record<number, { label: string; emoji: string; color: string }> = {
    1: { label: "Low", emoji: "🟢", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
    2: { label: "Medium", emoji: "🟡", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
    3: { label: "High", emoji: "🔴", color: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
    4: { label: "Critical", emoji: "⚫", color: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
}

const incidentStatusColors: Record<string, string> = {
    open: "bg-red-100 text-red-700 border-red-200",
    under_review: "bg-orange-100 text-orange-700 border-orange-200",
    resolved: "bg-green-100 text-green-700 border-green-200",
    closed: "bg-slate-100 text-slate-600 border-slate-200",
}

export default function IncidentsPage() {
    const { agencySlug } = useParams()
    const { user } = useAuthStore()
    const [incidents, setIncidents] = useState<Incident[]>([])
    const [deployments, setDeployments] = useState<Deployment[]>([])
    const [loading, setLoading] = useState(true)
    const [showCreate, setShowCreate] = useState(false)
    const [saving, setSaving] = useState(false)
    const [search, setSearch] = useState("")
    const [statusFilter, setStatusFilter] = useState("")
    const [severityFilter, setSeverityFilter] = useState("")

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    const [totalRecords, setTotalRecords] = useState(0)

    // Detail / review dialogs
    const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
    const [showDetail, setShowDetail] = useState(false)
    const [showReview, setShowReview] = useState(false)
    const [reviewTarget, setReviewTarget] = useState<{ id: string; status: string } | null>(null)
    const [reviewNotes, setReviewNotes] = useState("")
    const [reviewSaving, setReviewSaving] = useState(false)

    const [form, setForm] = useState({
        title: "",
        description: "",
        type: "",
        deploymentId: "",
        severity: 1,
    })

    const [formErrors, setFormErrors] = useState({
        title: "",
        deploymentId: "",
    })

    const isAdmin = user?.role?.toLowerCase().includes('admin')
    const isSupervisor = user?.role?.toLowerCase().includes('supervisor')
    const isGuard = user?.role?.toLowerCase().includes('guard') || user?.role?.toLowerCase().includes('staff')
    const canManage = isAdmin || isSupervisor || user?.permissions?.includes('manage_incidents')
    const canReport = isAdmin || isSupervisor || user?.permissions?.includes('report_incident')

    const fetchData = async () => {
        setLoading(true)
        try {
            const [incRes, depRes] = await Promise.allSettled([
                canManage ? api.get(`/incidents?page=${currentPage}&limit=${pageSize}`) : api.get("/incidents/my-incidents"),
                isAdmin ? api.get("/deployments") : api.get("/deployments/my-schedule"),
            ])
            if (incRes.status === "fulfilled") {
                const incidentsResponse = incRes.value.data
                if (incidentsResponse.data && Array.isArray(incidentsResponse.data)) {
                    setIncidents(incidentsResponse.data)
                    setTotalRecords(incidentsResponse.pagination?.total || 0)
                } else {
                    setIncidents(Array.isArray(incidentsResponse) ? incidentsResponse : [])
                    setTotalRecords(Array.isArray(incidentsResponse) ? incidentsResponse.length : 0)
                }
            }
            if (depRes.status === "fulfilled") {
                const data = depRes.value.data
                if (Array.isArray(data)) {
                    setDeployments(data)
                } else {
                    const all = [...(data.today || []), ...(data.upcoming || []), ...(data.past || [])]
                    setDeployments(all)
                }
            }
        } catch {
            toast.error("Failed to load incidents")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [currentPage, pageSize])

    // For guards, auto-select active deployment
    const activeDeployments = deployments.filter(d => d.status === "active")

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        
        // Reset errors
        setFormErrors({ title: "", deploymentId: "" })
        
        // Validate required fields
        const errors: any = {}
        if (!form.title.trim()) errors.title = "This field is required"
        
        // Auto-link deployment if guard has only one active deployment
        let deploymentId = form.deploymentId
        if (isGuard && activeDeployments.length === 1 && !deploymentId) {
            deploymentId = activeDeployments[0].id
        }
        
        // Validate deployment site is selected (not auto-linked for guards with single deployment)
        if (!deploymentId) {
            errors.deploymentId = "This field is required"
        }
        
        if (Object.keys(errors).length > 0) {
            setFormErrors(errors)
            toast.error("Please fill all required fields")
            return
        }
        
        setSaving(true)
        try {
            await api.post("/incidents", {
                title: form.title,
                description: form.description || undefined,
                type: form.type || undefined,
                deploymentId: deploymentId,
                severity: form.severity || 1,
            })
            toast.success("Incident reported successfully")
            setShowCreate(false)
            setForm({ title: "", description: "", type: "", deploymentId: "", severity: 1 })
            setFormErrors({ title: "", deploymentId: "" })
            fetchData()
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to report incident")
        } finally {
            setSaving(false)
        }
    }

    const openReviewDialog = (id: string, status: string) => {
        setReviewTarget({ id, status })
        setReviewNotes("")
        setShowReview(true)
    }

    const handleStatusChange = async () => {
        if (!reviewTarget) return
        setReviewSaving(true)
        try {
            await api.patch(`/incidents/${reviewTarget.id}/status`, {
                status: reviewTarget.status,
                notes: reviewNotes || undefined,
            })
            const messages: Record<string, string> = {
                under_review: "Incident marked as Under Review",
                resolved: "Incident has been Resolved",
                closed: "Incident has been Closed",
            }
            toast.success(messages[reviewTarget.status] || "Status updated")
            setShowReview(false)
            setReviewTarget(null)
            fetchData()
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to update status")
        } finally {
            setReviewSaving(false)
        }
    }

    const openDetail = (inc: Incident) => {
        setSelectedIncident(inc)
        setShowDetail(true)
    }

    const filtered = incidents.filter(inc => {
        const matchSearch = !search ||
            inc.title.toLowerCase().includes(search.toLowerCase()) ||
            inc.reporter.fullName.toLowerCase().includes(search.toLowerCase())
        const matchStatus = !statusFilter || inc.status === statusFilter
        const matchSeverity = !severityFilter || inc.severity === parseInt(severityFilter)
        return matchSearch && matchStatus && matchSeverity
    })

    if (loading) return <PageLoading message="Loading Incidents..." />

    const stats = {
        total: incidents.length,
        open: incidents.filter(i => i.status === "open").length,
        underReview: incidents.filter(i => i.status === "under_review").length,
        critical: incidents.filter(i => i.severity >= 3).length,
    }

    const reviewLabel: Record<string, string> = {
        under_review: "Mark as Under Review",
        resolved: "Resolve Incident",
        closed: "Close Incident",
    }

    return (
        <div className="space-y-10 pb-20">
            <PageHeader
                title="Incident"
                titleHighlight="Reporting"
                subtitle="Report and manage security incidents across deployments."
                action={canReport ? (
                    <CreateButton
                        onClick={() => setShowCreate(true)}
                        label="Report Incident"
                        icon={<Plus className="h-4 w-4" />}
                    />
                ) : undefined}
            />

            <div className="grid gap-4 grid-cols-2 sm:gap-6 md:grid-cols-4">
                <StatCard title="Total Incidents" value={stats.total} icon={<FileWarning className="text-slate-700" />} color="slate" />
                <StatCard title="Open" value={stats.open} icon={<AlertTriangle className="text-red-700" />} color="rose" />
                <StatCard title="Under Review" value={stats.underReview} icon={<Clock className="text-orange-700" />} color="orange" />
                <StatCard title="High/Critical" value={stats.critical} icon={<Shield className="text-orange-700" />} color="orange" />
            </div>

            <ControlPanel count={filtered.length} totalLabel="Incidents">
                <div className="flex items-center gap-3 flex-1 flex-wrap">
                    <Input
                        placeholder="Search by title or reporter..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="h-10 rounded-xl bg-white border border-border w-full sm:max-w-xs text-slate-900 placeholder:text-slate-400"
                    />
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="h-10 rounded-xl bg-white border-border w-[160px]">
                            <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200 bg-white p-2">
                            <SelectItem value="ALL" className="py-3 font-medium rounded-lg hover:bg-cyan-50 focus:bg-cyan-50">
                                All Status
                            </SelectItem>
                            <SelectItem value="open" className="py-3 font-medium rounded-lg hover:bg-cyan-50 focus:bg-cyan-50">
                                Open
                            </SelectItem>
                            <SelectItem value="under_review" className="py-3 font-medium rounded-lg hover:bg-cyan-50 focus:bg-cyan-50">
                                Under Review
                            </SelectItem>
                            <SelectItem value="resolved" className="py-3 font-medium rounded-lg hover:bg-cyan-50 focus:bg-cyan-50">
                                Resolved
                            </SelectItem>
                            <SelectItem value="closed" className="py-3 font-medium rounded-lg hover:bg-cyan-50 focus:bg-cyan-50">
                                Closed
                            </SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={severityFilter} onValueChange={setSeverityFilter}>
                        <SelectTrigger className="h-10 rounded-xl bg-white border-border w-[160px]">
                            <SelectValue placeholder="All Severity" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200 bg-white p-2">
                            <SelectItem value="ALL" className="py-3 font-medium rounded-lg hover:bg-cyan-50 focus:bg-cyan-50">
                                All Severity
                            </SelectItem>
                            <SelectItem value="1" className="py-3 font-medium rounded-lg hover:bg-cyan-50 focus:bg-cyan-50">
                                Low
                            </SelectItem>
                            <SelectItem value="2" className="py-3 font-medium rounded-lg hover:bg-cyan-50 focus:bg-cyan-50">
                                Medium
                            </SelectItem>
                            <SelectItem value="3" className="py-3 font-medium rounded-lg hover:bg-cyan-50 focus:bg-cyan-50">
                                High
                            </SelectItem>
                            <SelectItem value="4" className="py-3 font-medium rounded-lg hover:bg-cyan-50 focus:bg-cyan-50">
                                Critical
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </ControlPanel>

            <DataTable columns={["Incident", "Type", "Site", "Severity", "Status", "Reported By", "Date", "Actions"]}>
                {filtered.length === 0 ? (
                    <TableRowEmpty
                        colSpan={8}
                        title="No Incidents Found"
                        description="No incidents have been reported yet."
                        icon={<AlertTriangle className="h-8 w-8" />}
                    />
                ) : (
                    filtered.map(inc => (
                        <TableRow key={inc.id} className="group">
                            <TableCell className="py-4">
                                <div>
                                    <p className="font-semibold text-slate-900">{inc.title}</p>
                                    {inc.description && (
                                        <p className="text-[12px] text-slate-500 mt-1 line-clamp-1 max-w-xs">{inc.description}</p>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell>
                                <span className="text-slate-600 capitalize">
                                    {inc.type?.replace("_", " ") || "—"}
                                </span>
                            </TableCell>
                            <TableCell>
                                <p className="text-slate-600">
                                    {inc.deployment?.client?.name || "—"}
                                </p>
                            </TableCell>
                            <TableCell>
                                <span className={cn(
                                    "inline-flex items-center px-3 py-1 rounded-full font-semibold text-[12px] border",
                                    severityLabels[inc.severity]?.color || "bg-slate-100 text-slate-600"
                                )}>
                                    {severityLabels[inc.severity]?.emoji} {severityLabels[inc.severity]?.label || "Unknown"}
                                </span>
                            </TableCell>
                            <TableCell>
                                <span className={cn(
                                    "inline-flex items-center px-3 py-1 rounded-full font-semibold text-[12px] border",
                                    incidentStatusColors[inc.status] || "bg-slate-100 text-slate-600"
                                )}>
                                    {inc.status.replace("_", " ")}
                                </span>
                            </TableCell>
                            <TableCell>
                                <p className="text-slate-700 font-medium">{inc.reporter?.fullName || "Unknown"}</p>
                            </TableCell>
                            <TableCell className="text-slate-600">
                                {new Date(inc.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="sm" className="text-xs font-bold text-slate-500 hover:bg-slate-100"
                                        onClick={() => openDetail(inc)}>
                                        <Eye className="h-3.5 w-3.5 mr-1" /> View
                                    </Button>
                                    {canManage && inc.status !== "closed" && (
                                        <>
                                            {inc.status === "open" && (
                                                <Button variant="ghost" size="sm" className="text-xs font-bold text-amber-600 hover:bg-amber-50"
                                                    onClick={() => openReviewDialog(inc.id, "under_review")}>
                                                    <MessageSquare className="h-3.5 w-3.5 mr-1" /> Review
                                                </Button>
                                            )}
                                            {inc.status === "under_review" && (
                                                <Button variant="ghost" size="sm" className="text-xs font-bold text-emerald-600 hover:bg-emerald-50"
                                                    onClick={() => openReviewDialog(inc.id, "resolved")}>
                                                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Resolve
                                                </Button>
                                            )}
                                            {["open", "under_review", "resolved"].includes(inc.status) && (
                                                <Button variant="ghost" size="sm" className="text-xs font-bold text-slate-400 hover:bg-slate-100"
                                                    onClick={() => openReviewDialog(inc.id, "closed")}>
                                                    <XCircle className="h-3.5 w-3.5 mr-1" /> Close
                                                </Button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </TableCell>
                        </TableRow>
                    ))
                )}
            </DataTable>

            {totalRecords > 0 && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={Math.ceil(totalRecords / pageSize)}
                    pageSize={pageSize}
                    totalRecords={totalRecords}
                    onPageChange={(page) => setCurrentPage(page)}
                    onPageSizeChange={(size) => {
                        setPageSize(size)
                        setCurrentPage(1)
                    }}
                />
            )}

            {/* ─── Report Incident Dialog ─── */}
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black">Report Incident</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreate} className="space-y-6 mt-4">
                        <FormCard>
                            <FormHeader title="Incident Details" color="rose" />
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase tracking-wider text-slate-500">Title <span className="text-red-500">*</span></Label>
                                    <Input
                                        value={form.title}
                                        onChange={e => {
                                            setForm(p => ({ ...p, title: e.target.value }))
                                            if (formErrors.title) setFormErrors(p => ({ ...p, title: "" }))
                                        }}
                                        placeholder="Brief incident title..."
                                        className={cn("h-10 rounded-xl bg-slate-50", formErrors.title && "border-red-500 border-2")}
                                        required
                                    />
                                    {formErrors.title && <p className="text-xs text-red-500 font-semibold">{formErrors.title}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase tracking-wider text-slate-500">Description</Label>
                                    <Textarea
                                        value={form.description}
                                        onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                                        placeholder="Describe the incident in detail..."
                                        className="rounded-xl bg-slate-50"
                                        rows={4}
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black uppercase tracking-wider text-slate-500">Type</Label>
                                        <Select 
                                            value={form.type} 
                                            onValueChange={(v) => setForm(p => ({ ...p, type: v }))}
                                        >
                                            <SelectTrigger className="h-10 rounded-xl bg-slate-50 border-slate-200">
                                                <SelectValue placeholder="Select type..." />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-slate-200 bg-white p-2">
                                                {INCIDENT_TYPES.map(t => (
                                                    <SelectItem key={t.value} value={t.value} className="py-3 font-medium rounded-lg hover:bg-cyan-50 focus:bg-cyan-50">
                                                        {t.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black uppercase tracking-wider text-slate-500">Severity</Label>
                                        <Select 
                                            value={form.severity.toString()} 
                                            onValueChange={(v) => setForm(p => ({ ...p, severity: parseInt(v) }))}
                                        >
                                            <SelectTrigger className="h-10 rounded-xl bg-slate-50 border-slate-200">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-slate-200 bg-white p-2">
                                                <SelectItem value="1" className="py-3 font-medium rounded-lg hover:bg-cyan-50 focus:bg-cyan-50">
                                                    {severityLabels[1].emoji} Low
                                                </SelectItem>
                                                <SelectItem value="2" className="py-3 font-medium rounded-lg hover:bg-cyan-50 focus:bg-cyan-50">
                                                    {severityLabels[2].emoji} Medium
                                                </SelectItem>
                                                <SelectItem value="3" className="py-3 font-medium rounded-lg hover:bg-cyan-50 focus:bg-cyan-50">
                                                    {severityLabels[3].emoji} High
                                                </SelectItem>
                                                <SelectItem value="4" className="py-3 font-medium rounded-lg hover:bg-cyan-50 focus:bg-cyan-50">
                                                    {severityLabels[4].emoji} Critical
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase tracking-wider text-slate-500">
                                        Deployment Site <span className="text-red-500">*</span> {isGuard && activeDeployments.length === 1 ? "(auto-linked)" : ""}
                                    </Label>
                                    {isGuard && activeDeployments.length === 1 ? (
                                        // Guard with one active deployment — auto-linked on submit
                                        <div className="h-10 rounded-xl bg-emerald-50 border border-emerald-200 px-3 flex items-center text-sm text-emerald-700 font-medium">
                                            {activeDeployments[0].client?.name} — {activeDeployments[0].shift?.name}
                                        </div>
                                    ) : (
                                        <>
                                            <Select 
                                                value={form.deploymentId} 
                                                onValueChange={(v) => {
                                                    setForm(p => ({ ...p, deploymentId: v }))
                                                    if (formErrors.deploymentId) setFormErrors(p => ({ ...p, deploymentId: "" }))
                                                }}
                                            >
                                                <SelectTrigger className={cn("h-10 rounded-xl bg-slate-50 border-slate-200", formErrors.deploymentId && "border-red-500 border-2")}>
                                                    <SelectValue placeholder="Select deployment site" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl border-slate-200 bg-white p-2">
                                                    {(isAdmin ? deployments : activeDeployments).map(d => (
                                                        <SelectItem key={d.id} value={d.id} className="py-3 font-medium rounded-lg hover:bg-cyan-50 focus:bg-cyan-50">
                                                            {d.client?.name || "Unknown"} — {d.shift?.name || "N/A"}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {formErrors.deploymentId && <p className="text-xs text-red-500 font-semibold">{formErrors.deploymentId}</p>}
                                        </>
                                    )}
                                </div>
                            </div>
                        </FormCard>
                        <div className="flex justify-center">
                            <SubmitButton 
                                label="Report Incident" 
                                loading={saving}
                                disabled={!form.title.trim() || saving}
                            />
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ─── Review / Status Change Dialog ─── */}
            <Dialog open={showReview} onOpenChange={setShowReview}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black">
                            {reviewLabel[reviewTarget?.status || ""] || "Update Status"}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-2">
                        <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-wider text-slate-500">
                                {reviewTarget?.status === "under_review" ? "Review Notes" :
                                    reviewTarget?.status === "resolved" ? "Resolution Details" : "Closing Remarks"}
                            </Label>
                            <Textarea
                                value={reviewNotes}
                                onChange={e => setReviewNotes(e.target.value)}
                                placeholder={
                                    reviewTarget?.status === "under_review" ? "Add your review comments..." :
                                    reviewTarget?.status === "resolved" ? "Describe how the incident was resolved..." :
                                    "Add final remarks before closing..."
                                }
                                className="rounded-xl bg-slate-50"
                                rows={4}
                            />
                        </div>
                        <div className="flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setShowReview(false)} className="rounded-xl">Cancel</Button>
                            <Button
                                onClick={handleStatusChange}
                                disabled={reviewSaving}
                                className={cn("rounded-xl font-bold",
                                    reviewTarget?.status === "under_review" ? "bg-amber-500 hover:bg-amber-600" :
                                    reviewTarget?.status === "resolved" ? "bg-emerald-500 hover:bg-emerald-600" :
                                    "bg-slate-600 hover:bg-slate-700"
                                )}
                            >
                                {reviewSaving ? "Saving..." : "Confirm"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ─── Incident Detail Dialog ─── */}
            <Dialog open={showDetail} onOpenChange={setShowDetail}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black">Incident Details</DialogTitle>
                    </DialogHeader>
                    {selectedIncident && (
                        <div className="space-y-5 mt-2">
                            <div>
                                <h3 className="font-black text-lg text-slate-900">{selectedIncident.title}</h3>
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                    <span className={cn(
                                        "inline-flex items-center px-3 py-1 rounded-lg font-bold text-[10px] uppercase tracking-wide border",
                                        severityLabels[selectedIncident.severity]?.color
                                    )}>
                                        {severityLabels[selectedIncident.severity]?.emoji} {severityLabels[selectedIncident.severity]?.label}
                                    </span>
                                    <span className={cn(
                                        "inline-flex items-center px-3 py-1 rounded-lg font-bold text-[10px] uppercase tracking-wide border",
                                        incidentStatusColors[selectedIncident.status]
                                    )}>
                                        {selectedIncident.status.replace("_", " ")}
                                    </span>
                                    {selectedIncident.type && (
                                        <span className="inline-flex items-center px-3 py-1 rounded-lg font-bold text-[10px] uppercase tracking-wide border bg-slate-50 text-slate-600 border-slate-200">
                                            {selectedIncident.type.replace("_", " ")}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {selectedIncident.description && (
                                <div className="bg-slate-50 rounded-xl p-4">
                                    <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Description</p>
                                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedIncident.description}</p>
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-1">Reported By</p>
                                    <p className="font-bold text-slate-900">{selectedIncident.reporter?.fullName}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-1">Date & Time</p>
                                    <p className="font-bold text-slate-900">
                                        {new Date(selectedIncident.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-1">Site</p>
                                    <p className="font-bold text-slate-900">{selectedIncident.deployment?.client?.name || "Not linked"}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-1">Shift</p>
                                    <p className="font-bold text-slate-900">{selectedIncident.deployment?.shift?.name || "—"}</p>
                                </div>
                            </div>

                            {selectedIncident.reviewNotes && (
                                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                                    <p className="text-xs font-black uppercase tracking-wider text-amber-600 mb-2">Supervisor Review Notes</p>
                                    <p className="text-sm text-amber-800 whitespace-pre-wrap">{selectedIncident.reviewNotes}</p>
                                </div>
                            )}

                            {selectedIncident.resolution && (
                                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                                    <p className="text-xs font-black uppercase tracking-wider text-emerald-600 mb-2">Resolution</p>
                                    <p className="text-sm text-emerald-800 whitespace-pre-wrap">{selectedIncident.resolution}</p>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
