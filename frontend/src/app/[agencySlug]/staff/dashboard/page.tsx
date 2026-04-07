"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import {
  PageLoading
} from "@/components/ui/design-system"
import { Badge } from "@/components/ui/badge"
import {
  CalendarDays,
  Users,
  Activity,
  Zap,
  Target,
  Clock,
  MapPin,
  Shield,
  ClipboardCheck,
  AlertTriangle,
  LogIn,
  LogOut,
} from "lucide-react"
import api from "@/lib/api"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useAuthStore } from "@/store/authStore"

type LeaveType = "CASUAL" | "SICK" | "EARNED" | "LOSS_OF_PAY"

type LeaveBalanceItem = {
  total: number | null
  used: number
  remaining: number | null
}

type LeaveBalanceResponse = Record<LeaveType, LeaveBalanceItem>

type LeaveHistoryItem = {
  id: string
  leaveType: string
  startDate: string
  endDate: string
  status: string
  employeeId?: string
  employee?: {
    id?: string
  }
}

const EMPTY_LEAVE_BALANCE: LeaveBalanceResponse = {
  CASUAL: { total: 12, used: 0, remaining: 12 },
  SICK: { total: 7, used: 0, remaining: 7 },
  EARNED: { total: 12, used: 0, remaining: 12 },
  LOSS_OF_PAY: { total: null, used: 0, remaining: null },
}

const getDays = (start: string, end: string) => {
  if (!start || !end) return 0
  const startDate = new Date(start)
  const endDate = new Date(end)
  startDate.setHours(0, 0, 0, 0)
  endDate.setHours(0, 0, 0, 0)
  if (endDate < startDate) return 0
  const diff = endDate.getTime() - startDate.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1
}

const normalizeStatus = (status: string) => {
  const normalized = (status || "").toUpperCase().trim()
  if (normalized === "REJECTED") return "REJECTED"
  if (normalized === "APPROVED" || normalized === "AGENCY_APPROVED") return "APPROVED"
  if (normalized === "HR_APPROVED" || normalized === "SUPERVISOR_APPROVED") return "PENDING"
  return "PENDING"
}

const normalizeLeaveType = (leaveType: string): LeaveType => {
  const normalized = (leaveType || "").toUpperCase().trim()
  if (normalized === "ANNUAL") return "EARNED"
  if (normalized === "EMERGENCY") return "LOSS_OF_PAY"
  if (normalized === "CASUAL" || normalized === "SICK" || normalized === "EARNED" || normalized === "LOSS_OF_PAY") {
    return normalized
  }
  return "LOSS_OF_PAY"
}

const computeBalanceFromHistory = (history: LeaveHistoryItem[]): LeaveBalanceResponse => {
  const limits = {
    CASUAL: 12,
    SICK: 7,
    EARNED: 12,
  }

  const approved = history.filter((item) => normalizeStatus(item.status) === "APPROVED")
  const usedByType = approved.reduce<Record<LeaveType, number>>(
    (acc, item) => {
      const type = normalizeLeaveType(item.leaveType)
      acc[type] += getDays(item.startDate, item.endDate)
      return acc
    },
    { CASUAL: 0, SICK: 0, EARNED: 0, LOSS_OF_PAY: 0 },
  )

  return {
    CASUAL: {
      total: limits.CASUAL,
      used: usedByType.CASUAL,
      remaining: Math.max(0, limits.CASUAL - usedByType.CASUAL),
    },
    SICK: {
      total: limits.SICK,
      used: usedByType.SICK,
      remaining: Math.max(0, limits.SICK - usedByType.SICK),
    },
    EARNED: {
      total: limits.EARNED,
      used: usedByType.EARNED,
      remaining: Math.max(0, limits.EARNED - usedByType.EARNED),
    },
    LOSS_OF_PAY: {
      total: null,
      used: usedByType.LOSS_OF_PAY,
      remaining: null,
    },
  }
}

const safeGetJson = async (path: string) => {
  try {
    const response = await fetch(`/api${path}`, {
      method: "GET",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    })
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  }
}

