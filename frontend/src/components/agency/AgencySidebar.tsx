"use client"







import Link from "next/link"



import { useParams, usePathname } from "next/navigation"



import {



    BarChart3,



    Building,



    Briefcase,



    Users,



    Key,



    Clock,



    CalendarDays,



    Wallet,



    ShieldCheck,



    Shield,



    X,



    ChevronsLeft,



    ChevronsRight,



    MapPin,



    AlertTriangle,



    Calendar,



} from "lucide-react"



import { cn } from "@/lib/utils"







import { useAuthStore } from "@/store/authStore"



import { useEffect, useState } from "react"



import api from "@/lib/api"



import { SidebarItem, SidebarLogout, SidebarSectionLabel } from "@/components/ui/design-system"



import { Badge } from "@/components/ui/badge"







interface AgencySidebarProps {



    onItemClick?: () => void



    collapsed?: boolean



    onToggleCollapse?: () => void



}







export function AgencySidebar({ onItemClick, collapsed = false, onToggleCollapse }: AgencySidebarProps) {



    const { agencySlug } = useParams()



    const pathname = usePathname()



    const { user, login, logout } = useAuthStore()



    const [loading, setLoading] = useState(!user)







    const isStaff = user?.role === "staff";



    const sidebarItems = [



        {



            name: "Dashboard",



            href: isStaff ? `/${agencySlug}/staff/dashboard` : `/${agencySlug}/dashboard`,



            icon: BarChart3



        },



        {



            name: "Clients",



            href: `/${agencySlug}/clients`,



            icon: Building,



            permissions: ["view_clients", "create_client"]



        },



        {



            name: "Projects",



            href: `/${agencySlug}/projects`,



            icon: Briefcase,



            permissions: ["view_projects", "create_project"]



        },



        {



            name: "Employees",



            href: `/${agencySlug}/employees`,



            icon: Users,



            permissions: ["view_employee", "create_employee"]



        },



        {



            name: "Access Control",



            href: `/${agencySlug}/rbac`,



            icon: Key,



            permissions: ["manage_roles"]



        },



        {



            name: "Attendance",



            href: `/${agencySlug}/attendance`,



            icon: Clock,



            permissions: ["view_attendance", "record_attendance"]



        },



        {



            name: "Shifts",



            href: `/${agencySlug}/shifts`,



            icon: Shield,



            permissions: ["view_shifts", "manage_shifts"]



        },



        {



            name: "Deployments",



            href: `/${agencySlug}/deployments`,



            icon: MapPin,



            permissions: ["view_deployments", "manage_deployments"]



        },



        {



            name: "Incidents",



            href: `/${agencySlug}/incidents`,



            icon: AlertTriangle,



            permissions: ["view_incidents", "report_incident", "manage_incidents"]



        },



        {



            name: "My Schedule",



            href: `/${agencySlug}/my-schedule`,



            icon: Calendar,



        },



        {



            name: "Leaves",



            href: `/${agencySlug}/leaves`,



            icon: CalendarDays,



            permissions: ["view_leaves", "apply_leave", "approve_leave"]



        },



        {



            name: "Payroll",



            href: `/${agencySlug}/payroll`,



            icon: Wallet,



            permissions: ["view_payroll", "manage_payroll"]



        },



    ];







    return (



        <aside



            className={cn(



                "flex flex-col h-full w-64 bg-gradient-to-b from-slate-900 to-slate-800 border-r border-slate-700 shadow-lg transition-all duration-300",



                collapsed && "w-20 px-2"



            )}



        >



            <div className="flex flex-col gap-2 mt-6">



                {sidebarItems.map(item => (



                    <SidebarItem



                        key={item.name}



                        {...item}



                        collapsed={collapsed}



                        isActive={pathname === item.href}



                    />



                ))}



            </div>



            <div className="mt-auto mb-6">



                <SidebarLogout collapsed={collapsed} onClick={logout} />



            </div>



        </aside>



    }



