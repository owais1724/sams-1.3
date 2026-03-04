"use client"

import { useEffect, useState } from "react"
import api from "@/lib/api"
import { Shield, Plus, Key, Users, Lock, ShieldCheck, Database } from "lucide-react"
import {
    PageHeader,
    CreateButton,
    StatCard,
    DataTable,
    PageLoading,
    RowEditButton,
    RowDeleteButton,
    TableRowEmpty
} from "@/components/ui/design-system"
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
import { useAuthStore } from "@/store/authStore"
import { AlertModal } from "@/components/ui/alert-modal"
import { TableCell, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function RBACPage() {
    const { user } = useAuthStore()
    const [roles, setRoles] = useState<any[]>([])
    const [permissions, setPermissions] = useState<any[]>([])
    const [employees, setEmployees] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [open, setOpen] = useState(false)
    const [selectedRole, setSelectedRole] = useState<any>(null)
    const [deleteModal, setDeleteModal] = useState<{ open: boolean, id: string, name: string }>({
        open: false,
        id: "",
        name: ""
    })
    const [isDeleting, setIsDeleting] = useState(false)

    const fetchData = async () => {
        if (!user) return
        try {
            const params = user.agencyId ? { agencyId: user.agencyId } : {}
            // Sync roles
            try {
                await api.post("/employees/sync-roles", { agencyId: user.agencyId })
            } catch (err) { }

            const [rolesRes, permsRes, empRes] = await Promise.all([
                api.get("/roles", { params }),
                api.get("/roles/permissions", { params }),
                api.get("/employees", { params })
            ])

            setRoles(rolesRes.data)
            setPermissions(permsRes.data)
            setEmployees(empRes.data)
        } catch (error: any) {
            toast.error("Security matrix synchronization failed")
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!deleteModal.id) return
        setIsDeleting(true)
        try {
            await api.delete(`/roles/${deleteModal.id}`)
            toast.success("Security role terminated successfully")
            setDeleteModal({ open: false, id: "", name: "" })
            fetchData()
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Termination failed")
        } finally {
            setIsDeleting(false)
        }
    }

    useEffect(() => {
        if (user) fetchData()
    }, [user])

    if (loading) return <PageLoading message="Synchronizing Security Matrix..." />

    return (
        <div className="space-y-8 pb-20">
            <PageHeader
                title="Access"
                titleHighlight="Control"
                subtitle="Initialize and regulate high-level security permissions and role hierarchies."
                action={
                    <Sheet open={open} onOpenChange={(val) => {
                        setOpen(val)
                        if (!val) setSelectedRole(null)
                    }}>
                        <SheetTrigger asChild>
                            <CreateButton label="Create Role" icon={<Plus className="h-4 w-4" />} />
                        </SheetTrigger>
                        <SheetContent className="sm:max-w-[700px] border-none shadow-2xl p-0 overflow-hidden bg-white">
                            <div className="p-10 md:p-14 overflow-y-auto h-full">
                                <SheetHeader className="mb-12">
                                    <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                                        <Lock className="h-7 w-7 text-primary" />
                                    </div>
                                    <SheetTitle className="text-3xl font-black tracking-tight leading-none text-slate-900">
                                        {selectedRole ? "MODIFY ROLE PRIVILEGES" : "INITIALIZE SECURITY NODE"}
                                    </SheetTitle>
                                    <SheetDescription className="font-bold text-slate-500 uppercase tracking-widest text-[10px] pt-1">
                                        Precision authorization management for structural entities.
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
                }
            />

            <div className="grid gap-6 md:grid-cols-3">
                <StatCard title="Defined Roles" value={roles.length} icon={<ShieldCheck />} color="blue" />
                <StatCard title="Active Grants" value={permissions.length} icon={<Database />} color="emerald" />
                <StatCard title="Security Users" value={employees.length} icon={<Users />} color="amber" />
            </div>

            <div className="mt-4">
                <h2 className="text-xl font-extrabold text-slate-900 mb-4 px-2 tracking-tight">Identity & Access Management</h2>
                <DataTable
                    columns={['Employee Profile', 'Auth Group', 'Actions']}
                >
                    {employees.length === 0 ? (
                        <TableRowEmpty colSpan={3} title="No Personnel Found" icon={<Users />} />
                    ) : (
                        employees.map((emp) => (
                            <TableRow key={emp.id} className="group border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                <TableCell className="px-8 py-5">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 md:h-12 md:w-12 rounded-2xl bg-slate-50 border-2 border-slate-100 flex items-center justify-center text-slate-300 font-black group-hover:border-primary/20 transition-all shadow-sm">
                                            {emp.fullName?.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="font-extrabold text-slate-900 group-hover:text-primary transition-colors">{emp.fullName}</div>
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{emp.employeeCode || "PF-NODE"}</div>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-100 px-3 py-1 font-black text-[10px] uppercase tracking-wider rounded-xl">
                                        {emp.user?.role?.name || emp.designation?.name || "Standard Personnel"}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right px-8">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-9 px-4 rounded-xl text-primary font-black text-[10px] uppercase tracking-widest hover:bg-primary/5 transition-all"
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
                                        Manage Privileges
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </DataTable>
            </div>

            <div className="mt-12">
                <h2 className="text-xl font-extrabold text-slate-900 mb-4 px-2 tracking-tight">Structural Security Matrix</h2>
                <DataTable
                    columns={['Role Identifier', 'Purpose / Scope', 'Grant Intensity', 'Network Load', 'Actions']}
                >
                    {roles.map((role) => (
                        <TableRow key={role.id} className="group border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                            <TableCell className="px-8 py-5">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "h-10 w-10 rounded-xl flex items-center justify-center shadow-sm border",
                                        role.isSystem ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-100 text-primary"
                                    )}>
                                        {role.isSystem ? <Shield className="h-4 w-4" /> : <ShieldCheck className="h-5 w-5" />}
                                    </div>
                                    <div className="font-black text-slate-900 group-hover:text-primary transition-colors">{role.name}</div>
                                </div>
                            </TableCell>
                            <TableCell className="text-sm font-medium text-slate-500 italic">
                                {role.description || "Baseline operational access node"}
                            </TableCell>
                            <TableCell>
                                <Badge variant="secondary" className="bg-slate-50 text-slate-500 border-transparent font-black text-[10px] rounded-lg">
                                    {role.permissions?.length || 0} PERMS
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center text-xs font-bold text-slate-600">
                                    <Users className="h-3.5 w-3.5 mr-2 text-slate-300" />
                                    {role._count?.users || 0} active
                                </div>
                            </TableCell>
                            <TableCell className="text-right px-8">
                                {!role.isSystem ? (
                                    <div className="flex justify-end gap-2">
                                        <RowEditButton onClick={() => {
                                            setSelectedRole(role)
                                            setOpen(true)
                                        }} />
                                        <RowDeleteButton onClick={() => setDeleteModal({ open: true, id: role.id, name: role.name })} />
                                    </div>
                                ) : (
                                    <Badge variant="outline" className="text-[9px] uppercase font-black text-slate-300 border-slate-100 tracking-tighter">System Protected</Badge>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </DataTable>
            </div>

            <AlertModal
                isOpen={deleteModal.open}
                onClose={() => setDeleteModal({ ...deleteModal, open: false })}
                onConfirm={handleDelete}
                loading={isDeleting}
                title="TERMINATE SECURITY NODE"
                variant="danger"
                description={`Initiating termination sequence for "${deleteModal.name}". All associated privileges will be immediately revoked from the roster. Proceed?`}
                confirmText="Execute Deletion"
            />
        </div>
    )
}
