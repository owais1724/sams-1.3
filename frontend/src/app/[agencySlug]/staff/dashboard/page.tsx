"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CalendarDays, Users, Clock, TrendingUp, Briefcase, Award, Building2, Wallet } from "lucide-react"
import api from "@/lib/api"
import { toast } from "@/components/ui/sonner"

export default function StaffDashboard() {
  const router = useRouter()
  const { agencySlug } = useParams()
  const [userStats, setUserStats] = useState({
    totalStaff: 0,
    presentToday: 0,
    absentToday: 0,
    onLeave: 0,
    activeProjects: 0,
    completedTasks: 0
  })
  const [recentActivities, setRecentActivities] = useState([])
  const [topPerformers, setTopPerformers] = useState([])
  const [userPermissions, setUserPermissions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      // Fetch user info with permissions
      const userResponse = await api.get('/auth/me')
      const userData = userResponse.data
      const perms = userData.permissions || []
      setUserPermissions(perms)

      const isAdmin = userData?.role === 'Super Admin' || userData?.role === 'Agency Admin'
      const hasPerm = (p: string) => isAdmin || perms.includes(p)

      // Parallel fetching with settled status to avoid blocking
      const [empRes, attRes, projRes, leaveRes] = await Promise.allSettled([
        hasPerm('view_personnel') ? api.get('/employees') : Promise.reject('No permission'),
        hasPerm('view_attendance') ? api.get('/attendance?today=true') : api.get('/attendance?today=true&self=true'), // Staff view own
        hasPerm('view_projects') ? api.get('/projects') : Promise.reject('No permission'),
        hasPerm('view_leaves') ? api.get('/leaves') : Promise.reject('No permission')
      ])

      const employees = empRes.status === 'fulfilled' ? empRes.value.data : []
      const attendance = attRes.status === 'fulfilled' ? attRes.value.data : []
      const projects = projRes.status === 'fulfilled' ? projRes.value.data : []
      const leaves = leaveRes.status === 'fulfilled' ? leaveRes.value.data : []

      // Calculate statistics
      const presentToday = attendance.filter((a: any) => a.status === 'PRESENT').length
      const absentToday = attendance.filter((a: any) => a.status === 'ABSENT').length
      const onLeaveCount = leaves.filter((l: any) =>
        new Date(l.startDate) <= new Date() &&
        new Date(l.endDate) >= new Date() &&
        l.status === 'AGENCY_APPROVED'
      ).length
      const activeProjectsCount = projects.filter((p: any) => p.status === 'ACTIVE' || p.isActive).length

      setUserStats({
        totalStaff: employees.length,
        presentToday,
        absentToday,
        onLeave: onLeaveCount,
        activeProjects: activeProjectsCount,
        completedTasks: 0
      })

      // Set recent activities
      const activities = attendance.slice(0, 4).map((record: any) => ({
        type: record.status === 'PRESENT' ? 'checkin' : 'absent',
        title: `${record.employee?.fullName || 'Personnel'} ${record.status === 'PRESENT' ? 'checked in' : 'marked absent'}`,
        time: new Date(record.checkIn || record.createdAt).toLocaleTimeString(),
        icon: record.status === 'PRESENT' ? 'green' : 'red'
      }))
      setRecentActivities(activities as any)

      // Set personnel list
      const performers = employees.slice(0, 5).map((emp: any) => ({
        name: emp.fullName,
        designation: emp.designation?.name || 'Staff',
        attendance: 'Active',
        projects: (emp.assignedProjects?.length || 0).toString(),
        tasks: '0',
        initials: emp.fullName.split(' ').map((n: any) => n[0]).join('').toUpperCase()
      }))
      setTopPerformers(performers as any)

    } catch (error: any) {
      console.error('Failure in fetchDashboardData:', error)
      toast.error("Cloud synchronization issues. Dashboard might be partial.")
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      title: "Total Staff",
      value: userStats.totalStaff,
      icon: Users,
      color: "bg-blue-100 text-blue-800",
      trend: userStats.totalStaff > 0 ? "Active employees" : "No staff yet"
    },
    {
      title: "Present Today",
      value: userStats.presentToday,
      icon: Clock,
      color: "bg-green-100 text-green-800",
      trend: userStats.totalStaff > 0 ? `${Math.round((userStats.presentToday / userStats.totalStaff) * 100)}% attendance` : "No data"
    },
    {
      title: "On Leave",
      value: userStats.onLeave,
      icon: CalendarDays,
      color: "bg-yellow-100 text-yellow-800",
      trend: userStats.onLeave > 0 ? `${userStats.onLeave} staff members` : "None on leave"
    },
    {
      title: "Active Projects",
      value: userStats.activeProjects,
      icon: Briefcase,
      color: "bg-purple-100 text-purple-800",
      trend: userStats.activeProjects > 0 ? "Ongoing projects" : "No active projects"
    }
  ]

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading dashboard...</div>
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Staff Dashboard</h1>
          <p className="text-gray-600">Welcome back! Here's what's happening at your agency.</p>
        </div>
        <Badge className="bg-green-100 text-green-800">
          System Online
        </Badge>
      </div>

      {/* User Permissions Display */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {userPermissions.length > 0 ? (
              userPermissions.map((permission: string, index: number) => (
                <Badge key={index} className="bg-blue-100 text-blue-800">
                  {permission.replace('_', ' ')}
                </Badge>
              ))
            ) : (
              <p className="text-gray-500">No permissions assigned</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.trend}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Recent Activity</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.length > 0 ? (
                recentActivities.map((activity: any, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className={`w-2 h-2 bg-${activity.icon}-500 rounded-full`}></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.title}</p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Award className="h-5 w-5" />
              <span>Staff Members</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topPerformers.length > 0 ? (
                topPerformers.map((performer: any, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                        {performer.initials}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{performer.name}</p>
                        <p className="text-xs text-gray-500">{performer.designation}</p>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-800">
                      Active
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No staff members found</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {(userPermissions.includes('mark_attendance') || userPermissions.includes('view_attendance')) && (
              <Button variant="outline" className="h-24 flex-col space-y-2 rounded-2xl border-slate-200 hover:border-primary hover:text-primary transition-all shadow-sm" onClick={() => router.push(`/${agencySlug}/attendance`)}>
                <Clock className="h-6 w-6" />
                <span className="text-sm font-bold">Attendance</span>
              </Button>
            )}
            {userPermissions.includes('view_personnel') && (
              <Button variant="outline" className="h-24 flex-col space-y-2 rounded-2xl border-slate-200 hover:border-teal-600 hover:text-teal-600 transition-all shadow-sm" onClick={() => router.push(`/${agencySlug}/employees`)}>
                <Users className="h-6 w-6" />
                <span className="text-sm font-bold">Personnel</span>
              </Button>
            )}
            {userPermissions.includes('view_projects') && (
              <Button variant="outline" className="h-24 flex-col space-y-2 rounded-2xl border-slate-200 hover:border-emerald-600 hover:text-emerald-600 transition-all shadow-sm" onClick={() => router.push(`/${agencySlug}/projects`)}>
                <Briefcase className="h-6 w-6" />
                <span className="text-sm font-bold">Projects</span>
              </Button>
            )}
            {userPermissions.includes('view_clients') && (
              <Button variant="outline" className="h-24 flex-col space-y-2 rounded-2xl border-slate-200 hover:border-blue-600 hover:text-blue-600 transition-all shadow-sm" onClick={() => router.push(`/${agencySlug}/clients`)}>
                <Building2 className="h-6 w-6" />
                <span className="text-sm font-bold">Clients</span>
              </Button>
            )}
            {(userPermissions.includes('view_payroll') || userPermissions.includes('manage_payroll')) && (
              <Button variant="outline" className="h-24 flex-col space-y-2 rounded-2xl border-slate-200 hover:border-amber-600 hover:text-amber-600 transition-all shadow-sm" onClick={() => router.push(`/${agencySlug}/payroll`)}>
                <Wallet className="h-6 w-6" />
                <span className="text-sm font-bold">Payroll</span>
              </Button>
            )}
            {userPermissions.includes('apply_leave') && (
              <Button variant="outline" className="h-24 flex-col space-y-2 rounded-2xl border-slate-200 hover:border-orange-600 hover:text-orange-600 transition-all shadow-sm" onClick={() => router.push(`/${agencySlug}/leaves`)}>
                <CalendarDays className="h-6 w-6" />
                <span className="text-sm font-bold">Leave</span>
              </Button>
            )}
            {userPermissions.includes('view_reports') && (
              <Button variant="outline" className="h-24 flex-col space-y-2 rounded-2xl border-slate-200 hover:border-primary transition-all shadow-sm">
                <TrendingUp className="h-6 w-6" />
                <span className="text-sm font-bold">Analytics</span>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
