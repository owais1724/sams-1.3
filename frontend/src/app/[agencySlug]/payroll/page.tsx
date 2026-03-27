"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams } from "next/navigation"
import {
  PageHeader,
  CreateButton,
  StatCard,
  DataTable,
  PageLoading,
  TableRowEmpty,
  StatusBadge,
  SubmitButton,
  SectionHeading,
  FormLabelBase,
  inputVariants,
  selectVariants
} from "@/components/ui/design-system"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Wallet, Download, Eye, Calculator, CheckCircle2, AlertCircle, Receipt, Database, Activity, CreditCard, Filter } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import api from "@/lib/api"
import { toast } from "@/components/ui/sonner"
import { useAuthStore } from "@/store/authStore"
import { cn } from "@/lib/utils"
import { TableCell, TableRow } from "@/components/ui/table"
import { FormModal } from "@/components/common/FormModal"
import { AlertModal } from "@/components/ui/alert-modal"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { motion, AnimatePresence } from "framer-motion"

interface Payroll {
  id: string
  month: string
  basicSalary: number
  allowances: number
  deductions: number
  netPay: number
  status: string
  generatedDate: string
  employeeId?: string
  employee?: {
    id: string
    fullName: string
    employeeCode?: string
    email: string
    designation: {
      id: string
      name: string
    }
  }
}

interface Designation {
  id: string
  name: string
}

