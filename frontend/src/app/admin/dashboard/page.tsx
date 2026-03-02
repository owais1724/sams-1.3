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
import { Plus, Trash2, Building2, Shield, Users, Edit } from "lucide-react"
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

    useEffect(() => {
        fetchAgencies()
    }, [])

    const stats = [
        { title: "Total Agencies", value: agencies.length.toString(), icon: Building2, color: "text-blue-600" },
        { title: "Active Deployments", value: agencies.filter(a => a.isActive).length.toString(), icon: Shield, color: "text-emerald-600" },
        { title: "Platform Health", value: "Optimal", icon: Users, color: "text-purple-600" },
    ]

    return (
        <div className="space-y-10 max-w-7xl mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="flex-1 min-w-0">
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 mb-2 truncate">System Administration</h1>
                    <p className="text-[10px] md:text-sm font-bold text-slate-400 uppercase tracking-widest truncate">Global infrastructure command & control</p>
                </div>

                <Sheet open={open} onOpenChange={(val) => {
                    setOpen(val)
                    if (!val) setEditingAgency(null)
                }}>
                    <SheetTrigger asChild>
                        <Button
                            onClick={() => {
                                setEditingAgency(null)
                                setOpen(true)
                            }}
                            className="h-12 md:h-14 w-full md:w-auto px-6 md:px-8 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-xl shadow-blue-200 transition-all active:scale-[0.98] text-xs md:text-base"
                        >
                            <Plus className="mr-2 h-4 w-4 md:h-5 md:w-5 stroke-[3]" />
                            INITIALIZE AGENCY
                        </Button>
                    </SheetTrigger>
                    <SheetContent className="sm:max-w-[540px] border-l-0 shadow-2xl p-0 rounded-l-[40px] overflow-hidden">
                        <div className="h-full bg-slate-50/50 flex flex-col">
                            <div className="p-8 pt-12 overflow-y-auto h-full">
                                <SheetHeader className="mb-10">
                                    <SheetTitle className="text-3xl font-black tracking-tight text-slate-900">
                                        {editingAgency ? "Modify Agency" : "Entity Onboarding"}
                                    </SheetTitle>
                                    <SheetDescription className="text-sm font-bold text-slate-400 uppercase tracking-widest leading-loose">
                                        {editingAgency
                                            ? "Update agency infrastructure and operational status"
                                            : "Deploying new security infrastructure instance"}
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

            <div className="grid gap-6 md:grid-cols-3">
                {stats.map((stat) => (
                    <Card key={stat.title} className="border-slate-100 shadow-xl shadow-slate-200/50 rounded-[32px] p-2 transition-all hover:scale-[1.02] duration-300">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 p-6">
                            <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{stat.title}</CardTitle>
                            <div className={`p-3 rounded-2xl bg-slate-50`}>
                                <stat.icon className={`h-6 w-6 ${stat.color}`} />
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 pt-0">
                            <div className="text-4xl font-black text-slate-900 tracking-tight">{stat.value}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="rounded-[32px] border border-slate-100 bg-white shadow-2xl shadow-slate-200/60 overflow-hidden">
                <div className="px-8 py-7 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-black text-slate-900">Agency Directory</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Active Network Nodes</p>
                    </div>
                    <Badge className="bg-blue-600/10 text-blue-600 border-none font-black text-[10px] uppercase tracking-widest px-4 py-1.5 rounded-xl">
                        {agencies.length} Total Entities
                    </Badge>
                </div>
                <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200">
                    <Table className="min-w-[900px]">
                        <TableHeader className="bg-slate-50/30">
                            <TableRow className="hover:bg-transparent border-slate-100 h-14">
                                <TableHead className="px-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Agency Entity</TableHead>
                                <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Private Endpoint</TableHead>
                                <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Operational Status</TableHead>
                                <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Deployed Since</TableHead>
                                <TableHead className="text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pr-8">Operations</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-20">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Scanning Network...</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : agencies.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-32">
                                        <Building2 className="mx-auto h-16 w-16 text-slate-100 mb-6 animate-bounce" />
                                        <h3 className="text-xl font-black text-slate-900">No Entities Found</h3>
                                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-2">Initialize your first entity to begin management</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                agencies.map((agency) => (
                                    <TableRow key={agency.id} className="group hover:bg-slate-50/50 transition-colors border-slate-50 h-24">
                                        <TableCell className="pl-8">
                                            <div className="flex flex-col">
                                                <span className="text-base font-black text-slate-900 group-hover:text-blue-600 transition-colors">{agency.name}</span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">ID: {agency.id.slice(-8).toUpperCase()}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="h-1 w-1 rounded-full bg-blue-400" />
                                                <code className="text-xs font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-2xl border border-blue-100/50 uppercase font-mono tracking-wider">
                                                    /{agency.slug}
                                                </code>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={cn(
                                                "rounded-xl px-4 py-1.5 border-none font-black text-[10px] uppercase tracking-widest shadow-sm",
                                                agency.isActive
                                                    ? "bg-emerald-500 text-white shadow-emerald-200"
                                                    : "bg-slate-500 text-white shadow-slate-200"
                                            )}>
                                                {agency.isActive ? "Active" : "Locked"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm font-bold text-slate-500">
                                            {new Date(agency.createdAt).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </TableCell>
                                        <TableCell className="pr-8 text-right">
                                            <div className="flex items-center justify-end gap-3 translate-x-4 md:translate-x-0 group-hover:translate-x-0 transition-transform">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-11 px-5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white font-black rounded-2xl transition-all active:scale-95 shadow-sm shadow-blue-100/50"
                                                    onClick={() => {
                                                        setEditingAgency(agency)
                                                        setOpen(true)
                                                    }}
                                                >
                                                    <Edit className="h-4 w-4 mr-2" />
                                                    EDIT
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-11 px-5 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white font-black rounded-2xl transition-all active:scale-95 shadow-sm shadow-red-100/50"
                                                    onClick={() => setDeleteModal({ open: true, id: agency.id, name: agency.name })}
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    REMOVE
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <AlertModal
                isOpen={deleteModal.open}
                onClose={() => setDeleteModal({ ...deleteModal, open: false })}
                onConfirm={handleDelete}
                loading={isDeleting}
                title="TERMINATE ENTITY"
                variant="danger"
                description={`This action will permanently delete ${deleteModal.name} and all associated data from the network. This cannot be undone.`}
                confirmText="Confirm Termination"
            />
        </div>
    )
}
