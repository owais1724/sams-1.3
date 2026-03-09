"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Shield,
    Search,
    Filter,
    Download,
    Eye,
    Lock,
    UserPlus,
    Building2,
    Activity,
    ClipboardCheck,
    AlertCircle,
    Database,
    ShieldCheck
} from "lucide-react"
import {
    PageHeader,
    StatCard,
    DataTable,
    PageLoading,
    TableRowEmpty,
    StatusBadge
} from "@/components/ui/design-system"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { TableCell, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import api from "@/lib/api"
import { toast } from "@/components/ui/sonner"

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedLog, setSelectedLog] = useState<any>(null)

    const fetchLogs = async () => {
        try {
            const response = await api.get("/audit-logs")
            setLogs(response.data)
        } catch (error) {
            toast.error("Intelligence ledger communication failure.")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchLogs()
    }, [])

    const getIcon = (action: string) => {
        if (action.includes('LOGIN')) return Lock
        if (action.includes('CREATE')) return UserPlus
        if (action.includes('UPDATE')) return Activity
        if (action.includes('DELETE')) return AlertCircle
        return Activity
    }

    const filteredLogs = logs.filter(log =>
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.details?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.user?.fullName?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (loading && logs.length === 0) return <PageLoading message="Synchronizing Forensic Ledger..." />

    return (
        <div className="space-y-8 pb-20">
            {/* Dossier Dialog */}
            <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
                <DialogContent className="sm:max-w-2xl border-none rounded-[40px] p-0 overflow-hidden shadow-2xl bg-white">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Security Audit Dossier</DialogTitle>
                        <DialogDescription>Detailed view of security event metadata and forensic logs.</DialogDescription>
                    </DialogHeader>
                    {selectedLog && (
                        <div className="relative">
                            <div className="bg-slate-950 p-5 sm:p-10 text-white relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 blur-[100px] rounded-full -mr-32 -mt-32" />
                                <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/10 blur-[80px] rounded-full -ml-24 -mb-24" />

                                <div className="relative z-10">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center border border-white/20 backdrop-blur-md", selectedLog.severity === 'CRITICAL' ? "bg-red-500/20 text-red-400" : "bg-teal-500/20 text-teal-400")}>
                                            <Shield className="h-5 w-5" />
                                        </div>
                                        <Badge variant="outline" className="text-white/40 border-white/10 font-bold tracking-widest text-[9px]">ENCRYPTED PROTOCOL</Badge>
                                    </div>
                                    <h2 className="text-4xl font-black tracking-tighter mb-2 uppercase">Forensic <span className="text-teal-400">Dossier</span></h2>
                                    <p className="text-slate-400 font-medium text-sm">System integrity event verified and logged at secure node.</p>
                                </div>
                            </div>

                            <div className="p-10 space-y-10">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <Lock className="h-3 w-3" /> Action Key
                                        </p>
                                        <p className="text-sm font-black text-slate-900 font-mono tracking-tight bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 uppercase">{selectedLog.action}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <Activity className="h-3 w-3" /> Severity Matrix
                                        </p>
                                        <Badge className={cn("font-black text-[10px] px-3 py-1 rounded-full",
                                            selectedLog.severity === 'CRITICAL' ? "bg-red-500 text-white" :
                                                selectedLog.severity === 'MEDIUM' ? "bg-amber-500 text-white" : "bg-emerald-500 text-white")}>
                                            {selectedLog.severity} PRIORITY
                                        </Badge>
                                    </div>
                                </div>

                                <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 relative group overflow-hidden">
                                    <div className="relative z-10">
                                        <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                                            <ClipboardCheck className="h-3.5 w-3.5" /> Intelligence Narrative
                                        </p>
                                        <p className="text-slate-700 font-medium leading-relaxed italic text-sm">
                                            "{selectedLog.details || "No operational commentary provided for this transaction."}"
                                        </p>
                                    </div>
                                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                        <Building2 className="h-20 w-20" />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Forensic Metadata</p>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase">Operator Node</p>
                                            <p className="text-xs font-black text-slate-900">{selectedLog.user?.fullName || "SYSTEM_DAEMON"}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase">Temporal Stamp</p>
                                            <p className="text-xs font-black text-slate-900">{new Date(selectedLog.createdAt).toLocaleString()}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <PageHeader
                title="Forensic"
                titleHighlight="Audit"
                subtitle="Immutable ledger of institutional security events and operational transactions."
                action={
                    <Button variant="outline" className="rounded-2xl h-12 border-slate-100 shadow-sm font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all bg-white">
                        <Download className="h-4 w-4 mr-2" /> Export Ledger
                    </Button>
                }
            />

            <div className="grid gap-6 md:grid-cols-3">
                <StatCard title="Total Events" value={logs.length} icon={<Database />} color="blue" />
                <StatCard title="Critical Nodes" value={logs.filter(l => l.severity === 'CRITICAL').length} icon={<Shield />} color="rose" />
                <StatCard title="Active Session" value={logs.filter(l => l.action.includes('LOGIN')).length} icon={<ShieldCheck />} color="emerald" />
            </div>

            <div className="mt-4">
                <div className="relative group max-w-md mb-8">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-hover:text-primary transition-colors" />
                    <Input
                        placeholder="Search forensic records..."
                        className="pl-11 pr-4 py-7 bg-white border-slate-100 rounded-3xl w-full focus:ring-primary shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-slate-300/50 transition-all font-bold italic"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <DataTable columns={['Temporal Stamp', 'Security Event', 'Operator Node', 'Severity Matrix', 'Actions']}>
                    {filteredLogs.length === 0 ? (
                        <TableRowEmpty colSpan={5} title="No Forensic Data Found" icon={<Shield />} />
                    ) : (
                        filteredLogs.map((log, idx) => {
                            const LogIcon = getIcon(log.action)
                            return (
                                <TableRow key={log.id} className="group border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                    <TableCell className="px-4 sm:px-4 sm:px-8 py-4 sm:py-5 sm:py-6">
                                        <div className="flex flex-col">
                                            <span className="font-extrabold text-slate-900">{new Date(log.createdAt).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' })}</span>
                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{new Date(log.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center border border-slate-100 group-hover:border-primary/20 group-hover:text-primary transition-all">
                                                <LogIcon className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <div className="font-extrabold text-slate-900 uppercase tracking-tight text-xs">{log.action.replaceAll('_', ' ')}</div>
                                                <div className="text-[10px] text-slate-500 font-medium truncate max-w-[200px]">{log.details}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="bg-white text-slate-500 border-slate-100 font-bold px-3 py-1 rounded-full text-[10px] uppercase">
                                            {log.user?.fullName || "SYSTEM"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={cn(
                                            "shadow-none px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                                            log.severity === 'CRITICAL' ? "bg-red-500 text-white" :
                                                log.severity === 'MEDIUM' ? "bg-amber-500 text-white" : "bg-emerald-500 text-white"
                                        )}>
                                            {log.severity}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right px-4 sm:px-8">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-10 w-10 rounded-xl hover:bg-white hover:shadow-lg transition-all group-hover:text-primary"
                                            onClick={() => setSelectedLog(log)}
                                        >
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )
                        })
                    )}
                </DataTable>
            </div>
        </div>
    )
}
