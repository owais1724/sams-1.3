"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { CalendarDays, Plus, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react"
import { toast } from "@/components/ui/sonner"
import api from "@/lib/api"
import { cn } from "@/lib/utils"

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
    name: string
    email: string
    role: string
    designation: {
      name: string
    }
  }
}

interface User {
  id: string
  employeeId?: string
  role: string
  fullName: string
}

const statusColors = {
  PENDING: "bg-yellow-100 text-yellow-800",
  SUPERVISOR_APPROVED: "bg-blue-100 text-blue-800",
  HR_APPROVED: "bg-purple-100 text-purple-800",
  AGENCY_APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800"
}

const statusIcons = {
  PENDING: Clock,
  SUPERVISOR_APPROVED: CheckCircle,
  HR_APPROVED: CheckCircle,
  AGENCY_APPROVED: CheckCircle,
  REJECTED: XCircle
}

export default function LeavesPage() {
  const { agencySlug } = useParams()
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    leaveType: "",
    startDate: "",
    endDate: "",
    reason: ""
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await Promise.all([fetchUserData(), fetchLeaveRequests()])
      setLoading(false)
    }
    init()
  }, [])

  const fetchUserData = async () => {
    try {
      const response = await api.get('/auth/me')
      setUser(response.data)
    } catch (error) {
      console.error('Error fetching user data:', error)
    }
  }

  const fetchLeaveRequests = async () => {
    try {
      const response = await api.get('/leaves')
      setLeaveRequests(response.data)
    } catch (error) {
      toast.error('Failed to fetch leave requests')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user?.employeeId) {
      toast.error('Only staff members can apply for leave')
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
    }
  }

  const handleApproval = async (leaveId: string, status: string, rejectionReason?: string) => {
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

    // Terminal statuses (except for Emergency Audit)
    if (status === 'REJECTED') return false

    // For Emergency leaves, they are "Auditable" only if approved by SYSTEM
    const isEmergencyAudit = status === 'AGENCY_APPROVED' &&
      leave.leaveType === 'EMERGENCY' &&
      leave.agencyApprovedBy === 'SYSTEM_AUTO_EMERGENCY';

    if (status === 'AGENCY_APPROVED' && !isEmergencyAudit) return false

    // Agency Admin can always approve/audit anything that isn't final
    if (isAdmin) return true

    // HR Approval/Audit Logic
    if (isHR) {
      // HR can approve Supervisor and Staff leaves, but not HR/Admin leaves
      if (!isApplicantAdmin && !isApplicantHR) {
        if (status === 'PENDING' || status === 'SUPERVISOR_APPROVED' || isEmergencyAudit) {
          return true
        }
      }
    }

    // Supervisor Approval/Audit Logic
    if (isSupervisor) {
      // Supervisor can approve PENDING or Emergency Audit frontline staff leaves
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

    // HR and Admin approval are terminal
    if (isHR || isAdmin) return 'AGENCY_APPROVED'

    // Supervisor approval moves to intermediate level
    if (isSupervisor) return 'SUPERVISOR_APPROVED'

    return null
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">Synchronizing leave data...</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <CalendarDays className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Leave Management</h1>
        </div>

        {user?.role !== 'Agency Admin' && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Request Leave
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] border-none rounded-[40px] shadow-2xl p-8">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black text-slate-900">Request Leave</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="leaveType" className="text-sm font-bold text-slate-700 ml-1">Leave Type</Label>
                  <Select value={formData.leaveType} onValueChange={(value) => setFormData({ ...formData, leaveType: value })}>
                    <SelectTrigger className="h-12 rounded-xl border-slate-200 focus:ring-primary/20 transition-all">
                      <SelectValue placeholder="Select leave type" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200">
                      <SelectItem value="SICK">Sick Leave</SelectItem>
                      <SelectItem value="CASUAL">Casual Leave</SelectItem>
                      <SelectItem value="ANNUAL">Annual Leave</SelectItem>
                      <SelectItem value="EMERGENCY">Emergency Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="startDate" className="text-sm font-bold text-slate-700 ml-1">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="h-12 rounded-xl border-slate-200 focus:ring-primary/20 transition-all font-medium"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate" className="text-sm font-bold text-slate-700 ml-1">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="h-12 rounded-xl border-slate-200 focus:ring-primary/20 transition-all font-medium"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason" className="text-sm font-bold text-slate-700 ml-1">Reason</Label>
                  <Textarea
                    id="reason"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="Briefly explain the reason for your leave..."
                    className="rounded-2xl border-slate-200 focus:ring-primary/20 transition-all min-h-[120px] p-4 resize-none"
                    required
                  />
                </div>

                <Button type="submit" className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 font-black text-lg shadow-xl shadow-primary/20 transition-all active:scale-[0.98] mt-4">
                  Create Request
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-4">
        {leaveRequests.map((leave) => {
          const StatusIcon = statusIcons[leave.status as keyof typeof statusIcons]
          return (
            <Card key={leave.id} className="rounded-[32px] border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-8 py-6">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-black text-slate-900 tracking-tight">{leave.employee.name}</CardTitle>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{leave.employee.role} • {leave.employee.designation.name}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge className={cn(
                      "rounded-full px-4 py-1 font-black text-[10px] uppercase border-none shadow-none",
                      leave.status === 'AGENCY_APPROVED' && leave.leaveType === 'EMERGENCY' && leave.agencyApprovedBy === 'SYSTEM_AUTO_EMERGENCY'
                        ? "bg-blue-100 text-blue-800"
                        : statusColors[leave.status as keyof typeof statusColors]
                    )}>
                      {StatusIcon && <StatusIcon className="h-3 w-3 mr-1.5" />}
                      {leave.status === 'AGENCY_APPROVED' && leave.leaveType === 'EMERGENCY' && leave.agencyApprovedBy === 'SYSTEM_AUTO_EMERGENCY'
                        ? "Protocol Bypass (System)"
                        : leave.status.replace('_', ' ')}
                    </Badge>
                    {(leave.status !== 'AGENCY_APPROVED' || (leave.leaveType === 'EMERGENCY' && leave.agencyApprovedBy === 'SYSTEM_AUTO_EMERGENCY')) &&
                      leave.status !== 'REJECTED' && leave.pendingWith && (
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          Pending with: <span className="text-primary">{leave.pendingWith}</span>
                        </span>
                      )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8">
                <div className="space-y-6">
                  <div className="grid md:grid-cols-3 gap-6 text-sm">
                    <div className="flex flex-col">
                      <span className="text-slate-400 font-black uppercase text-[10px] tracking-widest mb-1">Leave Type</span>
                      <span className="font-bold text-slate-900">{leave.leaveType}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-slate-400 font-black uppercase text-[10px] tracking-widest mb-1">Timeframe</span>
                      <span className="font-bold text-slate-900">{new Date(leave.startDate).toLocaleDateString()} — {new Date(leave.endDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-slate-400 font-black uppercase text-[10px] tracking-widest mb-1">Submission Log</span>
                      <span className="font-bold text-slate-900">{new Date(leave.appliedAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 font-black uppercase text-[10px] tracking-widest block mb-2">Statement of Reason</span>
                    <p className="text-sm font-medium text-slate-700 leading-relaxed bg-slate-50/50 p-4 rounded-2xl border border-slate-100 italic">"{leave.reason}"</p>
                  </div>

                  {leave.rejectionReason && (
                    <div className="p-3 bg-red-50 rounded-xl text-sm text-red-800 border border-red-100">
                      <span className="font-bold uppercase text-[10px] block mb-1">Rejection Reason</span>
                      {leave.rejectionReason}
                    </div>
                  )}

                  {canApprove(leave) && (
                    <div className="flex space-x-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => handleApproval(leave.id, getNextStatus(leave)!)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          const reason = prompt('Enter declination reason:')
                          if (reason) {
                            handleApproval(leave.id, 'REJECTED', reason)
                          }
                        }}
                      >
                        Decline
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}

        {leaveRequests.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <CalendarDays className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-bold uppercase tracking-widest text-[10px]">No Leave Requests Found</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
