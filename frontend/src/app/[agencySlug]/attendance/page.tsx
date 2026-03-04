"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Calendar, Clock, Users, CheckCircle2, XCircle, AlertCircle, MapPin, Building2, Activity, Shield } from "lucide-react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
    PageHeader,
    StatCard,
    DataTable,
    PageLoading,
    StatusBadge,
    TableRowEmpty,
    SubmitButton
} from "@/components/ui/design-system"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuthStore } from "@/store/authStore"
import api from "@/lib/api"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export default function AttendancePage() {
    const { agencySlug } = useParams()
    const { user } = useAuthStore()
    const [loading, setLoading] = useState(true)
    const [attendanceData, setAttendanceData] = useState<any[]>([])
    const [projects, setProjects] = useState<any[]>([])
    const [selectedProject, setSelectedProject] = useState<string>("")
    const [myStatus, setMyStatus] = useState<any>(null)
    const [isChecking, setIsChecking] = useState(false)

    const isStaff = user?.role?.toLowerCase().includes('staff') || user?.role?.toLowerCase().includes('guard')
    const isAdmin = user?.role?.toLowerCase().includes('admin')
    const isHR = user?.role?.toLowerCase().includes('hr') || user?.role?.toLowerCase().includes('human resource')
    const canMark = user?.permissions?.includes('mark_attendance') || isStaff || isHR || isAdmin

    const fetchData = async () => {
        setLoading(true)
        try {
            const [attendanceRes, projectsRes] = await Promise.all([
                api.get(`/attendance?today=true`),
                canMark ? api.get('/projects') : Promise.resolve({ data: [] })
            ])

            const data = attendanceRes.data || []
            setAttendanceData(data)
            setProjects(projectsRes.data || [])

            if (canMark && user) {
                const myRecord = data.find((a: any) => a.employee?.userId === user.id || (user.employeeId && a.employeeId === user.employeeId))
                setMyStatus(myRecord)
            }
        } catch (error: any) {
            toast.error("Roster synchronization protocol failed.")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (user) fetchData()
    }, [user])

    const handleCheckIn = async () => {
        if (!selectedProject) {
            toast.error("Operational site identification required.")
            return
        }

        setIsChecking(true)
        try {
            await api.post('/attendance/check-in', {
                projectId: selectedProject,
                method: 'WEB'
            })
            toast.success("Operational deployment recorded.")
            fetchData()
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Check-in protocol rejected.")
        } finally {
            setIsChecking(false)
        }
    }

    const handleCheckOut = async () => {
        setIsChecking(true)
        try {
            await api.post('/attendance/check-out', {})
            toast.success("Shift termination logged.")
            fetchData()
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Check-out protocol rejected.")
        } finally {
            setIsChecking(false)
        }
    }

    const stats = {
        present: attendanceData.filter(a => a.status === 'PRESENT').length,
        late: attendanceData.filter(a => a.status === 'LATE').length,
        absent: attendanceData.filter(a => a.status === 'ABSENT').length,
        total: attendanceData.length
    }

    if (loading && attendanceData.length === 0) return <PageLoading message="Synchronizing Attendance Matrix..." />

    return (
        <div className="space-y-8 pb-20">
            <PageHeader
                title="Personnel"
                titleHighlight="Attendance"
                subtitle="Monitoring and authorization of daily operational deployment."
            />

            {/* Attendance Matrix Controls */}
            {canMark && (
                <div className="bg-slate-950 rounded-[40px] p-1 shadow-2xl overflow-hidden relative group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2 group-hover:bg-primary/20 transition-all duration-700" />
                    <div className="bg-slate-900 rounded-[38px] p-10 relative z-10 border border-white/5">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-10">
                            <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/20">
                                        <Clock className="h-4 w-4 text-primary" />
                                    </div>
                                    <h2 className="text-xl font-black text-white tracking-tight uppercase">Operational Protocol</h2>
                                </div>
                                <p className="text-slate-400 text-sm font-medium pr-10 leading-relaxed italic">
                                    {myStatus?.checkOut
                                        ? "Shift cycle completed. Deployment status offline."
                                        : (!myStatus ? "Verification required for site deployment." : "Active duty cycle in progress. Monitoring GPS node.")}
                                </p>
                            </div>

                            <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                                {!myStatus ? (
                                    <>
                                        <div className="w-full md:w-64">
                                            <Select onValueChange={setSelectedProject}>
                                                <SelectTrigger className="h-14 rounded-2xl bg-white/5 border-white/10 text-white font-bold backdrop-blur-md">
                                                    <SelectValue placeholder="Identify Site" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-2xl border-white/10 bg-slate-900 text-white shadow-2xl">
                                                    {projects.map(p => (
                                                        <SelectItem key={p.id} value={p.id} className="py-3 font-bold hover:bg-white/10">{p.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <Button
                                            onClick={handleCheckIn}
                                            disabled={isChecking}
                                            className="h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white px-10 font-bold shadow-xl shadow-primary/20 transition-all w-full md:w-auto"
                                        >
                                            {isChecking ? "Authenticating..." : "CHECK-IN RECORD"}
                                        </Button>
                                    </>
                                ) : !myStatus.checkOut ? (
                                    <div className="flex items-center gap-6">
                                        <div className="text-right hidden md:block">
                                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Entry Timestamp</div>
                                            <div className="text-sm font-black text-white">{new Date(myStatus.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                        </div>
                                        <Button
                                            onClick={handleCheckOut}
                                            disabled={isChecking}
                                            className="h-14 rounded-2xl bg-white text-slate-900 hover:bg-red-600 hover:text-white px-10 font-bold shadow-xl transition-all w-full md:w-auto"
                                        >
                                            {isChecking ? "Logging..." : "TERMINATE SHIFT"}
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-4 bg-white/5 border border-white/10 px-8 py-4 rounded-3xl backdrop-blur-md">
                                        <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                                        <div className="text-left">
                                            <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Protocol Secured</div>
                                            <div className="text-sm font-black text-white">{new Date(myStatus.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} Exit Log</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Metrics */}
            <div className="grid gap-6 md:grid-cols-4">
                <StatCard title="Active Deployment" value={stats.present} icon={<CheckCircle2 />} color="emerald" />
                <StatCard title="Delayed Entries" value={stats.late} icon={<Clock />} color="amber" />
                <StatCard title="Missing Nodes" value={stats.absent} icon={<XCircle />} color="red" />
                <StatCard title="Total Roster" value={stats.total} icon={<Users />} color="blue" />
            </div>

            {/* List */}
            <div className="mt-12">
                <div className="flex items-center justify-between mb-8 px-2">
                    <div>
                        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3 uppercase">
                            <Activity className="h-5 w-5 text-primary" />
                            Operational Status Matrix
                        </h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Real-time personnel tracking for {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                    {(isAdmin || isHR) && (
                        <div className="px-4 py-2 bg-primary/5 rounded-2xl border border-primary/10 flex items-center gap-3">
                            <Shield className="h-4 w-4 text-primary" />
                            <span className="text-[10px] font-black text-primary uppercase tracking-widest">Global Watchdog Active</span>
                        </div>
                    )}
                </div>

                <DataTable columns={['Personnel Node', 'Deployment Site', 'Check-In', 'Check-Out', 'Status']}>
                    {attendanceData.length === 0 ? (
                        <TableRowEmpty colSpan={5} title="No Operations Logged" icon={<Activity />} />
                    ) : (
                        attendanceData.map((record, idx) => (
                            <TableRow key={record.id} className="group border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                <TableCell className="px-8 py-6">
                                    <div className="flex items-center gap-4">
                                        <Avatar className="h-10 w-10 md:h-12 md:w-12 rounded-2xl border-2 border-slate-50 group-hover:border-primary/20 transition-all shadow-sm">
                                            <AvatarFallback className="bg-slate-50 text-slate-400 font-black text-xs uppercase">
                                                {record.employee?.fullName?.split(' ').map((n: string) => n[0]).join('') || '?'}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <div className="font-extrabold text-slate-900 group-hover:text-primary transition-colors">{record.employee?.fullName}</div>
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{record.employee?.designation?.name || "STAFF-NODE"}</div>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Building2 className="h-3.5 w-3.5 text-slate-300" />
                                        <span className="text-sm font-bold text-slate-600">{record.project?.name || "GLOBAL"}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center text-sm font-black text-slate-900">
                                        <Clock className="h-3.5 w-3.5 mr-2 text-slate-300" />
                                        {record.checkIn ? new Date(record.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : "-"}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center text-sm font-black text-slate-900">
                                        <Clock className="h-3.5 w-3.5 mr-2 text-slate-300" />
                                        {record.checkOut ? new Date(record.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : "-"}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right px-8">
                                    <StatusBadge status={record.status} />
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </DataTable>
            </div>
        </div>
    )
}