const isActiveLeaveToday = (item: LeaveHistoryItem) => {
  if (normalizeStatus(item.status) !== "APPROVED") return false

  const start = new Date(item.startDate)
  const end = new Date(item.endDate)
  const now = new Date()

  start.setHours(0, 0, 0, 0)
  end.setHours(23, 59, 59, 999)

  return now >= start && now <= end
}

export default function StaffDashboard() {
  const router = useRouter()
  const { agencySlug } = useParams()
  const [userStats, setUserStats] = useState({
    totalStaff: 0,
    presentToday: 0,
    absentToday: 0,
    onLeave: 0,
    activeProjects: 0,
    completedTasks: 0
  })
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalanceResponse>(EMPTY_LEAVE_BALANCE)
  const [pendingLeavesCount, setPendingLeavesCount] = useState(0)
  const [recentActivities, setRecentActivities] = useState([])
  const [topPerformers, setTopPerformers] = useState([])
  const [loading, setLoading] = useState(true)
  const [userData, setUserData] = useState<any>(null)
  const [isClockedIn, setIsClockedIn] = useState(false)
  const { login } = useAuthStore()

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const userRes = await api.get('/auth/me')
      const user = userRes.data
      setUserData(user)
      // Update auth store with fresh permissions so PermissionGuard works correctly
      login(user)

      const perms = user.permissions || []

      console.log('[Staff Dashboard] Permission check:', {
        role: user.role,
        permissions: perms,
        hasDashboardPermission: perms.includes('view_dashboard')
      })

      // Strict Dynamic Permission check - ALL staff must have view_dashboard permission
      // No role-based exceptions, only permission-based access
      if (!perms.includes('view_dashboard')) {
        console.log('[Staff Dashboard] No view_dashboard permission, redirecting to my-schedule')
        router.push(`/${agencySlug}/staff/my-schedule`)
        return
      }

      console.log('[Staff Dashboard] Permission check passed, loading dashboard data')

      // Check which data user can view based on permissions
      const isAdmin = ['Agency Admin', 'Supervisor'].includes(user?.role)
      const canApplyLeave = perms.includes('apply_leave')
      const canViewAllLeaves = isAdmin || perms.includes('view_leaves') || perms.includes('approve_leave')
      
      const [empRes, attRes, projRes] = await Promise.allSettled([
        (isAdmin || perms.includes('view_employee')) ? api.get('/employees') : Promise.reject('No permission'),
        (isAdmin || perms.includes('view_attendance')) ? api.get('/attendance?today=true') : api.get('/attendance?today=true&self=true'),
        (isAdmin || perms.includes('view_projects')) ? api.get('/projects') : Promise.reject('No permission'),
      ])

      const employees = empRes.status === 'fulfilled' ? empRes.value.data : []
      const attendance = attRes.status === 'fulfilled' ? attRes.value.data : []
      const projects = projRes.status === 'fulfilled' ? projRes.value.data : []

      let leaves: LeaveHistoryItem[] = []
      let resolvedLeaveBalance: LeaveBalanceResponse = EMPTY_LEAVE_BALANCE

      if (canApplyLeave) {
        const balanceData = await safeGetJson('/leaves/balance')
        if (balanceData) {
          resolvedLeaveBalance = balanceData as LeaveBalanceResponse
        }
      }

      if (canViewAllLeaves) {
        const allLeaves = await api.get('/leaves').then((res) => res.data).catch(() => [])
        leaves = Array.isArray(allLeaves) ? allLeaves : []
      } else if (canApplyLeave) {
        const myLeavesData = await safeGetJson('/leaves/my-leaves')

        if (Array.isArray(myLeavesData)) {
          leaves = myLeavesData as LeaveHistoryItem[]
        } else {
          // Compatibility fallback for environments still on old leave routes.
          const legacyLeaves = await api.get('/leaves').then((res) => res.data).catch(() => [])
          const scopedLegacy = Array.isArray(legacyLeaves)
            ? legacyLeaves.filter((item: LeaveHistoryItem) =>
              user?.employeeId
                ? item?.employee?.id === user.employeeId || item?.employeeId === user.employeeId
                : true,
            )
            : []
          leaves = scopedLegacy
        }

        if (!balanceData) {
          resolvedLeaveBalance = computeBalanceFromHistory(leaves)
        }
      }

      // Deduplicate attendance by employee — use worst status per employee
      const employeeStatusMap = new Map<string, string>()
      const statusPriority: Record<string, number> = { ABSENT: 3, LATE: 2, PRESENT: 1 }
      for (const a of attendance) {
        const empId = a.employeeId
        if (!empId) continue
        const current = employeeStatusMap.get(empId)
        const currentP = current ? (statusPriority[current] || 0) : 0
        const newP = statusPriority[a.status?.toUpperCase()] || 0
        if (newP >= currentP) {
          employeeStatusMap.set(empId, a.status?.toUpperCase())
        }
      }
      const uniqueStatuses = Array.from(employeeStatusMap.values())
      const presentToday = uniqueStatuses.filter(s => s === 'PRESENT').length
      const absentToday = uniqueStatuses.filter(s => s === 'ABSENT').length
      const activeProjectsCount = projects.filter((p: any) => p.status === 'ACTIVE' || p.isActive).length
      const onLeaveTodayCount = leaves.filter(isActiveLeaveToday).length
      const pendingCount = leaves.filter((leave) => normalizeStatus(leave.status) === 'PENDING').length

      setUserStats({
        totalStaff: employees.length,
        presentToday,
        absentToday,
        onLeave: onLeaveTodayCount,
        activeProjects: activeProjectsCount,
        completedTasks: 0
      })
      setLeaveBalance(resolvedLeaveBalance)
      setPendingLeavesCount(pendingCount)

      setRecentActivities(attendance.slice(0, 5).map((record: any) => ({
        type: record.status === 'PRESENT' ? 'checkin' : 'absent',
        title: `${record.employee?.fullName || 'Staff Member'} ${record.status === 'PRESENT' ? 'recorded deployment' : 'marked absent'}`,
        time: new Date(record.checkIn || record.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        color: record.status === 'PRESENT' ? 'emerald' : 'red'
      })) as any)

      setTopPerformers(employees.slice(0, 4).map((emp: any) => ({
        name: emp.fullName,
        designation: emp.designation?.name || 'Staff Node',
        initials: emp.fullName.split(' ').map((n: any) => n[0]).join('').toUpperCase()
      })) as any)

    } catch (error: any) {
      toast.error("Critical failure in mission data retrieval.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  if (loading) return <PageLoading message="Synchronizing HUD..." />

  const currentAgencySlug = Array.isArray(agencySlug) ? agencySlug[0] : agencySlug
  const permissions: string[] = userData?.permissions || []
  const isPrivileged = ["Agency Admin", "Supervisor"].includes(userData?.role)
  const hasPermission = (permission: string) => isPrivileged || permissions.includes(permission)

  const now = new Date()
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 18 ? "Good afternoon" : "Good evening"
  const todayLabel = now.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  const statCards = [
    {
      key: "staff",
      title: "Personnel count",
      value: userStats.totalStaff,
      subtitle: "Total staff members",
      borderColor: "border-t-[#06b6d4]",
      visible: hasPermission("view_employee"),
    },
    {
      key: "present",
      title: "Present today",
      value: userStats.presentToday,
      subtitle: "Attendance marked",
      borderColor: "border-t-[#22c55e]",
      visible: hasPermission("view_attendance"),
    },
    {
      key: "projects",
      title: "Active projects",
      value: userStats.activeProjects,
      subtitle: "Sites currently active",
      borderColor: "border-t-[#f59e0b]",
      visible: hasPermission("view_projects"),
    },
    {
      key: "leave",
      title: "On leave",
      value: userStats.onLeave,
      subtitle: "Staff currently on leave",
      borderColor: "border-t-[#f43f5e]",
      visible: hasPermission("view_leaves") || hasPermission("apply_leave"),
    },
  ].filter((card) => card.visible)

  const quickActions = [
    {
      key: "attendance",
      label: "Mark attendance",
      icon: <ClipboardCheck className="h-4 w-4 text-[#06b6d4]" />,
      href: `/${currentAgencySlug}/staff/attendance`,
      visible: hasPermission("record_attendance") || hasPermission("view_attendance"),
    },
    {
      key: "incident",
      label: "Report incident",
      icon: <AlertTriangle className="h-4 w-4 text-[#06b6d4]" />,
      href: `/${currentAgencySlug}/staff/incidents`,
      visible: hasPermission("report_incident") || hasPermission("view_incidents"),
    },
    {
      key: "leave",
      label: "Apply for leave",
      icon: <CalendarDays className="h-4 w-4 text-[#06b6d4]" />,
      href: `/${currentAgencySlug}/staff/leaves`,
      visible: hasPermission("apply_leave") || hasPermission("view_leaves"),
    },
    {
      key: "schedule",
      label: "View my schedule",
      icon: <Clock className="h-4 w-4 text-[#06b6d4]" />,
      href: `/${currentAgencySlug}/staff/my-schedule`,
      visible: true,
    },
  ].filter((action) => action.visible)

  return (
    <div className="min-h-full bg-[#f8fafc] space-y-6 pb-10">
      <section className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#06b6d4]">Staff portal · Online</p>
          <h1 className="text-3xl md:text-4xl font-black text-[#0f172a] tracking-tight">
            {greeting}, {userData?.fullName?.split(" ")?.[0] || "Staff"}
          </h1>
          <p className="text-sm text-[#64748b]">
            {todayLabel} · {userData?.agencyName || "Agency"}
          </p>
        </div>

        <div className="w-full max-w-[360px] rounded-xl border-[0.5px] border-[#e2e8f0] bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-[#0f172a]">
                <span className="h-2.5 w-2.5 rounded-full bg-[#22c55e]" />
                {isClockedIn ? "Clocked in" : "Clocked out"}
              </div>
              <p className="mt-1 text-xs text-[#64748b]">Use this to start or end your shift.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsClockedIn((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-lg bg-[#06b6d4] px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-600 transition-colors"
            >
              {isClockedIn ? <LogOut className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
              {isClockedIn ? "Clock Out" : "Clock In"}
            </button>
          </div>
        </div>
      </section>

      {statCards.length > 0 && (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card) => (
            <article
              key={card.key}
              className={cn(
                "rounded-[12px] border-[0.5px] border-[#e2e8f0] border-t-[3px] bg-white p-4",
                card.borderColor,
              )}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-[#64748b]">{card.title}</p>
              <p className="mt-2 text-4xl font-black text-[#0f172a] leading-none">{card.value}</p>
              <p className="mt-2 text-xs text-[#64748b]">{card.subtitle}</p>
            </article>
          ))}
        </section>
      )}

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {hasPermission("view_shifts") || hasPermission("view_deployments") ? (
          <article className="rounded-[12px] border-[0.5px] border-[#e2e8f0] bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#0f172a]">Today's shift</h2>
              <Badge className="bg-green-50 text-green-700 border border-green-200">Scheduled</Badge>
            </div>

            <div className="rounded-lg bg-[#f8fafc] border-[0.5px] border-[#e2e8f0] p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-cyan-50 border border-cyan-100 flex items-center justify-center text-[#06b6d4]">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#0f172a]">Morning Security Shift</p>
                <p className="text-xs text-[#64748b]">08:00 AM - 04:00 PM</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-[#f8fafc] border-[0.5px] border-[#e2e8f0] p-3">
                <p className="text-[11px] text-[#64748b] mb-1 flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Site</p>
                <p className="text-sm font-semibold text-[#0f172a] truncate">{userData?.agencyName || "Main Site"}</p>
              </div>
              <div className="rounded-lg bg-[#f8fafc] border-[0.5px] border-[#e2e8f0] p-3">
                <p className="text-[11px] text-[#64748b] mb-1 flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> Role</p>
                <p className="text-sm font-semibold text-[#0f172a] truncate">{userData?.role || "Staff"}</p>
              </div>
            </div>
          </article>
        ) : null}

        {hasPermission("view_leaves") || hasPermission("apply_leave") || hasPermission("approve_leave") ? (
          <article className="rounded-[12px] border-[0.5px] border-[#e2e8f0] bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#0f172a]">Leave balance</h2>
              <button
                type="button"
                onClick={() => router.push(`/${currentAgencySlug}/staff/leaves`)}
                className="text-sm font-semibold text-[#06b6d4] hover:text-cyan-700"
              >
                Apply leave
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-green-100 bg-green-50 p-3 text-center">
                <p className="text-2xl font-black text-green-700">{leaveBalance.CASUAL.remaining ?? "-"}</p>
                <p className="text-xs font-medium text-green-700/80">Casual</p>
              </div>
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-center">
                <p className="text-2xl font-black text-blue-700">{leaveBalance.SICK.remaining ?? "-"}</p>
                <p className="text-xs font-medium text-blue-700/80">Sick</p>
              </div>
              <div className="rounded-lg border border-yellow-100 bg-yellow-50 p-3 text-center">
                <p className="text-2xl font-black text-yellow-700">{leaveBalance.EARNED.remaining ?? "-"}</p>
                <p className="text-xs font-medium text-yellow-700/80">Earned</p>
              </div>
            </div>

            <div className="mt-4 rounded-lg border-[0.5px] border-amber-200 bg-amber-50 px-3 py-2 flex items-center justify-between">
              <span className="text-xs text-amber-700">Pending approval</span>
              <span className="text-sm font-bold text-amber-700">{pendingLeavesCount}</span>
            </div>
          </article>
        ) : null}
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {hasPermission("view_employee") ? (
          <article className="rounded-[12px] border-[0.5px] border-[#e2e8f0] bg-white p-5">
            <h2 className="text-lg font-bold text-[#0f172a] mb-4">Team members</h2>

            <div className="space-y-3">
              {topPerformers.map((performer: any, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-lg border-[0.5px] border-[#e2e8f0] bg-white px-3 py-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-9 w-9 rounded-full border border-[#e2e8f0]">
                      <AvatarFallback className="bg-cyan-50 text-[#0f172a] text-xs font-semibold">{performer.initials}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#0f172a]">{performer.name}</p>
                      <p className="truncate text-xs text-[#64748b]">{performer.designation}</p>
                    </div>
                  </div>
                  <span className={cn("h-2.5 w-2.5 rounded-full", idx % 2 === 0 ? "bg-green-500" : "bg-slate-300")} />
                </div>
              ))}

              {topPerformers.length === 0 && (
                <p className="text-sm text-[#64748b]">No team members found.</p>
              )}
            </div>
          </article>
        ) : null}

        {quickActions.length > 0 ? (
          <article className="rounded-[12px] border-[0.5px] border-[#e2e8f0] bg-white p-5">
            <h2 className="text-lg font-bold text-[#0f172a] mb-4">Quick actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {quickActions.map((action) => (
                <button
                  key={action.key}
                  type="button"
                  onClick={() => router.push(action.href)}
                  className="rounded-lg border-[0.5px] border-[#e2e8f0] bg-[#f8fafc] px-3 py-3 text-left flex items-center gap-2.5 hover:border-cyan-300 hover:bg-cyan-50/40 transition-colors"
                >
                  {action.icon}
                  <span className="text-sm font-semibold text-[#0f172a]">{action.label}</span>
                </button>
              ))}
            </div>
          </article>
        ) : null}
      </section>

      {hasPermission("view_attendance") && (
        <section className="rounded-[12px] border-[0.5px] border-[#e2e8f0] bg-white p-5">
          <h2 className="text-lg font-bold text-[#0f172a] mb-4">Recent activity</h2>
          <div className="space-y-3">
            {recentActivities.map((activity: any, idx) => (
              <div key={idx} className="bg-[#f8fafc] border-[0.5px] border-[#e2e8f0] rounded-lg p-3 flex items-center gap-3">
                <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center border", activity.color === 'emerald' ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200")}>
                  <Activity className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#0f172a]">{activity.title}</p>
                  <p className="text-xs text-[#64748b] mt-0.5">{activity.time}</p>
                </div>
              </div>
            ))}
            {recentActivities.length === 0 && <p className="text-sm text-[#64748b]">No recent activity.</p>}
          </div>
        </section>
      )}
    </div>
  )
}