export default function PayrollPage() {
  const { agencySlug } = useParams()
  const currentPayrollMonth = new Date().toISOString().slice(0, 7)
  const [payrolls, setPayrolls] = useState<Payroll[]>([])
  const [designations, setDesignations] = useState<Designation[]>([])
  const [activeTab, setActiveTab] = useState("ALL")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [generateConfirmModal, setGenerateConfirmModal] = useState(false)
  const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null)
  const [statusConfirmModal, setStatusConfirmModal] = useState<{ open: boolean; payroll: Payroll | null; status: string }>({
    open: false,
    payroll: null,
    status: "",
  })

  const [selectedMonth, setSelectedMonth] = useState(currentPayrollMonth)
  const [generateDesignationId, setGenerateDesignationId] = useState<string>("all")

  const { user: authUser } = useAuthStore()
  const isAdmin = authUser?.role === 'Super Admin' || authUser?.role === 'Agency Admin'
  const canManagePayroll = isAdmin || authUser?.permissions?.includes('manage_payroll')

  const fetchData = async () => {
    setLoading(true)
    const hasPerm = (p: string) => isAdmin || authUser?.permissions?.includes(p)

    try {
      const [payrollRes, desRes] = await Promise.all([
        hasPerm('view_payroll') ? api.get('/payrolls') : Promise.resolve({ data: [] }),
        (hasPerm('view_payroll') || hasPerm('manage_payroll') || isAdmin) ? api.get('/designations') : Promise.resolve({ data: [] })
      ])

      setPayrolls(payrollRes.data || [])
      setDesignations(desRes.data || [])
    } catch (err) {
      toast.error("Failed to connect to payroll service.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleGeneratePayroll = () => {
    if (selectedMonth > currentPayrollMonth) {
      toast.error("Payroll can only be generated for the current month or past months.")
      return
    }
    setGenerateConfirmModal(true)
  }

  const handleRequestStatusChange = (payroll: Payroll, status: string) => {
    setStatusConfirmModal({ open: true, payroll, status })
  }

  const handleConfirmedGeneratePayroll = async () => {
    setGenerating(true)
    try {
      const response = await api.post('/payrolls/generate-bulk', {
        month: selectedMonth,
        designationId: generateDesignationId === 'all' ? undefined : generateDesignationId
      })
      const generatedCount = typeof response.data === "number" ? response.data : undefined
      toast.success(
        generatedCount !== undefined
          ? `Payroll ledger generated for ${generatedCount} employee${generatedCount === 1 ? "" : "s"}.`
          : "Payroll ledger generated successfully."
      )
      setGenerateConfirmModal(false)
      setIsDialogOpen(false)
      fetchData()
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Generation failed.")
    } finally {
      setGenerating(false)
    }
  }

  const handleConfirmedStatusChange = async () => {
    if (!statusConfirmModal.payroll || !statusConfirmModal.status) return
    setGenerating(true)
    try {
      await api.post(`/payrolls/${statusConfirmModal.payroll.id}/status`, {
        status: statusConfirmModal.status
      })
      toast.success(`Payroll marked as ${statusConfirmModal.status}.`)
      setStatusConfirmModal({ open: false, payroll: null, status: "" })
      setSelectedPayroll((prev) =>
        prev?.id === statusConfirmModal.payroll?.id
          ? { ...prev, status: statusConfirmModal.status }
          : prev
      )
      fetchData()
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update payroll status.")
    } finally {
      setGenerating(false)
    }
  }

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 0
    }).format(amount)
  }

  const getMonthName = (monthStr: string) => {
    if (!monthStr) return "N/A"
    const [year, month] = monthStr.split('-')
    return new Date(parseInt(year), parseInt(month) - 1).toLocaleString('default', { month: 'long', year: 'numeric' })
  }

  const getStatusTone = (status: string) => {
    if (status === "PAID") return "text-emerald-600 bg-emerald-50 border-emerald-100"
    if (status === "DRAFT") return "text-amber-600 bg-amber-50 border-amber-100"
    return "text-slate-600 bg-slate-50 border-slate-200"
  }

  // Filter unique designation names for tabs to avoid "diff diff hr hr"
  const tabCategories = useMemo(() => {
    const names = designations.map(d => d.name)
    return ["ALL", ...Array.from(new Set(names))]
  }, [designations])

  const filteredPayrolls = useMemo(() => {
    if (activeTab === "ALL") return payrolls
    return payrolls.filter(p => p.employee?.designation?.name === activeTab)
  }, [payrolls, activeTab])

  if (loading) return <PageLoading message="Loading Payroll Data..." />

  return (
    <div className="space-y-12 pb-20">
      <PageHeader
        title="Agency"
        titleHighlight="Payroll"
        subtitle="Manage and authorize salary payments for employees."
        action={
        <FormModal
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          title="Create Payroll"
          description="Calculate and process salary payments for the agency."
          maxWidth={640}
          trigger={<CreateButton label="Generate Payroll" icon={<Calculator className="h-4 w-4" />} />}
        >
          <div className="space-y-10">
            <div className="space-y-0">
              <FormLabelBase label="Payroll Month" required />
              <Input
                type="month"
                value={selectedMonth}
                max={currentPayrollMonth}
                onChange={(e) => {
                  const nextMonth = e.target.value
                  if (nextMonth > currentPayrollMonth) {
                    toast.error("Future payroll months are not allowed.")
                    return
                  }
                  setSelectedMonth(nextMonth)
                }}
                className={inputVariants}
              />
            </div>

            <div className="space-y-0">
              <FormLabelBase label="Employee Scope" required />
              <Select value={generateDesignationId} onValueChange={setGenerateDesignationId}>
                <SelectTrigger className={selectVariants}>
                  <SelectValue placeholder="Select designation scope" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-slate-100 shadow-2xl p-2 font-black uppercase text-[10px] tracking-widest">
                  <SelectItem value="all" className="py-4 font-black uppercase text-[10px] tracking-widest rounded-xl">ALL EMPLOYEES</SelectItem>
                  {designations.map(d => (
                    <SelectItem key={d.id} value={d.id} className="py-4 font-black uppercase text-[10px] tracking-widest rounded-xl">{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-amber-50 rounded-[32px] p-8 border border-amber-100/50 flex gap-5">
              <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0">
                <AlertCircle className="h-5 w-5 text-amber-600" />
              </div>
              <p className="text-[13px] font-bold text-amber-900 leading-relaxed italic">
                Generating payroll will calculate salary for the selected employees based on their attendance and contracts.
              </p>
            </div>

            <div className="pt-4 pb-10 flex justify-center">
              <SubmitButton
                onClick={handleGeneratePayroll}
                loading={generating}
                label="Generate Payroll"
                icon={<CheckCircle2 className="h-4 w-4" />}
              />
            </div>
          </div>
        </FormModal>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        <StatCard title="Total Disbursed" value={formatCurrency(payrolls.filter(p => p.status === 'PAID').reduce((sum, p) => sum + p.netPay, 0))} icon={<CreditCard />} color="blue" />
        <StatCard title="Pending Payouts" value={formatCurrency(payrolls.filter(p => p.status !== 'PAID').reduce((sum, p) => sum + p.netPay, 0))} icon={<Wallet />} color="amber" />
        <StatCard title="Total Staff" value={payrolls.length} icon={<Database />} color="emerald" />
        <StatCard title="Employees Paid" value={payrolls.filter(p => p.status === 'PAID').length} icon={<Activity />} color="violet" />
      </div>

      <div className="space-y-8 pt-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
          <SectionHeading title="Payroll History" />

          <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 overflow-x-auto no-scrollbar max-w-full">
            {tabCategories.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all duration-300",
                  activeTab === tab
                    ? "bg-white text-primary shadow-sm ring-1 ring-slate-100"
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                {tab === "ALL" ? "All Payrolls" : tab}
              </button>
            ))}
          </div>
        </div>

        <DataTable columns={['Employee', 'Month', 'Salary Details', 'Status', 'Actions']}>
          <AnimatePresence mode="popLayout">
            {filteredPayrolls.length === 0 ? (
              <TableRowEmpty colSpan={5} title="No Fiscal Records" icon={<Receipt />} />
            ) : (
              filteredPayrolls.map((payroll, idx) => (
                <motion.tr
                  key={payroll.id}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2, delay: idx * 0.02 }}
                  className="group hover:bg-slate-50/50 transition-colors"
                >
                  <TableCell className="px-4 sm:px-8 py-4 sm:py-6">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-300 font-black group-hover:border-primary/20 group-hover:text-primary group-hover:scale-110 transition-all shadow-sm">
                        {payroll.employee?.fullName?.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-extrabold text-slate-900 leading-tight group-hover:text-primary transition-colors truncate">{payroll.employee?.fullName}</div>
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{payroll.employee?.designation?.name || "EMPLOYEE"}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-black text-slate-900 text-[13px] tracking-tight">{getMonthName(payroll.month)}</span>
                      <span className="text-[9px] text-slate-300 font-black uppercase tracking-widest mt-1 italic">Verified Cycle</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-emerald-600 italic">{formatCurrency(payroll.netPay)}</span>
                      <span className="text-[9px] text-slate-300 font-black uppercase tracking-widest mt-1">Net Salary</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={payroll.status} />
                  </TableCell>
                  <TableCell className="text-right px-4 sm:px-8">
                    <div className="flex items-center justify-end gap-2">
                      {canManagePayroll && payroll.status === "DRAFT" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-10 px-4 rounded-xl text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 font-bold"
                          onClick={() => handleRequestStatusChange(payroll, "PAID")}
                        >
                          Mark Paid
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-11 w-11 rounded-2xl hover:bg-white hover:text-primary hover:shadow-xl hover:shadow-slate-200/50 transition-all"
                        onClick={() => setSelectedPayroll(payroll)}
                      >
                        <Eye className="h-4.5 w-4.5" />
                      </Button>
                    </div>
                  </TableCell>
                </motion.tr>
              ))
            )}
          </AnimatePresence>
        </DataTable>
      </div>

      <AlertModal
        isOpen={generateConfirmModal}
        onClose={() => setGenerateConfirmModal(false)}
        onConfirm={handleConfirmedGeneratePayroll}
        loading={generating}
        title="Generate Payroll"
        description={`Are you sure you want to generate payroll for ${getMonthName(selectedMonth)}${generateDesignationId === "all" ? " for all employees" : " for the selected designation"}?`}
        variant="primary"
        confirmText="Generate Payroll"
        cancelText="Cancel"
      />

      <Dialog open={!!selectedPayroll} onOpenChange={(open) => { if (!open) setSelectedPayroll(null) }}>
        <DialogContent className="sm:max-w-[640px] bg-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900">Payroll Details</DialogTitle>
          </DialogHeader>
          {selectedPayroll && (
            <div className="space-y-6 pt-2">
              <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm">
                <div className="font-black text-xl text-slate-900">{selectedPayroll.employee?.fullName || "Employee"}</div>
                <div className="mt-1 text-[11px] font-black uppercase tracking-widest text-slate-400">
                  {selectedPayroll.employee?.designation?.name || "Employee"}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Month</p>
                  <p className="mt-2 text-sm font-black text-slate-900">{getMonthName(selectedPayroll.month)}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Generated Date</p>
                  <p className="mt-2 text-sm font-black text-slate-900">{new Date(selectedPayroll.generatedDate).toLocaleString()}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Basic Salary</p>
                  <p className="mt-2 text-sm font-black text-slate-900">{formatCurrency(selectedPayroll.basicSalary)}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Allowances</p>
                  <p className="mt-2 text-sm font-black text-slate-900">{formatCurrency(selectedPayroll.allowances)}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Deductions</p>
                  <p className="mt-2 text-sm font-black text-slate-900">{formatCurrency(selectedPayroll.deductions)}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Net Pay</p>
                  <p className="mt-2 text-sm font-black text-emerald-600">{formatCurrency(selectedPayroll.netPay)}</p>
                </div>
              </div>

              <div className={cn("inline-flex items-center rounded-full border px-4 py-2 text-[11px] font-black uppercase tracking-widest", getStatusTone(selectedPayroll.status))}>
                {selectedPayroll.status}
              </div>

              {canManagePayroll && selectedPayroll.status === "DRAFT" && (
                <div className="flex justify-end">
                  <Button
                    className="rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black"
                    onClick={() => handleRequestStatusChange(selectedPayroll, "PAID")}
                  >
                    Mark as Paid
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertModal
        isOpen={statusConfirmModal.open}
        onClose={() => setStatusConfirmModal({ open: false, payroll: null, status: "" })}
        onConfirm={handleConfirmedStatusChange}
        loading={generating}
        title="Update Payroll Status"
        description={`Are you sure you want to mark "${statusConfirmModal.payroll?.employee?.fullName || "this payroll"}" as ${statusConfirmModal.status}?`}
        variant="primary"
        confirmText="Update Status"
        cancelText="Cancel"
      />
    </div>
  )
}
