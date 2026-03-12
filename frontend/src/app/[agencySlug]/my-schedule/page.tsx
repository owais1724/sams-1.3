"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import api from "@/lib/api"
import {
    Calendar,
    Clock,
    MapPin,
    Shield,
    Users,
    LogIn,
    LogOut,
    CheckCircle2,
    AlertTriangle,
} from "lucide-react"
import {
    PageHeader,
    PageLoading,
    StatCard,
} from "@/components/ui/design-system"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "@/components/ui/sonner"
import { useAuthStore } from "@/store/authStore"
import { cn } from "@/lib/utils"

interface ScheduleDeployment {
    id: string
    startDate: string
    endDate: string
    status: string
    notes?: string
    client: { id: string; name: string; address?: string }
    shift: { id: string; name: string; startTime: string; endTime: string }
    guards: { user: { id: string; fullName: string } }[]
}

interface AttendanceRecord {
    id: string
    deploymentId: string
    checkIn: string | null
    checkOut: string | null
    status: string
}

const statusColors: Record<string, string> = {
    planned: "bg-blue-50 text-blue-700 border-blue-100",
    active: "bg-emerald-50 text-emerald-700 border-emerald-100",
    completed: "bg-slate-100 text-slate-600 border-slate-200",
    cancelled: "bg-rose-50 text-rose-700 border-rose-100",
}

