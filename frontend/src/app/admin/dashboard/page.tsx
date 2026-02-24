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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function AdminDashboard() {
    const [agencies, setAgencies] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [open, setOpen] = useState(false)
    const [editingAgency, setEditingAgency] = useState<any>(null)

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

    const stats = [
        { title: "Total Agencies", value: agencies.length.toString(), icon: Building2, color: "text-blue-600" },
        { title: "Active Deployments", value: agencies.filter(a => a.isActive).length.toString(), icon: Shield, color: "text-emerald-600" },
        { title: "Platform Health", value: "Optimal", icon: Users, color: "text-purple-600" },
    ]

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900">System Administration</h1>
                    <p className="text-slate-500 font-medium">Global overview and lifecycle management of security agencies.</p>
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
                            className="h-12 px-6 bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/20 rounded-xl font-bold transition-all active:scale-[0.98]"
                        >
                            <Plus className="mr-2 h-5 w-5" />
                            Create Agency
                        </Button>
                    </SheetTrigger>
                    <SheetContent className="sm:max-w-[540px] border-none shadow-2xl p-0">
                        <div className="p-6 md:p-8 overflow-y-auto h-full">
                            <SheetHeader className="mb-6">
                                <SheetTitle className="text-2xl font-black">
                                    {editingAgency ? "Modify Agency" : "Create New Agency"}
                                </SheetTitle>
                                <SheetDescription className="text-slate-500 font-medium">
                                    {editingAgency
                                        ? "Update agency infrastructure and operational status."
                                        : "Initialize a new agency node and its primary administrative credentials."}
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
                    </SheetContent>
                </Sheet>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {stats.map((stat) => (
                    <Card key={stat.title} className="border-slate-100 shadow-sm rounded-2xl p-2 transition-all hover:shadow-md">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                            <CardTitle className="text-xs font-black text-slate-400 uppercase tracking-widest">{stat.title}</CardTitle>
                            <div className={`p-2 rounded-lg bg-slate-50`}>
                                <stat.icon className={`h-5 w-5 ${stat.color}`} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-black text-slate-900">{stat.value}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="rounded-[2rem] border border-slate-100 bg-white shadow-sm overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-50 bg-slate-50/30">
                    <h3 className="font-bold text-slate-900">Agency Directory</h3>
                </div>
                <Table>
                    <TableHeader className="bg-slate-50/50">
                        <TableRow className="hover:bg-transparent border-slate-100 h-14">
                            <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest pl-8">Agency Name</TableHead>
                            <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">Login Slug</TableHead>
                            <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">Status</TableHead>
                            <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">Date Joined</TableHead>
                            <TableHead className="text-right font-bold text-slate-500 uppercase text-[10px] tracking-widest pr-8">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-20">
                                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent align-[-0.125em]" />
                                    <p className="mt-4 text-sm font-bold text-slate-400 uppercase tracking-widest">Synchronizing Agency Data...</p>
                                </TableCell>
                            </TableRow>
                        ) : agencies.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-32">
                                    <Building2 className="mx-auto h-16 w-16 text-slate-100 mb-6" />
                                    <h3 className="text-xl font-black text-slate-900">No Agencies Found</h3>
                                    <p className="text-slate-400 font-medium max-w-xs mx-auto mt-2">Initialize your first security agency to begin platform management.</p>
                                </TableCell>
                            </TableRow>
                        ) : (
                            agencies.map((agency) => (
                                <TableRow key={agency.id} className="group hover:bg-slate-50/50 transition-colors border-slate-50 h-20">
                                    <TableCell className="font-black text-slate-900 text-base pl-8">{agency.name}</TableCell>
                                    <TableCell>
                                        <code className="text-[10px] bg-slate-100 px-3 py-1.5 rounded-lg text-slate-600 font-bold tracking-wider uppercase font-mono border border-slate-200">/{agency.slug}</code>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={`rounded-full px-4 py-1 border-none font-bold text-[10px] uppercase tracking-wider ${agency.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                                            {agency.isActive ? "Active" : "Inactive"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm text-slate-500 font-bold">{new Date(agency.createdAt).toLocaleDateString()}</TableCell>
                                    <TableCell className="text-right pr-8">
                                        <div className="flex items-center justify-end space-x-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-bold rounded-xl transition-all"
                                                onClick={() => {
                                                    setEditingAgency(agency)
                                                    setOpen(true)
                                                }}
                                            >
                                                <Edit className="h-4 w-4 mr-2" />
                                                Edit
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-red-500 hover:text-red-600 hover:bg-red-50 font-bold rounded-xl transition-all"
                                                onClick={() => handleDelete(agency.id, agency.name)}
                                            >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Delete
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
    )
}
