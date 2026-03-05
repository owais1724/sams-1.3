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
    SubmitButton,
    SectionHeading
} from "@/components/ui/design-system"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuthStore } from "@/store/authStore"
import api from "@/lib/api"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

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
            toast.error("Project site selection required.")
            return
        }

        setIsChecking(true)
        try {
            await api.post('/attendance/check-in', {
                projectId: selectedProject,
                method: 'WEB'
            })
            toast.success("Check-in recorded.")
            fetchData()
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Check-in failed.")
        } finally {
            setIsChecking(false)
        }
    }

    const handleCheckOut = async () => {
        setIsChecking(true)
        try {
            await api.post('/attendance/check-out', {})
            toast.success("Check-out recorded.")
            fetchData()
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Check-out failed.")
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

    if (loading && attendanceData.length === 0) return <PageLoading message="Synchronizing Attendance..." />

    return (
        <div className="space-y-12 pb-20">
            <PageHeader
                title="Employee"
                titleHighlight="Attendance"
                subtitle="Monitor and manage employee attendance and deployments."
            />

            {/* Attendance Matrix Controls */}
            {canMark && (
                <div className="bg-slate-950 rounded-[40px] p-1 shadow-2xl overflow-hidden relative group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2 group-hover:bg-primary/20 transition-all duration-700" />
                    <div className="bg-slate-900 rounded-[38px] p-10 relative z-10 border border-white/5">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-10">
                            <div className="flex-1 space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/20 backdrop-blur-md">
                                        <Clock className="h-5 w-5 text-primary" />
                                    </div>
                                    <h2 className="text-2xl font-black text-white tracking-tight uppercase">Attendance Protocol</h2>
                                </div>
                                <p className="text-slate-400 text-sm font-bold pr-10 leading-relaxed italic opacity-80">
                                    {myStatus?.checkOut
                                        ? "Shift completed. All metrics logged."
                                        : (!myStatus ? "Please select your project site to check in." : "Active shift in progress.")}
                                </p>
                            </div>

                            <div className="flex flex-col md:flex-row items-center gap-5 w-full md:w-auto">
                                {!myStatus ? (
                                    <>
                                        <div className="w-full md:w-72">
                                            <Select onValueChange={setSelectedProject}>
                                                <SelectTrigger className="h-14 rounded-2xl bg-white/5 border-white/10 text-white font-black uppercase text-[11px] tracking-widest backdrop-blur-md focus:ring-primary/20">
                                                    <SelectValue placeholder="SELECT PROJECT SITE" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-[28px] border-white/10 bg-slate-900 text-white shadow-2xl p-2">
                                                    {projects.map(p => (
                                                        <SelectItem key={p.id} value={p.id} className="py-4 font-black uppercase text-[10px] tracking-widest rounded-xl focus:bg-primary/20 focus:text-primary transition-colors cursor-pointer">{p.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <Button
                                            onClick={handleCheckIn}
                                            disabled={isChecking}
                                            className="h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white px-12 font-black uppercase text-[11px] tracking-[0.2em] shadow-2xl shadow-primary/30 transition-all w-full md:w-auto active:scale-95"
                                        >
                                            {isChecking ? "CHECKING..." : "CHECK IN"}
                                        </Button>
                                    </>
                                ) : !myStatus.checkOut ? (
                                    <div className="flex items-center gap-8">
                                        <div className="text-right hidden md:block border-r border-white/10 pr-8">
                                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 px-0.5">Checked In At</div>
                                            <div className="text-xl font-black text-white italic">{new Date(myStatus.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                        </div>
                                        <Button
                                            onClick={handleCheckOut}
                                            disabled={isChecking}
                                            className="h-14 rounded-2xl bg-white text-slate-900 hover:bg-rose-600 hover:text-white px-12 font-black uppercase text-[11px] tracking-[0.2em] shadow-2xl transition-all w-full md:w-auto active:scale-95 border-none"
                                        >
                                            {isChecking ? "LOADING..." : "CHECK OUT"}
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-6 bg-white/5 border border-white/10 px-10 py-5 rounded-[32px] backdrop-blur-xl shadow-2xl">
                                        <div className="h-12 w-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
                                            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                                        </div>
                                        <div className="text-left">
                                            <div className="text-[11px] font-black text-emerald-500 uppercase tracking-[0.2em]">Shift Completed</div>
                                            <div className="text-lg font-black text-white italic">{new Date(myStatus.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} EXIT_LOG</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard title="Present" value={stats.present} icon={<CheckCircle2 />} color="emerald" />
                <StatCard title="Late" value={stats.late} icon={<Clock />} color="amber" />
                <StatCard title="Absent" value={stats.absent} icon={<XCircle />} color="rose" />
                <StatCard title="Total Staff" value={stats.total} icon={<Users />} color="blue" />
            </div>

            {/* List */}
            <div className="space-y-6 pt-4">
                <SectionHeading
                    title="Attendance History"
                />

                <DataTable columns={['Employee', 'Project Site', 'Check In', 'Check Out', 'Status']}>
                    <AnimatePresence mode="popLayout">
                        {attendanceData.length === 0 ? (
                            <TableRowEmpty colSpan={5} title="No Operations Logged" icon={<Activity />} />
                        ) : (
                            attendanceData.map((record, idx) => (
                                <motion.tr
                                    key={record.id}
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.2, delay: idx * 0.02 }}
                                    className="group hover:bg-slate-50/50 transition-colors"
                                >
                                    <TableCell className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <Avatar className="h-12 w-12 rounded-2xl border-2 border-slate-50 group-hover:border-primary/20 group-hover:scale-110 transition-all shadow-sm">
                                                <AvatarFallback className="bg-gradient-to-tr from-slate-100 to-slate-200 text-slate-500 font-black text-xs uppercase">
                                                    {record.employee?.fullName?.split(' ').map((n: string) => n[0]).join('') || '?'}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0">
                                                <div className="font-extrabold text-slate-900 group-hover:text-primary transition-colors truncate">{record.employee?.fullName}</div>
                                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">DESIGNATION: {record.employee?.designation?.name || "EMPLOYEE"}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="h-8 w-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                                                <Building2 className="h-3.5 w-3.5 text-slate-300" />
                                            </div>
                                            <span className="text-[13px] font-black text-slate-900 tracking-tight">{record.project?.name || "GLOBAL_OPS"}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center text-[13px] font-black text-slate-900 italic">
                                            <Clock className="h-3.5 w-3.5 mr-2.5 text-slate-300" />
                                            {record.checkIn ? new Date(record.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : "--:--"}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center text-[13px] font-black text-slate-900 italic">
                                            <Clock className="h-3.5 w-3.5 mr-2.5 text-slate-300" />
                                            {record.checkOut ? new Date(record.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : "--:--"}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right px-8">
                                        <StatusBadge status={record.status} />
                                    </TableCell>
                                </motion.tr>
                            ))
                        )}
                    </AnimatePresence>
                </DataTable>
            </div>
        </div>
    )
}
