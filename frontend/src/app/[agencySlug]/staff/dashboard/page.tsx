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

      const perms = user.permissions || []
      setUserPermissions(perms)

      // Permission check
      const isAdmin = user?.role?.toLowerCase().includes('admin')
      if (!isAdmin && !perms.includes('view_dashboard')) {
        toast.error("Unauthorized Access: Terminal restricted.")
        router.push(`/${agencySlug}/my-schedule`)
        return
      }

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
            <div className="bg-[#D9A75B]/10 text-[#D9A75B] px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-[#D9A75B]/20">Station Command</div>
            <Badge className="bg-[#D9A75B] text-black border-none text-[9px] font-black tracking-widest px-2 py-0.5 animate-pulse">TERMINAL LIVE</Badge>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-none uppercase italic">
            Mission <span className="text-[#D9A75B]">Control</span>
          </h1>
          <p className="text-white/40 font-bold text-sm mt-4 uppercase tracking-[0.2em] max-w-lg leading-relaxed">
            Real-time interface for <span className="text-[#D9A75B] italic font-black">{userData?.agencyName || 'Institutional Matrix'}</span> operations.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-white/5 p-4 rounded-[32px] border border-white/10 shadow-2xl backdrop-blur-xl">
          <Avatar className="h-14 w-14 rounded-2xl border-2 border-white/10 bg-black/40">
            <AvatarFallback className="bg-gradient-to-tr from-[#D9A75B] to-[#FFB800] text-black font-black">{userData?.fullName?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">OPERATOR IDENTITY</div>
            <div className="text-lg font-black text-white leading-tight">{userData?.fullName}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#D9A75B]" />
              <span className="text-[10px] font-bold text-[#D9A75B] uppercase tracking-[0.2em]">{userData?.role || 'Level 1 Personnel'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 sm:gap-6 md:grid-cols-4">
        <StatCard title="Personnel Count" value={userStats.totalStaff} icon={<Users className="text-[#D9A75B]" />} color="amber" className="bg-white/5 border-white/10" />
        <StatCard title="Active Duty" value={userStats.presentToday} icon={<Zap className="text-emerald-400" />} color="emerald" className="bg-white/5 border-white/10" />
        <StatCard title="Project Matrix" value={userStats.activeProjects} icon={<Target className="text-blue-400" />} color="blue" className="bg-white/5 border-white/10" />
        <StatCard title="Pending Status" value={userStats.onLeave} icon={<CalendarDays className="text-amber-400" />} color="amber" className="bg-white/5 border-white/10" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-10">
        <div className="lg:col-span-2 space-y-10">
          <div>
            <div className="flex items-center justify-between mb-8 px-2">
              <h2 className="text-xl font-black text-white uppercase tracking-[0.1em] flex items-center gap-3 italic">
                <Zap className="h-5 w-5 text-[#D9A75B]" />
                Command Links
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: 'Attendance', icon: Clock, path: '/attendance', perm: 'record_attendance' },
                { label: 'Personnel', icon: Users, path: '/employees', perm: 'view_employee' },
                { label: 'Projects', icon: Briefcase, path: '/projects', perm: 'view_projects' },
                { label: 'Clients', icon: Building2, path: '/clients', perm: 'view_clients' },
                { label: 'Payroll', icon: Wallet, path: '/payroll', perm: 'view_payroll' },
                { label: 'Leave Logs', icon: CalendarDays, path: '/leaves', perm: 'apply_leave' },
              ].filter(link => userPermissions.includes(link.perm) || userData?.role?.toLowerCase().includes('admin')).map((link) => (
                <Button
                  key={link.label}
                  variant="outline"
                  className="h-32 flex-col gap-3 rounded-[32px] border-white/10 bg-white/5 hover:border-[#D9A75B]/50 hover:bg-[#D9A75B]/10 hover:text-[#D9A75B] transition-all shadow-xl group relative overflow-hidden backdrop-blur-md text-white/70"
                  onClick={() => router.push(`/${agencySlug}${link.path}`)}
                >
                  <link.icon className="h-7 w-7 transition-transform group-hover:scale-110 duration-500" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">{link.label}</span>
                  <ArrowRight className="h-3 w-3 absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                </Button>
              ))}
            </div>
          </div>

          <div className="bg-white/5 p-8 rounded-[40px] border border-white/10 relative overflow-hidden group backdrop-blur-3xl">
            <div className="absolute top-0 right-0 p-5 sm:p-10 opacity-[0.03] group-hover:opacity-[0.1] transition-opacity duration-700">
              <ShieldCheck className="h-40 w-40 text-[#D9A75B]" />
            </div>
            <div className="relative z-10">
              <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.5em] mb-6 underline decoration-[#D9A75B]/30 decoration-2 underline-offset-8">Access Privileges</h3>
              <div className="flex flex-wrap gap-2">
                {userPermissions.map(p => (
                  <Badge key={p} className="bg-[#D9A75B]/10 text-[#D9A75B] border border-[#D9A75B]/20 shadow-lg px-3 py-1.5 rounded-xl font-black text-[9px] uppercase tracking-widest">
                    {p.replaceAll('_', ' ')}
                  </Badge>
                ))}
                {userPermissions.length === 0 && <span className="text-xs font-medium text-white/30 italic uppercase tracking-widest">Unauthorized Terminal Access.</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-10">
          <div>
            <div className="flex items-center justify-between mb-8 px-2">
              <h2 className="text-xl font-black text-white uppercase tracking-[0.1em] italic">Telemetry</h2>
            </div>
            <div className="space-y-4">
              {recentActivities.map((activity: any, idx) => (
                <div key={idx} className="bg-white/5 p-5 rounded-[28px] border border-white/10 shadow-xl hover:bg-white/10 transition-all flex items-center gap-4 group backdrop-blur-md">
                  <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg", activity.color === 'emerald' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20")}>
                    <Activity className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black text-white/80 leading-tight group-hover:text-[#D9A75B] transition-colors truncate uppercase tracking-wider">{activity.title}</p>
                    <p className="text-[9px] font-bold text-white/30 uppercase tracking-[0.2em] mt-1">{activity.time} — SECTOR 7</p>
                  </div>
                </div>
              ))}
              {recentActivities.length === 0 && <p className="text-center py-10 text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">No telemetry detected in current cycle.</p>}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-8 px-2">
              <h2 className="text-xl font-black text-white uppercase tracking-[0.1em] italic">Node Directory</h2>
            </div>
            <div className="space-y-4">
              {topPerformers.map((performer: any, idx) => (
                <div key={idx} className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/10 shadow-lg">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 rounded-xl border border-white/10">
                      <AvatarFallback className="bg-black/40 text-[#D9A75B] font-black text-xs">{performer.initials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-xs font-black text-white leading-tight uppercase tracking-wider">{performer.name}</div>
                      <div className="text-[9px] font-bold text-white/30 uppercase tracking-[0.15em]">{performer.designation}</div>
                    </div>
                  </div>
                  <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                </div>
              ))}
              {topPerformers.length === 0 && <p className="text-center py-10 text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Sector manifest empty.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
