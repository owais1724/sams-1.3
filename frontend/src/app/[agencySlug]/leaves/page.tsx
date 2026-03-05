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
  FormLabelBase
} from "@/components/ui/design-system"
import { useAuthStore } from "@/store/authStore"
import { usePermission } from "@/hooks/usePermission"
import { PermissionGuard } from "@/components/common/PermissionGuard"
import { toast } from "sonner"
import api from "@/lib/api"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

const formatDate = (date: string | Date, options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' }) => {
  return new Intl.DateTimeFormat('en-GB', options).format(new Date(date))
}

const formatYear = (date: string | Date) => {
  return new Date(date).getFullYear().toString()
}

import { Plus, CalendarDays, CheckCircle2, XCircle, Clock, FileText, User, Filter, MoreHorizontal, History, Briefcase, ShieldCheck } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TableCell, TableRow } from "@/components/ui/table"

interface LeaveRequest {
  id: string
  leaveType: string
  startDate: string
  endDate: string
  reason: string
  status: string
  pendingWith?: string
  employee: {
    id: string
    fullName: string
    employeeCode: string
    designation: {
      name: string
    }
  }
}

export default function LeavesPage() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const { user } = useAuthStore()
  const { hasPermission } = usePermission()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    leaveType: "",
    startDate: "",
    endDate: "",
    reason: ""
  })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [viewingLeave, setViewingLeave] = useState<LeaveRequest | null>(null)

  useEffect(() => {
    if (user) fetchLeaveRequests()
  }, [user])

  const fetchLeaveRequests = async () => {
    try {
      const response = await api.get('/leaves')
      setLeaveRequests(response.data)
    } catch (error) {
      toast.error('Failed to synchronize leave protocols')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)

    if (!user?.employeeId) {
      toast.error('Only employees can request leave')
      setSubmitting(false)
      return
    }

    try {
      await api.post('/leaves', {
        ...formData,
        startDate: new Date(formData.startDate),
        endDate: new Date(formData.endDate),
        employeeId: user.employeeId
      })

      toast.success('Leave request submitted')
      setIsDialogOpen(false)
      setFormData({ leaveType: "", startDate: "", endDate: "", reason: "" })
      fetchLeaveRequests()
    } catch (error) {
      toast.error('Failed to transmit leave request')
    } finally {
      setSubmitting(false)
    }
  }

  const handleApproval = async (leaveId: string, status: string, rejectionReason?: string) => {
    if (processingId) return
    setProcessingId(leaveId)
    try {
      await api.put(`/leaves/${leaveId}/approve`, {
        status,
        rejectionReason
      })

      const statusLabel = status.toLowerCase().replace('_', ' ')
      toast.success(`Leave ${statusLabel}`)
      fetchLeaveRequests()
    } catch (error) {
      toast.error('Authorization update failed')
    } finally {
      setProcessingId(null)
    }
  }

  const canApprove = (leave: LeaveRequest) => {
    if (!user || !user.role) return false

    const role = user.role.toLowerCase();
    const applicantRole = (leave.employee?.designation?.name || 'Staff').toLowerCase();
    const status = leave.status;

    const isHR = role.includes('hr');
    const isSupervisor = role.includes('supervisor');
    const isAdmin = role.includes('admin');

    if (status === 'REJECTED') return false
    if (status === 'AGENCY_APPROVED') return false

    if (isAdmin) return true
    if (isHR && (status === 'PENDING' || status === 'SUPERVISOR_APPROVED')) return true
    if (isSupervisor && status === 'PENDING') return true

    return false
  }

  const getNextStatus = (leave: LeaveRequest) => {
    if (!user || !user.role) return null
    const role = user.role.toLowerCase();

    const isHR = role.includes('hr');
    const isSupervisor = role.includes('supervisor');
    const isAdmin = role.includes('admin');

    if (isHR || isAdmin) return 'AGENCY_APPROVED'
    if (isSupervisor) return 'SUPERVISOR_APPROVED'

    return null
  }

  if (loading) return <PageLoading message="Synchronizing Leave Requests..." />

  return (
    <div className="space-y-12 pb-20">
      <PageHeader
        title="Leave"
        titleHighlight="Management"
        subtitle="Oversight of employee leave and availability."
        action={
          user?.role !== 'Agency Admin' && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <CreateButton
                  label="Initiate Request"
                  icon={<Plus className="h-4 w-4" />}
                />
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] border-none rounded-[40px] shadow-2xl p-0 overflow-hidden bg-white">
                <DialogHeader className="p-10 bg-slate-900 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
                  <DialogTitle className="text-3xl font-black tracking-tight leading-none z-10 uppercase">New Leave Request</DialogTitle>
                  <DialogDescription className="text-slate-400 font-bold text-[10px] mt-3 uppercase tracking-[0.2em] z-10">Submit your leave request details</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="p-10 space-y-8">
                  <div className="space-y-0">
                    <FormLabelBase label="Type of Leave" required />
                    <Select value={formData.leaveType} onValueChange={(value) => setFormData({ ...formData, leaveType: value })}>
                      <SelectTrigger className={selectVariants}>
                        <SelectValue placeholder="Select leave category" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-slate-100 p-2">
                        <SelectItem value="SICK" className="py-3 font-bold rounded-xl">Sick Leave</SelectItem>
                        <SelectItem value="CASUAL" className="py-3 font-bold rounded-xl">Casual Leave</SelectItem>
                        <SelectItem value="ANNUAL" className="py-3 font-bold rounded-xl">Annual Leave</SelectItem>
                        <SelectItem value="EMERGENCY" className="py-3 font-bold rounded-xl">Emergency Leave</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-0">
                      <FormLabelBase label="From Date" required />
                      <Input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        className={inputVariants}
                        required
                      />
                    </div>
                    <div className="space-y-0">
                      <FormLabelBase label="To Date" required />
                      <Input
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        className={inputVariants}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-0">
                    <FormLabelBase label="Reason for Leave" required />
                    <Textarea
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      placeholder="Provide reason for leave..."
                      className="min-h-[140px] rounded-3xl bg-slate-50 border-none focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all p-5 text-sm font-bold italic text-slate-900 placeholder:text-slate-300"
                      required
                    />
                  </div>

                  <div className="pt-4 flex items-center gap-4">
                    <Button type="button" variant="ghost" className="h-14 rounded-2xl font-black text-xs uppercase tracking-widest flex-1" onClick={() => setIsDialogOpen(false)}>CANCEL</Button>
                    <SubmitButton
                      label={submitting ? "SUBMITTING..." : "SUBMIT REQUEST"}
                      loading={submitting}
                      className="flex-[2] mt-0"
                    />
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Review Required" value={leaveRequests.filter(r => r.status === 'PENDING').length} icon={<Clock />} color="amber" />
        <StatCard title="Approved" value={leaveRequests.filter(r => r.status === 'AGENCY_APPROVED').length} icon={<CheckCircle2 />} color="emerald" />
        <StatCard title="All Records" value={leaveRequests.length} icon={<FileText />} color="blue" />
        <StatCard title="Rejected" value={leaveRequests.filter(r => r.status === 'REJECTED').length} icon={<XCircle />} color="rose" />
      </div>

      <div className="space-y-6 pt-4">
        <SectionHeading title="Employee Leave Records" />

        <DataTable columns={['Employee', 'Leave Details', 'Duration', 'Status', 'Actions']}>
          <AnimatePresence mode="popLayout">
            {leaveRequests.length === 0 ? (
              <TableRowEmpty colSpan={5} title="No Absence Records" icon={<CalendarDays />} />
            ) : (
              leaveRequests.map((leave, idx) => (
                <motion.tr
                  key={leave.id}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2, delay: idx * 0.02 }}
                  className="group hover:bg-slate-50/50 transition-colors"
                >
                  <TableCell className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-300 font-black group-hover:border-primary/20 group-hover:text-primary group-hover:scale-110 transition-all shadow-sm">
                        {leave.employee?.fullName?.charAt(0) || <User className="h-5 w-5" />}
                      </div>
                      <div className="min-w-0">
                        <div className="font-extrabold text-slate-900 leading-tight group-hover:text-primary transition-colors truncate">{leave.employee?.fullName || 'N/A'}</div>
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">ID: {leave.employee?.employeeCode || 'N/A'}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-black text-slate-900 text-[13px] tracking-tight">{leave.leaveType.replace(/_/g, " ")}</span>
                      <span className="text-[10px] text-slate-400 font-bold truncate max-w-[180px] italic mt-0.5">"{leave.reason}"</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-[13px] font-black text-slate-900 italic">{formatDate(leave.startDate)} - {formatDate(leave.endDate)}</span>
                      <span className="text-[9px] text-slate-300 font-black uppercase tracking-widest mt-0.5">{formatYear(leave.startDate)} CYCLE</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1.5">
                      <StatusBadge status={leave.status} />
                      {leave.status !== 'AGENCY_APPROVED' && leave.status !== 'REJECTED' && (
                        <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest pl-1">PENDING: {leave.pendingWith}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right px-8">
                    <div className="flex items-center justify-end gap-3">
                      <RowViewButton onClick={() => setViewingLeave(leave)} />
                      {canApprove(leave) && (
                        <>
                          <Button
                            size="sm"
                            className="h-10 px-6 rounded-2xl bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white border-none font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-100 transition-all active:scale-95"
                            onClick={() => handleApproval(leave.id, getNextStatus(leave)!)}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-2" />
                            APPROVE
                          </Button>
                          <Button
                            size="sm"
                            className="h-10 px-6 rounded-2xl bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border-none font-black text-[10px] uppercase tracking-widest shadow-lg shadow-rose-100 transition-all active:scale-95"
                            onClick={() => {
                              const reason = prompt("Reason for rejection:");
                              if (reason) handleApproval(leave.id, 'REJECTED', reason);
                            }}
                          >
                            <XCircle className="h-3.5 w-3.5 mr-2" />
                            REJECT
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </motion.tr>
              ))
            )}
          </AnimatePresence>
        </DataTable>
      </div>

      <Dialog open={!!viewingLeave} onOpenChange={(val) => !val && setViewingLeave(null)}>
        <DialogContent className="sm:max-w-[500px] border-none rounded-[40px] shadow-2xl p-0 overflow-hidden bg-white">
          <DialogHeader className="p-10 bg-slate-900 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
            <DialogTitle className="text-3xl font-black tracking-tight leading-none z-10 uppercase">Leave Details</DialogTitle>
            <DialogDescription className="text-slate-400 font-bold text-[10px] mt-3 uppercase tracking-[0.2em] z-10">Verification & Information Protocol</DialogDescription>
          </DialogHeader>
          {viewingLeave && (
            <div className="p-10 space-y-8">
              <div className="flex items-center gap-5 p-6 bg-slate-50 rounded-[32px] border border-slate-100">
                <div className="h-16 w-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-primary font-black text-2xl shadow-sm">
                  {viewingLeave.employee?.fullName?.charAt(0)}
                </div>
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Applicant</div>
                  <div className="text-xl font-black text-slate-900">{viewingLeave.employee?.fullName}</div>
                  <div className="text-[9px] font-black text-primary uppercase tracking-[0.2em] mt-1">{viewingLeave.employee?.designation?.name}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Leave Type</div>
                  <div className="font-extrabold text-slate-900 italic text-sm">{viewingLeave.leaveType.replace(/_/g, " ")}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Current Status</div>
                  <StatusBadge status={viewingLeave.status} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Start Date</div>
                  <div className="font-extrabold text-slate-900 italic text-sm">{formatDate(viewingLeave.startDate, { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">End Date</div>
                  <div className="font-extrabold text-slate-900 italic text-sm">{formatDate(viewingLeave.endDate, { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Reason</div>
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 text-sm font-bold italic text-slate-700 leading-relaxed">
                  "{viewingLeave.reason}"
                </div>
              </div>

              {viewingLeave.pendingWith && viewingLeave.status !== 'AGENCY_APPROVED' && viewingLeave.status !== 'REJECTED' && (
                <div className="bg-amber-50 rounded-[28px] p-5 border border-amber-100 flex items-center gap-4">
                  <Clock className="h-5 w-5 text-amber-600" />
                  <div className="text-[10px] font-black text-amber-900 uppercase tracking-widest">Currently pending with: <span className="underline italic">{viewingLeave.pendingWith}</span></div>
                </div>
              )}

              <Button onClick={() => setViewingLeave(null)} className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest shadow-xl shadow-slate-200/50">CLOSE RECORD</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
