"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import {
  StatCard,
  PageLoading
} from "@/components/ui/design-system"
import { Badge } from "@/components/ui/badge"
import {
  CalendarDays,
  Users,
  ShieldCheck,
  Activity,
  Zap,
  Target
} from "lucide-react"
import api from "@/lib/api"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useAuthStore } from "@/store/authStore"

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
  const [recentActivities, setRecentActivities] = useState([])
  const [topPerformers, setTopPerformers] = useState([])
  const [userPermissions, setUserPermissions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [userData, setUserData] = useState<any>(null)
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
      setUserPermissions(perms)

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
      
      const [empRes, attRes, projRes, leaveRes] = await Promise.allSettled([
        (isAdmin || perms.includes('view_employee')) ? api.get('/employees') : Promise.reject('No permission'),
        (isAdmin || perms.includes('view_attendance')) ? api.get('/attendance?today=true') : api.get('/attendance?today=true&self=true'),
        (isAdmin || perms.includes('view_projects')) ? api.get('/projects') : Promise.reject('No permission'),
        (isAdmin || perms.includes('view_leaves')) ? api.get('/leaves') : Promise.reject('No permission')
      ])

      const employees = empRes.status === 'fulfilled' ? empRes.value.data : []
      const attendance = attRes.status === 'fulfilled' ? attRes.value.data : []
      const projects = projRes.status === 'fulfilled' ? projRes.value.data : []
      const leaves = leaveRes.status === 'fulfilled' ? leaveRes.value.data : []

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

      setUserStats({
        totalStaff: employees.length,
        presentToday,
        absentToday,
        onLeave: leaves.length,
        activeProjects: activeProjectsCount,
        completedTasks: 0
      })

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

  return (
    <div className="space-y-10 pb-20 font-inter">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Badge variant="secondary">Staff portal</Badge>
            <Badge className="bg-cyan-50 text-[#06b6d4] border border-cyan-100">Online</Badge>
          </div>
          <h1 className="text-[28px] font-bold text-slate-900 tracking-tight leading-none">
            Staff Dashboard
          </h1>
          <p className="text-slate-600 text-sm mt-3 max-w-lg leading-relaxed">
            Real-time interface for <span className="text-slate-900 font-semibold">{userData?.agencyName || 'your agency'}</span>.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-border shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
          <Avatar className="h-12 w-12 rounded-xl border border-border bg-white">
            <AvatarFallback className="bg-slate-100 text-slate-700 font-semibold">{userData?.fullName?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="text-[12px] font-medium text-slate-500">Signed in as</div>
            <div className="text-[14px] font-semibold text-slate-900 leading-tight">{userData?.fullName}</div>
            <div className="text-[12px] text-slate-500 mt-0.5">{userData?.role || 'Staff'}</div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 sm:gap-6 md:grid-cols-4">
        <StatCard title="Personnel Count" value={userStats.totalStaff} icon={<Users className="text-teal-700" />} color="teal" />
        <StatCard title="Present Today" value={userStats.presentToday} icon={<Zap className="text-green-700" />} color="emerald" />
        <StatCard title="Active Projects" value={userStats.activeProjects} icon={<Target className="text-sky-700" />} color="blue" />
        <StatCard title="On Leave" value={userStats.onLeave} icon={<CalendarDays className="text-orange-700" />} color="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-10">
        <div className="lg:col-span-2 space-y-10">
          <div className="bg-white p-6 rounded-xl border border-border shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[20px] font-semibold text-slate-900">Permissions</h3>
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex flex-wrap gap-2">
                {userPermissions.map(p => (
                  <Badge key={p} variant="secondary">
                    {p.replaceAll('_', ' ')}
                  </Badge>
                ))}
                {userPermissions.length === 0 && <span className="text-sm text-slate-500">No permissions assigned.</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-10">
          <div>
            <div className="flex items-center justify-between mb-8 px-2">
              <h2 className="text-[20px] font-semibold text-slate-900">Recent activity</h2>
            </div>
            <div className="space-y-4">
              {recentActivities.map((activity: any, idx) => (
                <div key={idx} className="bg-white p-4 rounded-xl border border-border shadow-[0_1px_3px_rgba(0,0,0,0.1)] flex items-center gap-4">
                  <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border", activity.color === 'emerald' ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200")}>
                    <Activity className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-slate-900 leading-tight truncate">{activity.title}</p>
                    <p className="text-[12px] text-slate-500 mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
              {recentActivities.length === 0 && <p className="text-center py-10 text-sm text-slate-500">No recent activity.</p>}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-8 px-2">
              <h2 className="text-[20px] font-semibold text-slate-900">Team members</h2>
            </div>
            <div className="space-y-4">
              {topPerformers.map((performer: any, idx) => (
                <div key={idx} className="flex items-center justify-between bg-white p-4 rounded-xl border border-border shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 rounded-xl border border-border">
                      <AvatarFallback className="bg-slate-100 text-slate-700 font-semibold text-xs">{performer.initials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium text-slate-900 leading-tight">{performer.name}</div>
                      <div className="text-[12px] text-slate-500">{performer.designation}</div>
                    </div>
                  </div>
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                </div>
              ))}
              {topPerformers.length === 0 && <p className="text-center py-10 text-sm text-slate-500">No team members found.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
