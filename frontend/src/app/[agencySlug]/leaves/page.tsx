"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import {
  PageHeader,
  CreateButton,
  DataTable,
  PageLoading,
  StatusBadge,
  TableRowLoading,
  TableRowEmpty,
  StatCard,
  RowViewButton,
  RowEditButton,
  SubmitButton
} from "@/components/ui/design-system"
import { useAuthStore } from "@/store/authStore"
import { usePermission } from "@/hooks/usePermission"
import { PermissionGuard } from "@/components/common/PermissionGuard"
import { toast } from "sonner"
import api from "@/lib/api"
import { cn } from "@/lib/utils"
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TableCell, TableRow } from "@/components/ui/table"

interface LeaveRequest {
  id: string
  employeeId: string
  leaveType: string
  startDate: string
  endDate: string
  reason: string
  status: string
  appliedAt: string
  supervisorApprovedAt?: string
  supervisorApprovedBy?: string
  hrApprovedAt?: string
  hrApprovedBy?: string
  agencyApprovedAt?: string
  agencyApprovedBy?: string
  rejectionReason?: string
  pendingWith?: string
  employee: {
    id: string
    fullName: string
    employeeCode: string
    role: string
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

  useEffect(() => {
    if (user) fetchLeaveRequests()
  }, [user])

  const fetchLeaveRequests = async () => {
    try {
      const response = await api.get('/leaves')
      setLeaveRequests(response.data)
    } catch (error) {
      toast.error('Failed to fetch leave requests')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)

    if (!user?.employeeId) {
      toast.error('Only staff members can apply for leave')
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

      toast.success('Leave request submitted successfully')
      setIsDialogOpen(false)
      setFormData({ leaveType: "", startDate: "", endDate: "", reason: "" })
      fetchLeaveRequests()
    } catch (error) {
      toast.error('Failed to submit leave request')
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
      toast.success(`Leave request ${statusLabel}`)
      fetchLeaveRequests()
    } catch (error) {
      toast.error('Failed to update leave request')
    } finally {
      setProcessingId(null)
    }
  }

  const canApprove = (leave: LeaveRequest) => {
    if (!user || !user.role) return false

    const role = user.role.toLowerCase();
    const applicantRole = (leave.employee?.role || 'Staff').toLowerCase();
    const status = leave.status;

    const isHR = role.includes('hr');
    const isSupervisor = role.includes('supervisor');
    const isAdmin = role.includes('admin');

    const isApplicantAdmin = applicantRole.includes('admin');
    const isApplicantHR = applicantRole.includes('hr');
    const isApplicantSupervisor = applicantRole.includes('supervisor');

    if (status === 'REJECTED') return false

    const isEmergencyAudit = status === 'AGENCY_APPROVED' &&
      leave.leaveType === 'EMERGENCY' &&
      leave.agencyApprovedBy === 'SYSTEM_AUTO_EMERGENCY';

    if (status === 'AGENCY_APPROVED' && !isEmergencyAudit) return false

    if (isAdmin) return true

    if (isHR) {
      if (!isApplicantAdmin && !isApplicantHR) {
        if (status === 'PENDING' || status === 'SUPERVISOR_APPROVED' || isEmergencyAudit) {
          return true
        }
      }
    }

    if (isSupervisor) {
      if (!isApplicantAdmin && !isApplicantHR && !isApplicantSupervisor) {
        if (status === 'PENDING' || isEmergencyAudit) {
          return true
        }
      }
    }

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

  if (loading) return <PageLoading message="Synchronizing Leave Protocols..." />

  return (
    <div className="space-y-8 pb-20">
      <PageHeader
        title="Leave"
        titleHighlight="Protocols"
        subtitle="High-level oversight of staff availability and emergency deployment bypasses."
        action={
          user?.role !== 'Agency Admin' && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <CreateButton
                  label="Request Leave"
                  icon={<Plus className="h-4 w-4" />}
                />
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] border-none rounded-[40px] shadow-2xl p-0 overflow-hidden bg-white">
                <DialogHeader className="p-10 bg-slate-900 text-white relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl" />
                  <DialogTitle className="text-3xl font-black tracking-tight leading-none z-10">Initialize Leave Request</DialogTitle>
                  <DialogDescription className="text-slate-400 font-bold text-xs mt-2 uppercase tracking-widest z-10">Professional absence documentation</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="p-10 space-y-6">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-widest pl-1">Protocol Type</Label>
                    <Select value={formData.leaveType} onValueChange={(value) => setFormData({ ...formData, leaveType: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select leave category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SICK">Sick / Medical</SelectItem>
                        <SelectItem value="CASUAL">Personal / Casual</SelectItem>
                        <SelectItem value="ANNUAL">Annual Base</SelectItem>
                        <SelectItem value="EMERGENCY">Emergency Deployment Bypass</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-widest pl-1">Start Date</Label>
                      <Input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-widest pl-1">End Date</Label>
                      <Input
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-widest pl-1">Justification Reason</Label>
                    <Textarea
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      placeholder="Provide professional justification for this absence..."
                      className="min-h-[120px] rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-primary/20 transition-all p-4 text-sm font-medium italic"
                      required
                    />
                  </div>

                  <DialogFooter className="pt-4">
                    <Button type="button" variant="ghost" className="h-14 rounded-2xl font-bold flex-1" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                    <SubmitButton
                      label={submitting ? "Processing..." : "Submit Protocol"}
                      loading={submitting}
                      className="flex-[2] mt-0"
                    />
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Review Required" value={leaveRequests.filter(r => r.status === 'PENDING').length} icon={<Clock />} color="amber" />
        <StatCard title="Active Leaves" value={leaveRequests.filter(r => r.status === 'AGENCY_APPROVED').length} icon={<CheckCircle2 />} color="emerald" />
        <StatCard title="Protocol Log" value={leaveRequests.length} icon={<FileText />} color="blue" />
        <StatCard title="Denied Requests" value={leaveRequests.filter(r => r.status === 'REJECTED').length} icon={<XCircle />} color="rose" />
      </div>

      <DataTable columns={['Staff Member', 'Leave Parameters', 'Operational Window', 'Security Status', 'Actions']}>
        {leaveRequests.length === 0 ? (
          <TableRowEmpty colSpan={5} title="No Leave Protocols Found" icon={<CalendarDays />} />
        ) : (
          leaveRequests.map((leave, idx) => (
            <TableRow key={leave.id} className="group border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
              <TableCell className="px-8 py-5">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 font-black group-hover:bg-primary/5 group-hover:text-primary transition-all">
                    {leave.employee?.fullName?.charAt(0)}
                  </div>
                  <div>
                    <div className="font-extrabold text-slate-900 leading-tight group-hover:text-primary transition-colors">{leave.employee?.fullName}</div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{leave.employee?.employeeCode}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-bold text-slate-700">{leave.leaveType.replace(/_/g, " ")}</span>
                  <span className="text-[10px] text-slate-400 font-medium truncate max-w-[180px] italic">"{leave.reason}"</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="text-sm font-black text-slate-900">{formatDate(leave.startDate)} - {formatDate(leave.endDate)}</span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{formatYear(leave.startDate)}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1.5">
                  <StatusBadge status={leave.status} />
                  {leave.status !== 'AGENCY_APPROVED' && leave.status !== 'REJECTED' && (
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest pl-1">Pending: {leave.pendingWith}</span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right px-8">
                {canApprove(leave) ? (
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant="success"
                      className="h-10 px-5"
                      onClick={() => handleApproval(leave.id, getNextStatus(leave)!)}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-2" />
                      Authorize
                    </Button>
                    <Button
                      size="sm"
                      variant="danger-solid"
                      className="h-10 px-5"
                      onClick={() => {
                        const reason = prompt("State reason for denial:");
                        if (reason) handleApproval(leave.id, 'REJECTED', reason);
                      }}
                    >
                      <XCircle className="h-3.5 w-3.5 mr-2" />
                      Deny
                    </Button>
                  </div>
                ) : (
                  <div className="pr-4 flex justify-end">
                    <RowViewButton onClick={() => { }} className="opacity-50 cursor-not-allowed" />
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))
        )}
      </DataTable>
    </div>
  )
}

