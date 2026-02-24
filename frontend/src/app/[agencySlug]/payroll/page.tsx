"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Wallet, Plus, Download, Eye, Calculator, CheckCircle2, AlertCircle, Calendar, Filter } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import api from "@/lib/api"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

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

const statusColors = {
  DRAFT: "bg-gray-100 text-gray-800",
  PROCESSED: "bg-blue-100 text-blue-800",
  PAID: "bg-green-100 text-green-800"
}

export default function PayrollPage() {
  const { agencySlug } = useParams()
  const [payrolls, setPayrolls] = useState<Payroll[]>([])
  const [designations, setDesignations] = useState<Designation[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  // Generation Form
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  const [generateDesignationId, setGenerateDesignationId] = useState<string>("all")
  const [employees, setEmployees] = useState<any[]>([])
  const [generationMode, setGenerationMode] = useState<'bulk' | 'individual'>('bulk')
  const [targetEmployeeId, setTargetEmployeeId] = useState<string>("")
  const [customAmount, setCustomAmount] = useState<string>("")

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [payrollRes, designationRes, employeeRes] = await Promise.all([
        api.get('/payrolls'),
        api.get('/designations'),
        api.get('/employees')
      ])
      setPayrolls(payrollRes.data || [])
      setDesignations(designationRes.data || [])
      setEmployees(employeeRes.data || [])
    } catch (error) {
      console.error('Failed to fetch data:', error)
      toast.error("Failed to load records")
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      if (generationMode === 'bulk') {
        const res = await api.post('/payrolls/generate-bulk', {
          month: selectedMonth,
          designationId: generateDesignationId === "all" ? undefined : generateDesignationId
        })
        toast.success(`Generated payroll for ${res.data} employees`)
      } else {
        if (!targetEmployeeId || !customAmount) {
          toast.error("Please select an employee and enter an amount")
          setGenerating(false)
          return
        }
        await api.post('/payrolls/generate-individual', {
          employeeId: targetEmployeeId,
          month: selectedMonth,
          amount: parseFloat(customAmount)
        })
        toast.success(`Individual payroll generated successfully`)
      }
      setIsDialogOpen(false)
      fetchData()
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Generation failed")
    } finally {
      setGenerating(false)
    }
  }

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      await api.post(`/payrolls/${id}/status`, { status: newStatus })
      toast.success(`Payroll status updated to ${newStatus}`)
      fetchData()
    } catch (error: any) {
      toast.error("Failed to update status")
    }
  }

  const stats = {
    totalNet: payrolls.reduce((acc, p) => acc + p.netPay, 0),
    paidCount: payrolls.filter(p => p.status === 'PAID').length,
    pendingCount: payrolls.filter(p => p.status !== 'PAID').length
  }

  // Group payrolls by designation
  const groupedPayrolls = designations.map(d => ({
    ...d,
    records: payrolls.filter(p => p.employee?.designation?.id === d.id)
  })).filter(group => group.records.length > 0)

  if (loading && payrolls.length === 0) {
    return <div className="flex items-center justify-center h-64">Loading payroll system...</div>
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center">
            <Wallet className="h-8 w-8 mr-3 text-primary" />
            Payroll Management
          </h1>
          <p className="text-slate-500">Manage salary processing by designation or personnel.</p>
        </div>

        <Button onClick={() => setIsDialogOpen(true)} className="bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4 mr-2" />
          Generate Payroll
        </Button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-[32px] border-slate-100 shadow-xl shadow-slate-200/50 p-6 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Net Disbursement</p>
            <h3 className="text-3xl font-black text-slate-900 mt-1">${stats.totalNet.toLocaleString()}</h3>
          </div>
          <div className="h-14 w-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
            <Wallet className="h-7 w-7" />
          </div>
        </Card>

        <Card className="rounded-[32px] border-slate-100 shadow-xl shadow-slate-200/50 p-6 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Transfers Completed</p>
            <h3 className="text-3xl font-black text-emerald-600 mt-1">{stats.paidCount}</h3>
          </div>
          <div className="h-14 w-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
            <CheckCircle2 className="h-7 w-7" />
          </div>
        </Card>

        <Card className="rounded-[32px] border-slate-100 shadow-xl shadow-slate-200/50 p-6 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Awaiting Processing</p>
            <h3 className="text-3xl font-black text-amber-600 mt-1">{stats.pendingCount}</h3>
          </div>
          <div className="h-14 w-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
            <AlertCircle className="h-7 w-7" />
          </div>
        </Card>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <div className="flex items-center justify-between mb-4 border-b border-slate-200">
          <TabsList className="bg-transparent h-auto p-0 space-x-6">
            <TabsTrigger
              value="all"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 pb-2 font-bold"
            >
              All Payrolls
            </TabsTrigger>
            {designations.map(d => (
              <TabsTrigger
                key={d.id}
                value={d.id}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 pb-2 font-bold"
              >
                {d.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="all" className="mt-0">
          <div className="grid gap-4">
            {payrolls.length > 0 ? (
              payrolls.map((p) => <PayrollCard key={p.id} payroll={p} onUpdateStatus={updateStatus} />)
            ) : (
              <EmptyState />
            )}
          </div>
        </TabsContent>

        {designations.map(d => (
          <TabsContent key={d.id} value={d.id} className="mt-0">
            <div className="grid gap-4">
              {payrolls.filter(p => p.employee?.designation?.id === d.id || p.employee?.designation?.name === d.name).length > 0 ? (
                payrolls.filter(p => p.employee?.designation?.id === d.id || p.employee?.designation?.name === d.name)
                  .map((p) => <PayrollCard key={p.id} payroll={p} onUpdateStatus={updateStatus} />)
              ) : (
                <EmptyState message={`No payroll records found for ${d.name}`} />
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Generation Dialog */}
      {isDialogOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md shadow-2xl border-none rounded-[40px] overflow-hidden">
            <CardHeader className="bg-slate-50 p-8 border-b border-slate-100">
              <CardTitle className="flex items-center text-xl font-black text-slate-900 uppercase tracking-tight">
                <Calculator className="h-5 w-5 mr-3 text-primary" />
                Initialize Payroll
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 p-8">
              <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl mb-2">
                <Button
                  variant={generationMode === 'bulk' ? 'default' : 'ghost'}
                  className={`flex-1 text-[10px] font-black uppercase tracking-widest h-10 rounded-xl ${generationMode === 'bulk' ? 'bg-white text-primary shadow-sm hover:bg-white' : 'text-slate-500 hover:bg-slate-200/50'}`}
                  onClick={() => setGenerationMode('bulk')}
                >
                  Bulk Ops
                </Button>
                <Button
                  variant={generationMode === 'individual' ? 'default' : 'ghost'}
                  className={`flex-1 text-[10px] font-black uppercase tracking-widest h-10 rounded-xl ${generationMode === 'individual' ? 'bg-white text-primary shadow-sm hover:bg-white' : 'text-slate-500 hover:bg-slate-200/50'}`}
                  onClick={() => setGenerationMode('individual')}
                >
                  Unit Target
                </Button>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Operational Period</label>
                <Input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="h-14 rounded-2xl border-slate-200 bg-slate-50/50 focus:bg-white font-bold transition-all px-6"
                />
              </div>

              {generationMode === 'bulk' ? (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Rank Filter</label>
                    <Select value={generateDesignationId} onValueChange={setGenerateDesignationId}>
                      <SelectTrigger className="h-14 rounded-2xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all px-6">
                        <SelectValue placeholder="All Designations" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-slate-200">
                        <SelectItem value="all" className="font-bold">Entire Agency Roster</SelectItem>
                        {designations.map(d => (
                          <SelectItem key={d.id} value={d.id} className="font-bold">{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest leading-relaxed">
                      Auto-generating disbursement records for <span className="underline">{generateDesignationId === "all" ? "Entire Agency" : designations.find(d => d.id === generateDesignationId)?.name}</span>. Base salary tables will be applied.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Personnel Select</label>
                    <Select value={targetEmployeeId} onValueChange={(val) => {
                      setTargetEmployeeId(val);
                      const emp = employees.find(e => e.id === val);
                      if (emp) setCustomAmount(emp.basicSalary?.toString() || "");
                    }}>
                      <SelectTrigger className="h-14 rounded-2xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all px-6">
                        <SelectValue placeholder="Identify officer..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-slate-200">
                        {employees.map(e => (
                          <SelectItem key={e.id} value={e.id} className="font-bold">{e.fullName} <span className="text-slate-400 text-[10px] ml-2">[{e.designation?.name}]</span></SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Manual Amount ($)</label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      className="h-14 rounded-2xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all px-6 text-lg font-black"
                    />
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex space-x-4 p-8 bg-slate-50 border-t border-slate-100">
              <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="flex-1 h-14 rounded-2xl font-bold text-slate-500 hover:text-slate-900 transition-all">
                ABORT
              </Button>
              <Button
                onClick={handleGenerate}
                className="flex-1 h-14 rounded-2xl bg-primary text-white font-black shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                disabled={generating}
              >
                {generating ? "PROCESSING..." : "COMMIT PAYROLL"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  )
}

function PayrollCard({ payroll, onUpdateStatus }: { payroll: Payroll, onUpdateStatus: (id: string, s: string) => void }) {
  return (
    <Card className="rounded-[32px] border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden hover:shadow-2xl transition-all duration-300 group">
      <div className={`h-1.5 w-full ${payroll.status === 'PAID' ? 'bg-emerald-500' :
        payroll.status === 'PROCESSED' ? 'bg-blue-500' : 'bg-slate-200'
        }`} />
      <CardContent className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 bg-slate-50 border-2 border-slate-100 rounded-2xl flex items-center justify-center font-black text-slate-400 uppercase text-xs group-hover:scale-110 transition-transform">
              {payroll.employee?.fullName?.charAt(0) || 'E'}
            </div>
            <div>
              <p className="font-extrabold text-slate-900 text-lg tracking-tight">{payroll.employee?.fullName}</p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{payroll.employee?.designation.name} • OPS-{payroll.id.slice(-4).toUpperCase()}</p>
            </div>
          </div>
          <Badge className={cn(
            "rounded-full px-4 py-1 font-black text-[10px] uppercase border-none shadow-none",
            statusColors[payroll.status as keyof typeof statusColors]
          )}>
            {payroll.status}
          </Badge>
        </div>

        <div className="grid grid-cols-4 gap-6 py-6 border-y border-slate-50">
          <div className="text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Base</p>
            <p className="text-base font-bold text-slate-900">${payroll.basicSalary.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Incentives</p>
            <p className="text-base font-bold text-emerald-600">+${payroll.allowances.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tax/Ded.</p>
            <p className="text-base font-bold text-red-600">-${payroll.deductions.toLocaleString()}</p>
          </div>
          <div className="text-center bg-slate-50/50 rounded-2xl py-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Net Dist.</p>
            <p className="text-base font-black text-slate-900 font-mono">${payroll.netPay.toLocaleString()}</p>
          </div>
        </div>

        <div className="flex justify-between items-center mt-8">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Logged: {new Date(payroll.generatedDate).toLocaleDateString()}</p>
          <div className="flex space-x-3">
            {payroll.status === 'DRAFT' && (
              <Button onClick={() => onUpdateStatus(payroll.id, 'PROCESSED')} className="h-10 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary text-white shadow-lg shadow-primary/20">Commit</Button>
            )}
            {payroll.status === 'PROCESSED' && (
              <Button onClick={() => onUpdateStatus(payroll.id, 'PAID')} className="h-10 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-100">Disburse</Button>
            )}
            <Button variant="ghost" className="h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900">
              <Download className="h-4 w-4 mr-2" />
              Voucher
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function EmptyState({ message = "No payroll records found" }: { message?: string }) {
  return (
    <Card className="border-dashed border-2 bg-slate-50/50">
      <CardContent className="text-center py-12">
        <Wallet className="h-10 w-10 text-slate-200 mx-auto mb-3" />
        <p className="text-slate-500 font-medium">{message}</p>
      </CardContent>
    </Card>
  )
}
