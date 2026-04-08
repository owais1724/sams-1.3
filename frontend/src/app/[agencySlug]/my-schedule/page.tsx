"use client"

import { useEffect, useState } from "react"
import { useAuthStore } from "@/store/authStore"
import { useRouter, useParams } from "next/navigation"
import api from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, MapPin, Shield, AlertCircle } from "lucide-react"
import { toast } from "@/components/ui/sonner"

export default function MySchedulePage() {
    const { user } = useAuthStore()
    const router = useRouter()
    const { agencySlug } = useParams()
    const [deployments, setDeployments] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // ✅ Dynamic RBAC: Any user with employeeId can access this page
        // No hardcoded role names - completely dynamic
        const isStaffUser = Boolean(user?.employeeId);
        
        if (user && !isStaffUser) {
            console.warn(`[My Schedule] Access denied - no employeeId for user: ${user.email}`)
            toast.error("Unauthorized access. You have been logged out.")
            api.post('/auth/logout').catch(() => {})
            router.push(`/${agencySlug}/login`)
            return
        }
        
        fetchMySchedule()
    }, [user, router, agencySlug])

    const fetchMySchedule = async () => {
        try {
            setLoading(true)
            const response = await api.get('/deployments/my-schedule')
            setDeployments(response.data)
        } catch (error: any) {
            console.error('Failed to fetch schedule:', error)
            toast.error('Failed to load your schedule')
        } finally {
            setLoading(false)
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-green-500/10 text-green-600 border-green-500/20'
            case 'planned': return 'bg-blue-500/10 text-blue-600 border-blue-500/20'
            case 'completed': return 'bg-gray-500/10 text-gray-600 border-gray-500/20'
            case 'cancelled': return 'bg-red-500/10 text-red-600 border-red-500/20'
            default: return 'bg-gray-500/10 text-gray-600 border-gray-500/20'
        }
    }

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        })
    }

    const getTodayDeployments = () => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        return deployments.filter(d => {
            const start = new Date(d.startDate)
            start.setHours(0, 0, 0, 0)
            return start.getTime() === today.getTime() && d.status === 'active'
        })
    }

    const getUpcomingDeployments = () => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        return deployments.filter(d => {
            const start = new Date(d.startDate)
            start.setHours(0, 0, 0, 0)
            return start > today && (d.status === 'planned' || d.status === 'active')
        })
    }

    const todayDeployments = getTodayDeployments()
    const upcomingDeployments = getUpcomingDeployments()
    const hasVisibleSchedule = todayDeployments.length > 0 || upcomingDeployments.length > 0

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-muted-foreground">Loading your schedule...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-foreground">My Schedule</h1>
                <p className="text-muted-foreground mt-2">
                    Deployment schedule for {user?.fullName}
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-l-4 border-l-green-500">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Today's Deployments</p>
                                <p className="text-3xl font-bold text-foreground mt-2">{todayDeployments.length}</p>
                            </div>
                            <Shield className="h-10 w-10 text-green-500 opacity-20" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Upcoming</p>
                                <p className="text-3xl font-bold text-foreground mt-2">{upcomingDeployments.length}</p>
                            </div>
                            <Calendar className="h-10 w-10 text-blue-500 opacity-20" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Active</p>
                                <p className="text-3xl font-bold text-foreground mt-2">
                                    {deployments.filter(d => d.status === 'active').length}
                                </p>
                            </div>
                            <MapPin className="h-10 w-10 text-purple-500 opacity-20" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Today's Assignments */}
            {todayDeployments.length > 0 && (
                <div>
                    <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        Today's Assignments
                    </h2>
                    <div className="grid gap-4">
                        {todayDeployments.map((deployment) => (
                            <Card key={deployment.id} className="border-l-4 border-l-green-500 bg-green-500/5">
                                <CardContent className="pt-6">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 space-y-3">
                                            <div className="flex items-center gap-3">
                                                <MapPin className="h-5 w-5 text-green-600" />
                                                <h3 className="text-lg font-bold text-foreground">{deployment.client.name}</h3>
                                                <Badge className={getStatusColor(deployment.status)}>
                                                    {deployment.status.toUpperCase()}
                                                </Badge>
                                            </div>
                                            
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Clock className="h-4 w-4" />
                                                <span className="font-semibold text-foreground">{deployment.shift.name}</span>
                                                <span>•</span>
                                                <span>{deployment.shift.startTime} - {deployment.shift.endTime}</span>
                                            </div>

                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Calendar className="h-4 w-4" />
                                                <span>{formatDate(deployment.startDate)} - {formatDate(deployment.endDate)}</span>
                                            </div>

                                            {deployment.client.address && (
                                                <p className="text-sm text-muted-foreground">
                                                    📍 {deployment.client.address}
                                                </p>
                                            )}

                                            {deployment.notes && (
                                                <p className="text-sm text-muted-foreground italic">
                                                    Note: {deployment.notes}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Upcoming Deployments */}
            {upcomingDeployments.length > 0 && (
                <div>
                    <h2 className="text-xl font-bold text-foreground mb-4">Upcoming Deployments</h2>
                    <div className="grid gap-4">
                        {upcomingDeployments.map((deployment) => (
                            <Card key={deployment.id}>
                                <CardContent className="pt-6">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 space-y-3">
                                            <div className="flex items-center gap-3">
                                                <MapPin className="h-5 w-5 text-primary" />
                                                <h3 className="text-lg font-bold text-foreground">{deployment.client.name}</h3>
                                                <Badge className={getStatusColor(deployment.status)}>
                                                    {deployment.status.toUpperCase()}
                                                </Badge>
                                            </div>
                                            
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Clock className="h-4 w-4" />
                                                <span className="font-semibold text-foreground">{deployment.shift.name}</span>
                                                <span>•</span>
                                                <span>{deployment.shift.startTime} - {deployment.shift.endTime}</span>
                                            </div>

                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Calendar className="h-4 w-4" />
                                                <span>{formatDate(deployment.startDate)} - {formatDate(deployment.endDate)}</span>
                                            </div>

                                            {deployment.client.address && (
                                                <p className="text-sm text-muted-foreground">
                                                    📍 {deployment.client.address}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!hasVisibleSchedule && (
                <Card>
                    <CardContent className="pt-12 pb-12">
                        <div className="flex flex-col items-center justify-center text-center">
                            <AlertCircle className="h-16 w-16 text-muted-foreground/50 mb-4" />
                            <h3 className="text-lg font-semibold text-foreground mb-2">No Schedule Available</h3>
                            <p className="text-sm text-muted-foreground max-w-md">
                                You have no deployments scheduled for today or upcoming dates.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
