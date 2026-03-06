"use client"

import { useEffect, useState } from "react"
import api from "@/lib/api"
import {
    PageHeader,
    CreateButton,
    StatCard,
    DataTable,
    PageLoading,
    StatusBadge,
    TableRowEmpty,
    RowViewButton,
    RowEditButton,
    ControlPanel,
    SectionHeading
} from "@/components/ui/design-system"
import { useAuthStore } from "@/store/authStore"
import { usePermission } from "@/hooks/usePermission"
import { PermissionGuard } from "@/components/common/PermissionGuard"
import { motion, AnimatePresence } from "framer-motion"
import { FormSheet } from "@/components/common/FormSheet"
import { TableCell } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { AlertModal } from "@/components/ui/alert-modal"
import {
    Users,
    UserCheck,
    Shield,
    Plus,
    Filter,
    ShieldCheck,
    Calculator,
    Wallet,
    Trash2,
    Mail,
    Phone,
    Settings2,
    Search
} from "lucide-react"
import { toast } from "@/components/ui/sonner"
import { EmployeeForm } from "@/components/agency/EmployeeForm"
import { DesignationManager } from "@/components/agency/DesignationManager"
import { SearchBar } from "@/components/common/SearchBar"
import { Input } from "@/components/ui/input"

export default function EmployeesPage() {
    const { user } = useAuthStore()
    const [employees, setEmployees] = useState<any[]>([])
    const [designations, setDesignations] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [editingEmployee, setEditingEmployee] = useState<any | null>(null)
    const [openEnroll, setOpenEnroll] = useState(false)

    // Profile State
    const [profileDialog, setProfileDialog] = useState<{ open: boolean, employee: any | null }>({
        open: false,
        employee: null
    })

    const [deleting, setDeleting] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)

    const { hasPermission } = usePermission();

    const fetchData = async () => {
        if (!user) return
        try {
            const [empRes, desRes] = await Promise.allSettled([
                hasPermission('view_employee') ? api.get("/employees") : Promise.resolve({ data: [] }),
                hasPermission(['view_employee', 'create_employee', 'edit_employee', 'manage_roles']) ? api.get("/designations") : Promise.resolve({ data: [] })
            ])

            if (empRes.status === 'fulfilled') setEmployees(empRes.value.data)
            if (desRes.status === 'fulfilled') setDesignations(desRes.value.data)
        } catch (error) {
            toast.error("Failed to load operational roster.")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (user) fetchData()
    }, [user])

    const handleDeleteEmployee = async () => {
        if (!profileDialog.employee) return
        setShowDeleteModal(true)
    }

    const confirmDeleteEmployee = async () => {
        if (!profileDialog.employee) return
        setDeleting(true)
        try {
            await api.delete(`/employees/${profileDialog.employee.id}`)
            toast.success("Employee record deleted.")
            setProfileDialog({ open: false, employee: null })
            fetchData()
        } catch (error) {
            toast.error("Termination failed. Active deployment detected.")
        } finally {
            setDeleting(false)
            setShowDeleteModal(false)
        }
    }

    const filteredEmployees = employees.filter((emp: any) =>
        emp.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.employeeCode?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (loading) return <PageLoading message="Synchronizing Employees..." />

    return (
        <div className="space-y-10 pb-20">
            <PageHeader
                title="Employee"
                titleHighlight="Directory"
                subtitle="High-fidelity lifecycle management and deployment of agency security staff."
                action={
                    <PermissionGuard permission="create_employee">
                        <CreateButton
                            label="Add Employee"
                            icon={<Plus className="h-4 w-4" />}
                            onClick={() => { setEditingEmployee(null); setOpenEnroll(true) }}
                        />
                    </PermissionGuard>
                }
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Total Employees" value={employees.length} icon={<Users />} color="teal" />
                <StatCard title="Active" value={employees.filter((e: any) => e.status === 'ACTIVE').length} icon={<UserCheck />} color="emerald" />
                <StatCard title="Designations" value={designations.length} icon={<Shield />} color="blue" />
            </div>

            <Tabs defaultValue="staff" className="space-y-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <TabsList className="bg-slate-100/50 p-2 rounded-3xl border border-slate-200/50 w-fit">
                        <TabsTrigger value="staff" className="rounded-2xl px-8 py-3 data-[state=active]:bg-white data-[state=active]:shadow-2xl data-[state=active]:text-primary font-black uppercase text-[10px] tracking-widest transition-all">
                            <Users className="h-4 w-4 mr-2" />
                            Active Employees
                        </TabsTrigger>
                        <TabsTrigger value="designations" className="rounded-2xl px-8 py-3 data-[state=active]:bg-white data-[state=active]:shadow-2xl data-[state=active]:text-primary font-black uppercase text-[10px] tracking-widest transition-all">
                            <Settings2 className="h-4 w-4 mr-2" />
                            Designations
                        </TabsTrigger>
                    </TabsList>

                    <ControlPanel count={filteredEmployees.length} totalLabel="Registered Employees" className="mb-0 flex-1 md:max-w-xl">
                        <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search employee by name or ID..." />
                    </ControlPanel>
                </div>

                <TabsContent value="staff" className="mt-0 outline-none">
                    <DataTable columns={['Employee Profile', 'Designation', 'Monthly Salary', 'Status', 'Actions']}>
                        <AnimatePresence mode="popLayout">
                            {filteredEmployees.length === 0 ? (
                                <TableRowEmpty
                                    colSpan={5}
                                    title="No Record Identified"
                                    description="Register new employee to initialize the database."
                                    icon={<Users className="h-10 w-10 text-slate-300" />}
                                />
                            ) : (
                                filteredEmployees.map((emp, idx) => (
                                    <motion.tr
                                        key={emp.id}
                                        initial={{ opacity: 0, scale: 0.98 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.98 }}
                                        transition={{ duration: 0.2, delay: idx * 0.03 }}
                                        className="group hover:bg-slate-50/50 transition-colors"
                                    >
                                        <TableCell className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <Avatar className="h-12 w-12 rounded-2xl border-2 border-slate-50 shadow-sm transition-all group-hover:scale-110 group-hover:border-primary/20">
                                                    <AvatarFallback className="bg-gradient-to-tr from-slate-100 to-slate-200 text-slate-500 font-black uppercase">
                                                        {emp.fullName?.slice(0, 2)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0">
                                                    <div className="font-black text-slate-900 leading-tight group-hover:text-primary transition-colors truncate">{emp.fullName}</div>
                                                    <div className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">{emp.employeeCode || `ID: ${emp.id.slice(-6).toUpperCase()}`}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100 shadow-sm">
                                                    <ShieldCheck className="h-4.5 w-4.5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-black text-slate-900 text-[13px] tracking-tight truncate">{emp.designation?.name || "UNRANKED"}</p>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Designation</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-black text-slate-900 text-sm italic">{emp.salaryCurrency} {emp.basicSalary?.toLocaleString()}</span>
                                                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Monthly Salary</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge status={emp.status || "ACTIVE"} />
                                        </TableCell>
                                        <TableCell className="text-right px-8">
                                            <div className="flex items-center justify-end gap-2">
                                                <RowViewButton onClick={() => setProfileDialog({ open: true, employee: emp })} />
                                                <PermissionGuard permission="edit_employee">
                                                    <RowEditButton onClick={() => { setEditingEmployee(emp); setOpenEnroll(true) }} />
                                                </PermissionGuard>
                                            </div>
                                        </TableCell>
                                    </motion.tr>
                                ))
                            )}
                        </AnimatePresence>
                    </DataTable>
                </TabsContent>

                <TabsContent value="designations" className="mt-0 outline-none">
                    <DesignationManager
                        onUpdate={() => fetchData()}
                        designations={designations}
                    />
                </TabsContent>
            </Tabs>

            <FormSheet
                open={openEnroll}
                onOpenChange={(v) => { setOpenEnroll(v); if (!v) setEditingEmployee(null) }}
                title={editingEmployee ? `Edit Employee Profile` : "Add New Employee"}
                description={editingEmployee
                    ? "Update employee credentials and profile information."
                    : "Register a new employee record. Administrative credentials will be generated."}
            >
                <EmployeeForm
                    designations={designations}
                    refetchDesignations={fetchData}
                    initialData={editingEmployee}
                    onSuccess={() => {
                        setOpenEnroll(false)
                        setEditingEmployee(null)
                        fetchData()
                    }}
                />
            </FormSheet>

            {/* Employee Profile Dialog */}
            <Dialog open={profileDialog.open} onOpenChange={(v) => !v && setProfileDialog({ open: false, employee: null })}>
                <DialogContent className="sm:max-w-[500px] border-none rounded-[40px] p-0 overflow-hidden shadow-2xl bg-white focus:outline-none">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Employee Profile - {profileDialog.employee?.fullName}</DialogTitle>
                        <DialogDescription>Full employee profile and management center.</DialogDescription>
                    </DialogHeader>

                    <div className="bg-slate-900 p-10 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2 rotate-12" />
                        <div className="relative flex items-center gap-6">
                            <Avatar className="h-24 w-24 border-4 border-white/10 shadow-2xl rounded-[32px] overflow-hidden">
                                <AvatarFallback className="bg-primary text-white text-3xl font-black uppercase">
                                    {profileDialog.employee?.fullName?.slice(0, 2)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                                <div className="px-3 py-1 rounded-full bg-primary/20 text-primary text-[10px] font-black uppercase tracking-[0.2em] w-fit mb-3 border border-primary/20">Operational Profile</div>
                                <h2 className="text-3xl font-black tracking-tight leading-none truncate pr-4">{profileDialog.employee?.fullName}</h2>
                                <p className="text-slate-400 font-black text-[10px] mt-2 uppercase tracking-[0.3em]">{profileDialog.employee?.employeeCode || 'DEEPLAYED_OPERATOR'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-10 space-y-10 bg-white">
                        <div className="grid grid-cols-2 gap-10">
                            {[
                                { icon: <ShieldCheck />, label: 'Designation', value: profileDialog.employee?.designation?.name || "UNSET" },
                                { icon: <Wallet />, label: 'Monthly Salary', value: `${profileDialog.employee?.salaryCurrency} ${profileDialog.employee?.basicSalary?.toLocaleString()}` },
                                { icon: <Mail />, label: 'Email', value: profileDialog.employee?.email, truncate: true },
                                { icon: <Phone />, label: 'Phone Number', value: profileDialog.employee?.phoneNumber || "NOT_SET" },
                            ].map((item) => (
                                <div key={item.label} className="space-y-2">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <span className="text-primary">{item.icon}</span> {item.label}
                                    </p>
                                    <p className={cn("text-[13px] font-black text-slate-900 tracking-tight", item.truncate && "truncate")}>{item.value}</p>
                                </div>
                            ))}
                        </div>

                        <div className="pt-10 border-t border-slate-50 flex items-center justify-between">
                            <div className="flex flex-col">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee Management</p>
                                <p className="text-[11px] text-slate-400 font-medium font-italic">Record deletion requires confirmation.</p>
                            </div>
                            <PermissionGuard permission="delete_employee">
                                <Button
                                    variant="destructive"
                                    disabled={deleting}
                                    onClick={handleDeleteEmployee}
                                    className="bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border-none rounded-2xl font-black text-[10px] px-8 h-12 shadow-xl shadow-rose-100 transition-all active:scale-95"
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    {deleting ? "DELETING..." : "DELETE RECORD"}
                                </Button>
                            </PermissionGuard>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <AlertModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={confirmDeleteEmployee}
                loading={deleting}
                title="DELETE EMPLOYEE RECORD"
                variant="danger"
                description={`Are you sure you want to delete ${profileDialog.employee?.fullName}? This action is irreversible and will remove all employment history.`}
                confirmText="Delete Record"
            />
        </div>
    )
}
