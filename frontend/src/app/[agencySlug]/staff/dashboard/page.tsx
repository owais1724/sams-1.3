"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import {
  PageHeader,
  StatCard,
  PageLoading
} from "@/components/ui/design-system"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  CalendarDays,
  Users,
  Clock,
  TrendingUp,
  Briefcase,
  Award,
  Building2,
  Wallet,
  ShieldCheck,
  ArrowRight,
  Activity,
  Zap,
  Target
} from "lucide-react"
import api from "@/lib/api"
import { toast } from "@/components/ui/sonner"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

      const PLATFORM_PERMISSIONS = [
        'create_agency', 'edit_agency', 'delete_agency', 'view_agencies',
        'create_agency_admin', 'edit_agency_admin', 'delete_agency_admin',
        'view_audit_logs_platform',
      ]
      const perms: string[] = (user.permissions || []).filter(
        (p: string) => !PLATFORM_PERMISSIONS.includes(p)
      )
      setUserPermissions(perms)

      const isAdmin = user?.role === 'Super Admin' || user?.role === 'Agency Admin'
      const hasPerm = (p: string) => isAdmin || perms.includes(p)

      const [empRes, attRes, projRes, leaveRes] = await Promise.allSettled([
        hasPerm('view_employee') ? api.get('/employees') : Promise.reject('No permission'),
        hasPerm('view_attendance') ? api.get('/attendance?today=true') : api.get('/attendance?today=true&self=true'),
        hasPerm('view_projects') ? api.get('/projects') : Promise.reject('No permission'),
        hasPerm('view_leaves') ? api.get('/leaves') : Promise.reject('No permission')
      ])

      const employees = empRes.status === 'fulfilled' ? empRes.value.data : []
      const attendance = attRes.status === 'fulfilled' ? attRes.value.data : []
      const projects = projRes.status === 'fulfilled' ? projRes.value.data : []
      const leaves = leaveRes.status === 'fulfilled' ? leaveRes.value.data : []

      const presentToday = attendance.filter((a: any) => a.status === 'PRESENT').length
      const activeProjectsCount = projects.filter((p: any) => p.status === 'ACTIVE' || p.isActive).length

      setUserStats({
        totalStaff: employees.length,
        presentToday,
        absentToday: 0,
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
      toast.error("Failed to load dashboard.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  if (loading) return <PageLoading message="Loading Dashboard..." />

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-primary/10">Staff Dashboard</div>
            <Badge className="bg-emerald-500 text-white border-none text-[9px] font-black tracking-widest px-2 py-0.5 animate-pulse">SYSTEM LIVE</Badge>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-none">
            Staff <span className="text-primary">Dashboard</span>
          </h1>
          <p className="text-slate-500 font-bold text-sm mt-4 uppercase tracking-widest max-w-lg leading-relaxed">
            Overview of your activity and status within <span className="text-primary italic font-black">{userData?.agencyName || 'SAMS Operations'}</span>.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-white p-4 rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/50">
          <Avatar className="h-14 w-14 rounded-2xl border-2 border-slate-50">
            <AvatarFallback className="bg-slate-900 text-white font-black">{userData?.fullName?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">User Profile</div>
            <div className="text-lg font-black text-slate-900 leading-tight">{userData?.fullName}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{userData?.role || 'Employee'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <StatCard title="Total Staff" value={userStats.totalStaff} icon={<Users />} color="blue" />
        <StatCard title="Present Today" value={userStats.presentToday} icon={<Zap />} color="emerald" />
        <StatCard title="Active Projects" value={userStats.activeProjects} icon={<Target />} color="violet" />
        <StatCard title="Pending Leaves" value={userStats.onLeave} icon={<CalendarDays />} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-10">
        <div className="lg:col-span-2 space-y-10">
          <div>
            <div className="flex items-center justify-between mb-8 px-2">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                <Zap className="h-5 w-5 text-primary" />
                Quick Access
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: 'Attendance', icon: Clock, path: '/attendance', perm: 'mark_attendance', color: 'slate' },
                { label: 'Employees', icon: Users, path: '/employees', perm: 'view_employee', color: 'teal' },
                { label: 'Projects', icon: Briefcase, path: '/projects', perm: 'view_projects', color: 'emerald' },
                { label: 'Clients', icon: Building2, path: '/clients', perm: 'view_clients', color: 'blue' },
                { label: 'Payroll', icon: Wallet, path: '/payroll', perm: 'view_payroll', color: 'amber' },
                { label: 'Leaves', icon: CalendarDays, path: '/leaves', perm: 'apply_leave', color: 'orange' },
              ].filter(link => userPermissions.includes(link.perm) || userData?.role === 'Super Admin' || userData?.role === 'Agency Admin').map((link) => (
                <Button
                  key={link.label}
                  variant="outline"
                  className="h-32 flex-col gap-3 rounded-[32px] border-slate-100 hover:border-primary hover:bg-primary/5 hover:text-primary transition-all shadow-sm group relative overflow-hidden bg-white"
                  onClick={() => router.push(`/${agencySlug}${link.path}`)}
                >
                  <link.icon className="h-7 w-7 transition-transform group-hover:scale-110 duration-500" />
                  <span className="text-xs font-black uppercase tracking-widest">{link.label}</span>
                  <ArrowRight className="h-3 w-3 absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                </Button>
              ))}
            </div>
          </div>

          <div className="bg-slate-50/50 p-8 rounded-[40px] border border-slate-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-5 sm:p-10 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-700">
              <ShieldCheck className="h-40 w-40" />
            </div>
            <div className="relative z-10">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Permissions & Access</h3>
              <div className="flex flex-wrap gap-2">
                {userPermissions.map(p => (
                  <Badge key={p} className="bg-white text-slate-600 border border-slate-100 shadow-sm px-3 py-1.5 rounded-xl font-bold text-[10px] uppercase tracking-wider">
                    {p.replaceAll('_', ' ')}
                  </Badge>
                ))}
                {userPermissions.length === 0 && <span className="text-xs font-medium text-slate-400 italic">No specific privileges assigned to this node.</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-10">
          <div>
            <div className="flex items-center justify-between mb-8 px-2">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Activity Log</h2>
            </div>
            <div className="space-y-4">
              {recentActivities.map((activity: any, idx) => (
                <div key={idx} className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center gap-4 group">
                  <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", activity.color === 'emerald' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600")}>
                    <Activity className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black text-slate-900 leading-tight group-hover:text-primary transition-colors truncate">{activity.title}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{activity.time} — Verified</p>
                  </div>
                </div>
              ))}
              {recentActivities.length === 0 && <p className="text-center py-10 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">No activities logged in current cycle.</p>}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-8 px-2">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Agency Staff</h2>
            </div>
            <div className="space-y-4">
              {topPerformers.map((performer: any, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 rounded-xl border border-white">
                      <AvatarFallback className="bg-slate-200 text-slate-600 font-bold text-xs">{performer.initials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-xs font-black text-slate-900 leading-tight">{performer.name}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{performer.designation}</div>
                    </div>
                  </div>
                  <div className="h-2 w-2 rounded-full bg-emerald-500 mr-2" />
                </div>
              ))}
              {topPerformers.length === 0 && <p className="text-center py-10 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">No staff members found.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
