"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import {
  PageHeader,
  CreateButton,
  DataTable,
  PageLoading,
  StatusBadge,
  TableRowEmpty,
  StatCard,
  RowViewButton,
  SubmitButton,
  SectionHeading,
  inputVariants,
  selectVariants,
  FormLabelBase,
} from "@/components/ui/design-system"
import { useAuthStore } from "@/store/authStore"
import { usePermission } from "@/hooks/usePermission"
import { toast } from "@/components/ui/sonner"
import api from "@/lib/api"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

import {
  Plus,
  Clock,
  Shield,
  Users,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Sun,
  Moon,
  CalendarDays,
  Trash2,
  LogIn,
  LogOut,
  UserPlus,
  Pencil,
  Power,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TableCell } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Shift {
  id: string
  name: string
  startTime: string
  endTime: string
  isActive: boolean
  _count?: { assignments: number }
}

interface ShiftAssignment {
  id: string
  date: string
  status: string
  checkIn: string | null
  checkOut: string | null
  notes: string | null
  shift: Shift
  employee: {
    id: string
    fullName: string
    employeeCode: string
    designation?: { name: string }
  }
  project?: { id: string; name: string } | null
}

const formatTime12 = (time24: string) => {
  const [h, m] = time24.split(":").map(Number)
  const ampm = h >= 12 ? "PM" : "AM"
  const hour = h % 12 || 12
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`
}

const formatDateTime = (dt: string | null) => {
  if (!dt) return "—"
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dt))
}

/** AM/PM time picker that stores value in 24h "HH:mm" format */
function TimePickerAmPm({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  // Parse 24h value into parts
  const parse = (v: string) => {
    if (!v) return { hour: "", minute: "", period: "AM" }
    const [h, m] = v.split(":").map(Number)
    const period = h >= 12 ? "PM" : "AM"
    const hour = (h % 12 || 12).toString()
    const minute = (m || 0).toString().padStart(2, "0")
    return { hour, minute, period }
  }

  const { hour, minute, period } = parse(value)

  const to24 = (h: string, m: string, p: string) => {
    let hNum = parseInt(h, 10)
    if (isNaN(hNum) || !m) return ""
    if (p === "AM" && hNum === 12) hNum = 0
    if (p === "PM" && hNum !== 12) hNum += 12
    return `${hNum.toString().padStart(2, "0")}:${m}`
  }

  const update = (h: string, m: string, p: string) => {
    const result = to24(h, m, p)
    if (result) onChange(result)
  }

  const selectClass = "h-12 rounded-xl bg-slate-50 border border-slate-200 px-3 text-sm font-semibold appearance-none cursor-pointer focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"

  return (
    <div className="flex items-center gap-2">
      <select
        value={hour}
        onChange={(e) => update(e.target.value, minute || "00", period)}
        className={cn(selectClass, "flex-1")}
        required
      >
        <option value="" disabled>HH</option>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
          <option key={h} value={h.toString()}>{h}</option>
        ))}
      </select>
      <span className="text-lg font-black text-slate-400">:</span>
      <select
        value={minute}
        onChange={(e) => update(hour || "12", e.target.value, period)}
        className={cn(selectClass, "flex-1")}
        required
      >
        <option value="" disabled>MM</option>
        {["00", "15", "30", "45"].map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
      <select
        value={period}
        onChange={(e) => update(hour || "12", minute || "00", e.target.value)}
        className={cn(selectClass, "w-20")}
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  )
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  SCHEDULED: { label: "Scheduled", color: "bg-blue-50 text-blue-700", icon: <Clock className="h-3 w-3" /> },
  COMPLETED: { label: "Completed", color: "bg-emerald-50 text-emerald-700", icon: <CheckCircle2 className="h-3 w-3" /> },
  LATE: { label: "Late Arrival", color: "bg-amber-50 text-amber-700", icon: <AlertTriangle className="h-3 w-3" /> },
  MISSED: { label: "Missed", color: "bg-rose-50 text-rose-700", icon: <XCircle className="h-3 w-3" /> },
}

export default function ShiftsPage() {
  const { agencySlug } = useParams()
  const { user } = useAuthStore()
  const { hasPermission } = usePermission()

  const [shifts, setShifts] = useState<Shift[]>([])
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Shift create dialog
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false)
  const [shiftForm, setShiftForm] = useState({ name: "", startTime: "", endTime: "" })
  const [submitting, setSubmitting] = useState(false)

  // Edit shift dialog
  const [editShiftDialogOpen, setEditShiftDialogOpen] = useState(false)
  const [editingShift, setEditingShift] = useState<Shift | null>(null)
  const [editShiftForm, setEditShiftForm] = useState({ name: "", startTime: "", endTime: "", isActive: true })

  // Assignment create dialog
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [assignForm, setAssignForm] = useState({ shiftId: "", employeeId: "", date: "", projectId: "" })

  // Filter
  const [filterDate, setFilterDate] = useState(() => {
    const now = new Date()
    const yyyy = now.getFullYear()
    const mm = String(now.getMonth() + 1).padStart(2, "0")
    const dd = String(now.getDate()).padStart(2, "0")
    return `${yyyy}-${mm}-${dd}`
  })
  const [filterStatus, setFilterStatus] = useState("")

  useEffect(() => {
    if (user) fetchAll()
  }, [user])

  useEffect(() => {
    if (user) fetchAssignments()
  }, [filterDate, filterStatus])

  const fetchAll = async () => {
    try {
      const [shiftsRes, empRes, projRes] = await Promise.allSettled([
        api.get("/shifts"),
        api.get("/employees"),
        api.get("/projects"),
      ])
      if (shiftsRes.status === "fulfilled") setShifts(shiftsRes.value.data)
      if (empRes.status === "fulfilled") setEmployees(empRes.value.data)
      if (projRes.status === "fulfilled") setProjects(projRes.value.data)
      await fetchAssignments()
    } catch {
      toast.error("Failed to load shift data")
    } finally {
      setLoading(false)
    }
  }

  const fetchAssignments = async () => {
    try {
      const params = new URLSearchParams()
      if (filterDate) params.append("date", filterDate)
      if (filterStatus) params.append("status", filterStatus)
      const res = await api.get(`/shift-assignments?${params.toString()}`)
      setAssignments(res.data)
    } catch {
      // silently fail on filter changes
    }
  }

  const handleCreateShift = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    try {
      await api.post("/shifts", shiftForm)
      toast.success("Shift created successfully")
      setShiftDialogOpen(false)
      setShiftForm({ name: "", startTime: "", endTime: "" })
      const res = await api.get("/shifts")
      setShifts(res.data)
    } catch {
      toast.error("Failed to create shift")
    } finally {
      setSubmitting(false)
    }
  }

  const handleAssignGuard = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    try {
      await api.post("/shift-assignments", assignForm)
      toast.success("Guard assigned to shift")
      setAssignDialogOpen(false)
      setAssignForm({ shiftId: "", employeeId: "", date: "", projectId: "" })
      fetchAssignments()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to assign guard")
    } finally {
      setSubmitting(false)
    }
  }

  const handleCheckIn = async (assignmentId: string) => {
    try {
      await api.post(`/shift-assignments/${assignmentId}/check-in`)
      toast.success("Shift check-in recorded")
      fetchAssignments()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Check-in failed")
    }
  }

  const handleCheckOut = async (assignmentId: string) => {
    try {
      await api.post(`/shift-assignments/${assignmentId}/check-out`)
      toast.success("Shift check-out recorded")
      fetchAssignments()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Check-out failed")
    }
  }

  const handleDetectMissed = async () => {
    try {
      const res = await api.post("/shift-assignments/detect-missed")
      if (res.data.markedMissed > 0) {
        toast.warning(`${res.data.markedMissed} shift(s) marked as missed`)
      } else {
        toast.info("No missed shifts detected")
      }
      fetchAssignments()
    } catch {
      toast.error("Failed to detect missed shifts")
    }
  }

  const handleDeleteShift = async (shiftId: string) => {
    try {
      await api.delete(`/shifts/${shiftId}`)
      toast.success("Shift deleted")
      setShifts((prev) => prev.filter((s) => s.id !== shiftId))
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete shift")
    }
  }

  const openEditShift = (shift: Shift) => {
    setEditingShift(shift)
    setEditShiftForm({
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
      isActive: shift.isActive,
    })
    setEditShiftDialogOpen(true)
  }

  const handleEditShift = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingShift || submitting) return
    setSubmitting(true)
    try {
      await api.patch(`/shifts/${editingShift.id}`, editShiftForm)
      toast.success("Shift updated successfully")
      setEditShiftDialogOpen(false)
      setEditingShift(null)
      const res = await api.get("/shifts")
      setShifts(res.data)
    } catch (err: any) {
      toast.error(err?.message || "Failed to update shift")
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleShiftActive = async (shift: Shift) => {
    try {
      await api.patch(`/shifts/${shift.id}`, { isActive: !shift.isActive })
      toast.success(`Shift ${shift.isActive ? "deactivated" : "activated"}`)
      setShifts((prev) => prev.map((s) => s.id === shift.id ? { ...s, isActive: !s.isActive } : s))
    } catch (err: any) {
      toast.error(err?.message || "Failed to toggle shift status")
    }
  }

  const handleDeleteAssignment = async (assignmentId: string) => {
    try {
      await api.delete(`/shift-assignments/${assignmentId}`)
      toast.success("Assignment removed")
      setAssignments((prev) => prev.filter((a) => a.id !== assignmentId))
    } catch {
      toast.error("Failed to remove assignment")
    }
  }

  if (loading) return <PageLoading message="Loading Shift Management..." />

  const totalAssignments = assignments.length
  const completedCount = assignments.filter((a) => a.status === "COMPLETED").length
  const lateCount = assignments.filter((a) => a.status === "LATE").length
  const missedCount = assignments.filter((a) => a.status === "MISSED").length

  return (
    <div className="space-y-12 pb-20">
      <PageHeader
        title="Shift"
        titleHighlight="Management"
        subtitle="Create shifts, assign guards, and track shift timings."
        action={
          hasPermission("manage_shifts") && (
            <div className="flex items-center gap-3">
              <Dialog open={shiftDialogOpen} onOpenChange={setShiftDialogOpen}>
                <DialogTrigger asChild>
                  <CreateButton label="Create Shift" icon={<Plus className="h-4 w-4" />} />
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px] border-none rounded-[40px] shadow-2xl p-0 overflow-hidden bg-white">
                  <DialogHeader className="p-10 bg-slate-900 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
                    <DialogTitle className="text-3xl font-black tracking-tight leading-none z-10 uppercase">New Shift</DialogTitle>
                    <DialogDescription className="text-slate-400 font-bold text-[10px] mt-3 uppercase tracking-[0.2em] z-10">Define shift name and timings</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateShift} className="p-10 space-y-8">
                    <div className="space-y-0">
                      <FormLabelBase label="Shift Name" required />
                      <Input
                        placeholder="e.g. Morning, Night, Evening"
                        value={shiftForm.name}
                        onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })}
                        className={inputVariants}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-0">
                        <FormLabelBase label="Start Time" required />
                        <TimePickerAmPm
                          value={shiftForm.startTime}
                          onChange={(v) => setShiftForm({ ...shiftForm, startTime: v })}
                        />
                      </div>
                      <div className="space-y-0">
                        <FormLabelBase label="End Time" required />
                        <TimePickerAmPm
                          value={shiftForm.endTime}
                          onChange={(v) => setShiftForm({ ...shiftForm, endTime: v })}
                        />
                      </div>
                    </div>
                    <div className="pt-4 flex items-center gap-4">
                      <Button type="button" variant="ghost" className="h-14 rounded-2xl font-black text-xs uppercase tracking-widest flex-1" onClick={() => setShiftDialogOpen(false)}>CANCEL</Button>
                      <SubmitButton label={submitting ? "CREATING..." : "CREATE SHIFT"} loading={submitting} className="flex-[2] mt-0" />
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          )
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Total Shifts" value={shifts.length} icon={<Shield />} color="teal" />
        <StatCard title="Assignments Today" value={totalAssignments} icon={<Users />} color="blue" />
        <StatCard title="Late Arrivals" value={lateCount} icon={<AlertTriangle />} color="amber" />
        <StatCard title="Missed Shifts" value={missedCount} icon={<XCircle />} color="rose" />
      </div>

      <Tabs defaultValue="assignments" className="space-y-8">
        <TabsList className="bg-slate-100 rounded-2xl p-1.5 h-auto">
          <TabsTrigger value="assignments" className="rounded-xl font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm px-6 py-3">
            Shift Assignments
          </TabsTrigger>
          <TabsTrigger value="shifts" className="rounded-xl font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm px-6 py-3">
            Shift Templates
          </TabsTrigger>
        </TabsList>

        {/* ─── ASSIGNMENTS TAB ─── */}
        <TabsContent value="assignments" className="space-y-6">
          {/* Filters & Actions Bar */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <FormLabelBase label="Date" />
              <Input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="rounded-2xl bg-white border-slate-200 h-11 w-44 font-bold text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <FormLabelBase label="Status" />
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="rounded-2xl bg-white border-slate-200 h-11 w-40 font-bold text-sm">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-slate-100 p-2">
                  <SelectItem value="ALL" className="py-3 font-bold rounded-xl">All</SelectItem>
                  <SelectItem value="SCHEDULED" className="py-3 font-bold rounded-xl">Scheduled</SelectItem>
                  <SelectItem value="COMPLETED" className="py-3 font-bold rounded-xl">Completed</SelectItem>
                  <SelectItem value="LATE" className="py-3 font-bold rounded-xl">Late</SelectItem>
                  <SelectItem value="MISSED" className="py-3 font-bold rounded-xl">Missed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {hasPermission("manage_shifts") && (
              <div className="flex items-center gap-3 ml-auto">
                <Button
                  variant="outline"
                  className="h-11 rounded-2xl font-black text-[10px] uppercase tracking-widest border-amber-200 text-amber-700 hover:bg-amber-50"
                  onClick={handleDetectMissed}
                >
                  <AlertTriangle className="h-3.5 w-3.5 mr-2" />
                  Detect Missed
                </Button>
                <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="h-11 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-slate-900 hover:bg-slate-800 text-white px-6">
                      <UserPlus className="h-3.5 w-3.5 mr-2" />
                      Assign Guard
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px] border-none rounded-[40px] shadow-2xl p-0 overflow-hidden bg-white">
                    <DialogHeader className="p-10 bg-slate-900 text-white relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
                      <DialogTitle className="text-3xl font-black tracking-tight leading-none z-10 uppercase">Assign Guard</DialogTitle>
                      <DialogDescription className="text-slate-400 font-bold text-[10px] mt-3 uppercase tracking-[0.2em] z-10">Assign a security guard to a shift</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAssignGuard} className="p-10 space-y-8">
                      <div className="space-y-0">
                        <FormLabelBase label="Select Shift" required />
                        <Select value={assignForm.shiftId} onValueChange={(v) => setAssignForm({ ...assignForm, shiftId: v })}>
                          <SelectTrigger className={selectVariants}><SelectValue placeholder="Choose a shift" /></SelectTrigger>
                          <SelectContent className="rounded-2xl border-slate-100 p-2">
                            {shifts.filter((s) => s.isActive).map((s) => (
                              <SelectItem key={s.id} value={s.id} className="py-3 font-bold rounded-xl">
                                {s.name} ({formatTime12(s.startTime)} – {formatTime12(s.endTime)})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-0">
                        <FormLabelBase label="Select Guard" required />
                        <Select value={assignForm.employeeId} onValueChange={(v) => setAssignForm({ ...assignForm, employeeId: v })}>
                          <SelectTrigger className={selectVariants}><SelectValue placeholder="Choose an employee" /></SelectTrigger>
                          <SelectContent className="rounded-2xl border-slate-100 p-2 max-h-60">
                            {employees.map((e: any) => (
                              <SelectItem key={e.id} value={e.id} className="py-3 font-bold rounded-xl">
                                {e.fullName} ({e.employeeCode})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-0">
                        <FormLabelBase label="Date" required />
                        <Input
                          type="date"
                          value={assignForm.date}
                          onChange={(e) => setAssignForm({ ...assignForm, date: e.target.value })}
                          className={inputVariants}
                          required
                        />
                      </div>
                      <div className="space-y-0">
                        <FormLabelBase label="Project / Site (Optional)" />
                        <Select value={assignForm.projectId} onValueChange={(v) => setAssignForm({ ...assignForm, projectId: v })}>
                          <SelectTrigger className={selectVariants}><SelectValue placeholder="No specific project" /></SelectTrigger>
                          <SelectContent className="rounded-2xl border-slate-100 p-2 max-h-60">
                            <SelectItem value="NONE" className="py-3 font-bold rounded-xl">None</SelectItem>
                            {projects.map((p: any) => (
                              <SelectItem key={p.id} value={p.id} className="py-3 font-bold rounded-xl">
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="pt-4 flex items-center gap-4">
                        <Button type="button" variant="ghost" className="h-14 rounded-2xl font-black text-xs uppercase tracking-widest flex-1" onClick={() => setAssignDialogOpen(false)}>CANCEL</Button>
                        <SubmitButton label={submitting ? "ASSIGNING..." : "ASSIGN GUARD"} loading={submitting} className="flex-[2] mt-0" />
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>

          <SectionHeading title="Guard Shift Assignments" />

          <DataTable columns={["Guard", "Shift", "Project", "Timing", "Status", "Actions"]}>
            <AnimatePresence mode="popLayout">
              {assignments.length === 0 ? (
                <TableRowEmpty colSpan={6} title="No Shift Assignments" icon={<CalendarDays />} />
              ) : (
                assignments.map((a, idx) => {
                  const sc = statusConfig[a.status] || statusConfig.SCHEDULED
                  return (
                    <motion.tr
                      key={a.id}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2, delay: idx * 0.02 }}
                      className="group hover:bg-slate-50/50 transition-colors"
                    >
                      <TableCell className="px-4 sm:px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-300 font-black group-hover:border-primary/20 group-hover:text-primary group-hover:scale-110 transition-all shadow-sm">
                            {a.employee?.fullName?.charAt(0) || "?"}
                          </div>
                          <div className="min-w-0">
                            <div className="font-extrabold text-slate-900 leading-tight group-hover:text-primary transition-colors truncate">{a.employee?.fullName}</div>
                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{a.employee?.employeeCode}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-black text-slate-900 text-[13px] tracking-tight">{a.shift?.name}</span>
                          <span className="text-[10px] text-slate-400 font-bold mt-0.5">
                            {formatTime12(a.shift?.startTime)} – {formatTime12(a.shift?.endTime)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-bold text-slate-600 text-[13px]">{a.project?.name || "—"}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-bold text-slate-500">
                            <span className="text-emerald-600">IN:</span> {formatDateTime(a.checkIn)}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500">
                            <span className="text-rose-600">OUT:</span> {formatDateTime(a.checkOut)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest", sc.color)}>
                          {sc.icon} {sc.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-right px-4 sm:px-8">
                        <div className="flex items-center justify-end gap-2">
                          {a.status === "SCHEDULED" && !a.checkIn && (
                            <Button
                              size="sm"
                              className="h-9 px-4 rounded-2xl bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white border-none font-black text-[9px] uppercase tracking-widest transition-all"
                              onClick={() => handleCheckIn(a.id)}
                            >
                              <LogIn className="h-3 w-3 mr-1.5" /> Check In
                            </Button>
                          )}
                          {a.checkIn && !a.checkOut && (
                            <Button
                              size="sm"
                              className="h-9 px-4 rounded-2xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border-none font-black text-[9px] uppercase tracking-widest transition-all"
                              onClick={() => handleCheckOut(a.id)}
                            >
                              <LogOut className="h-3 w-3 mr-1.5" /> Check Out
                            </Button>
                          )}
                          {hasPermission("manage_shifts") && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-9 w-9 rounded-2xl text-slate-300 hover:text-rose-500 hover:bg-rose-50"
                              onClick={() => handleDeleteAssignment(a.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </motion.tr>
                  )
                })
              )}
            </AnimatePresence>
          </DataTable>
        </TabsContent>

        {/* ─── SHIFT TEMPLATES TAB ─── */}
        <TabsContent value="shifts" className="space-y-6">
          <SectionHeading title="Configured Shifts" />

          <DataTable columns={["Shift Name", "Timing", "Assignments", "Status", "Actions"]}>
            <AnimatePresence mode="popLayout">
              {shifts.length === 0 ? (
                <TableRowEmpty colSpan={5} title="No Shifts Configured" icon={<Clock />} />
              ) : (
                shifts.map((shift, idx) => (
                  <motion.tr
                    key={shift.id}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2, delay: idx * 0.02 }}
                    className="group hover:bg-slate-50/50 transition-colors"
                  >
                    <TableCell className="px-4 sm:px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-white shadow-lg shadow-teal-100">
                          {shift.name.toLowerCase().includes("night") ? (
                            <Moon className="h-5 w-5" />
                          ) : (
                            <Sun className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <div className="font-black text-slate-900 text-base group-hover:text-primary transition-colors">{shift.name}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-black text-slate-900 text-[13px]">
                          {formatTime12(shift.startTime)} – {formatTime12(shift.endTime)}
                        </span>
                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-0.5">
                          {shift.startTime} — {shift.endTime}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-black text-slate-900 text-lg">{shift._count?.assignments ?? 0}</span>
                      <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest ml-2">TOTAL</span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={shift.isActive ? "ACTIVE" : "INACTIVE"} />
                    </TableCell>
                    <TableCell className="text-right px-4 sm:px-8">
                      {hasPermission("manage_shifts") && (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-9 w-9 rounded-2xl text-slate-400 hover:text-primary hover:bg-primary/10"
                            onClick={() => openEditShift(shift)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className={cn(
                              "h-9 w-9 rounded-2xl",
                              shift.isActive
                                ? "text-amber-500 hover:text-amber-700 hover:bg-amber-50"
                                : "text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50"
                            )}
                            onClick={() => handleToggleShiftActive(shift)}
                            title={shift.isActive ? "Deactivate" : "Activate"}
                          >
                            <Power className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-9 w-9 rounded-2xl text-slate-300 hover:text-rose-500 hover:bg-rose-50"
                            onClick={() => handleDeleteShift(shift.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </motion.tr>
                ))
              )}
            </AnimatePresence>
          </DataTable>
        </TabsContent>
      </Tabs>

      {/* Edit Shift Dialog */}
      <Dialog open={editShiftDialogOpen} onOpenChange={(open) => { if (!open) { setEditShiftDialogOpen(false); setEditingShift(null) } }}>
        <DialogContent className="sm:max-w-[500px] border-none rounded-[40px] shadow-2xl p-0 overflow-hidden bg-white">
          <DialogHeader className="p-10 bg-slate-900 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
            <DialogTitle className="text-3xl font-black tracking-tight leading-none z-10 uppercase">Edit Shift</DialogTitle>
            <DialogDescription className="text-slate-400 font-bold text-[10px] mt-3 uppercase tracking-[0.2em] z-10">Update shift name, timings, or status</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditShift} className="p-10 space-y-8">
            <div className="space-y-0">
              <FormLabelBase label="Shift Name" required />
              <Input
                placeholder="e.g. Morning, Night, Evening"
                value={editShiftForm.name}
                onChange={(e) => setEditShiftForm({ ...editShiftForm, name: e.target.value })}
                className={inputVariants}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-0">
                <FormLabelBase label="Start Time" required />
                <TimePickerAmPm
                  value={editShiftForm.startTime}
                  onChange={(v) => setEditShiftForm({ ...editShiftForm, startTime: v })}
                />
              </div>
              <div className="space-y-0">
                <FormLabelBase label="End Time" required />
                <TimePickerAmPm
                  value={editShiftForm.endTime}
                  onChange={(v) => setEditShiftForm({ ...editShiftForm, endTime: v })}
                />
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
              <div>
                <div className="font-black text-sm text-slate-900">Active Status</div>
                <div className="text-xs text-slate-500 mt-0.5">Inactive shifts won&apos;t appear in deployment options</div>
              </div>
              <button
                type="button"
                onClick={() => setEditShiftForm({ ...editShiftForm, isActive: !editShiftForm.isActive })}
                className={cn(
                  "relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none",
                  editShiftForm.isActive ? "bg-emerald-500" : "bg-slate-300"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ease-in-out mt-1",
                    editShiftForm.isActive ? "translate-x-6 ml-0" : "translate-x-1"
                  )}
                />
              </button>
            </div>
            <div className="pt-4 flex items-center gap-4">
              <Button type="button" variant="ghost" className="h-14 rounded-2xl font-black text-xs uppercase tracking-widest flex-1" onClick={() => { setEditShiftDialogOpen(false); setEditingShift(null) }}>CANCEL</Button>
              <SubmitButton label={submitting ? "SAVING..." : "SAVE CHANGES"} loading={submitting} className="flex-[2] mt-0" />
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
