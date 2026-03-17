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
    const sevColor = (s: number) => ["", "text-blue-400 bg-blue-500/10 border border-blue-500/20", "text-amber-400 bg-amber-500/10 border border-amber-500/20", "text-orange-400 bg-orange-500/10 border border-orange-500/20", "text-rose-400 bg-rose-500/10 border border-rose-500/20"][s] || "text-white/40 bg-white/5 border border-white/10"

    return (
        <div className="space-y-10 pb-20">
            <PageHeader
                title="Agency"
                titleHighlight="Command"
                subtitle={`Operational Control Center for ${authUser?.agencyName || agencySlug}. System online.`}
                action={
                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                            Live Node
                        </span>
                    </div>
                }
            />

            {/* ── Stat Cards ── */}
            <div className="grid gap-4 grid-cols-2 sm:gap-6 md:grid-cols-3 lg:grid-cols-5">
                <StatCard title="Active Deployments" value={stats.activeDeployments} icon={<Target />} color="teal" />
                <StatCard title="Guards on Duty" value={stats.guardsOnDuty} icon={<ShieldCheck />} color="teal" />
                <StatCard title="Open Incidents" value={stats.openIncidents} icon={<AlertTriangle />} color="rose" />
                <StatCard title="Total Clients" value={stats.clients} icon={<Building2 />} color="teal" />
                <StatCard title="Total Personnel" value={stats.employees} icon={<Users />} color="teal" />
            </div>

            {/* ── Panel 1: Attendance Summary ── */}
            <Card className="overflow-hidden">
                <div className="px-4 sm:px-6 py-5 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-teal-50 rounded-xl flex items-center justify-center shrink-0 border border-teal-100">
                            <CheckCircle2 className="h-6 w-6 text-teal-700" />
                        </div>
                        <h3 className="text-[20px] font-semibold text-slate-900">Attendance Summary</h3>
                    </div>
                </div>
                <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
                        <div className="text-center p-4 sm:p-6 bg-slate-50 border border-border rounded-xl">
                            <p className="text-3xl sm:text-4xl font-bold text-green-700">{stats.attendanceSummary.present}</p>
                            <p className="text-[12px] font-medium text-slate-600 mt-2">Present</p>
                        </div>
                        <div className="text-center p-4 sm:p-6 bg-slate-50 border border-border rounded-xl">
                            <p className="text-3xl sm:text-4xl font-bold text-orange-700">{stats.attendanceSummary.late}</p>
                            <p className="text-[12px] font-medium text-slate-600 mt-2">Late</p>
                        </div>
                        <div className="text-center p-4 sm:p-6 bg-slate-50 border border-border rounded-xl">
                            <p className="text-3xl sm:text-4xl font-bold text-red-700">{stats.attendanceSummary.absent}</p>
                            <p className="text-[12px] font-medium text-slate-600 mt-2">Absent</p>
                        </div>
                        <div className="text-center p-4 sm:p-6 bg-slate-50 border border-border rounded-xl">
                            <p className="text-3xl sm:text-4xl font-bold text-slate-900">{stats.attendanceSummary.total}</p>
                            <p className="text-[12px] font-medium text-slate-600 mt-2">Total</p>
                        </div>
                    </div>
                    {stats.attendanceSummary.total > 0 && (
                        <div className="mt-6 h-2 w-full bg-slate-200 rounded-full overflow-hidden flex">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${(stats.attendanceSummary.present / stats.attendanceSummary.total) * 100}%` }} transition={{ duration: 1 }} className="bg-emerald-500 h-full" />
                            <motion.div initial={{ width: 0 }} animate={{ width: `${(stats.attendanceSummary.late / stats.attendanceSummary.total) * 100}%` }} transition={{ duration: 1, delay: 0.2 }} className="bg-amber-500 h-full" />
                            <motion.div initial={{ width: 0 }} animate={{ width: `${(stats.attendanceSummary.absent / stats.attendanceSummary.total) * 100}%` }} transition={{ duration: 1, delay: 0.4 }} className="bg-rose-500 h-full" />
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* ── Panel 2: Today's Active Deployments ── */}
                <Card>
                    <div className="px-4 sm:px-6 py-5 border-b border-border flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 bg-teal-50 rounded-xl flex items-center justify-center shrink-0 border border-teal-100">
                                <MapPin className="h-6 w-6 text-teal-700" />
                            </div>
                            <h3 className="text-[20px] font-semibold text-slate-900">Today’s Deployments</h3>
                        </div>
                        <Badge variant="secondary">{todayDeployments.length}</Badge>
                    </div>
                    <CardContent className="p-4 sm:p-6 max-h-[450px] overflow-y-auto scrollbar-hide">
                        {todayDeployments.length === 0 ? (
                            <div className="text-center py-20 opacity-40">
                                <CalendarDays className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                                <p className="text-xs font-black uppercase tracking-widest">No Active Deployments</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {todayDeployments.map((dep: any) => (
                                    <div key={dep.id} className="flex items-center gap-4 p-4 bg-slate-50 border border-border rounded-xl hover:bg-slate-100 transition-colors">
                                        <div className="h-12 w-12 bg-white rounded-xl flex items-center justify-center shrink-0 border border-border">
                                            <Building2 className="h-5 w-5 text-primary" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-slate-900 truncate">{dep.client?.name}</p>
                                            <p className="text-[12px] text-slate-500 mt-1">
                                                {dep.shift?.name} • {dep.shift?.startTime} – {dep.shift?.endTime} • {dep._count?.guards || 0} guards
                                            </p>
                                        </div>
                                        <Badge className={cn(
                                            "shrink-0",
                                            dep.status === "active" ? "bg-green-100 text-green-700 border border-green-200" : "bg-slate-100 text-slate-600 border border-slate-200"
                                        )}>{dep.status}</Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* ── Panel 3: Guards on Duty ── */}
                <Card>
                    <div className="px-4 sm:px-6 py-5 border-b border-border flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 bg-teal-50 rounded-xl flex items-center justify-center shrink-0 border border-teal-100">
                                <Shield className="h-6 w-6 text-teal-700" />
                            </div>
                            <h3 className="text-[20px] font-semibold text-slate-900">Guards on Duty</h3>
                        </div>
                        <Badge variant="secondary">{guardsOnDutyList.length}</Badge>
                    </div>
                    <CardContent className="p-4 sm:p-6 max-h-[450px] overflow-y-auto scrollbar-hide">
                        {guardsOnDutyList.length === 0 ? (
                            <div className="text-center py-20 opacity-40">
                                <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                                <p className="text-xs font-black uppercase tracking-widest">No Personnel Logged</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {guardsOnDutyList.map((g: any, i: number) => (
                                    <div key={i} className="flex items-center gap-5 p-5 bg-white/[0.02] border border-white/5 rounded-3xl group">
                                        <div className="h-12 w-12 bg-gradient-to-tr from-primary/20 to-primary/5 rounded-2xl flex items-center justify-center shrink-0 border border-primary/20 transition-transform group-hover:scale-105">
                                            <span className="text-lg font-black text-primary italic">{g.name?.charAt(0)?.toUpperCase()}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-black text-foreground text-base tracking-tight truncate uppercase">{g.name}</p>
                                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] mt-1 border-t border-white/5 pt-1.5">
                                                {g.deployment || g.project || "Sector Default"} • <span className="text-primary/60">IN: {new Date(g.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Active</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* ── Panel 4: Open Incidents ── */}
                <Card className="rounded-[40px] border-white/5 bg-black shadow-3xl">
                    <div className="px-4 sm:px-8 py-8 border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 bg-rose-500/10 rounded-2xl flex items-center justify-center shrink-0 border border-rose-500/20">
                                <AlertTriangle className="h-6 w-6 text-rose-500" />
                            </div>
                            <h3 className="text-sm font-black uppercase tracking-[0.3em] text-white">Breach Reports</h3>
                        </div>
                        <Button variant="ghost" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-all" asChild>
                            <Link href={`/${agencySlug}/incidents`}>Intercept All <ArrowRight className="h-3 w-3 ml-2" /></Link>
                        </Button>
                    </div>
                    <CardContent className="p-4 sm:p-6 max-h-[450px] overflow-y-auto scrollbar-hide">
                        {recentIncidents.length === 0 ? (
                            <div className="text-center py-20 opacity-40">
                                <ShieldCheck className="h-16 w-16 text-emerald-500/50 mx-auto mb-4" />
                                <p className="text-xs font-black uppercase tracking-widest">Sector Secure – No Threats</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {recentIncidents.map((inc: any) => (
                                    <div key={inc.id} className="flex items-center gap-5 p-5 bg-white/[0.02] border border-white/5 rounded-3xl hover:bg-rose-500/[0.02] transition-all hover:border-rose-500/20 group">
                                        <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105", 
                                            inc.severity >= 3 ? "bg-rose-500/20 border-rose-500/40 text-rose-500" : "bg-amber-500/20 border-amber-500/40 text-amber-500")}>
                                            <AlertTriangle className="h-5 w-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-black text-foreground text-base tracking-tight truncate uppercase italic">{inc.title}</p>
                                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] mt-1 border-t border-white/5 pt-1.5 font-sans">
                                                {inc.reporter?.fullName} • {inc.deployment?.client?.name || "General Sector"} • <span className="opacity-70 font-black tracking-widest">{sevLabel(inc.severity)}</span>
                                            </p>
                                        </div>
                                        <Badge className={cn(
                                            "rounded-lg font-black text-[8px] uppercase tracking-widest shrink-0 border",
                                            inc.status === "open" ? "bg-rose-500/20 text-rose-400 border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.1)]" : "bg-amber-500/20 text-amber-400 border-amber-500/20"
                                        )}>{inc.status?.replace("_", " ")}</Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* ── Panel 5: Recent Activity Feed ── */}
                <Card className="rounded-[40px] border-white/5 bg-black shadow-3xl">
                    <div className="px-4 sm:px-8 py-8 border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0 border border-primary/20">
                                <Activity className="h-6 w-6 text-primary" />
                            </div>
                            <h3 className="text-sm font-black uppercase tracking-[0.3em] text-white">Operational Feed</h3>
                        </div>
                        <Button variant="ghost" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-all" asChild>
                            <Link href={`/${agencySlug}/audit-logs`}>Full Stream <ArrowRight className="h-3 w-3 ml-2" /></Link>
                        </Button>
                    </div>
                    <CardContent className="p-4 sm:p-6 max-h-[450px] overflow-y-auto scrollbar-hide">
                        {recentActivity.length === 0 ? (
                            <div className="text-center py-20 opacity-40">
                                <Clock className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                                <p className="text-xs font-black uppercase tracking-widest">No Recent Activity</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {recentActivity.map((log: any) => (
                                    <div key={log.id} className="flex items-center gap-5 p-5 bg-white/[0.02] border border-white/5 rounded-3xl">
                                        <div className={cn(
                                            "h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 border",
                                            log.severity === 'CRITICAL' ? "bg-rose-500/10 border-rose-500/20 text-rose-500" :
                                            log.action?.includes('LOG') ? "bg-blue-500/10 border-blue-500/20 text-blue-500" :
                                            "bg-primary/10 border-primary/20 text-primary"
                                        )}>
                                            {log.action?.includes('CHECK') ? <LogIn className="h-5 w-5" /> :
                                             log.action?.includes('INCIDENT') ? <AlertTriangle className="h-5 w-5" /> :
                                             <Activity className="h-5 w-5" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[11px] font-black text-foreground uppercase tracking-tight truncate italic">{log.action?.replace(/_/g, ' ')}</p>
                                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1 opacity-60 font-sans">{log.user?.fullName || "SYSTEM ENGINE"}</p>
                                        </div>
                                        <span className="text-[9px] font-black text-primary/60 uppercase tracking-widest whitespace-nowrap shrink-0 ml-2">
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
            <Card>
                <CardContent className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="h-12 w-12 bg-teal-50 border border-teal-100 rounded-xl flex items-center justify-center">
                                <ShieldCheck className="h-6 w-6 text-primary" />
                            </div>
                            <h3 className="text-[20px] font-semibold text-slate-900">Quick actions</h3>
                        </div>
                        <p className="text-slate-600 text-sm max-w-xl leading-relaxed">
                            Deploy personnel, report incidents, and manage daily operations from one place.
                        </p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                        <Button variant="primary" size="cta" className="w-full sm:w-auto" onClick={() => router.push(`/${agencySlug}/deployments`)}>
                            Mission deploy
                        </Button>
                        <Button variant="secondary" size="cta" className="w-full sm:w-auto" onClick={() => router.push(`/${agencySlug}/incidents`)}>
                            Threat intel
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
