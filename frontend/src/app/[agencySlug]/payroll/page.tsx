"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import {
  PageHeader,
  CreateButton,
  StatCard,
  DataTable,
  PageLoading,
  TableRowEmpty,
  StatusBadge,
  SubmitButton
} from "@/components/ui/design-system"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Wallet, Download, Eye, Calculator, CheckCircle2, AlertCircle, Receipt, Database, Activity, CreditCard } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import api from "@/lib/api"
import { toast } from "sonner"
import { useAuthStore } from "@/store/authStore"
import { cn } from "@/lib/utils"
import { TableCell, TableRow } from "@/components/ui/table"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"

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
  const [payrolls, setPayrolls] = useState<Payroll[]>([])
  const [designations, setDesignations] = useState<Designation[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  const [generateDesignationId, setGenerateDesignationId] = useState<string>("all")

  const { user: authUser } = useAuthStore()

  const fetchData = async () => {
    setLoading(true)
    const isAdmin = authUser?.role === 'Super Admin' || authUser?.role === 'Agency Admin'
    const hasPerm = (p: string) => isAdmin || authUser?.permissions?.includes(p)

    try {
      const [payrollRes, desRes] = await Promise.all([
        hasPerm('view_payroll') ? api.get('/payrolls') : Promise.resolve({ data: [] }),
        (hasPerm('view_designations') || isAdmin) ? api.get('/designations') : Promise.resolve({ data: [] })
      ])

      setPayrolls(payrollRes.data || [])
      setDesignations(desRes.data || [])
    } catch (err) {
      toast.error("Financial node communication failure.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleGeneratePayroll = async () => {
    setGenerating(true)
    try {
      await api.post('/payrolls/generate', {
        month: selectedMonth,
        designationId: generateDesignationId === 'all' ? undefined : generateDesignationId
      })
      toast.success("Payroll ledger generated successfully.")
      setIsDialogOpen(false)
      fetchData()
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Generation protocol failure.")
    } finally {
      setGenerating(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount)
  }

  const getMonthName = (monthStr: string) => {
    if (!monthStr) return "N/A"
    const [year, month] = monthStr.split('-')
    return new Date(parseInt(year), parseInt(month) - 1).toLocaleString('default', { month: 'long', year: 'numeric' })
  }

  if (loading) return <PageLoading message="Synchronizing Financial Node..." />

  return (
    <div className="space-y-8 pb-20">
      <PageHeader
        title="Payroll"
        titleHighlight="Ledger"
        subtitle="Regulate and authorize institutional salary disbursements and tax deductions."
        action={
          <Sheet open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <SheetTrigger asChild>
              <CreateButton label="Generate Payroll" icon={<Calculator className="h-4 w-4" />} />
            </SheetTrigger>
            <SheetContent className="sm:max-w-[700px] border-none shadow-2xl p-0 overflow-hidden bg-white">
              <div className="p-10 md:p-14 overflow-y-auto h-full">
                <SheetHeader className="mb-12">
                  <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                    <Receipt className="h-7 w-7 text-primary" />
                  </div>
                  <SheetTitle className="text-3xl font-black tracking-tight leading-none text-slate-900 uppercase">
                    Initialize Payroll Cycle
                  </SheetTitle>
                  <SheetDescription className="font-bold text-slate-500 uppercase tracking-widest text-[10px] pt-1">
                    Authorization for system-wide salary calculation and disbursement.
                  </SheetDescription>
                </SheetHeader>

                <div className="space-y-8">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 pl-1">Target Disbursement Month</Label>
                    <Input
                      type="month"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="h-14 rounded-2xl bg-slate-50 border-slate-100 focus:bg-white transition-all font-black text-slate-900"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 pl-1">Operational Filter (Designation)</Label>
                    <Select value={generateDesignationId} onValueChange={setGenerateDesignationId}>
                      <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold text-slate-900">
                        <SelectValue placeholder="Select designation scope" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-slate-100 shadow-2xl">
                        <SelectItem value="all" className="py-3 font-bold">ALL PERSONNEL NODES</SelectItem>
                        {designations.map(d => (
                          <SelectItem key={d.id} value={d.id} className="py-3 font-bold uppercase text-[11px] tracking-wider">{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100/50 flex gap-4">
                    <AlertCircle className="h-6 w-6 text-amber-600 shrink-0" />
                    <p className="text-xs font-semibold text-amber-800 leading-relaxed">
                      Generating payroll will calculate Net Pay for all employees in the selected scope based on their active contracts and attendance data.
                    </p>
                  </div>
                </div>

                <div className="mt-14 pb-10">
                  <SubmitButton
                    onClick={handleGeneratePayroll}
                    loading={generating}
                    label="Execute Financial Protocol"
                    icon={<CheckCircle2 className="h-4 w-4" />}
                  />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        }
      />

      <div className="grid gap-6 md:grid-cols-4">
        <StatCard title="Total Disbursed" value={formatCurrency(payrolls.filter(p => p.status === 'PAID').reduce((sum, p) => sum + p.netPay, 0))} icon={<CreditCard />} color="blue" />
        <StatCard title="Pending Payouts" value={formatCurrency(payrolls.filter(p => p.status !== 'PAID').reduce((sum, p) => sum + p.netPay, 0))} icon={<Wallet />} color="amber" />
        <StatCard title="Staff Coverage" value={payrolls.length} icon={<Database />} color="emerald" />
        <StatCard title="Processed Nodes" value={payrolls.filter(p => p.status === 'PAID').length} icon={<Activity />} color="violet" />
      </div>

      <div className="mt-12">
        <div className="flex items-center justify-between mb-6 px-2">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Disbursement Ledger</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Immutable record of institutional financial activities.</p>
          </div>
          <Button variant="outline" className="rounded-2xl h-12 border-slate-100 shadow-sm font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all">
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        </div>

        <DataTable columns={['Personnel Node', 'Pay Period', 'Fiscal Summary', 'Status', 'Actions']}>
          {payrolls.length === 0 ? (
            <TableRowEmpty colSpan={5} title="No Financial Records Logged" icon={<Receipt />} />
          ) : (
            payrolls.map((payroll) => (
              <TableRow key={payroll.id} className="group border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                <TableCell className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 md:h-12 md:w-12 rounded-2xl bg-slate-50 border-2 border-slate-100 flex items-center justify-center text-slate-300 font-black group-hover:border-primary/20 transition-all">
                      {payroll.employee?.fullName?.charAt(0)}
                    </div>
                    <div>
                      <div className="font-extrabold text-slate-900 leading-tight group-hover:text-primary transition-colors">{payroll.employee?.fullName}</div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{payroll.employee?.designation?.name || "STAFF-NODE"}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-black text-slate-900">{getMonthName(payroll.month)}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic pt-0.5">Verified Protocol</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-emerald-600">{formatCurrency(payroll.netPay)}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Net Compensation</span>
                  </div>
                </TableCell>
                <TableCell>
                  <StatusBadge status={payroll.status} />
                </TableCell>
                <TableCell className="text-right px-8">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-xl hover:bg-white hover:shadow-lg hover:shadow-slate-200/50 transition-all"
                  >
                    <Eye className="h-4 w-4 text-slate-400" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </DataTable>
      </div>
    </div>
  )
}
