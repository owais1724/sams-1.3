"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Calendar, Clock, Users, CheckCircle2, XCircle, AlertCircle, MapPin, Building2, Activity, Shield, Camera } from "lucide-react"
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
import { AttendanceCheckIn } from "@/components/common/AttendanceCheckIn"
import { useAuthStore } from "@/store/authStore"
import api from "@/lib/api"
import { toast } from "@/components/ui/sonner"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

export default function AttendancePage() {
    const { agencySlug } = useParams()
    const { user } = useAuthStore()
    const [loading, setLoading] = useState(true)
    const [attendanceData, setAttendanceData] = useState<any[]>([])
    const [projects, setProjects] = useState<any[]>([])
    const [activeDeployments, setActiveDeployments] = useState<any[]>([])
    const [selectedProject, setSelectedProject] = useState<string>("")
    const [selectedDeployment, setSelectedDeployment] = useState<string>("")
    const [isChecking, setIsChecking] = useState(false)
    const [attendanceCheckInOpen, setAttendanceCheckInOpen] = useState(false)

    // Does this user have active deployments today?
    const hasDeployments = activeDeployments.length > 0

    const isStaff = user?.role?.toLowerCase().includes('staff') || user?.role?.toLowerCase().includes('guard')
    const isAdmin = user?.role?.toLowerCase().includes('admin')
    const isHR = user?.role?.toLowerCase().includes('hr') || user?.role?.toLowerCase().includes('human resource')
    const canMark = user?.permissions?.includes('mark_attendance') || isStaff || isHR || isAdmin

    const fetchData = async () => {
        setLoading(true)
        try {
            const [attendanceRes, projectsRes, deploymentsRes] = await Promise.all([
                api.get(`/attendance?today=true`),
                canMark ? api.get('/projects') : Promise.resolve({ data: [] }),
                canMark ? api.get('/deployments/my-schedule').catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
            ])

            const data = attendanceRes.data || []
            setAttendanceData(data)

            // Check for active deployments today
            const today = new Date()
            const myDeployments = (deploymentsRes.data || []).filter((d: any) => {
                if (d.status !== 'active') return false
                const start = new Date(d.startDate)
                const end = new Date(d.endDate)
                start.setHours(0, 0, 0, 0)
                end.setHours(23, 59, 59, 999)
                return today >= start && today <= end
            })
            setActiveDeployments(myDeployments)
            
            // Filter projects - for staff, show only assigned projects
            let filteredProjects = projectsRes.data || []
            if (isStaff && user?.employeeId) {
                filteredProjects = filteredProjects.filter((p: any) => 
                    p.assignedEmployees?.some((emp: any) => emp.id === user.employeeId)
                )
            }
            setProjects(filteredProjects)

            // Don't set myStatus here - will be calculated based on selected project
        } catch (error: any) {
            toast.error("Failed to load attendance data.")
        } finally {
            setLoading(false)
        }
    }

    // Calculate attendance status for selected site (project or deployment)
    const getAttendanceStatus = () => {
        if (!user) return null
        if (hasDeployments) {
            if (!selectedDeployment) return null
            return attendanceData.find((a: any) => 
                a.deploymentId === selectedDeployment && 
                (a.employee?.userId === user.id || (user.employeeId && a.employeeId === user.employeeId))
            )
        }
        if (!selectedProject) return null
        return attendanceData.find((a: any) => 
            a.projectId === selectedProject && 
            (a.employee?.userId === user.id || (user.employeeId && a.employeeId === user.employeeId))
        )
    }

    const myStatus = getAttendanceStatus()
    const selectedSite = hasDeployments ? selectedDeployment : selectedProject

    useEffect(() => {
        if (user) fetchData()
    }, [user])

    const handleCheckOut = async () => {
        if (!selectedSite) {
            toast.error(hasDeployments ? "Please select a deployment first." : "Please select a project first.")
            return
        }
        
        setIsChecking(true)
        try {
            await api.post('/attendance/check-out', 
                hasDeployments ? { deploymentId: selectedDeployment } : { projectId: selectedProject }
            )
            toast.success("Check-out recorded.")
            fetchData()
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Check-out failed.")
        } finally {
            setIsChecking(false)
        }
    }

    // Deduplicate attendance stats by employee (worst status wins: ABSENT > LATE > PRESENT)
    const statusPriority: Record<string, number> = { ABSENT: 3, LATE: 2, PRESENT: 1 }
    const employeeStatusMap = new Map<string, string>()
    for (const a of attendanceData) {
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
    const stats = {
        present: uniqueStatuses.filter(s => s === 'PRESENT').length,
        late: uniqueStatuses.filter(s => s === 'LATE').length,
        absent: uniqueStatuses.filter(s => s === 'ABSENT').length,
        total: employeeStatusMap.size
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
                    <div className="bg-slate-900 rounded-[38px] p-5 sm:p-10 relative z-10 border border-white/5">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-10">
                            <div className="flex-1 space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/20 backdrop-blur-md">
                                        <Clock className="h-5 w-5 text-primary" />
                                    </div>
                                    <h2 className="text-2xl font-black text-white tracking-tight uppercase">Check-In / Out</h2>
                                </div>
                                <p className="text-slate-400 text-sm font-bold pr-10 leading-relaxed italic opacity-80">
                                    {selectedSite && myStatus?.checkOut
                                        ? "Shift completed for this site. Select another site to mark attendance."
                                        : (selectedSite && myStatus && !myStatus.checkOut ? "Active shift in progress." : (hasDeployments ? "Select your deployment to check in." : "Select your project site to check in."))}
                                </p>
                            </div>

                            <div className="flex flex-col md:flex-row items-center gap-5 w-full md:w-auto">
                                {/* Always show project selector */}
                                <div className="w-full md:w-72">
                                    {hasDeployments ? (
                                        <Select value={selectedDeployment} onValueChange={setSelectedDeployment}>
                                            <SelectTrigger className="h-14 rounded-2xl bg-white/5 border-white/10 text-white focus:text-slate-900 font-black uppercase text-[11px] tracking-widest backdrop-blur-md focus:ring-primary/20">
                                                <SelectValue placeholder="SELECT DEPLOYMENT" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-[28px] border-white/10 bg-slate-900 shadow-2xl p-2">
                                                {activeDeployments.map(d => (
                                                    <SelectItem key={d.id} value={d.id} className="py-4 font-black uppercase text-[10px] tracking-widest rounded-xl text-white/70 focus:bg-white/10 focus:text-white data-[state=checked]:text-white data-[state=checked]:bg-white/5 transition-all cursor-pointer">
                                                        {d.client?.name || d.clientId} — {d.shift?.name || 'Shift'}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <Select value={selectedProject} onValueChange={setSelectedProject}>
                                            <SelectTrigger className="h-14 rounded-2xl bg-white/5 border-white/10 text-white focus:text-slate-900 font-black uppercase text-[11px] tracking-widest backdrop-blur-md focus:ring-primary/20">
                                                <SelectValue placeholder="SELECT YOUR SITE" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-[28px] border-white/10 bg-slate-900 shadow-2xl p-2">
                                                {projects.map(p => (
                                                    <SelectItem key={p.id} value={p.id} className="py-4 font-black uppercase text-[10px] tracking-widest rounded-xl text-white/70 focus:bg-white/10 focus:text-white data-[state=checked]:text-white data-[state=checked]:bg-white/5 transition-all cursor-pointer">
                                                        {p.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                </div>

                                {/* Show appropriate button based on selected project status */}
                                {selectedSite && myStatus && !myStatus.checkOut ? (
                                    // Already checked in, show check out
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
                                ) : selectedSite && myStatus?.checkOut ? (
                                    // Completed shift
                                    <div className="flex items-center gap-6 bg-white/5 border border-white/10 px-10 py-5 rounded-[32px] backdrop-blur-xl shadow-2xl">
                                        <div className="h-12 w-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
                                            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                                        </div>
                                        <div className="text-left">
                                            <div className="text-[11px] font-black text-emerald-500 uppercase tracking-[0.2em]">Shift Completed</div>
                                            <div className="text-lg font-black text-white italic">{new Date(myStatus.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} Logged</div>
                                        </div>
                                    </div>
                                ) : selectedSite ? (
                                    // No attendance yet, show check in button
                                    <Button
                                        onClick={() => {
                                            setAttendanceCheckInOpen(true)
                                        }}
                                        disabled={isChecking}
                                        className="h-16 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-16 font-black uppercase text-sm tracking-[0.2em] shadow-2xl shadow-emerald-500/30 transition-all w-full md:w-auto active:scale-95 flex items-center gap-3"
                                    >
                                        <Camera className="h-6 w-6" />
                                        MARK ATTENDANCE
                                    </Button>
                                ) : null}
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
                            <TableRowEmpty colSpan={5} title="No Records For Today" icon={<Activity />} />
                        ) : (
                            attendanceData.map((record, idx) => (
                                <motion.tr
                                    key={record.id}
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.2, delay: idx * 0.02 }}
                                    className="group hover:bg-slate-50/50 transition-colors"
                                >
                                    <TableCell className="px-4 sm:px-4 sm:px-8 py-4 sm:py-5 sm:py-6">
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
                                            <span className="text-[13px] font-black text-slate-900 tracking-tight">{record.project?.name || record.deployment?.client?.name || "General"}</span>
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
                                    <TableCell className="text-right px-4 sm:px-8">
                                        <StatusBadge status={record.status} />
                                    </TableCell>
                                </motion.tr>
                            ))
                        )}
                    </AnimatePresence>
                </DataTable>
            </div>

            {/* Attendance Check-In Flow (Photo → QR → GPS) - For all roles */}
            {canMark && (
                <AttendanceCheckIn
                    open={attendanceCheckInOpen}
                    onOpenChange={setAttendanceCheckInOpen}
                    onSuccess={fetchData}
                    {...(hasDeployments ? {
                        deploymentId: selectedDeployment,
                        projectName: activeDeployments.find(d => d.id === selectedDeployment)?.client?.name,
                        projectLocation: activeDeployments.find(d => d.id === selectedDeployment)?.client?.address,
                    } : {
                        projectId: selectedProject,
                        projectName: projects.find(p => p.id === selectedProject)?.name,
                        projectLocation: projects.find(p => p.id === selectedProject)?.location,
                    })}
                />
            )}
        </div>
    )
}
