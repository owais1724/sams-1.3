"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import api from "@/lib/api"
import { motion } from "framer-motion"
import {
    Building2,
    Users,
    ShieldCheck,
    ArrowRight,
    Activity,
    Target,
    Zap,
    Shield,
    Clock,
    AlertTriangle,
    MapPin,
    CheckCircle2,
    XCircle,
    LogIn,
    CalendarDays,
} from "lucide-react"
import {
    PageHeader,
    StatCard,
    PageLoading,
} from "@/components/ui/design-system"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/sonner"
import { useAuthStore } from "@/store/authStore"
import { Card, CardContent } from "@/components/ui/card"

export default function AgencyDashboard() {
    const { agencySlug } = useParams()
    const router = useRouter()
    const { user: authUser } = useAuthStore()
    const [stats, setStats] = useState({
        clients: 0,
        employees: 0,
        activeDeployments: 0,
        guardsOnDuty: 0,
        openIncidents: 0,
        totalGuards: 0,
        attendanceSummary: { present: 0, late: 0, absent: 0, total: 0 },
    })
    const [todayDeployments, setTodayDeployments] = useState<any[]>([])
    const [guardsOnDutyList, setGuardsOnDutyList] = useState<any[]>([])
    const [recentIncidents, setRecentIncidents] = useState<any[]>([])
    const [recentActivity, setRecentActivity] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const fetchData = async () => {
        setLoading(true)
        try {
            const isAdmin = authUser?.role === 'Super Admin' || authUser?.role === 'Agency Admin'
            const hasPerm = (p: string) => isAdmin || authUser?.permissions?.includes(p)

            const [dashRes, cliRes, empRes, attRes] = await Promise.allSettled([
                api.get("/dashboard/agency"),
                hasPerm('view_clients') ? api.get("/clients") : Promise.resolve({ data: [] }),
                hasPerm('view_employee') ? api.get("/employees") : Promise.resolve({ data: [] }),
                api.get("/attendance?today=true"),
            ])

            const dashboard = dashRes.status === 'fulfilled' ? dashRes.value.data : null
            const clients = cliRes.status === 'fulfilled' ? cliRes.value.data : []
            const employees = empRes.status === 'fulfilled' ? empRes.value.data : []
            const attendance = attRes.status === 'fulfilled' ? attRes.value.data : []

            if (dashboard) {
                setTodayDeployments(dashboard.todayDeploymentsList || [])
                setRecentIncidents(dashboard.recentIncidents || [])
                setRecentActivity(dashboard.recentActivity || [])
            }

            // Build guards on duty list from today's attendance (checked in, not checked out)
            const onDuty = attendance
                .filter((a: any) => a.checkIn && !a.checkOut)
                .map((a: any) => ({
                    name: a.employee?.user?.fullName || a.employee?.fullName || 'Guard',
                    checkIn: a.checkIn,
                    project: a.project?.name,
                    deployment: a.deployment?.client?.name,
                }))
            setGuardsOnDutyList(onDuty)

            setStats({
                clients: clients.length,
                employees: employees.length,
                activeDeployments: dashboard?.activeDeployments ?? 0,
                guardsOnDuty: dashboard?.guardsOnDuty ?? onDuty.length,
                openIncidents: dashboard?.openIncidents ?? 0,
                totalGuards: dashboard?.totalGuards ?? employees.length,
                attendanceSummary: dashboard?.attendanceSummary ?? { present: 0, late: 0, absent: 0, total: 0 },
            })
        } catch {
            toast.error("Failed to load dashboard.")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (authUser) fetchData()
    }, [authUser])

    if (loading) return <PageLoading message="Loading Dashboard..." />

    const sevLabel = (s: number) => ["", "Low", "Medium", "High", "Critical"][s] || "Unknown"
    const sevColor = (s: number) => ["", "text-blue-600 bg-blue-50", "text-amber-600 bg-amber-50", "text-orange-600 bg-orange-50", "text-rose-600 bg-rose-50"][s] || "text-slate-600 bg-slate-50"

    return (
        <div className="space-y-10 pb-20">
            <PageHeader
                title="Agency"
                titleHighlight="Dashboard"
                subtitle={`Real-time operational overview for ${authUser?.agencyName || agencySlug}.`}
                action={
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-none font-black text-[10px] uppercase tracking-widest px-4 py-2 animate-pulse">
                        Live
                    </Badge>
                }
            />

            {/* ── Stat Cards ── */}
            <div className="grid gap-6 md:grid-cols-5">
                <StatCard title="Active Deployments" value={stats.activeDeployments} icon={<MapPin />} color="violet" />
                <StatCard title="Guards on Duty" value={stats.guardsOnDuty} icon={<Zap />} color="emerald" />
                <StatCard title="Open Incidents" value={stats.openIncidents} icon={<AlertTriangle />} color="rose" />
                <StatCard title="Total Clients" value={stats.clients} icon={<Building2 />} color="teal" />
                <StatCard title="Total Personnel" value={stats.employees} icon={<Users />} color="blue" />
            </div>

            {/* ── Panel 1: Attendance Summary ── */}
            <Card className="rounded-[32px] border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
                <div className="px-8 py-5 border-b border-slate-100 flex items-center gap-3">
                    <div className="h-8 w-8 bg-emerald-50 rounded-xl flex items-center justify-center">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    </div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-700">Today&apos;s Attendance Summary</h3>
                </div>
                <CardContent className="p-8">
                    <div className="grid grid-cols-4 gap-6">
                        <div className="text-center p-4 bg-emerald-50/50 rounded-2xl">
                            <p className="text-3xl font-black text-emerald-600">{stats.attendanceSummary.present}</p>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 mt-1">Present</p>
                        </div>
                        <div className="text-center p-4 bg-amber-50/50 rounded-2xl">
                            <p className="text-3xl font-black text-amber-600">{stats.attendanceSummary.late}</p>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500 mt-1">Late</p>
                        </div>
                        <div className="text-center p-4 bg-rose-50/50 rounded-2xl">
                            <p className="text-3xl font-black text-rose-600">{stats.attendanceSummary.absent}</p>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-rose-500 mt-1">Absent</p>
                        </div>
                        <div className="text-center p-4 bg-slate-50 rounded-2xl">
                            <p className="text-3xl font-black text-slate-700">{stats.attendanceSummary.total}</p>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">Total Records</p>
                        </div>
                    </div>
                    {stats.attendanceSummary.total > 0 && (
                        <div className="mt-6 h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${(stats.attendanceSummary.present / stats.attendanceSummary.total) * 100}%` }} transition={{ duration: 1 }} className="bg-emerald-500 h-full" />
                            <motion.div initial={{ width: 0 }} animate={{ width: `${(stats.attendanceSummary.late / stats.attendanceSummary.total) * 100}%` }} transition={{ duration: 1, delay: 0.2 }} className="bg-amber-500 h-full" />
                            <motion.div initial={{ width: 0 }} animate={{ width: `${(stats.attendanceSummary.absent / stats.attendanceSummary.total) * 100}%` }} transition={{ duration: 1, delay: 0.4 }} className="bg-rose-500 h-full" />
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* ── Panel 2: Today's Active Deployments ── */}
                <Card className="rounded-[32px] border-slate-100 shadow-xl shadow-slate-200/50">
                    <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 bg-violet-50 rounded-xl flex items-center justify-center">
                                <MapPin className="h-4 w-4 text-violet-600" />
                            </div>
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-700">Today&apos;s Deployments</h3>
                        </div>
                        <Badge variant="outline" className="font-black text-[10px]">{todayDeployments.length}</Badge>
                    </div>
                    <CardContent className="p-6 max-h-[400px] overflow-y-auto">
                        {todayDeployments.length === 0 ? (
                            <div className="text-center py-12">
                                <CalendarDays className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                                <p className="text-sm font-bold text-slate-400">No deployments today</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {todayDeployments.map((dep: any) => (
                                    <div key={dep.id} className="flex items-center gap-4 p-4 bg-slate-50/50 rounded-2xl hover:bg-slate-50 transition-colors">
                                        <div className="h-10 w-10 bg-violet-50 rounded-xl flex items-center justify-center shrink-0">
                                            <Building2 className="h-4 w-4 text-violet-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-slate-900 text-sm truncate">{dep.client?.name}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                {dep.shift?.name} • {dep.shift?.startTime}–{dep.shift?.endTime} • {dep._count?.guards || 0} guards
                                            </p>
                                        </div>
                                        <span className={cn(
                                            "px-2.5 py-1 rounded-lg font-bold text-[9px] uppercase tracking-wide border shrink-0",
                                            dep.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-blue-50 text-blue-700 border-blue-100"
                                        )}>{dep.status}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* ── Panel 3: Guards on Duty ── */}
                <Card className="rounded-[32px] border-slate-100 shadow-xl shadow-slate-200/50">
                    <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 bg-emerald-50 rounded-xl flex items-center justify-center">
                                <Shield className="h-4 w-4 text-emerald-600" />
                            </div>
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-700">Guards on Duty</h3>
                        </div>
                        <Badge variant="outline" className="font-black text-[10px]">{guardsOnDutyList.length}</Badge>
                    </div>
                    <CardContent className="p-6 max-h-[400px] overflow-y-auto">
                        {guardsOnDutyList.length === 0 ? (
                            <div className="text-center py-12">
                                <Users className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                                <p className="text-sm font-bold text-slate-400">No guards currently on duty</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {guardsOnDutyList.map((g: any, i: number) => (
                                    <div key={i} className="flex items-center gap-4 p-4 bg-slate-50/50 rounded-2xl">
                                        <div className="h-10 w-10 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
                                            <span className="text-sm font-black text-emerald-700">{g.name?.charAt(0)?.toUpperCase()}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-slate-900 text-sm truncate">{g.name}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                {g.deployment || g.project || "On site"} • In at {new Date(g.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                            <span className="text-[9px] font-black text-emerald-600 uppercase">Active</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* ── Panel 4: Open Incidents ── */}
                <Card className="rounded-[32px] border-slate-100 shadow-xl shadow-slate-200/50">
                    <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 bg-rose-50 rounded-xl flex items-center justify-center">
                                <AlertTriangle className="h-4 w-4 text-rose-600" />
                            </div>
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-700">Open Incidents</h3>
                        </div>
                        <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary" asChild>
                            <Link href={`/${agencySlug}/incidents`}>View All <ArrowRight className="h-3 w-3 ml-1" /></Link>
                        </Button>
                    </div>
                    <CardContent className="p-6 max-h-[400px] overflow-y-auto">
                        {recentIncidents.length === 0 ? (
                            <div className="text-center py-12">
                                <ShieldCheck className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                                <p className="text-sm font-bold text-slate-400">No open incidents — all clear!</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {recentIncidents.map((inc: any) => (
                                    <div key={inc.id} className="flex items-center gap-4 p-4 bg-slate-50/50 rounded-2xl hover:bg-slate-50 transition-colors">
                                        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", sevColor(inc.severity))}>
                                            <AlertTriangle className="h-4 w-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-slate-900 text-sm truncate">{inc.title}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                {inc.reporter?.fullName} • {inc.deployment?.client?.name || "General"} • {sevLabel(inc.severity)}
                                            </p>
                                        </div>
                                        <span className={cn(
                                            "px-2.5 py-1 rounded-lg font-bold text-[9px] uppercase tracking-wide border shrink-0",
                                            inc.status === "open" ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-amber-50 text-amber-600 border-amber-100"
                                        )}>{inc.status?.replace("_", " ")}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* ── Panel 5: Recent Activity Feed ── */}
                <Card className="rounded-[32px] border-slate-100 shadow-xl shadow-slate-200/50">
                    <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 bg-blue-50 rounded-xl flex items-center justify-center">
                                <Activity className="h-4 w-4 text-blue-600" />
                            </div>
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-700">Recent Activity</h3>
                        </div>
                        <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary" asChild>
                            <Link href={`/${agencySlug}/audit-logs`}>Full Log <ArrowRight className="h-3 w-3 ml-1" /></Link>
                        </Button>
                    </div>
                    <CardContent className="p-6 max-h-[400px] overflow-y-auto">
                        {recentActivity.length === 0 ? (
                            <div className="text-center py-12">
                                <Clock className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                                <p className="text-sm font-bold text-slate-400">No recent activity</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {recentActivity.map((log: any) => (
                                    <div key={log.id} className="flex items-center gap-4 p-4 bg-slate-50/50 rounded-2xl">
                                        <div className={cn(
                                            "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                                            log.severity === 'CRITICAL' ? "bg-red-50 text-red-600" :
                                            log.action?.includes('LOGIN') ? "bg-blue-50 text-blue-600" :
                                            log.action?.includes('CHECK') ? "bg-emerald-50 text-emerald-600" :
                                            "bg-teal-50 text-teal-600"
                                        )}>
                                            {log.action?.includes('CHECK') ? <LogIn className="h-4 w-4" /> :
                                             log.action?.includes('INCIDENT') ? <AlertTriangle className="h-4 w-4" /> :
                                             <Activity className="h-4 w-4" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight truncate">{log.action?.replace(/_/g, ' ')}</p>
                                            <p className="text-[10px] font-bold text-slate-400 truncate">{log.user?.fullName || "System"}</p>
                                        </div>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase whitespace-nowrap shrink-0">
                                            {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Quick Nav Banner */}
            <div className="bg-slate-950 rounded-[40px] p-5 sm:p-10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2 group-hover:bg-primary/20 transition-all duration-1000" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="h-10 w-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/10 backdrop-blur-md">
                                <ShieldCheck className="h-5 w-5 text-primary" />
                            </div>
                            <h3 className="text-xl font-black text-white uppercase tracking-tight">Quick Actions</h3>
                        </div>
                        <p className="text-slate-400 font-medium max-w-md leading-relaxed">
                            Manage deployments, review incidents, and monitor guard attendance.
                        </p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                        <Button className="h-12 px-6 rounded-2xl bg-white text-slate-950 hover:bg-primary hover:text-white font-black uppercase tracking-widest text-[10px] transition-all shadow-xl" onClick={() => router.push(`/${agencySlug}/deployments`)}>
                            Deployments
                        </Button>
                        <Button className="h-12 px-6 rounded-2xl bg-white/10 text-white hover:bg-white hover:text-slate-950 font-black uppercase tracking-widest text-[10px] transition-all border border-white/20" onClick={() => router.push(`/${agencySlug}/incidents`)}>
                            Incidents
                        </Button>
                        <Button className="h-12 px-6 rounded-2xl bg-white/10 text-white hover:bg-white hover:text-slate-950 font-black uppercase tracking-widest text-[10px] transition-all border border-white/20" onClick={() => router.push(`/${agencySlug}/attendance`)}>
                            Attendance
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
