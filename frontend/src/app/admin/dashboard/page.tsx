"use client"

import { useEffect, useState } from "react"
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
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Building2, Shield, Users, Edit3, Power, PowerOff } from "lucide-react"
import { RowEditButton, RowDeleteButton } from "@/components/ui/design-system"
import { cn } from "@/lib/utils"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import { AgencyForm } from "@/components/admin/AgencyForm"
import { toast } from "@/components/ui/sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertModal } from "@/components/ui/alert-modal"

export default function AdminDashboard() {
    const [agencies, setAgencies] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [open, setOpen] = useState(false)
    const [editingAgency, setEditingAgency] = useState<any>(null)
    const [deleteModal, setDeleteModal] = useState<{ open: boolean, id: string, name: string }>({
        open: false,
        id: "",
        name: ""
    })
    const [isDeleting, setIsDeleting] = useState(false)
    const [toggleModal, setToggleModal] = useState<{ open: boolean, id: string, name: string, currentStatus: boolean }>({
        open: false, id: "", name: "", currentStatus: true
    })
    const [isToggling, setIsToggling] = useState(false)

    const fetchAgencies = async () => {
        try {
            const response = await api.get("/agencies")
            setAgencies(response.data)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!deleteModal.id) return
        setIsDeleting(true)
        try {
            await api.delete(`/agencies/${deleteModal.id}`)
            toast.success("Agency deleted successfully")
            setDeleteModal({ open: false, id: "", name: "" })
            fetchAgencies()
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to delete agency")
        } finally {
            setIsDeleting(false)
        }
    }

    const handleToggleStatus = async () => {
        if (!toggleModal.id) return
        setIsToggling(true)
        try {
            const res = await api.patch(`/agencies/${toggleModal.id}/toggle-status`)
            const newStatus = res.data.isActive
            setAgencies(prev => prev.map(a => a.id === toggleModal.id ? { ...a, isActive: newStatus } : a))
            toast.success(newStatus ? `${toggleModal.name} has been activated` : `${toggleModal.name} has been deactivated`)
            setToggleModal({ open: false, id: "", name: "", currentStatus: true })
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to update agency status")
        } finally {
            setIsToggling(false)
        }
    }

    useEffect(() => {
        fetchAgencies()
    }, [])

    const stats = [
        { title: "Total Agencies", value: agencies.length.toString(), icon: Building2, color: "text-blue-600" },
        { title: "Active Deployments", value: agencies.filter(a => a.isActive).length.toString(), icon: Shield, color: "text-emerald-600" },
        { title: "Platform Health", value: "Optimal", icon: Users, color: "text-purple-600" },
    ]

    return (
        <div className="space-y-12 max-w-7xl mx-auto px-6 py-12 font-inter selection:bg-primary/30">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-2 w-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_#FFB800]" />
                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.5em]">System Level: Authoritative</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white mb-3 truncate italic uppercase">Infrastructure <span className="text-primary not-italic">Command</span></h1>
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.4em] truncate flex items-center gap-2">
                        <Shield className="h-3 w-3 text-primary/50" />
                        Global Network Node Management // SAMS HYPERCORE v4.0
                    </p>
                </div>

                <Sheet open={open} onOpenChange={(val) => {
                    setOpen(val)
                    if (!val) setEditingAgency(null)
                }}>
                    <SheetTrigger asChild>
                        <Button
                            variant="premium"
                            size="cta"
                            onClick={() => {
                                setEditingAgency(null)
                                setOpen(true)
                            }}
                            className="h-16 w-full md:w-auto px-10 uppercase tracking-[0.2em]"
                        >
                            <Plus className="mr-3 h-5 w-5 stroke-[4]" />
                            Initialize Agency
                        </Button>
                    </SheetTrigger>
                    <SheetContent className="sm:max-w-[640px] border-l border-white/10 bg-black/95 backdrop-blur-3xl shadow-[0_0_100px_rgba(0,0,0,0.8)] p-0">
                        <div className="h-full flex flex-col relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/5 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
                            <div className="p-10 md:p-16 overflow-y-auto h-full relative z-10 scrollbar-hide">
                                <SheetHeader className="mb-12">
                                    <div className="h-1 w-12 bg-primary mb-6" />
                                    <SheetTitle className="text-4xl font-black tracking-tighter text-white uppercase italic">
                                        {editingAgency ? "Modify Entity" : "Entity Onboarding"}
                                    </SheetTitle>
                                    <SheetDescription className="text-xs font-black text-primary/60 uppercase tracking-[0.3em] leading-relaxed mt-4">
                                        {editingAgency
                                            ? "Adjust specific node infrastructure and operational parameters"
                                            : "Provisioning new high-security institutional node instance"}
                                    </SheetDescription>
                                </SheetHeader>
                                <AgencyForm
                                    initialData={editingAgency}
                                    onSuccess={() => {
                                        setOpen(false)
                                        setEditingAgency(null)
                                        fetchAgencies()
                                    }}
                                />
                            </div>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>

            {/* Stat Matrix */}
            <div className="grid gap-8 md:grid-cols-3">
                {stats.map((stat) => (
                    <Card key={stat.title} className="bg-card border-white/5 shadow-2xl rounded-[40px] p-2 transition-all hover:translate-y-[-4px] hover:border-primary/20 duration-500 group overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6 p-8">
                            <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.4em]">{stat.title}</CardTitle>
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 group-hover:border-primary/30 transition-all duration-500">
                                <stat.icon className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
                            </div>
                        </CardHeader>
                        <CardContent className="p-8 pt-0">
                            <div className="text-5xl font-black text-white tracking-tighter italic">{stat.value}</div>
                            <div className="h-1 w-8 bg-primary/30 rounded-full mt-4 group-hover:w-16 transition-all duration-500" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Data Table */}
            <div className="rounded-[48px] border border-white/5 bg-card shadow-3xl overflow-hidden group/table">
                <div className="px-8 sm:px-12 py-8 bg-white/[0.02] border-b border-white/5 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div>
                        <h3 className="text-2xl font-black text-white italic tracking-tight uppercase">Network Directory</h3>
                        <p className="text-[10px] font-black text-primary/60 uppercase tracking-[0.5em] mt-2">Active Infrastructure Nodes // Authorized Entities</p>
                    </div>
                    <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-6 py-3 rounded-2xl shadow-inner">
                        <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                        <span className="text-[11px] text-white font-black uppercase tracking-widest">{agencies.length} Total Systems</span>
                    </div>
                </div>
                <div className="overflow-x-auto scrollbar-hide">
                    <Table className="min-w-[800px]">
                        <TableHeader>
                            <TableRow className="hover:bg-transparent border-white/5 h-16">
                                <TableHead className="px-8 sm:px-12 text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Operational Node</TableHead>
                                <TableHead className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Cyber Endpoint</TableHead>
                                <TableHead className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Node Status</TableHead>
                                <TableHead className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Deployment Date</TableHead>
                                <TableHead className="text-right text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] pr-8 sm:px-12">Operations Hub</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow className="hover:bg-transparent border-none">
                                    <TableCell colSpan={5} className="text-center py-32">
                                        <div className="flex flex-col items-center gap-6">
                                            <div className="h-16 w-16 border-t-2 border-r-2 border-primary rounded-full animate-spin shadow-[0_0_20px_rgba(255,184,0,0.2)]" />
                                            <p className="text-xs font-black text-primary/60 uppercase tracking-[0.6em] animate-pulse">Deep Packet Search...</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : agencies.length === 0 ? (
                                <TableRow className="hover:bg-transparent border-none">
                                    <TableCell colSpan={5} className="text-center py-40">
                                        <div className="relative inline-block mb-10">
                                            <Building2 className="h-24 w-24 text-white/5 animate-pulse" />
                                            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full opacity-20" />
                                        </div>
                                        <h3 className="text-3xl font-black text-white uppercase italic tracking-widest">Network Zero</h3>
                                        <p className="text-muted-foreground font-black uppercase text-[10px] tracking-[0.4em] mt-4">Initialize first node to establish grid presence</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                agencies.map((agency) => (
                                    <TableRow key={agency.id} className="group/row hover:bg-white/[0.02] transition-all duration-500 border-white/5 sm:h-28">
                                        <TableCell className="pl-8 sm:pl-12">
                                            <div className="flex flex-col gap-2">
                                                <span className="text-lg font-black text-white group-hover/row:text-primary transition-colors uppercase italic">{agency.name}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.1em] bg-white/5 px-2 py-0.5 rounded border border-white/5">NODE_{agency.id.slice(-6).toUpperCase()}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="h-1.5 w-1.5 rounded-full bg-primary/40 group-hover/row:bg-primary transition-colors" />
                                                <code className="text-xs font-black text-primary bg-primary/5 px-4 py-2 rounded-2xl border border-primary/20 uppercase font-mono tracking-widest shadow-inner">
                                                    /{agency.slug}
                                                </code>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={cn(
                                                "rounded-xl px-5 py-2 border-none font-black text-[10px] uppercase tracking-[0.3em] shadow-2xl transition-all duration-500",
                                                agency.isActive
                                                    ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                                    : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                                            )}>
                                                {agency.isActive ? "Online" : "Locked"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm font-black text-muted-foreground/60 uppercase tracking-widest">
                                            {new Date(agency.createdAt).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </TableCell>
                                        <TableCell className="pr-8 sm:px-12 text-right">
                                            <div className="flex items-center justify-end gap-3 opacity-60 group-hover/row:opacity-100 transition-all duration-500 translate-x-4 group-hover/row:translate-x-0">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className={cn(
                                                        "h-12 px-6 font-black rounded-xl transition-all active:scale-95 shadow-lg text-[10px] uppercase tracking-widest",
                                                        agency.isActive
                                                            ? "bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-black border border-amber-500/20"
                                                            : "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-black border border-emerald-500/20"
                                                    )}
                                                    onClick={() => setToggleModal({ open: true, id: agency.id, name: agency.name, currentStatus: agency.isActive })}
                                                >
                                                    {agency.isActive
                                                        ? <><PowerOff className="h-4 w-4 mr-2" />Lock</>
                                                        : <><Power className="h-4 w-4 mr-2" />Boot</>
                                                    }
                                                </Button>
                                                <RowEditButton className="h-12 w-12 p-0 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10" label="" onClick={() => { setEditingAgency(agency); setOpen(true) }} />
                                                <RowDeleteButton className="h-12 w-12 p-0 bg-rose-500/5 hover:bg-rose-500 text-rose-500 hover:text-white rounded-xl border border-white/5" label="" onClick={() => setDeleteModal({ open: true, id: agency.id, name: agency.name })} />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Modals styling similarly updated in their components */}
            <AlertModal
                isOpen={toggleModal.open}
                onClose={() => setToggleModal({ ...toggleModal, open: false })}
                onConfirm={handleToggleStatus}
                loading={isToggling}
                title={toggleModal.currentStatus ? "NODE DEACTIVATION" : "NODE ACTIVATION"}
                variant={toggleModal.currentStatus ? "danger" : "success"}
                description={
                    toggleModal.currentStatus
                        ? `Initiating global lock on ${toggleModal.name}. All endpoint access will be terminated immediately. Operational data remains encrypted.`
                        : `Authorizing re-activation of ${toggleModal.name}. Infrastructure access will be restored across all sectors.`
                }
                confirmText={toggleModal.currentStatus ? "Authorize Lock" : "Authorize Boot"}
            />

            <AlertModal
                isOpen={deleteModal.open}
                onClose={() => setDeleteModal({ ...deleteModal, open: false })}
                onConfirm={handleDelete}
                loading={isDeleting}
                title="SYSTEM TERMINATION"
                variant="danger"
                description={`This action will permanently purge ${deleteModal.name} and all derivative data from the HYPERCORE network. This operation is IRREVERSIBLE.`}
                confirmText="Execute Purge"
            />
        </div>
    )
}
