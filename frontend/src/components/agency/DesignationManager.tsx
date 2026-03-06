"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Trash2, Building, ShieldCheck, Briefcase } from "lucide-react"
import { cn } from "@/lib/utils"
import api from "@/lib/api"
import { toast } from "@/components/ui/sonner"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { RowDeleteButton, TableRowEmpty } from "@/components/ui/design-system"
import { useAuthStore } from "@/store/authStore"
import { PermissionGuard } from "@/components/common/PermissionGuard"
import { Label } from "@/components/ui/label"

export function DesignationManager({ designations, onUpdate }: { designations: any[], onUpdate: () => void }) {
    const [loading, setLoading] = useState(false)
    const [newName, setNewName] = useState("")
    const [newDesc, setNewDesc] = useState("")
    const { user } = useAuthStore()

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newName) return
        setLoading(true)
        try {
            await api.post("/designations", {
                name: newName,
                description: newDesc,
                agencyId: user?.agencyId
            })
            toast.success("Designation protocol initialized.")
            setNewName("")
            setNewDesc("")
            onUpdate()
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to initialize designation.")
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        try {
            await api.delete(`/designations/${id}`)
            toast.success("Designation purged from roster.")
            onUpdate()
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Purge protocol failed.")
        }
    }

    return (
        <div className="grid gap-8 lg:grid-cols-3">
            <PermissionGuard permission="manage_roles">
                <div className="lg:col-span-1">
                    <div className="bg-slate-950 rounded-[32px] p-1 shadow-2xl overflow-hidden relative group">
                        <div className="bg-slate-900 rounded-[30px] p-8 relative z-10 border border-white/5">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="h-10 w-10 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/20">
                                    <ShieldCheck className="h-5 w-5 text-primary" />
                                </div>
                                <h3 className="text-lg font-black text-white uppercase tracking-tight">Add Designation</h3>
                            </div>

                            <form onSubmit={handleAdd} className="space-y-6">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Title</Label>
                                    <Input
                                        placeholder="e.g. SPECIAL OPERATIVE"
                                        className="h-12 bg-white/5 border-white/10 text-white rounded-xl focus:bg-white/10 transition-all font-bold placeholder:text-slate-600"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Scope</Label>
                                    <Input
                                        placeholder="Identification of responsibilities..."
                                        className="h-12 bg-white/5 border-white/10 text-white rounded-xl focus:bg-white/10 transition-all font-bold placeholder:text-slate-600"
                                        value={newDesc}
                                        onChange={(e) => setNewDesc(e.target.value)}
                                    />
                                </div>
                                <Button type="submit" className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest shadow-xl shadow-primary/20 transition-all mt-4" disabled={loading}>
                                    {loading ? "PROCESSING..." : "ADD DESIGNATION"}
                                </Button>
                            </form>
                        </div>
                    </div>
                </div>
            </PermissionGuard>

            <div className={cn(
                "lg:col-span-2 space-y-4",
                !user?.permissions?.includes('manage_roles') && "lg:col-span-3"
            )}>
                <div className="flex items-center justify-between mb-4 px-2">
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                        <Briefcase className="h-5 w-5 text-primary" />
                        Hierarchy
                    </h3>
                </div>

                <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
                    <Table>
                        <TableHeader className="bg-slate-50/50 border-b border-slate-100">
                            <TableRow className="h-14">
                                <TableHead className="px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Designation Title</TableHead>
                                <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Roster Density</TableHead>
                                <TableHead className="text-right px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {designations.length === 0 ? (
                                <TableRowEmpty colSpan={3} title="No Designations Found" icon={<Building />} />
                            ) : (
                                designations.map((des) => (
                                    <TableRow key={des.id} className="group border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                        <TableCell className="px-8 py-5">
                                            <div className="font-extrabold text-slate-900 group-hover:text-primary transition-colors uppercase tracking-tight">{des.name}</div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 italic">{des.description || "Baseline operational scope"}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="inline-flex items-center px-3 py-1 rounded-full bg-slate-50 text-slate-500 text-[10px] font-black border border-slate-100 shadow-sm">
                                                {des._count?.employees || 0} ACTIVE MEMBERS
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right px-8">
                                            <PermissionGuard permission="manage_roles">
                                                <RowDeleteButton onClick={() => handleDelete(des.id)} />
                                            </PermissionGuard>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    )
}
