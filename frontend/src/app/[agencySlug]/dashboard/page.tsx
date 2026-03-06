"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import api from "@/lib/api"
import { motion, AnimatePresence } from "framer-motion"
import {
    Building2,
    Briefcase,
    Users,
    ShieldCheck,
    Plus,
    ArrowRight,
    Activity,
    TrendingUp,
    ChevronRight,
    CalendarDays,
    Target,
    Zap,
    Shield,
    Clock,
    ExternalLink
} from "lucide-react"
import {
    PageHeader,
    StatCard,
    PageLoading,
    DataTable,
    TableRowEmpty,
    StatusBadge
} from "@/components/ui/design-system"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/sonner"
import { useAuthStore } from "@/store/authStore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export default function AgencyDashboard() {
    const { agencySlug } = useParams()
    const router = useRouter()
    const { user: authUser } = useAuthStore()
    const [stats, setStats] = useState({
        clients: 0,
        projects: 0,
        employees: 0,
        pendingLeaves: 0,
        activeDeployments: 0
    })
    const [recentProjects, setRecentProjects] = useState<any[]>([])
    const [recentLogs, setRecentLogs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const fetchData = async () => {
        setLoading(true)
        try {
            const isAdmin = authUser?.role === 'Super Admin' || authUser?.role === 'Agency Admin'
            const hasPerm = (p: string) => isAdmin || authUser?.permissions?.includes(p)

            const [projRes, attRes, logRes, cliRes, empRes, leaveRes] = await Promise.allSettled([
                api.get("/projects"),
                api.get("/attendance?today=true"),
                hasPerm('view_audit_logs') ? api.get("/audit-logs") : Promise.reject('No perm'),
                hasPerm('view_clients') ? api.get("/clients") : Promise.resolve({ data: [] }),
                hasPerm('view_employee') ? api.get("/employees") : Promise.resolve({ data: [] }),
                hasPerm('view_leaves') ? api.get("/leaves") : Promise.resolve({ data: [] }),
            ])

            const projects = projRes.status === 'fulfilled' ? projRes.value.data : []
            const attendance = attRes.status === 'fulfilled' ? attRes.value.data : []
            const logs = logRes.status === 'fulfilled' ? logRes.value.data : []
            const clients = cliRes.status === 'fulfilled' ? cliRes.value.data : []
            const employees = empRes.status === 'fulfilled' ? empRes.value.data : []
            const leaves = leaveRes.status === 'fulfilled' ? leaveRes.value.data : []

            setRecentProjects(projects.slice(0, 5))
            setRecentLogs(logs.slice(0, 5))

            setStats({
                clients: clients.length,
                projects: projects.length,
                employees: employees.length,
                pendingLeaves: leaves.filter((l: any) => l.status === 'PENDING').length,
                activeDeployments: attendance.filter((a: any) => a.status === 'PRESENT').length
            })
        } catch (error) {
            toast.error("Failed to load dashboard.")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (authUser) fetchData()
    }, [authUser])

    if (loading) return <PageLoading message="Loading Dashboard..." />

    return (
        <div className="space-y-10 pb-20">
            <PageHeader
                title="Agency"
                titleHighlight="Overview"
                subtitle={`Quick overview and monitoring for ${authUser?.agencyName || agencySlug}.`}
                action={
                    <div className="flex items-center gap-3">
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-none font-black text-[10px] uppercase tracking-widest px-4 py-2 animate-pulse">
                            System Active
                        </Badge>
                    </div>
                }
            />

            <div className="grid gap-6 md:grid-cols-4 lg:grid-cols-5">
                <StatCard title="Total Clients" value={stats.clients} icon={<Building2 />} color="teal" />
                <StatCard title="Active Sites" value={stats.projects} icon={<Target />} color="violet" />
                <StatCard title="Staff on Duty" value={stats.activeDeployments} icon={<Zap />} color="emerald" />
                <StatCard title="Total Employees" value={stats.employees} icon={<Users />} color="blue" />
                <StatCard title="Pending Leaves" value={stats.pendingLeaves} icon={<CalendarDays />} color="amber" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 space-y-10">
                    <div>
                        <div className="flex items-center justify-between mb-8 px-2">
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                                <Activity className="h-5 w-5 text-primary" />
                                Recent Projects
                            </h2>
                            <Button variant="ghost" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-all" asChild>
                                <Link href={`/${agencySlug}/projects`}>Full Portfolio <ArrowRight className="h-3 w-3 ml-2" /></Link>
                            </Button>
                        </div>

                        <div className="space-y-4">
                            {recentProjects.length === 0 ? (
                                <div className="bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-200 p-20 flex flex-col items-center">
                                    <div className="h-20 w-20 bg-white rounded-full flex items-center justify-center shadow-lg border border-slate-100 mb-6">
                                        <Briefcase className="h-8 w-8 text-slate-300" />
                                    </div>
                                    <h4 className="text-xl font-black text-slate-900">No Projects Found</h4>
                                    <p className="text-slate-500 font-medium max-w-xs text-center mt-2">Initialize your first security project to begin monitoring.</p>
                                    <Button className="mt-8 bg-slate-950 rounded-2xl h-12 px-8 font-black uppercase text-[10px] tracking-widest shadow-xl" onClick={() => router.push(`/${agencySlug}/projects`)}>
                                        Add Project
                                    </Button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {recentProjects.map((project) => (
                                        <div key={project.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/50 group hover:-translate-y-1 transition-all">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="h-12 w-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-500">
                                                    <Building2 className="h-6 w-6" />
                                                </div>
                                                <Badge className="bg-emerald-50/50 text-emerald-600 border-none font-black text-[9px] uppercase tracking-widest px-3 py-1">Verified Site</Badge>
                                            </div>
                                            <h4 className="font-extrabold text-slate-900 text-lg tracking-tight mb-1 group-hover:text-primary transition-colors">{project.name}</h4>
                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-6">ID: {project.id.slice(-6).toUpperCase()}</p>
                                            <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active</span>
                                                </div>
                                                <Button size="icon" variant="ghost" className="h-10 w-10 rounded-xl hover:bg-slate-50" asChild>
                                                    <Link href={`/${agencySlug}/projects`}><ExternalLink className="h-4 w-4 text-slate-400" /></Link>
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-slate-950 rounded-[40px] p-10 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2 rotate-12 group-hover:bg-primary/20 transition-all duration-1000" />
                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-10">
                            <div>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="h-10 w-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/10 backdrop-blur-md">
                                        <ShieldCheck className="h-5 w-5 text-primary" />
                                    </div>
                                    <h3 className="text-xl font-black text-white uppercase tracking-tight">System Audit Logs</h3>
                                </div>
                                <p className="text-slate-400 font-medium max-w-md leading-relaxed">
                                    View detailed audit logs and activity history to ensure operational standards.
                                </p>
                            </div>
                            <Button className="h-14 px-10 rounded-2xl bg-white text-slate-950 hover:bg-primary hover:text-white font-black uppercase tracking-widest transition-all shadow-2xl" onClick={() => router.push(`/${agencySlug}/audit-logs`)}>
                                View Logs
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="space-y-10">
                    <div>
                        <div className="flex items-center justify-between mb-8 px-2">
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Recent Activity</h2>
                        </div>
                        <div className="space-y-4">
                            {recentLogs.map((log, idx) => (
                                <div key={log.id} className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center gap-4 group cursor-pointer" onClick={() => router.push(`/${agencySlug}/audit-logs`)}>
                                    <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm", log.severity === 'CRITICAL' ? "bg-red-50 text-red-600" : "bg-teal-50 text-teal-600")}>
                                        <Shield className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <p className="text-[10px] font-black text-slate-900 group-hover:text-primary transition-colors uppercase tracking-tight truncate pr-4">{log.action}</p>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase whitespace-nowrap">{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{log.user?.fullName || "SYSTEM"}</p>
                                    </div>
                                </div>
                            ))}
                            {recentLogs.length === 0 && (
                                <div className="text-center py-10">
                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] italic">No recent activity found.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-slate-50 p-8 rounded-[40px] border border-slate-100 shadow-inner group">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="h-12 w-12 bg-white rounded-2xl shadow-lg border border-slate-100 flex items-center justify-center group-hover:rotate-12 transition-transform duration-500">
                                <Target className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">System Status</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Operational Stats</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {[
                                { label: 'Site Activity', value: 85, color: 'bg-emerald-500' },
                                { label: 'System Status', value: 98, color: 'bg-primary' },
                                { label: 'Staff Capacity', value: 62, color: 'bg-amber-500' },
                            ].map((metric) => (
                                <div key={metric.label} className="space-y-2">
                                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest px-1">
                                        <span className="text-slate-500">{metric.label}</span>
                                        <span className="text-slate-900">{metric.value}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-white rounded-full overflow-hidden border border-slate-100">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${metric.value}%` }}
                                            transition={{ duration: 1.5, ease: "easeOut" }}
                                            className={cn("h-full rounded-full shadow-lg", metric.color)}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
