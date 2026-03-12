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
import { toast } from "@/components/ui/sonner"
import { useAuthStore } from "@/store/authStore"
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
    1: { label: "Low", emoji: "🟢", color: "bg-blue-50 text-blue-700 border-blue-100" },
    2: { label: "Medium", emoji: "🟡", color: "bg-amber-50 text-amber-700 border-amber-100" },
    3: { label: "High", emoji: "🔴", color: "bg-orange-50 text-orange-700 border-orange-100" },
    4: { label: "Critical", emoji: "⚫", color: "bg-rose-50 text-rose-700 border-rose-100" },
}

const incidentStatusColors: Record<string, string> = {
    open: "bg-rose-50 text-rose-700 border-rose-100",
    under_review: "bg-amber-50 text-amber-700 border-amber-100",
    resolved: "bg-emerald-50 text-emerald-700 border-emerald-100",
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

    const isAdmin = user?.role?.toLowerCase().includes('admin')
    const isSupervisor = user?.role?.toLowerCase().includes('supervisor')
    const isGuard = user?.role?.toLowerCase().includes('guard') || user?.role?.toLowerCase().includes('staff')
    const canManage = isAdmin || isSupervisor || user?.permissions?.includes('manage_incidents')
    const canReport = isAdmin || isSupervisor || user?.permissions?.includes('report_incident')

    const fetchData = async () => {
        setLoading(true)
        try {
            const [incRes, depRes] = await Promise.allSettled([
                canManage ? api.get("/incidents") : api.get("/incidents/my-incidents"),
                isAdmin ? api.get("/deployments") : api.get("/deployments/my-schedule"),
            ])
            if (incRes.status === "fulfilled") setIncidents(incRes.value.data)
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
    }, [])

    // For guards, auto-select active deployment
    const activeDeployments = deployments.filter(d => d.status === "active")

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.title) {
            toast.error("Title is required")
            return
        }
        setSaving(true)
        try {
            await api.post("/incidents", {
                title: form.title,
                description: form.description,
                type: form.type || undefined,
                deploymentId: form.deploymentId || undefined,
                severity: form.severity,
            })
            toast.success("Incident reported successfully")
            setShowCreate(false)
            setForm({ title: "", description: "", type: "", deploymentId: "", severity: 1 })
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

            <div className="grid gap-6 md:grid-cols-4">
                <StatCard title="Total Incidents" value={stats.total} icon={<FileWarning />} color="slate" />
                <StatCard title="Open" value={stats.open} icon={<AlertTriangle />} color="rose" />
                <StatCard title="Under Review" value={stats.underReview} icon={<Clock />} color="amber" />
                <StatCard title="High/Critical" value={stats.critical} icon={<Shield />} color="orange" />
            </div>

            <ControlPanel count={filtered.length} totalLabel="Incidents">
                <div className="flex items-center gap-3 flex-1 flex-wrap">
                    <Input
                        placeholder="Search by title or reporter..."
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
                        <option value="open">Open</option>
                        <option value="under_review">Under Review</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                    </select>
                    <select
                        value={severityFilter}
                        onChange={e => setSeverityFilter(e.target.value)}
                        className="h-10 rounded-xl bg-slate-50 border border-slate-200 px-3 text-sm"
                    >
                        <option value="">All Severity</option>
                        <option value="1">Low</option>
                        <option value="2">Medium</option>
                        <option value="3">High</option>
                        <option value="4">Critical</option>
                    </select>
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
                        <TableRow key={inc.id} className="group hover:bg-slate-50/50">
                            <TableCell className="px-4 sm:px-8 py-5">
                                <div>
                                    <p className="font-bold text-slate-900">{inc.title}</p>
                                    {inc.description && (
                                        <p className="text-xs text-slate-400 mt-1 line-clamp-1 max-w-xs">{inc.description}</p>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell>
                                <span className="text-sm text-slate-600 capitalize">
                                    {inc.type?.replace("_", " ") || "—"}
                                </span>
                            </TableCell>
                            <TableCell>
                                <p className="text-sm text-slate-600">
                                    {inc.deployment?.client?.name || "—"}
                                </p>
                            </TableCell>
                            <TableCell>
                                <span className={cn(
                                    "inline-flex items-center px-3 py-1 rounded-lg font-bold text-[10px] uppercase tracking-wide border",
                                    severityLabels[inc.severity]?.color || "bg-slate-100 text-slate-600"
                                )}>
                                    {severityLabels[inc.severity]?.emoji} {severityLabels[inc.severity]?.label || "Unknown"}
                                </span>
                            </TableCell>
                            <TableCell>
                                <span className={cn(
                                    "inline-flex items-center px-3 py-1 rounded-lg font-bold text-[10px] uppercase tracking-wide border",
                                    incidentStatusColors[inc.status] || "bg-slate-100 text-slate-600"
                                )}>
                                    {inc.status.replace("_", " ")}
                                </span>
                            </TableCell>
                            <TableCell>
                                <p className="text-sm font-medium text-slate-700">{inc.reporter?.fullName || "Unknown"}</p>
                            </TableCell>
                            <TableCell className="text-sm text-slate-500">
                                {new Date(inc.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="px-4 sm:px-8">
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
                                    <Label className="text-xs font-black uppercase tracking-wider text-slate-500">Title *</Label>
                                    <Input
                                        value={form.title}
                                        onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                                        placeholder="Brief incident title..."
                                        className="h-10 rounded-xl bg-slate-50"
                                        required
                                    />
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
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black uppercase tracking-wider text-slate-500">Type</Label>
                                        <select
                                            value={form.type}
                                            onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                                            className="w-full h-10 rounded-xl bg-slate-50 border border-slate-200 px-3 text-sm"
                                        >
                                            <option value="">Select type...</option>
                                            {INCIDENT_TYPES.map(t => (
                                                <option key={t.value} value={t.value}>{t.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black uppercase tracking-wider text-slate-500">Severity</Label>
                                        <select
                                            value={form.severity}
                                            onChange={e => setForm(p => ({ ...p, severity: parseInt(e.target.value) }))}
                                            className="w-full h-10 rounded-xl bg-slate-50 border border-slate-200 px-3 text-sm"
                                        >
                                            <option value={1}>{severityLabels[1].emoji} Low</option>
                                            <option value={2}>{severityLabels[2].emoji} Medium</option>
                                            <option value={3}>{severityLabels[3].emoji} High</option>
                                            <option value={4}>{severityLabels[4].emoji} Critical</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase tracking-wider text-slate-500">
                                        Deployment Site {isGuard && activeDeployments.length === 1 ? "(auto-linked)" : ""}
                                    </Label>
                                    {isGuard && activeDeployments.length === 1 ? (
                                        // Guard with one active deployment — auto-select it
                                        <div className="h-10 rounded-xl bg-emerald-50 border border-emerald-200 px-3 flex items-center text-sm text-emerald-700 font-medium">
                                            {activeDeployments[0].client?.name} — {activeDeployments[0].shift?.name}
                                        </div>
                                    ) : (
                                        <select
                                            value={form.deploymentId}
                                            onChange={e => setForm(p => ({ ...p, deploymentId: e.target.value }))}
                                            className="w-full h-10 rounded-xl bg-slate-50 border border-slate-200 px-3 text-sm"
                                        >
                                            <option value="">Auto-detect deployment</option>
                                            {(isAdmin ? deployments : activeDeployments).map(d => (
                                                <option key={d.id} value={d.id}>{d.client?.name || "Unknown"} — {d.shift?.name || "N/A"}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            </div>
                        </FormCard>
                        <SubmitButton label="Report Incident" loading={saving} />
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

                            <div className="grid grid-cols-2 gap-4 text-sm">
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
