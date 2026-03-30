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
        teal: "bg-emerald-50 text-emerald-600 border-emerald-100",
        rose: "bg-rose-50 text-rose-600 border-rose-100",
        amber: "bg-amber-50 text-amber-600 border-amber-100",
        blue: "bg-blue-50 text-blue-600 border-blue-100"
    }

    return (
        <Card className="overflow-hidden border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow rounded-2xl">
            <CardContent className="p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">{title}</p>
                        <h4 className="text-2xl font-bold text-slate-900 tracking-tight">{value}</h4>
                    </div>
                    <div className={cn("p-3 rounded-xl border", colorMap[color])}>
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
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

    const fetchData = async () => {
        try {
            const isAdmin = authUser?.role === 'Agency Admin' || authUser?.role === 'Super Admin'
            const hasPerm = (p: string) => isAdmin || authUser?.permissions?.includes(p)

            const [
                deployRes,
                attnSumRes,
                incRes,
                dutyRes,
                actRes,
                cliRes,
                empRes
            ] = await Promise.allSettled([
                api.get("/dashboard/today-deployments"),
                api.get("/dashboard/attendance-summary"),
                api.get("/dashboard/open-incidents"),
                api.get("/dashboard/guards-on-duty"),
                api.get("/dashboard/recent-activity"),
                hasPerm('view_clients') ? api.get("/clients") : Promise.resolve({ data: [] }),
                hasPerm('view_employee') ? api.get("/employees") : Promise.resolve({ data: [] }),
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

            setLastUpdated(new Date())
        } catch {
            toast.error("Failed to load dashboard.")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (authUser) {
            // Strictly prevent Staff roles from viewing the Agency Admin dashboard
            const staffRoles = ['Supervisor', 'Guard', 'HR', 'Staff'];
            if (staffRoles.includes(authUser.role as string)) {
                console.log('[Agency Dashboard] Access denied. Redirecting staff to staff dashboard.');
                router.replace(`/${agencySlug}/staff/dashboard`);
                return;
            }

            setLoading(true)
            fetchData()
        }
    }, [authUser, router, agencySlug])

    // Auto-refresh every 30 seconds
    useEffect(() => {
        if (!authUser) return

        const interval = setInterval(() => {
            fetchData()
        }, 30000) // 30 seconds

        return () => clearInterval(interval)
    }, [authUser])

    if (loading) return <PageLoading message="Synchronizing Interface..." />

    const sevLabel = (s: number) => ["", "Low", "Medium", "High", "Critical"][s] || "Unknown"

    return (
        <div className="space-y-8 pb-10">
            <PageHeader
                title="Agency"
                titleHighlight="Command"
                subtitle={`Operational Control Center for ${authUser?.agencyName || agencySlug}. Systems live.`}
                action={
                    <div className="flex items-center gap-3">
                        {lastUpdated && (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg">
                                <Clock className="h-3.5 w-3.5 text-slate-500" />
                                <span className="text-[10px] font-medium text-slate-600 uppercase tracking-wider">
                                    {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </span>
                            </div>
                        )}
                        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-full shadow-sm">
                            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                                Live
                            </span>
                        </div>
                    </div>
                }
            />

            {/* ── Stat Cards ── */}
            <div className="grid gap-4 grid-cols-2 sm:gap-6 md:grid-cols-3 lg:grid-cols-5">
                <StatCard title="Active Missions" value={stats.activeDeployments} icon={<Target className="h-5 w-5" />} color="teal" />
                <StatCard title="Guards on Duty" value={stats.guardsOnDuty} icon={<ShieldCheck className="h-5 w-5" />} color="teal" />
                <StatCard title="Open Incidents" value={stats.openIncidents} icon={<AlertTriangle className="h-5 w-5" />} color="rose" />
                <StatCard title="Total Clients" value={stats.clients} icon={<Building2 className="h-5 w-5" />} color="teal" />
                <StatCard title="Total Personnel" value={stats.employees} icon={<Users className="h-5 w-5" />} color="teal" />
            </div>

            {/* ── Panel 1: Attendance Summary ── */}
            <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-white shadow-sm rounded-xl flex items-center justify-center border border-slate-200">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        </div>
                        <h3 className="text-[15px] font-bold text-slate-900 uppercase tracking-wider">Attendance Summary</h3>
                    </div>
                </div>
                <CardContent className="p-8">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                        <div className="text-center p-6 bg-slate-50/50 border border-slate-100 rounded-2xl">
                            <p className="text-3xl font-bold text-emerald-600">{stats.attendanceSummary.present}</p>
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-2">Present</p>
                        </div>
                        <div className="text-center p-6 bg-slate-50/50 border border-slate-100 rounded-2xl">
                            <p className="text-3xl font-bold text-amber-600">{stats.attendanceSummary.late}</p>
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-2">Late</p>
                        </div>
                        <div className="text-center p-6 bg-slate-50/50 border border-slate-100 rounded-2xl">
                            <p className="text-3xl font-bold text-rose-600">{stats.attendanceSummary.absent}</p>
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-2">Absent</p>
                        </div>
                        <div className="text-center p-6 bg-slate-50/50 border border-slate-100 rounded-2xl">
                            <p className="text-3xl font-bold text-slate-900">{stats.attendanceSummary.total}</p>
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-2">Total</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* ── Panel 2: Today's Active Deployments ── */}
                <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 bg-white shadow-sm rounded-xl flex items-center justify-center border border-slate-200">
                                <MapPin className="h-5 w-5 text-blue-600" />
                            </div>
                            <h3 className="text-[15px] font-bold text-slate-900 uppercase tracking-wider">Active Missions</h3>
                        </div>
                        <Badge variant="outline" className="bg-white text-slate-600 border-slate-200 font-bold px-3 py-1">{todayDeployments.length}</Badge>
                    </div>
                    <CardContent className="p-6 max-h-[450px] overflow-y-auto custom-scrollbar">
                        {todayDeployments.length === 0 ? (
                            <div className="text-center py-20 opacity-40">
                                <CalendarDays className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Zero Active Deployments</p>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {todayDeployments.map((dep: any) => (
                                    <div key={dep.id} className="flex items-center gap-4 p-4 bg-slate-50 hover:bg-slate-100/80 transition-colors border border-slate-100 rounded-xl group">
                                        <div className="h-10 w-10 bg-white rounded-lg flex items-center justify-center shrink-0 border border-slate-200 shadow-sm">
                                            <Building2 className="h-5 w-5 text-slate-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-slate-900 text-[15px] truncate">{dep.client?.name}</p>
                                            <p className="text-[11px] font-medium text-slate-500 mt-0.5 truncate uppercase tracking-tight">
                                                {dep.shift?.name} • {dep.shift?.startTime} – {dep.shift?.endTime}
                                            </p>
                                        </div>
                                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 uppercase text-[9px] font-bold px-2 py-0.5">{dep.status}</Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* ── Panel 3: Guards on Duty ── */}
                <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 bg-white shadow-sm rounded-xl flex items-center justify-center border border-slate-200">
                                <Shield className="h-5 w-5 text-indigo-600" />
                            </div>
                            <h3 className="text-[15px] font-bold text-slate-900 uppercase tracking-wider">Live Personnel</h3>
                        </div>
                        <Badge variant="outline" className="bg-white text-slate-600 border-slate-200 font-bold px-3 py-1">{guardsOnDutyList.length}</Badge>
                    </div>
                    <CardContent className="p-6 max-h-[450px] overflow-y-auto custom-scrollbar">
                        {guardsOnDutyList.length === 0 ? (
                            <div className="text-center py-20 opacity-40">
                                <Users className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">No Personnel In Field</p>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {guardsOnDutyList.map((g: any, i: number) => (
                                    <div key={i} className="flex items-center gap-4 p-4 bg-slate-50 hover:bg-slate-100/80 transition-colors border border-slate-100 rounded-xl">
                                        <div className="h-10 w-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center font-bold text-indigo-600 text-[13px] shadow-sm">
                                            {g.name?.charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-slate-900 text-[15px] truncate">{g.name}</p>
                                            <p className="text-[11px] font-medium text-slate-500 mt-0.5 truncate uppercase tracking-tight">
                                                {g.location || "On-Site"} • <span className="text-emerald-600 font-bold">IN: {new Date(g.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 border border-emerald-100 rounded-lg">
                                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            <span className="text-[9px] font-bold text-emerald-600 uppercase">Live</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* ── Panel 4: Open Incidents ── */}
                <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 bg-white shadow-sm rounded-xl flex items-center justify-center border border-slate-200">
                                <AlertTriangle className="h-5 w-5 text-rose-600" />
                            </div>
                            <h3 className="text-[15px] font-bold text-slate-900 uppercase tracking-wider">Breach Reports</h3>
                        </div>
                    </div>
                    <CardContent className="p-6 max-h-[450px] overflow-y-auto custom-scrollbar">
                        {recentIncidents.length === 0 ? (
                            <div className="text-center py-20 opacity-40">
                                <ShieldCheck className="h-12 w-12 text-emerald-500/40 mx-auto mb-3" />
                                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">All Sectors Secure</p>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {recentIncidents.map((inc: any) => (
                                    <div key={inc.id} className="flex items-center gap-4 p-4 bg-slate-50 hover:bg-slate-100/80 transition-colors border border-slate-100 rounded-xl">
                                        <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0 border shadow-sm", 
                                            inc.severity >= 3 ? "bg-rose-50 border-rose-100 text-rose-600" : "bg-amber-50 border-amber-100 text-amber-600")}>
                                            <AlertTriangle className="h-4 w-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-slate-900 text-[15px] truncate">{inc.title}</p>
                                            <p className="text-[11px] font-medium text-slate-500 mt-0.5 truncate uppercase tracking-tight">
                                                {inc.reporter?.fullName} • {sevLabel(inc.severity)}
                                            </p>
                                        </div>
                                        <Badge variant="secondary" className="bg-slate-200/50 text-slate-600 border border-slate-200 text-[9px] uppercase font-bold">{inc.status}</Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* ── Panel 5: Recent Activity Feed ── */}
                <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 bg-white shadow-sm rounded-xl flex items-center justify-center border border-slate-200">
                                <Activity className="h-5 w-5 text-slate-600" />
                            </div>
                            <h3 className="text-[15px] font-bold text-slate-900 uppercase tracking-wider">Mission Logs</h3>
                        </div>
                    </div>
                    <CardContent className="p-6 max-h-[450px] overflow-y-auto custom-scrollbar">
                        {recentActivity.length === 0 ? (
                            <div className="text-center py-20 opacity-40">
                                <Clock className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">No Recent Logs</p>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {recentActivity.map((log: any) => (
                                    <div key={log.id} className="flex items-center gap-4 p-4 bg-slate-50 hover:bg-slate-100/80 transition-colors border border-slate-100 rounded-xl">
                                        <div className={cn(
                                            "h-10 w-10 rounded-lg flex items-center justify-center shrink-0 border shadow-sm",
                                            log.severity === 'CRITICAL' ? "bg-rose-50 border-rose-100 text-rose-600" : "bg-blue-50 border-blue-100 text-blue-600"
                                        )}>
                                            <Activity className="h-4 w-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[12px] font-bold text-slate-900 uppercase tracking-tight truncate">{log.action?.replace(/_/g, ' ')}</p>
                                            <p className="text-[10px] font-medium text-slate-500 mt-1 uppercase tracking-wider">{log.user?.fullName || "SYSTEM CONTROL"}</p>
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-400 tabular-nums">
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
            <Card className="rounded-3xl border border-slate-200 bg-white shadow-xl p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <ShieldCheck className="h-32 w-32 text-slate-900" />
                </div>
                <CardContent className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 p-0 relative z-10">
                    <div>
                        <div className="flex items-center gap-4 mb-4">
                            <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Mission Control Center</h3>
                        </div>
                        <p className="text-slate-700 text-sm max-w-xl leading-relaxed font-medium">
                            Manage your tactical personnel, monitor real-time deployments, and respond to breaches from a single unified operational dashboard.
                        </p>
                    </div>
                    <div className="flex items-center gap-4 flex-wrap">
                        <Button className="bg-slate-100 text-slate-900 hover:bg-cyan-500 hover:text-white font-bold px-8 h-12 rounded-xl transition-all shadow-lg" onClick={() => router.push(`/${agencySlug}/deployments`)}>
                            Deploy Personnel
                        </Button>
                        <Button variant="outline" className="border-slate-300 bg-white text-slate-900 hover:bg-cyan-500 hover:text-white hover:border-cyan-500 font-bold px-8 h-12 rounded-xl transition-all" onClick={() => router.push(`/${agencySlug}/incidents`)}>
                            Review Intel
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
