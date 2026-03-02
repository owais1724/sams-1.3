"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Calendar, Clock, Users, CheckCircle2, XCircle, AlertCircle, Camera, MapPin, Building2 } from "lucide-react"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuthStore } from "@/store/authStore"
import api from "@/lib/api"
import { toast } from "@/components/ui/sonner"

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

    useEffect(() => {
        fetchData()
    }, [user])

    const fetchData = async () => {
        setLoading(true)
        try {
            // Fetch Attendance
            const attendanceRes = await api.get(`/attendance?today=true`)
            const data = attendanceRes.data || []
            setAttendanceData(data)

            // If person can mark attendance, find "my" record for today
            if (canMark && user) {
                const myRecord = data.find((a: any) => a.employee?.userId === user.id || (user.employeeId && a.employeeId === user.employeeId))
                setMyStatus(myRecord)
            }

            // Fetch Projects (for check-in)
            if (canMark) {
                const projectsRes = await api.get('/projects')
                setProjects(projectsRes.data || [])
            }
        } catch (error: any) {
            console.error("Failed to fetch attendance:", error)
            toast.error("Failed to load attendance data")
        } finally {
            setLoading(false)
        }
    }

    const handleCheckIn = async () => {
        if (!selectedProject) {
            toast.error("Please select a project first")
            return
        }

        setIsChecking(true)
        try {
            const res = await api.post('/attendance/check-in', {
                projectId: selectedProject,
                method: 'WEB'
            })
            toast.success("Checked in successfully!")
            fetchData()
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Check-in failed")
        } finally {
            setIsChecking(false)
        }
    }

    const handleCheckOut = async () => {
        setIsChecking(true)
        try {
            await api.post('/attendance/check-out', {})
            toast.success("Checked out successfully!")
            fetchData()
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Check-out failed")
        } finally {
            setIsChecking(false)
        }
    }

    const stats = {
        present: attendanceData.filter(a => a.status === 'PRESENT').length,
        late: attendanceData.filter(a => a.status === 'LATE').length,
        absent: 0, // Logic for absent will be implemented later (no check-in by cut-off)
        total: attendanceData.length
    }

    if (loading && attendanceData.length === 0) {
        return <div className="p-8 text-center animate-pulse text-slate-400 font-bold uppercase tracking-widest text-[10px]">Synchronizing Attendance Data...</div>
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex-1 min-w-0">
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight truncate">Attendance Management</h1>
                    <p className="text-[10px] md:text-sm text-slate-500 truncate">Track and manage daily work hours.</p>
                </div>
            </div>

            {/* Attendance Action Section (Visible to anyone with mark_attendance permission) */}
            {canMark && (
                <Card className="border-none bg-blue-50/50 rounded-[40px] shadow-xl shadow-blue-100/20 overflow-hidden">
                    <CardHeader className="bg-blue-600/5 px-8 py-6 border-b border-blue-100/50">
                        <CardTitle className="flex items-center text-blue-900 font-black uppercase text-xs tracking-[0.2em]">
                            <Clock className="h-4 w-4 mr-3" />
                            Attendance Protocol
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-10">
                        <div className="flex flex-col md:flex-row items-center gap-8">
                            {!myStatus ? (
                                <>
                                    <div className="w-full md:w-80">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block ml-1">Select Work Site</label>
                                        <Select onValueChange={setSelectedProject}>
                                            <SelectTrigger className="h-14 rounded-2xl border-slate-200 bg-white">
                                                <SelectValue placeholder="Identification Required" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-2xl border-slate-200">
                                                {projects.map(p => (
                                                    <SelectItem key={p.id} value={p.id} className="rounded-xl font-bold">{p.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button
                                        onClick={handleCheckIn}
                                        disabled={isChecking}
                                        className="h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white px-10 font-bold shadow-lg shadow-emerald-100 mt-6 md:mt-0"
                                    >
                                        {isChecking ? "Authenticating..." : "CHECK-IN RECORD"}
                                    </Button>
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center mt-6 md:mt-0">
                                        <MapPin className="h-4 w-4 mr-2 text-primary" />
                                        Bio-Metric & GPS Active
                                    </div>
                                </>
                            ) : !myStatus.checkOut ? (
                                <>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3">
                                            <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
                                            <p className="text-emerald-900 font-black text-xl tracking-tight uppercase">Operational Duty Active</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-8 mt-4">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Entry Timestamp</span>
                                                <span className="font-bold text-slate-900">{new Date(myStatus.checkIn).toLocaleTimeString()}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Assigned Perimeter</span>
                                                <span className="font-bold text-slate-900">{myStatus.project?.name || "Global Command"}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        onClick={handleCheckOut}
                                        disabled={isChecking}
                                        className="h-14 rounded-2xl bg-slate-900 hover:bg-red-600 text-white px-10 font-bold shadow-lg transition-all"
                                    >
                                        {isChecking ? "Logging..." : "TERMINATE SHIFT"}
                                    </Button>
                                </>
                            ) : (
                                <div className="flex items-center text-emerald-700 bg-white px-8 py-6 rounded-3xl border border-emerald-100 shadow-sm w-full">
                                    <CheckCircle2 className="h-8 w-8 mr-4 text-emerald-500" />
                                    <div>
                                        <span className="font-black uppercase tracking-widest text-lg">Shift Completed</span>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                                            Exit Log: {new Date(myStatus.checkOut).toLocaleTimeString()} • Cycle Logged
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Stats Cards (Admin/HR Only) */}
            {(isAdmin || isHR) && (
                <div className="grid gap-6 md:grid-cols-4">
                    <div className="p-6 bg-white border border-slate-100 rounded-[32px] flex items-center shadow-xl shadow-slate-200/50">
                        <div className="h-12 w-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mr-4">
                            <CheckCircle2 className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Present</div>
                            <div className="text-2xl font-black text-slate-900 leading-none mt-1">{stats.present}</div>
                        </div>
                    </div>

                    <div className="p-6 bg-white border border-slate-100 rounded-[32px] flex items-center shadow-xl shadow-slate-200/50">
                        <div className="h-12 w-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mr-4">
                            <AlertCircle className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Late</div>
                            <div className="text-2xl font-black text-slate-900 leading-none mt-1">{stats.late}</div>
                        </div>
                    </div>

                    <div className="p-6 bg-white border border-slate-100 rounded-[32px] flex items-center shadow-xl shadow-slate-200/50">
                        <div className="h-12 w-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mr-4">
                            <XCircle className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Absent</div>
                            <div className="text-2xl font-black text-slate-900 leading-none mt-1">{stats.absent}</div>
                        </div>
                    </div>

                    <div className="p-6 bg-white border border-slate-100 rounded-[32px] flex items-center shadow-xl shadow-slate-200/50 text-primary">
                        <div className="h-12 w-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mr-4">
                            <Users className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="text-[10px] font-black text-primary uppercase tracking-widest">Reporting</div>
                            <div className="text-2xl font-black leading-none mt-1">{stats.total}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Today's Attendance Table (Always visible to Admin/HR, Staff sees their status) */}
            <div className="bg-white rounded-[40px] border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden">
                <div className="bg-slate-50/50 p-6 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-lg font-black text-slate-900 flex items-center uppercase tracking-tight">
                        <Calendar className="h-5 w-5 mr-3 text-primary" />
                        Daily Operations Log — {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </h2>
                    {(isAdmin || isHR) && (
                        <Badge className="bg-primary/10 text-primary border-none font-black text-[10px] uppercase tracking-widest px-3 py-1">
                            Full Portfolio View
                        </Badge>
                    )}
                </div>
                <div className="overflow-x-auto">
                    <Table className="min-w-[900px] lg:min-w-full">
                        <TableHeader className="bg-slate-50/50 border-b border-slate-100">
                            <TableRow className="h-14">
                                <TableHead className="px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">Personnel Profile</TableHead>
                                <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Professional Rank</TableHead>
                                <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Deployment Site</TableHead>
                                <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Check-In</TableHead>
                                <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Check-Out</TableHead>
                                <TableHead className="text-right px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">Operational Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {attendanceData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-12 text-slate-400 italic">No attendance records for today.</TableCell>
                                </TableRow>
                            ) : (
                                attendanceData.map((record) => (
                                    <TableRow key={record.id} className="group border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                        <TableCell className="px-8 py-6">
                                            <div className="flex items-center">
                                                <Avatar className="h-10 w-10 mr-4 border-2 border-slate-100">
                                                    <AvatarFallback className="text-[10px] font-black bg-slate-100">
                                                        {record.employee?.fullName?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || '??'}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className="font-extrabold text-slate-900 group-hover:text-primary transition-colors">{record.employee?.fullName}</div>
                                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID: {record.employee?.id?.slice(-6).toUpperCase() || "N/A"}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className="bg-slate-100 text-slate-700 border-none shadow-none font-black text-[10px] px-3 py-1 rounded-full uppercase">
                                                {record.employee?.designation?.name || 'FRONT-LINE'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm font-bold text-slate-700">
                                                {record.project?.name || "UNASSIGNED"}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center text-sm font-bold text-slate-900">
                                                <Clock className="h-3.5 w-3.5 mr-2 text-slate-400" />
                                                {record.checkIn ? new Date(record.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center text-sm font-bold text-slate-900">
                                                <Clock className="h-3.5 w-3.5 mr-2 text-slate-400" />
                                                {record.checkOut ? new Date(record.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right px-8">
                                            {record.status === "PRESENT" && (
                                                <Badge className="bg-emerald-50 text-emerald-700 border-none shadow-none font-black text-[10px] px-3 py-1 rounded-full uppercase">
                                                    Operational
                                                </Badge>
                                            )}
                                            {record.status === "LATE" && (
                                                <Badge className="bg-amber-50 text-amber-700 border-none shadow-none font-black text-[10px] px-3 py-1 rounded-full uppercase">
                                                    Delayed
                                                </Badge>
                                            )}
                                            {record.status === "ABSENT" && (
                                                <Badge className="bg-red-50 text-red-700 border-none shadow-none font-black text-[10px] px-3 py-1 rounded-full uppercase">
                                                    Missing
                                                </Badge>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    )
}