export default function MySchedulePage() {
    const { agencySlug } = useParams()
    const { user } = useAuthStore()
    const [deployments, setDeployments] = useState<ScheduleDeployment[]>([])
    const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceRecord>>({})
    const [loading, setLoading] = useState(true)
    const [checkingIn, setCheckingIn] = useState<string | null>(null)

    const fetchData = async () => {
        try {
            const [depRes, attRes] = await Promise.allSettled([
                api.get("/deployments/my-schedule"),
                api.get("/attendance?today=true"),
            ])
            if (depRes.status === "fulfilled") setDeployments(depRes.value.data)
            if (attRes.status === "fulfilled") {
                const records = attRes.value.data || []
                const map: Record<string, AttendanceRecord> = {}
                records.forEach((r: any) => {
                    if (r.deploymentId) map[r.deploymentId] = r
                })
                setAttendanceMap(map)
            }
        } catch {
            toast.error("Failed to load schedule")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    const handleCheckIn = async (deploymentId: string) => {
        setCheckingIn(deploymentId)
        try {
            await api.post("/attendance/check-in", { deploymentId, method: "WEB" })
            toast.success("Checked in successfully!")
            fetchData()
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message || "Check-in failed"
            toast.error(msg)
        } finally {
            setCheckingIn(null)
        }
    }

    const handleCheckOut = async (deploymentId: string) => {
        setCheckingIn(deploymentId)
        try {
            await api.post("/attendance/check-out", { deploymentId })
            toast.success("Checked out successfully!")
            fetchData()
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message || "Check-out failed"
            toast.error(msg)
        } finally {
            setCheckingIn(null)
        }
    }

    if (loading) return <PageLoading message="Loading Your Schedule..." />

    const now = new Date()
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999)

    // Categorize deployments
    const today: ScheduleDeployment[] = []
    const upcoming: ScheduleDeployment[] = []
    const past: ScheduleDeployment[] = []

    deployments.forEach(d => {
        const start = new Date(d.startDate)
        const end = new Date(d.endDate)

        if (d.status === "cancelled") {
            past.push(d)
        } else if (d.status === "completed" || end < todayStart) {
            past.push(d)
        } else if (start > todayEnd) {
            upcoming.push(d)
        } else {
            // Deployment covers today (start <= today <= end)
            today.push(d)
        }
    })

    return (
        <div className="space-y-10 pb-20">
            <PageHeader
                title="My"
                titleHighlight="Schedule"
                subtitle={`Deployment schedule for ${user?.fullName || "Guard"}.`}
            />

            <div className="grid gap-6 md:grid-cols-3">
                <StatCard title="Today's Deployments" value={today.length} icon={<Shield />} color="emerald" />
                <StatCard title="Upcoming" value={upcoming.length} icon={<Calendar />} color="blue" />
                <StatCard title="Completed" value={past.length} icon={<Clock />} color="slate" />
            </div>

            {/* Today's Deployments */}
            {today.length > 0 && (
                <div>
                    <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-6 flex items-center gap-3 px-2">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        Today&apos;s Assignments
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2">
                        {today.map(dep => (
                            <ScheduleCard
                                key={dep.id}
                                deployment={dep}
                                attendance={attendanceMap[dep.id]}
                                onCheckIn={handleCheckIn}
                                onCheckOut={handleCheckOut}
                                isLoading={checkingIn === dep.id}
                                isToday
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Upcoming Deployments */}
            {upcoming.length > 0 && (
                <div>
                    <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-6 flex items-center gap-3 px-2">
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                        Upcoming Assignments
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2">
                        {upcoming.map(dep => (
                            <ScheduleCard key={dep.id} deployment={dep} />
                        ))}
                    </div>
                </div>
            )}

            {/* Past Deployments */}
            {past.length > 0 && (
                <div>
                    <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-6 flex items-center gap-3 px-2">
                        <div className="h-2 w-2 rounded-full bg-slate-400" />
                        Past Assignments
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2">
                        {past.map(dep => (
                            <ScheduleCard key={dep.id} deployment={dep} />
                        ))}
                    </div>
                </div>
            )}

            {deployments.length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="h-24 w-24 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100 mb-8">
                        <Calendar className="h-10 w-10 text-slate-300" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 mb-2">No Assignments</h3>
                    <p className="text-slate-500 font-medium max-w-sm">
                        You don&apos;t have any deployment assignments yet. Your supervisor will assign you to sites.
                    </p>
                </div>
            )}
        </div>
    )
}

function ScheduleCard({
    deployment,
    attendance,
    onCheckIn,
    onCheckOut,
    isLoading,
    isToday,
}: {
    deployment: ScheduleDeployment
    attendance?: AttendanceRecord
    onCheckIn?: (id: string) => void
    onCheckOut?: (id: string) => void
    isLoading?: boolean
    isToday?: boolean
}) {
    const checkedIn = !!attendance?.checkIn
    const checkedOut = !!attendance?.checkOut
    const canCheckIn = isToday && !checkedIn && deployment.status === "active"
    const canCheckOut = isToday && checkedIn && !checkedOut

    return (
        <Card className="rounded-[28px] border-slate-100 shadow-xl shadow-slate-200/50 hover:-translate-y-1 transition-all overflow-hidden">
            {/* Site header bar */}
            <div className={cn(
                "px-6 py-4 flex items-center justify-between",
                isToday ? "bg-gradient-to-r from-teal-600 to-emerald-600" : "bg-gradient-to-r from-slate-600 to-slate-700"
            )}>
                <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-white/80" />
                    <div>
                        <h4 className="font-black text-white text-lg">{deployment.client.name}</h4>
                        {deployment.client.address && (
                            <p className="text-xs text-white/60">{deployment.client.address}</p>
                        )}
                    </div>
                </div>
                <span className={cn(
                    "inline-flex items-center px-3 py-1 rounded-lg font-bold text-[10px] uppercase tracking-wide border",
                    deployment.status === "active" ? "bg-white/20 text-white border-white/30" :
                    deployment.status === "planned" ? "bg-blue-400/20 text-blue-100 border-blue-300/30" :
                    "bg-white/10 text-white/70 border-white/20"
                )}>
                    {deployment.status}
                </span>
            </div>

            <CardContent className="p-6 space-y-4">
                {/* Shift info */}
                <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl">
                    <div className="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                        <Clock className="h-5 w-5 text-indigo-500" />
                    </div>
                    <div className="flex-1">
                        <p className="font-black text-slate-900 text-sm uppercase tracking-wider">{deployment.shift.name} Shift</p>
                        <p className="text-sm text-slate-500 font-medium">{deployment.shift.startTime} – {deployment.shift.endTime}</p>
                    </div>
                </div>

                {/* Date range */}
                <div className="flex items-center gap-3 text-sm px-1">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-600 font-medium">
                        {new Date(deployment.startDate).toLocaleDateString()} – {new Date(deployment.endDate).toLocaleDateString()}
                    </span>
                </div>

                {/* Guard count */}
                <div className="flex items-center gap-3 text-sm px-1">
                    <Users className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-600 font-medium">
                        {deployment.guards.length} guard{deployment.guards.length !== 1 ? "s" : ""} on this deployment
                    </span>
                </div>

                {/* Attendance status for today */}
                {isToday && (
                    <div className="pt-2 border-t border-slate-100 space-y-3">
                        {/* Status indicator */}
                        {attendance ? (
                            <div className={cn(
                                "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold",
                                checkedOut ? "bg-slate-50 text-slate-600" :
                                attendance.status === "LATE" ? "bg-amber-50 text-amber-700" :
                                "bg-emerald-50 text-emerald-700"
                            )}>
                                {checkedOut ? (
                                    <><CheckCircle2 className="h-4 w-4" /> Shift completed</>
                                ) : attendance.status === "LATE" ? (
                                    <><AlertTriangle className="h-4 w-4" /> Late arrival — checked in at {new Date(attendance.checkIn!).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</>
                                ) : (
                                    <><CheckCircle2 className="h-4 w-4" /> On duty — checked in at {new Date(attendance.checkIn!).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-50 text-orange-600 text-sm font-bold">
                                <AlertTriangle className="h-4 w-4" /> Not checked in yet
                            </div>
                        )}

                        {/* Check-in / Check-out buttons */}
                        <div className="flex gap-2">
                            {canCheckIn && (
                                <Button
                                    onClick={() => onCheckIn?.(deployment.id)}
                                    disabled={isLoading}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-11 font-bold"
                                >
                                    <LogIn className="h-4 w-4 mr-2" />
                                    {isLoading ? "Checking In..." : "Check In"}
                                </Button>
                            )}
                            {canCheckOut && (
                                <Button
                                    onClick={() => onCheckOut?.(deployment.id)}
                                    disabled={isLoading}
                                    variant="outline"
                                    className="flex-1 border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl h-11 font-bold"
                                >
                                    <LogOut className="h-4 w-4 mr-2" />
                                    {isLoading ? "Checking Out..." : "Check Out"}
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
