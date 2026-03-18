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
    const canMark = user?.permissions?.includes('record_attendance') || isStaff || isHR || isAdmin

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
                <div className="bg-white rounded-xl p-5 sm:p-6 relative z-10 border border-border shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
                    <div className="relative">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-10">
                            <div className="flex-1 space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 bg-cyan-50 rounded-xl flex items-center justify-center border border-cyan-100">
                                        <Clock className="h-5 w-5 text-cyan-700" />
                                    </div>
                                    <h2 className="text-[20px] font-semibold text-slate-900">Check-in / out</h2>
                                </div>
                                <p className="text-slate-600 text-sm pr-10 leading-relaxed">
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
                                            <SelectTrigger className="h-12 rounded-xl bg-white border border-border text-slate-900 focus:ring-primary/20">
                                                <SelectValue placeholder="SELECT DEPLOYMENT" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-border bg-white shadow-lg p-2">
                                                {activeDeployments.map(d => (
                                                    <SelectItem key={d.id} value={d.id} className="py-3 font-medium rounded-lg">
                                                        {d.client?.name || d.clientId} — {d.shift?.name || 'Shift'}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <Select value={selectedProject} onValueChange={setSelectedProject}>
                                            <SelectTrigger className="h-12 rounded-xl bg-white border border-border text-slate-900 focus:ring-primary/20">
                                                <SelectValue placeholder="SELECT YOUR SITE" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-border bg-white shadow-lg p-2">
                                                {projects.map(p => (
                                                    <SelectItem key={p.id} value={p.id} className="py-3 font-medium rounded-lg">
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
                                        <div className="text-right hidden md:block border-r border-border pr-8">
                                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 px-0.5">Checked In At</div>
                                            <div className="text-xl font-bold text-slate-900">{new Date(myStatus.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                        </div>
                                        <Button
                                            onClick={handleCheckOut}
                                            disabled={isChecking}
                                            variant="destructive"
                                            className="h-12 rounded-xl px-8 w-full md:w-auto"
                                        >
                                            {isChecking ? "LOADING..." : "CHECK OUT"}
                                        </Button>
                                    </div>
                                ) : selectedSite && myStatus?.checkOut ? (
                                    // Completed shift
                                    <div className="flex items-center gap-4 bg-green-50 border border-green-200 px-6 py-4 rounded-xl">
                                        <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center border border-green-200">
                                            <CheckCircle2 className="h-5 w-5 text-green-700" />
                                        </div>
                                        <div className="text-left">
                                            <div className="text-[12px] font-semibold text-green-700">Shift completed</div>
                                            <div className="text-[14px] font-medium text-slate-700">{new Date(myStatus.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} logged</div>
                                        </div>
                                    </div>
                                ) : selectedSite ? (
                                    // No attendance yet, show check in button
                                    <Button
                                        onClick={() => {
                                            setAttendanceCheckInOpen(true)
                                        }}
                                        disabled={isChecking}
                                        variant="primary"
                                        className="h-12 rounded-xl px-8 w-full md:w-auto flex items-center gap-2"
                                    >
                                        <Camera className="h-5 w-5" />
                                        Mark attendance
                                    </Button>
                                ) : null}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                <StatCard title="Present" value={stats.present} icon={<CheckCircle2 className="text-green-700" />} color="emerald" />
                <StatCard title="Late" value={stats.late} icon={<Clock className="text-orange-700" />} color="orange" />
                <StatCard title="Absent" value={stats.absent} icon={<XCircle className="text-red-700" />} color="rose" />
                <StatCard title="Total Staff" value={stats.total} icon={<Users className="text-sky-700" />} color="blue" />
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
                                    className="group"
                                >
                                    <TableCell className="py-4">
                                        <div className="flex items-center gap-4">
                                            <Avatar className="h-12 w-12 rounded-xl border border-border shadow-sm transition-transform group-hover:scale-105">
                                                <AvatarFallback className="bg-slate-100 text-slate-700 font-semibold text-xs uppercase">
                                                    {record.employee?.fullName?.split(' ').map((n: string) => n[0]).join('') || '?'}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0">
                                                <div className="font-semibold text-slate-900 truncate">{record.employee?.fullName}</div>
                                                <div className="text-[12px] text-slate-500 mt-1">Designation: {record.employee?.designation?.name || "Employee"}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="h-8 w-8 rounded-lg bg-slate-50 border border-border flex items-center justify-center">
                                                <Building2 className="h-3.5 w-3.5 text-slate-500" />
                                            </div>
                                            <span className="text-[14px] font-medium text-slate-700">{record.project?.name || record.deployment?.client?.name || "General"}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center text-[14px] font-medium text-slate-700">
                                            <Clock className="h-3.5 w-3.5 mr-2.5 text-slate-400" />
                                            {record.checkIn ? new Date(record.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : "--:--"}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center text-[14px] font-medium text-slate-700">
                                            <Clock className="h-3.5 w-3.5 mr-2.5 text-slate-400" />
                                            {record.checkOut ? new Date(record.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : "--:--"}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
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
