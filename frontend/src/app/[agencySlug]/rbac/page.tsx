"use client"

import { useEffect, useState } from "react"
import api from "@/lib/api"
import { Shield, Plus, Users, Lock, ShieldCheck, Database } from "lucide-react"
import {
    PageHeader,
    CreateButton,
    StatCard,
    DataTable,
    PageLoading,
    RowEditButton,
    RowDeleteButton,
    TableRowEmpty,
    SectionHeading
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
import { toast } from "sonner"
import { useAuthStore } from "@/store/authStore"
import { AlertModal } from "@/components/ui/alert-modal"
import { TableCell, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

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
            // Sync roles - ensure system consistency
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
            toast.error("Failed to sync permissions")
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!deleteModal.id) return
        setIsDeleting(true)
        try {
            await api.delete(`/roles/${deleteModal.id}`)
            toast.success("Role deleted")
            setDeleteModal({ open: false, id: "", name: "" })
            fetchData()
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to delete role")
        } finally {
            setIsDeleting(false)
        }
    }

    useEffect(() => {
        if (user) fetchData()
    }, [user])

    if (loading) return <PageLoading message="Loading Access Control..." />

    return (
        <div className="space-y-12 pb-20">
            <PageHeader
                title="Access"
                titleHighlight="Control"
                subtitle="Manage user roles and permissions for your agency."
                action={
                    <Sheet open={open} onOpenChange={(val) => {
                        setOpen(val)
                        if (!val) setSelectedRole(null)
                    }}>
                        <SheetTrigger asChild>
                            <CreateButton label="Add Role" icon={<Plus className="h-4 w-4" />} />
                        </SheetTrigger>
                        <SheetContent className="sm:max-w-[700px] border-none shadow-2xl p-0 overflow-hidden bg-white">
                            <div className="p-10 md:p-14 overflow-y-auto h-full">
                                <SheetHeader className="mb-12">
                                    <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
                                        <Lock className="h-7 w-7 text-primary" />
                                    </div>
                                    <SheetTitle className="text-3xl font-black tracking-tight leading-none text-slate-900 uppercase">
                                        {selectedRole ? "Edit Role" : "Create New Role"}
                                    </SheetTitle>
                                    <SheetDescription className="font-bold text-slate-400 uppercase tracking-[0.2em] text-[10px] pt-2">
                                        Define permissions and access levels.
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Total Roles" value={roles.length} icon={<ShieldCheck />} color="blue" />
                <StatCard title="Permissions" value={permissions.length} icon={<Database />} color="emerald" />
                <StatCard title="Total Users" value={employees.length} icon={<Users />} color="amber" />
            </div>

            <div className="space-y-6">
                <SectionHeading title="Employee Access" />
                <DataTable columns={['Employee', 'Role', 'Actions']}>
                    <AnimatePresence mode="popLayout">
                        {employees.length === 0 ? (
                            <TableRowEmpty colSpan={3} title="No users found" icon={<Users />} />
                        ) : (
                            employees.map((emp, idx) => (
                                <motion.tr
                                    key={emp.id}
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.98 }}
                                    transition={{ duration: 0.2, delay: idx * 0.02 }}
                                    className="group hover:bg-slate-50/50 transition-colors"
                                >
                                    <TableCell className="px-8 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-300 font-black group-hover:border-primary/20 group-hover:text-primary transition-all shadow-sm">
                                                {emp.fullName?.charAt(0)}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-extrabold text-slate-900 group-hover:text-primary transition-colors truncate">{emp.fullName}</div>
                                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">NODE_{emp.id.slice(-6).toUpperCase()}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="bg-slate-900/5 text-slate-900 border-none px-4 py-1.5 font-black text-[9px] uppercase tracking-[0.15em] rounded-full">
                                            {emp.user?.role?.name || emp.designation?.name || "EMPLOYEE"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right px-8">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-10 px-6 rounded-2xl text-primary font-black text-[10px] uppercase tracking-widest hover:bg-primary/5 transition-all"
                                            onClick={() => {
                                                const role = roles.find(r => r.id === emp.user?.role?.id);
                                                if (role) {
                                                    setSelectedRole(role);
                                                    setOpen(true);
                                                } else {
                                                    toast.error("System roles are immutable.");
                                                }
                                            }}
                                        >
                                            RECONF ROLE
                                        </Button>
                                    </TableCell>
                                </motion.tr>
                            ))
                        )}
                    </AnimatePresence>
                </DataTable>
            </div>

            <div className="space-y-6 pt-10">
                <SectionHeading title="Roles & Permissions" />
                <DataTable columns={['Role Name', 'Description', 'Permissions', 'Users Assigned', 'Actions']}>
                    <AnimatePresence mode="popLayout">
                        {roles.map((role, idx) => (
                            <motion.tr
                                key={role.id}
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.98 }}
                                transition={{ duration: 0.2, delay: idx * 0.03 }}
                                className="group hover:bg-slate-50/50 transition-colors"
                            >
                                <TableCell className="px-8 py-6">
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "h-12 w-12 rounded-2xl flex items-center justify-center shadow-sm border-2 transition-transform group-hover:scale-110",
                                            role.isSystem ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-100 text-primary"
                                        )}>
                                            {role.isSystem ? <Shield className="h-5 w-5" /> : <ShieldCheck className="h-5.5 w-5.5" />}
                                        </div>
                                        <div>
                                            <div className="font-black text-slate-900 text-lg tracking-tight group-hover:text-primary transition-colors">{role.name}</div>
                                            {role.isSystem && <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Core System Node</div>}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-[13px] font-medium text-slate-400 italic font-outfit max-w-[200px] truncate">
                                    {role.description || "Access level for employees"}
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-black text-slate-900 text-xs italic">{role.permissions?.length || 0} Permissions</span>
                                        <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest mt-0.5">Assigned</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center text-[11px] font-black text-slate-500 uppercase tracking-widest">
                                        <Users className="h-4 w-4 mr-2.5 text-slate-200" />
                                        {role._count?.users || 0} USERS
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
                                        <div className="px-4 py-1.5 rounded-full bg-slate-50 border border-slate-100 text-[9px] font-black text-slate-300 uppercase tracking-widest w-fit ml-auto">PROTECTED</div>
                                    )}
                                </TableCell>
                            </motion.tr>
                        ))}
                    </AnimatePresence>
                </DataTable>
            </div>

            <AlertModal
                isOpen={deleteModal.open}
                onClose={() => setDeleteModal({ ...deleteModal, open: false })}
                onConfirm={handleDelete}
                loading={isDeleting}
                title="DELETE ROLE"
                variant="danger"
                description={`Are you sure you want to delete the role: ${deleteModal.name}? This action cannot be undone.`}
                confirmText="Delete Role"
            />
        </div>
    )
}
