"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import api from "@/lib/api"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Shield, Plus, Key, Users, Trash2 } from "lucide-react"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import { RoleForm } from "@/components/agency/RoleForm"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { toast } from "sonner"

export default function RBACPage() {
    const { agencySlug } = useParams()
    const [roles, setRoles] = useState<any[]>([])
    const [permissions, setPermissions] = useState<any[]>([])
    const [employees, setEmployees] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [open, setOpen] = useState(false)
    const [selectedRole, setSelectedRole] = useState<any>(null)

    const fetchData = async () => {
        try {
            // First, sync roles to designations automatically
            try {
                await api.post("/employees/sync-roles", {})
            } catch (syncError) {
                console.error("Role sync error:", syncError)
            }

            // Then fetch all data
            console.log("Fetching roles...")
            const rolesRes = await api.get("/roles")
            console.log("Roles fetched successfully")

            console.log("Fetching permissions...")
            const permsRes = await api.get("/roles/permissions")
            console.log("Permissions fetched successfully")

            console.log("Fetching employees...")
            const empRes = await api.get("/employees")
            console.log("Employees fetched successfully")

            setRoles(rolesRes.data)
            setPermissions(permsRes.data)
            setEmployees(empRes.data)
        } catch (error: any) {
            const msg = error.response?.data?.message || error.message || "Unknown error"
            console.error("RBAC Fetch Error Detail:", msg)
            toast.error(`RBAC Fetch Failed: ${msg}`)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete the role "${name}"?`)) return
        try {
            await api.delete(`/roles/${id}`)
            toast.success("Role deleted successfully")
            fetchData()
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to delete role")
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    return (
        <div className="space-y-8 pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">Access Control</h1>
                    <p className="text-slate-500 font-medium mt-1">Define authorization matrix and security privileges for your agency infrastructure.</p>
                </div>

                <Sheet open={open} onOpenChange={(val) => {
                    setOpen(val)
                    if (!val) setSelectedRole(null)
                }}>
                    <SheetTrigger asChild>
                        <Button className="h-12 bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 font-bold px-8 rounded-xl transition-all active:scale-[0.98]">
                            <Plus className="mr-2 h-5 w-5" />
                            Create Role
                        </Button>
                    </SheetTrigger>
                    <SheetContent className="sm:max-w-[600px] border-none shadow-2xl p-0 overflow-hidden">
                        <div className="p-8 md:p-12 overflow-y-auto h-full">
                            <SheetHeader className="mb-10">
                                <SheetTitle className="text-2xl font-black">{selectedRole ? "Edit Role Privileges" : "Initialize New Role"}</SheetTitle>
                                <SheetDescription className="font-medium text-slate-500">
                                    Define specific grant permissions for this structural node.
                                </SheetDescription>
                            </SheetHeader>
                            <RoleForm
                                permissions={permissions}
                                initialData={selectedRole}
                                onSuccess={() => {
                                    setOpen(false)
                                    setSelectedRole(null)
                                    fetchData()
                                }}
                            />
                        </div>
                    </SheetContent>
                </Sheet>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <div className="p-6 bg-white border border-slate-100 rounded-[2rem] flex items-center shadow-xl shadow-slate-200/50">
                    <div className="h-14 w-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mr-6 shadow-inner">
                        <Shield className="h-7 w-7" />
                    </div>
                    <div>
                        <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Defined Roles</div>
                        <div className="text-3xl font-black text-slate-900">{roles.length}</div>
                    </div>
                </div>
                <div className="p-6 bg-white border border-slate-100 rounded-[2rem] flex items-center shadow-xl shadow-slate-200/50">
                    <div className="h-14 w-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mr-6 shadow-inner">
                        <Key className="h-7 w-7" />
                    </div>
                    <div>
                        <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Active Grants</div>
                        <div className="text-3xl font-black text-slate-900">{permissions.length}</div>
                    </div>
                </div>
                <div className="p-6 bg-white border border-slate-100 rounded-[2rem] flex items-center shadow-xl shadow-slate-200/50">
                    <div className="h-14 w-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mr-6 shadow-inner">
                        <Users className="h-7 w-7" />
                    </div>
                    <div>
                        <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Total Users</div>
                        <div className="text-3xl font-black text-slate-900">{employees.length}</div>
                    </div>
                </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden mt-6">
                <div className="bg-slate-50 p-4 border-b border-slate-200">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center">
                        <Users className="h-5 w-5 mr-2 text-blue-600" />
                        Employee & Access Control
                    </h2>
                    <p className="text-xs text-slate-500">Each employee&apos;s designation (Guard, HR, Supervisor, etc.) determines their system access. Click &quot;Permissions&quot; to configure what each designation can do.</p>
                </div>
                <Table>
                    <TableHeader className="bg-slate-50/50">
                        <TableRow className="h-14 border-slate-100">
                            <TableHead className="w-[300px] pl-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee Profile</TableHead>
                            <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Auth Group</TableHead>
                            <TableHead className="text-right pr-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center py-8">Loading staff access data...</TableCell>
                            </TableRow>
                        ) : employees.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center py-12 text-slate-400 italic">No employees onboarded yet.</TableCell>
                            </TableRow>
                        ) : (
                            employees.map((emp) => (
                                <TableRow key={emp.id} className="hover:bg-slate-50/50">
                                    <TableCell>
                                        <div className="flex items-center">
                                            <Avatar className="h-8 w-8 mr-3">
                                                <AvatarFallback className="text-[10px] font-bold">
                                                    {emp.fullName?.split(' ').map((n: string) => n[0]).join('')}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="font-semibold text-slate-900">{emp.fullName}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 px-3 py-1 font-bold">
                                            {emp.user?.role?.name || emp.designation?.name || "Staff"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="border-primary text-primary hover:bg-primary/5 font-bold"
                                            onClick={() => {
                                                const role = roles.find(r => r.id === emp.user?.role?.id);
                                                if (role) {
                                                    setSelectedRole(role);
                                                    setOpen(true);
                                                } else {
                                                    toast.error("Role details not found. System roles cannot be modified.");
                                                }
                                            }}
                                        >
                                            Permissions
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="mt-12">
                <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
                    <Key className="h-5 w-5 mr-2" />
                    System Roles Matrix
                </h2>
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow className="h-14 border-slate-100">
                                <TableHead className="pl-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Role Identifier</TableHead>
                                <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Purpose / Scope</TableHead>
                                <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Grant Count</TableHead>
                                <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Linked Users</TableHead>
                                <TableHead className="text-right pr-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-slate-500 italic">Syncing security matrix...</TableCell>
                                </TableRow>
                            ) : roles.map((role) => (
                                <TableRow key={role.id} className="hover:bg-slate-50/50">
                                    <TableCell className="font-bold text-slate-900">
                                        <div className="flex items-center">
                                            {role.isSystem && <Shield className="h-3 w-3 mr-2 text-blue-500" />}
                                            {role.name}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm text-slate-500">{role.description || "No description provided"}</TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="bg-slate-100 text-slate-600">
                                            {role.permissions?.length || 0} Grants
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center text-sm font-medium text-slate-700">
                                            <Users className="h-4 w-4 mr-2 text-slate-400" />
                                            {role._count?.users || 0}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {!role.isSystem ? (
                                            <div className="flex justify-end space-x-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-primary hover:bg-primary/5"
                                                    onClick={() => {
                                                        setSelectedRole(role)
                                                        setOpen(true)
                                                    }}
                                                >
                                                    Edit
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-red-500 hover:bg-red-50"
                                                    onClick={() => handleDelete(role.id, role.name)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <Badge variant="outline" className="text-[10px] uppercase font-bold text-slate-400">Fixed System Role</Badge>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    )
}
