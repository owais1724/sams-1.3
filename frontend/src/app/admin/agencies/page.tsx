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
import { Plus, Trash2, Shield } from "lucide-react"
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
import { toast } from "sonner"

export default function AgenciesPage() {
    const [agencies, setAgencies] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [open, setOpen] = useState(false)

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

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete ${name}? This will remove all agency data permanently.`)) return

        try {
            await api.delete(`/agencies/${id}`)
            toast.success("Agency deleted successfully")
            fetchAgencies()
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to delete agency")
        }
    }

    useEffect(() => {
        fetchAgencies()
    }, [])

    return (
        <div className="space-y-8 max-w-7xl mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900 mb-2">Platform Agencies</h1>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Global infrastructure command & control</p>
                </div>
                <Sheet open={open} onOpenChange={setOpen}>
                    <SheetTrigger asChild>
                        <Button className="h-14 px-8 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-xl shadow-blue-200 transition-all active:scale-[0.98]">
                            <Plus className="mr-2 h-5 w-5 stroke-[3]" />
                            REGISTER NEW ENTITY
                        </Button>
                    </SheetTrigger>
                    <SheetContent className="sm:max-w-[540px] border-l-0 shadow-2xl p-0">
                        <div className="h-full bg-slate-50/50 flex flex-col">
                            <div className="p-8 pt-12">
                                <SheetHeader className="space-y-1">
                                    <SheetTitle className="text-3xl font-black tracking-tight text-slate-900">Entity Onboarding</SheetTitle>
                                    <SheetDescription className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                                        Deploying new security infrastructure instance
                                    </SheetDescription>
                                </SheetHeader>
                                <div className="mt-10">
                                    <AgencyForm
                                        onSuccess={() => {
                                            setOpen(false)
                                            fetchAgencies()
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>

            <div className="rounded-[32px] border border-slate-100 bg-white shadow-2xl shadow-slate-200/60 overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50/50 border-b border-slate-100">
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="h-14 px-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Agency Entity</TableHead>
                            <TableHead className="h-14 px-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Private Endpoint</TableHead>
                            <TableHead className="h-14 px-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Operational Status</TableHead>
                            <TableHead className="h-14 px-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Deployed Since</TableHead>
                            <TableHead className="h-14 px-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Operations</TableHead>
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
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="h-12 w-12 bg-slate-50 rounded-2xl flex items-center justify-center">
                                            <Shield className="h-6 w-6 text-slate-200" />
                                        </div>
                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">No active entities detected</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            agencies.map((agency) => (
                                <TableRow key={agency.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-0 group">
                                    <TableCell className="px-6 py-5">
                                        <div className="flex flex-col">
                                            <span className="text-base font-black text-slate-900 group-hover:text-blue-600 transition-colors">{agency.name}</span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">ID: {agency.id.slice(-8).toUpperCase()}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-6 py-5">
                                        <div className="flex items-center gap-2">
                                            <div className="h-1 w-1 rounded-full bg-blue-400" />
                                            <code className="text-xs font-black text-blue-600 bg-blue-50/50 px-3 py-1.5 rounded-xl border border-blue-100/50">
                                                /{agency.slug}
                                            </code>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-6 py-5">
                                        <Badge className={cn(
                                            "rounded-xl px-4 py-1 border-none font-black text-[10px] uppercase tracking-widest shadow-sm",
                                            agency.isActive
                                                ? "bg-emerald-500 text-white shadow-emerald-200"
                                                : "bg-slate-500 text-white shadow-slate-200"
                                        )}>
                                            {agency.isActive ? "Active" : "Locked"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="px-6 py-5">
                                        <span className="text-sm font-bold text-slate-600">
                                            {new Date(agency.createdAt).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </span>
                                    </TableCell>
                                    <TableCell className="px-6 py-5 text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-10 px-4 text-red-600 hover:text-white hover:bg-red-500 font-bold rounded-xl transition-all active:scale-95"
                                            onClick={() => handleDelete(agency.id, agency.name)}
                                        >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            TERMINATE
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
