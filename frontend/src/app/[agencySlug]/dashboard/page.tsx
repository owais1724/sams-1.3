"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import api from "@/lib/api"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { motion } from "framer-motion"
import { Building2, Briefcase, Users, ShieldCheck, Plus, ArrowRight, Activity, TrendingUp, ChevronRight, CalendarDays } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/sonner"

export default function AgencyDashboard() {
    const { agencySlug } = useParams()
    const [stats, setStats] = useState({
        clients: 0,
        projects: 0,
        employees: 0,
        pendingLeaves: 0
    })
    const [recentProjects, setRecentProjects] = useState<any[]>([])
    const [pendingLeaves, setPendingLeaves] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoading(true)
            try {
                const [clientsRes, projectsRes, employeesRes, leavesRes] = await Promise.all([
                    api.get("/clients"),
                    api.get("/projects"),
                    api.get("/employees"),
                    api.get("/leaves")
                ])

                const clients = clientsRes.data || []
                const projects = projectsRes.data || []
                const employees = employeesRes.data || []
                const leaves = leavesRes.data || []

                const pending = leaves.filter((l: any) => l.status !== 'AGENCY_APPROVED' && l.status !== 'REJECTED')

                setStats({
                    clients: clients.length,
                    projects: projects.length,
                    employees: employees.length,
                    pendingLeaves: pending.length
                })
                setRecentProjects(projects.slice(0, 5))
                setPendingLeaves(pending.slice(0, 5))
            } catch (e) {
                console.error("Dashboard data fetch failed", e)
            } finally {
                setLoading(false)
            }
        }
        fetchDashboardData()
    }, [])

    const cards = [
        {
            title: "Total Clients",
            value: stats.clients,
            icon: Building2,
            color: "text-teal-600",
            bg: "bg-teal-50/50",
            border: "border-teal-100",
            trend: "+2 this month",
            href: `/${agencySlug}/clients`
        },
        {
            title: "Active Projects",
            value: stats.projects,
            icon: Briefcase,
            color: "text-emerald-600",
            bg: "bg-emerald-50/50",
            border: "border-emerald-100",
            trend: "All on track",
            href: `/${agencySlug}/projects`
        },
        {
            title: "Security Employees",
            value: stats.employees,
            icon: Users,
            color: "text-teal-700",
            bg: "bg-teal-50/50",
            border: "border-teal-100",
            trend: "3 in training",
            href: `/${agencySlug}/employees`
        },
        {
            title: "Pending Leaves",
            value: stats.pendingLeaves,
            icon: CalendarDays,
            color: "text-orange-600",
            bg: "bg-orange-50/50",
            border: "border-orange-100",
            trend: "Action required",
            href: `/${agencySlug}/leaves`
        },
    ]



    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    }

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
                <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-500 font-bold animate-pulse uppercase tracking-widest text-xs">Synchronizing Intelligence</p>
            </div>
        )
    }

    return (
        <motion.div
            className="space-y-6 sm:space-y-10 max-w-[1600px] mx-auto pb-20"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <motion.div variants={itemVariants}>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Agency Active</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
                        Operations <span className="text-primary">Command</span>
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">Global overview for <span className="text-slate-900 font-bold uppercase underline decoration-primary/30 decoration-4 underline-offset-4">{agencySlug}</span></p>
                </motion.div>
            </div>



            {/* Stats Grid — 2 cols on mobile, 4 on large screens */}
            <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
                {cards.map((card, idx) => (
                    <motion.div key={card.title} variants={itemVariants}>
                        <Link href={card.href}>
                            <Card className={cn("border-none shadow-xl shadow-slate-200/50 rounded-2xl sm:rounded-3xl overflow-hidden group hover:-translate-y-1 transition-all duration-300 cursor-pointer", card.bg)}>
                                <CardHeader className="flex flex-row items-center justify-between pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                                    <div className={cn("p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-white shadow-sm group-hover:scale-110 transition-transform duration-500", card.color)}>
                                        <card.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                                    </div>
                                    <div className="hidden sm:flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-white/50 px-3 py-1 rounded-full">
                                        <TrendingUp className="h-3 w-3" />
                                        {card.trend}
                                    </div>
                                </CardHeader>
                                <CardContent className="mt-1 px-3 sm:px-6 pb-3 sm:pb-6">
                                    <div className="text-[10px] sm:text-sm font-bold text-slate-500 tracking-wide uppercase truncate">{card.title}</div>
                                    <div className="text-2xl sm:text-4xl font-extrabold text-slate-900 mt-1">{card.value}</div>
                                </CardContent>
                            </Card>
                        </Link>
                    </motion.div>
                ))}
            </div>

            {/* Main Content Area */}
            <div className="grid gap-6 sm:gap-10 lg:grid-cols-3">
                <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
                    <Card className="border-none shadow-xl shadow-slate-200/50 rounded-2xl sm:rounded-3xl p-4 sm:p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-base sm:text-xl font-bold text-slate-800 flex items-center gap-2">
                                <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                                Deployment Analytics
                            </h3>
                        </div>

                        {recentProjects.length === 0 ? (
                            <div className="bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 p-8 sm:p-16 flex flex-col items-center text-center">
                                <div className="h-14 w-14 sm:h-20 sm:w-20 bg-white rounded-full flex items-center justify-center shadow-lg border border-slate-100 mb-4">
                                    <Briefcase className="h-6 w-6 sm:h-8 sm:w-8 text-slate-300" />
                                </div>
                                <h4 className="text-base sm:text-lg font-bold text-slate-800">Intelligence Stream Offline</h4>
                                <p className="text-slate-500 text-xs sm:text-sm max-w-xs mt-2 font-medium">Connect your first project and employee to see live deployment metrics.</p>
                                <Link href={`/${agencySlug}/projects`}>
                                    <Button className="mt-6 bg-slate-800 rounded-xl px-6 py-4 font-bold hover:scale-105 transition-all text-sm">Launch Monitoring</Button>
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {recentProjects.map((project, idx) => (
                                    <div key={project.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-100 group hover:border-primary/30 transition-all gap-2 sm:gap-0">
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 sm:h-12 sm:w-12 bg-white rounded-xl flex items-center justify-center shadow-sm font-black text-primary shrink-0 text-sm">
                                                0{idx + 1}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h4 className="font-bold text-slate-900 group-hover:text-primary transition-colors truncate text-sm sm:text-base">{project.name}</h4>
                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">ID: {project.id.slice(0, 8).toUpperCase()}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-none pt-2 sm:pt-0">
                                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 shadow-none px-3 py-1 rounded-lg font-bold text-[10px] whitespace-nowrap">
                                                {project.status || 'ACTIVE'}
                                            </Badge>
                                            <Link href={`/${agencySlug}/projects`}>
                                                <Button variant="ghost" size="icon" className="rounded-xl h-8 w-8 sm:h-10 sm:w-10 hover:bg-white hover:shadow-md transition-all">
                                                    <ChevronRight className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                                <Button variant="ghost" className="w-full py-4 sm:py-6 text-slate-400 font-bold hover:text-primary transition-colors text-sm" asChild>
                                    <Link href={`/${agencySlug}/projects`}>
                                        View All Operational Units <ArrowRight className="h-4 w-4 ml-2" />
                                    </Link>
                                </Button>
                            </div>
                        )}
                    </Card>
                </motion.div>

                <motion.div variants={itemVariants} className="space-y-6">
                    <Card className="border-none shadow-xl shadow-slate-200/50 rounded-3xl p-6 bg-slate-900 text-white overflow-hidden relative">
                        {/* Decorative Background */}
                        <div className="absolute -right-20 -top-20 h-64 w-64 bg-primary/20 rounded-full blur-3xl" />

                        <h3 className="text-xl font-bold mb-6 relative z-10">Security Pulse</h3>

                        <div className="space-y-5 relative z-10">
                            <div className="flex items-center p-4 bg-white/5 rounded-2xl border border-white/10">
                                <div className="h-10 w-10 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center mr-4">
                                    <ShieldCheck className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold">All Systems Nominal</p>
                                    <span className="text-[10px] text-slate-400 font-medium">Last scan 2m ago</span>
                                </div>
                            </div>

                            <div className="flex items-center p-4 bg-white/5 rounded-2xl border border-white/10 opacity-70">
                                <div className="h-10 w-10 bg-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center mr-4">
                                    <Users className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold">Employee Sync Completed</p>
                                    <span className="text-[10px] text-slate-400 font-medium tracking-wide">3 new staff assigned</span>
                                </div>
                            </div>
                        </div>

                        <Link href={`/${agencySlug}/audit-logs`}>
                            <Button variant="ghost" className="w-full mt-8 border border-white/10 text-white hover:bg-white/10 rounded-xl py-6 font-bold transition-all active:scale-95">
                                View Audit Logs
                            </Button>
                        </Link>
                    </Card>

                    <Card className="border-none shadow-xl shadow-slate-200/50 rounded-3xl p-6">
                        <h3 className="text-xl font-bold text-slate-800 mb-6">Critical Alerts</h3>
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                            <div className="h-16 w-16 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mb-4 animate-bounce">
                                <ShieldCheck className="h-8 w-8" />
                            </div>
                            <p className="text-sm font-bold text-slate-800">Clear Skies</p>
                            <p className="text-xs text-slate-500 font-medium mt-1">No operational breaches detected in the last 24 hours.</p>
                        </div>
                    </Card>
                </motion.div>
            </div>
        </motion.div>
    )
}
