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
    TableRowLoading,
    TableRowEmpty,
    RowViewButton,
    RowEditButton
} from "@/components/ui/design-system"
import { useAuthStore } from "@/store/authStore"
import { usePermission } from "@/hooks/usePermission"
import { PermissionGuard } from "@/components/common/PermissionGuard"
import { motion, AnimatePresence } from "framer-motion"
import { FormSheet } from "@/components/common/FormSheet"
import { TableCell, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { AlertModal } from "@/components/ui/alert-modal"
import {
    Users,
    UserCheck,
    Shield,
    Plus,
    Search,
    ShieldCheck,
    ExternalLink,
    Edit3,
    Settings2,
    Calculator,
    Wallet,
    Trash2,
    Mail,
    Phone,
    Briefcase
} from "lucide-react"
import { toast } from "sonner"
import { EmployeeForm } from "@/components/agency/EmployeeForm"
import { DesignationManager } from "@/components/agency/DesignationManager"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

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

    // Individual Payroll State
    const [payrollDialog, setPayrollDialog] = useState<{ open: boolean, employee: any | null }>({
        open: false,
        employee: null
    })
    const [payrollAmount, setPayrollAmount] = useState<string>("0")
    const [payrollMonth, setPayrollMonth] = useState<string>(new Date().toISOString().slice(0, 7))
    const [generating, setGenerating] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)

    const { hasPermission, isAdmin } = usePermission();

    const fetchData = async () => {
        if (!user) return

        try {
            // Priority 1: Employees list
            if (hasPermission('view_employee')) {
                const empRes = await api.get("/employees")
                setEmployees(empRes.data)
            }

            // Priority 2: Designations (Side data)
            if (hasPermission(['view_designations', 'manage_roles'])) {
                try {
                    const desRes = await api.get("/designations")
                    setDesignations(desRes.data)
                } catch (err) {
                    console.warn("Designations fetch failed (non-critical)", err)
                }
            }
        } catch (error) {
            console.error("Critical roster fetch error", error)
            toast.error("Failed to load roster database.")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (user) fetchData()
    }, [user])

    const handleOpenPayroll = (emp: any) => {
        setPayrollDialog({ open: true, employee: emp })
        setPayrollAmount(emp.basicSalary?.toString() || "0")
    }

    const handleDeleteEmployee = async () => {
        if (!profileDialog.employee) return
        setShowDeleteModal(true)
    }

    const confirmDeleteEmployee = async () => {
        if (!profileDialog.employee) return
        setDeleting(true)
        try {
            await api.delete(`/employees/${profileDialog.employee.id}`)
            toast.success("Employee record deleted successfully.")
            setProfileDialog({ open: false, employee: null })
            fetchData()
        } catch (error) {
            toast.error("Failed to delete employee. They might have active assignments.")
        } finally {
            setDeleting(false)
            setShowDeleteModal(false)
        }
    }

    const handleGeneratePayroll = async () => {
        if (!payrollDialog.employee) return
        setGenerating(true)
        try {
            await api.post("/payroll/individual", {
                employeeId: payrollDialog.employee.id,
                month: payrollMonth,
                amount: parseFloat(payrollAmount)
            })
            toast.success(`Payroll generated for ${payrollDialog.employee.fullName}`)
            setPayrollDialog({ open: false, employee: null })
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Generation failed. Maybe already exists?")
        } finally {
            setGenerating(false)
        }
    }

    const filteredEmployees = employees.filter((emp: any) =>
        emp.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.employeeCode?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const stats = [
        { label: "Active Employees", value: employees.length, icon: <Users />, color: "teal" as const },
        { label: "On Station", value: "0", icon: <UserCheck />, color: "emerald" as const },
        { label: "Designations", value: designations.length, icon: <Shield />, color: "blue" as const },
    ]

    if (loading) return <PageLoading message="Synchronizing Roster Data..." />

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <PageHeader
                title="Employee"
                titleHighlight="Directory"
                subtitle="Lifecycle management and deployment of security staff."
                action={
                    <PermissionGuard permission="create_employee">
                        <CreateButton
                            label="Create Employee"
                            icon={<Plus className="h-4 w-4" />}
                            onClick={() => { setEditingEmployee(null); setOpenEnroll(true) }}
                        />
                    </PermissionGuard>
                }
            />

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((s) => (
                    <StatCard
                        key={s.label}
                        title={s.label}
                        value={s.value}
                        icon={s.icon}
                        color={s.color}
                    />
                ))}
            </div>

            <FormSheet
                open={openEnroll}
                onOpenChange={(v) => { setOpenEnroll(v); if (!v) setEditingEmployee(null) }}
                title={editingEmployee ? `Modify Record: ${editingEmployee.fullName}` : "Establish Employee Record"}
                description={editingEmployee
                    ? "Update professional credentials and operational profiles for this staff member."
                    : "Initialize a new staff record. Administrative credentials and operational profiles will be generated."}
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

            <Tabs defaultValue="staff" className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <TabsList className="bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200/50">
                        <TabsTrigger value="staff" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-primary font-bold transition-all">
                            <Users className="h-4 w-4 mr-2" />
                            Active Roster
                        </TabsTrigger>
                        <TabsTrigger value="designations" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-primary font-bold transition-all">
                            <Settings2 className="h-4 w-4 mr-2" />
                            Designations
                        </TabsTrigger>
                    </TabsList>

                    <div className="flex flex-1 gap-2">
                        <div className="relative group flex-1 md:flex-initial">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-hover:text-primary transition-colors" />
                            <Input
                                placeholder="Search roster..."
                                className="pl-11 pr-4 h-12 bg-white border-slate-200 rounded-2xl w-full md:w-[300px] focus:ring-primary shadow-sm hover:shadow-md transition-all font-medium"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <TabsContent value="staff" className="mt-0 outline-none">
                    <DataTable columns={['Employee Profile', 'Professional Rank', 'Base Compensation', 'Current Status', 'Actions']}>
                        <AnimatePresence mode="popLayout">
                            {filteredEmployees.length === 0 ? (
                                <TableRowEmpty
                                    colSpan={5}
                                    title="No Employees Found"
                                    description="Register new staff members to build your operational team."
                                    icon={<Users className="h-10 w-10 text-slate-300" />}
                                />
                            ) : (
                                filteredEmployees.map((emp, idx) => (
                                    <motion.tr
                                        key={emp.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="group border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                                    >
                                        <TableCell className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <Avatar className="h-12 w-12 rounded-2xl border-2 border-slate-100 shadow-sm transition-transform group-hover:scale-105">
                                                    <AvatarFallback className="bg-gradient-to-tr from-slate-100 to-slate-200 text-slate-500 font-black">
                                                        {emp.fullName?.slice(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className="font-extrabold text-slate-900 leading-tight group-hover:text-primary transition-colors">{emp.fullName}</div>
                                                    <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">{emp.employeeCode || `ID: ${emp.id.slice(-6).toUpperCase()}`}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="h-8 w-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100 shadow-sm">
                                                    <ShieldCheck className="h-4 w-4" />
                                                </div>
                                                <span className="font-bold text-slate-700 text-sm">{emp.designation?.name || "Unassigned"}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-black text-slate-900">{emp.salaryCurrency} {emp.basicSalary?.toLocaleString()}</span>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Base Monthly</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge status={emp.status || "ACTIVE"} />
                                        </TableCell>
                                        <TableCell className="text-right px-8">
                                            <div className="flex items-center justify-end gap-2 pr-4">
                                                <RowViewButton
                                                    onClick={() => setProfileDialog({ open: true, employee: emp })}
                                                />
                                                <PermissionGuard permission="edit_employee">
                                                    <RowEditButton
                                                        onClick={() => { setEditingEmployee(emp); setOpenEnroll(true) }}
                                                    />
                                                </PermissionGuard>
                                            </div>
                                        </TableCell>
                                    </motion.tr>
                                ))
                            )}
                        </AnimatePresence>
                    </DataTable>
                </TabsContent>

                <TabsContent value="designations">
                    <DesignationManager
                        onUpdate={() => fetchData()}
                        designations={designations}
                    />
                </TabsContent>
            </Tabs>

            {/* Individual Payroll Generation Dialog */}
            <Dialog open={payrollDialog.open} onOpenChange={(v) => !v && setPayrollDialog({ open: false, employee: null })}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center text-slate-900">
                            <Calculator className="h-5 w-5 mr-2 text-primary" />
                            Generate Payroll Record
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-[20px] border border-slate-100">
                            <Avatar className="h-10 w-10">
                                <AvatarFallback className="font-black bg-white">{payrollDialog.employee?.fullName?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-bold text-slate-900 text-sm">{payrollDialog.employee?.fullName}</p>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{payrollDialog.employee?.designation?.name}</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Month</label>
                            <Input
                                type="month"
                                className="h-12 rounded-xl"
                                value={payrollMonth}
                                onChange={(e) => setPayrollMonth(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Amount ({payrollDialog.employee?.salaryCurrency})</label>
                            <Input
                                type="number"
                                value={payrollAmount}
                                onChange={(e) => setPayrollAmount(e.target.value)}
                                placeholder="Enter specific amount"
                                className="text-lg font-black h-14 rounded-2xl"
                            />
                            <p className="text-[10px] font-medium text-slate-400 ml-1 italic">Default base salary auto-filled.</p>
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="ghost" className="h-12 rounded-xl font-bold" onClick={() => setPayrollDialog({ open: false, employee: null })}>Cancel</Button>
                        <Button
                            onClick={handleGeneratePayroll}
                            disabled={generating || !payrollAmount}
                            className="h-12 bg-primary text-white hover:bg-primary/90 rounded-xl font-bold px-6 shadow-lg shadow-primary/20"
                        >
                            {generating ? "Processing..." : "Generate Record"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Employee Profile Dialog */}
            <Dialog open={profileDialog.open} onOpenChange={(v) => !v && setProfileDialog({ open: false, employee: null })}>
                <DialogContent className="sm:max-w-[500px] border-none rounded-[40px] p-0 overflow-hidden shadow-2xl bg-white">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Employee Profile - {profileDialog.employee?.fullName}</DialogTitle>
                        <DialogDescription>Full professional profile and administrative actions.</DialogDescription>
                    </DialogHeader>

                    <div className="bg-slate-900 p-10 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
                        <div className="relative flex items-center gap-6">
                            <Avatar className="h-24 w-24 border-4 border-white/10 shadow-2xl rounded-[32px]">
                                <AvatarFallback className="bg-primary text-white text-3xl font-black">
                                    {profileDialog.employee?.fullName?.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <div className="px-3 py-1 rounded-full bg-primary/20 text-primary text-[10px] font-black uppercase tracking-widest w-fit mb-3">Professional Profile</div>
                                <h2 className="text-3xl font-black tracking-tight leading-none">{profileDialog.employee?.fullName}</h2>
                                <p className="text-slate-400 font-bold text-xs mt-2 uppercase tracking-widest">{profileDialog.employee?.employeeCode || 'VERIFIED EMPLOYEE'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-10 space-y-10 bg-white">
                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-1.5">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <ShieldCheck className="h-3 w-3 text-primary" /> Active Rank
                                </p>
                                <p className="text-sm font-black text-slate-900">{profileDialog.employee?.designation?.name}</p>
                            </div>
                            <div className="space-y-1.5">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Wallet className="h-3 w-3 text-primary" /> Monthly Base
                                </p>
                                <p className="text-sm font-black text-slate-900">{profileDialog.employee?.salaryCurrency} {profileDialog.employee?.basicSalary?.toLocaleString()}</p>
                            </div>
                            <div className="space-y-1.5">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Mail className="h-3 w-3 text-primary" /> Communications
                                </p>
                                <p className="text-sm font-bold text-slate-700 truncate">{profileDialog.employee?.email}</p>
                            </div>
                            <div className="space-y-1.5">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Phone className="h-3 w-3 text-primary" /> Contact Node
                                </p>
                                <p className="text-sm font-bold text-slate-700">{profileDialog.employee?.phoneNumber || "NOT SET"}</p>
                            </div>
                        </div>

                        <div className="pt-8 border-t border-slate-50 flex items-center justify-between">
                            <div className="flex flex-col">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Administrative Control</p>
                                <p className="text-[11px] text-slate-500 font-medium">Record purge requires clearance.</p>
                            </div>
                            <PermissionGuard permission="delete_employee">
                                <Button
                                    variant="destructive"
                                    disabled={deleting}
                                    onClick={handleDeleteEmployee}
                                    className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border-none rounded-2xl font-black text-[10px] px-6 h-10 shadow-none transition-all"
                                >
                                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                                    {deleting ? "PURGING..." : "PURGE RECORD"}
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
                title="PURGE EMPLOYEE RECORD"
                variant="danger"
                description={`Are you sure you want to permanently delete ${profileDialog.employee?.fullName}? This action is irreversible and will remove all deployment history.`}
                confirmText="Confirm Purge"
            />
        </div>
    )
}
