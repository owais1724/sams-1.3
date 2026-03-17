"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuthStore } from "@/store/authStore"
import api from "@/lib/api"
import { 
    Users, 
    Building2, 
    ShieldCheck, 
    AlertTriangle, 
    Target,
    Activity,
    Clock,
    ArrowRight,
    MapPin,
    CalendarDays,
    Shield,
    CheckCircle2,
    LogIn
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader, PageLoading } from "@/components/ui/design-system"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface DashboardStats {
    clients: number
    employees: number
    activeDeployments: number
    guardsOnDuty: number
    openIncidents: number
    totalGuards: number
    attendanceSummary: {
        present: number
        late: number
        absent: number
        total: number
    }
}

const StatCard = ({ title, value, icon, color }: { title: string; value: number | string; icon: React.ReactNode; color: 'teal' | 'rose' | 'amber' | 'blue' }) => {
    const colorMap = {
        teal: "from-teal-500/10 to-teal-500/5 text-teal-500 border-teal-500/20",
        rose: "from-rose-500/10 to-rose-500/5 text-rose-500 border-rose-500/20",
        amber: "from-amber-500/10 to-amber-500/5 text-amber-500 border-amber-500/20",
        blue: "from-blue-500/10 to-blue-500/5 text-white border-white/10"
    }

    return (
        <Card className={cn("overflow-hidden border border-white/5 bg-[#111111] shadow-2xl relative group")}>
            <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50 transition-opacity group-hover:opacity-70", colorMap[color])} />
            <CardContent className="p-6 relative">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-1">{title}</p>
                        <h4 className="text-3xl font-black text-white tracking-tighter italic">{value}</h4>
                    </div>
                    <div className={cn("p-3 rounded-2xl border bg-black/50", colorMap[color])}>
                        {icon}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

export default function AgencyDashboard() {
    const { user: authUser } = useAuthStore()
    const router = useRouter()
    const { agencySlug } = useParams()
    const [stats, setStats] = useState<DashboardStats>({
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

            const [
                deployRes,
                attnSumRes,
                incRes,
                dutyRes,
                actRes,
                cliRes,
                empRes,
                attRes
            ] = await Promise.allSettled([
                api.get("/dashboard/today-deployments"),
                api.get("/dashboard/attendance-summary"),
                api.get("/dashboard/open-incidents"),
                api.get("/dashboard/guards-on-duty"),
                api.get("/dashboard/recent-activity"),
                hasPerm('view_clients') ? api.get("/clients") : Promise.resolve({ data: [] }),
                hasPerm('view_employee') ? api.get("/employees") : Promise.resolve({ data: [] }),
                api.get("/attendance?today=true"),
            ]);

            const todayDeploymentsData = deployRes.status === 'fulfilled' ? deployRes.value.data : { deployments: [], count: 0 }
            const attendanceSummary = attnSumRes.status === 'fulfilled' ? attnSumRes.value.data : { present: 0, late: 0, absent: 0, total: 0 }
            const incidentsData = incRes.status === 'fulfilled' ? incRes.value.data : { incidents: [], count: 0 }
            const onDutyData = dutyRes.status === 'fulfilled' ? dutyRes.value.data : { personnel: [], count: 0 }
            const recentActData = actRes.status === 'fulfilled' ? actRes.value.data : { activities: [] }
            
            const clients = cliRes.status === 'fulfilled' ? cliRes.value.data : []
            const employees = empRes.status === 'fulfilled' ? empRes.value.data : []

            setTodayDeployments(todayDeploymentsData.deployments || [])
            setRecentIncidents(incidentsData.incidents || [])
            setRecentActivity(recentActData.activities || [])

            // Build guards on duty list from specialized endpoint data
            const onDuty = onDutyData.personnel?.map((p: any) => ({
                name: p.name,
                checkIn: p.checkIn,
                location: p.location,
            })) || []
            setGuardsOnDutyList(onDuty)

            setStats({
                clients: clients.length,
                employees: employees.length,
                activeDeployments: todayDeploymentsData.count || 0,
                guardsOnDuty: onDutyData.count || 0,
                openIncidents: incidentsData.count || 0,
                totalGuards: employees.length,
                attendanceSummary: attendanceSummary,
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
            <Card className="rounded-[40px] border-white/10 bg-[#111111] shadow-2xl">
                <div className="px-4 sm:px-8 py-8 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-white/5 rounded-2xl flex items-center justify-center shrink-0 border border-white/10">
                            <CheckCircle2 className="h-6 w-6 text-white" />
                        </div>
                        <h3 className="text-sm font-black uppercase tracking-[0.3em] text-white">Attendance Summary</h3>
                    </div>
                </div>
                <CardContent className="p-8">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                        <div className="text-center p-6 bg-white/[0.02] border border-white/5 rounded-[30px]">
                            <p className="text-4xl font-black text-emerald-400 italic">{stats.attendanceSummary.present}</p>
                            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mt-2 font-sans">Present</p>
                        </div>
                        <div className="text-center p-6 bg-white/[0.02] border border-white/5 rounded-[30px]">
                            <p className="text-4xl font-black text-amber-400 italic">{stats.attendanceSummary.late}</p>
                            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mt-2 font-sans">Late</p>
                        </div>
                        <div className="text-center p-6 bg-white/[0.02] border border-white/5 rounded-[30px]">
                            <p className="text-4xl font-black text-rose-400 italic">{stats.attendanceSummary.absent}</p>
                            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mt-2 font-sans">Absent</p>
                        </div>
                        <div className="text-center p-6 bg-white/[0.02] border border-white/5 rounded-[30px]">
                            <p className="text-4xl font-black text-white italic">{stats.attendanceSummary.total}</p>
                            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mt-2 font-sans">Total</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* ── Panel 2: Today's Active Deployments ── */}
                <Card className="rounded-[40px] border-white/10 bg-[#111111] shadow-2xl">
                    <div className="px-4 sm:px-8 py-8 border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 bg-white/5 rounded-2xl flex items-center justify-center shrink-0 border border-white/10">
                                <MapPin className="h-6 w-6 text-white" />
                            </div>
                            <h3 className="text-sm font-black uppercase tracking-[0.3em] text-white">Active Missions</h3>
                        </div>
                        <Badge className="bg-white/10 text-white border-white/10 font-black tracking-widest text-[10px]">{todayDeployments.length}</Badge>
                    </div>
                    <CardContent className="p-4 sm:p-6 max-h-[450px] overflow-y-auto scrollbar-hide">
                        {todayDeployments.length === 0 ? (
                            <div className="text-center py-20 opacity-40">
                                <CalendarDays className="h-16 w-16 text-white/20 mx-auto mb-4" />
                                <p className="text-xs font-black uppercase tracking-widest text-white/50">No Active Deployments</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {todayDeployments.map((dep: any) => (
                                    <div key={dep.id} className="flex items-center gap-5 p-5 bg-white/[0.02] border border-white/5 rounded-3xl group">
                                        <div className="h-12 w-12 bg-white/[0.05] rounded-2xl flex items-center justify-center shrink-0 border border-white/10 group-hover:bg-white/20 transition-all">
                                            <Building2 className="h-5 w-5 text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-black text-white text-base tracking-tight truncate uppercase italic">{dep.client?.name}</p>
                                            <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.15em] mt-1 border-t border-white/5 pt-1.5 font-sans">
                                                {dep.shift?.name} • {dep.shift?.startTime} – {dep.shift?.endTime}
                                            </p>
                                        </div>
                                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/20 uppercase text-[8px] font-black tracking-widest italic">{dep.status}</Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* ── Panel 3: Guards on Duty ── */}
                <Card className="rounded-[40px] border-white/10 bg-[#111111] shadow-2xl">
                    <div className="px-4 sm:px-8 py-8 border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 bg-white/5 rounded-2xl flex items-center justify-center shrink-0 border border-white/10">
                                <Shield className="h-6 w-6 text-white" />
                            </div>
                            <h3 className="text-sm font-black uppercase tracking-[0.3em] text-white">Personnel Tracking</h3>
                        </div>
                        <Badge className="bg-white/10 text-white border-white/10 font-black tracking-widest text-[10px]">{guardsOnDutyList.length}</Badge>
                    </div>
                    <CardContent className="p-4 sm:p-6 max-h-[450px] overflow-y-auto scrollbar-hide">
                        {guardsOnDutyList.length === 0 ? (
                            <div className="text-center py-20 opacity-40">
                                <Users className="h-16 w-16 text-white/20 mx-auto mb-4" />
                                <p className="text-xs font-black uppercase tracking-widest text-white/50">No Personnel Logged</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {guardsOnDutyList.map((g: any, i: number) => (
                                    <div key={i} className="flex items-center gap-5 p-5 bg-white/[0.02] border border-white/5 rounded-3xl group">
                                        <div className="h-12 w-12 bg-white/[0.05] rounded-2xl flex items-center justify-center shrink-0 border border-white/10 group-hover:bg-white/20 transition-all font-black text-white italic">
                                            {g.name?.charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-black text-white text-base tracking-tight truncate uppercase italic">{g.name}</p>
                                            <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.15em] mt-1 border-t border-white/5 pt-1.5 font-sans">
                                                {g.location || "Sector Alpha"} • <span className="text-emerald-400">IN: {new Date(g.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest italic">Live</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* ── Panel 4: Open Incidents ── */}
                <Card className="rounded-[40px] border-white/10 bg-[#111111] shadow-2xl">
                    <div className="px-4 sm:px-8 py-8 border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 bg-rose-500/10 rounded-2xl flex items-center justify-center shrink-0 border border-rose-500/20">
                                <AlertTriangle className="h-6 w-6 text-rose-500" />
                            </div>
                            <h3 className="text-sm font-black uppercase tracking-[0.3em] text-white">Breach Reports</h3>
                        </div>
                    </div>
                    <CardContent className="p-4 sm:p-6 max-h-[450px] overflow-y-auto scrollbar-hide">
                        {recentIncidents.length === 0 ? (
                            <div className="text-center py-20 opacity-40">
                                <ShieldCheck className="h-16 w-16 text-emerald-500/50 mx-auto mb-4" />
                                <p className="text-xs font-black uppercase tracking-widest text-white/50">Sector Secure – No Threats</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {recentIncidents.map((inc: any) => (
                                    <div key={inc.id} className="flex items-center gap-5 p-5 bg-white/[0.02] border border-white/5 rounded-3xl hover:bg-rose-500/[0.02] transition-all group">
                                        <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 border", 
                                            inc.severity >= 3 ? "bg-rose-500/20 border-rose-500/40 text-rose-500" : "bg-amber-500/20 border-amber-500/40 text-amber-500")}>
                                            <AlertTriangle className="h-5 w-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-black text-white text-base tracking-tight truncate uppercase italic">{inc.title}</p>
                                            <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.15em] mt-1 border-t border-white/5 pt-1.5 font-sans">
                                                {inc.reporter?.fullName} • {sevLabel(inc.severity)}
                                            </p>
                                        </div>
                                        <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/20 italic">{inc.status}</Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* ── Panel 5: Recent Activity Feed ── */}
                <Card className="rounded-[40px] border-white/10 bg-[#111111] shadow-2xl">
                    <div className="px-4 sm:px-8 py-8 border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 bg-white/5 rounded-2xl flex items-center justify-center shrink-0 border border-white/10">
                                <Activity className="h-6 w-6 text-white" />
                            </div>
                            <h3 className="text-sm font-black uppercase tracking-[0.3em] text-white">Activity Feed</h3>
                        </div>
                    </div>
                    <CardContent className="p-4 sm:p-6 max-h-[450px] overflow-y-auto scrollbar-hide">
                        {recentActivity.length === 0 ? (
                            <div className="text-center py-20 opacity-40">
                                <Clock className="h-16 w-16 text-white/20 mx-auto mb-4" />
                                <p className="text-xs font-black uppercase tracking-widest text-white/50">No Recent Activity</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {recentActivity.map((log: any) => (
                                    <div key={log.id} className="flex items-center gap-5 p-5 bg-white/[0.02] border border-white/5 rounded-3xl">
                                        <div className={cn(
                                            "h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 border",
                                            log.severity === 'CRITICAL' ? "bg-rose-500/10 border-rose-500/20 text-rose-500" : "bg-white/10 border-white/20 text-white"
                                        )}>
                                            <Activity className="h-5 w-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[11px] font-black text-white uppercase tracking-tight truncate italic">{log.action?.replace(/_/g, ' ')}</p>
                                            <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mt-1 opacity-80 font-sans">{log.user?.fullName || "SYSTEM"}</p>
                                        </div>
                                        <span className="text-[9px] font-black text-white/80 uppercase tracking-widest whitespace-nowrap shrink-0 ml-2">
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
            <Card className="rounded-[40px] border-white/10 bg-[#111111] shadow-2xl p-8">
                <CardContent className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 p-0">
                    <div>
                        <div className="flex items-center gap-4 mb-3">
                            <div className="h-14 w-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center">
                                <ShieldCheck className="h-8 w-8 text-white" />
                            </div>
                            <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Command Center</h3>
                        </div>
                        <p className="text-white/50 text-xs font-black uppercase tracking-widest max-w-xl leading-relaxed">
                            Deploy personnel, report incidents, and manage daily operations from one unified tactical interface.
                        </p>
                    </div>
                    <div className="flex items-center gap-4 flex-wrap">
                        <Button className="bg-white text-black hover:bg-white/90 font-black uppercase tracking-widest italic rounded-2xl px-8 h-12 transition-all shadow-lg shadow-white/5" onClick={() => router.push(`/${agencySlug}/deployments`)}>
                            Mission deploy
                        </Button>
                        <Button variant="outline" className="border-white/10 bg-white/5 text-white font-black uppercase tracking-widest italic rounded-2xl px-8 h-12 transition-all hover:bg-white/10" onClick={() => router.push(`/${agencySlug}/incidents`)}>
                            Threat intel
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
