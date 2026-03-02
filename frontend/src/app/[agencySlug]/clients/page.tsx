"use client"

import { useEffect, useState } from "react"
import api from "@/lib/api"
import { TableBody, TableCell, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Plus, Building, Search, Filter, Mail, Activity, Edit3, Trash2 } from "lucide-react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { ClientForm } from "@/components/agency/ClientForm"
import { motion, AnimatePresence } from "framer-motion"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { AlertModal } from "@/components/ui/alert-modal"
import { PageHeader, CreateButton, DataTable, PageLoading, EmptyState } from "@/components/ui/design-system"

export default function ClientsPage() {
    const [clients, setClients] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [open, setOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [editingClient, setEditingClient] = useState<any | null>(null)
    const [deleteModal, setDeleteModal] = useState<{ open: boolean, id: string, name: string }>({
        open: false, id: "", name: ""
    })
    const [isDeleting, setIsDeleting] = useState(false)

    const fetchClients = async () => {
        try {
            const response = await api.get("/clients")
            setClients(response.data)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchClients() }, [])

    const handleDelete = async () => {
        if (!deleteModal.id) return
        setIsDeleting(true)
        try {
            await api.delete(`/clients/${deleteModal.id}`)
            toast.success("Client record purged from system")
            setDeleteModal({ open: false, id: "", name: "" })
            fetchClients()
        } catch (error) {
            toast.error("Failed to delete client")
        } finally {
            setIsDeleting(false)
        }
    }

    const filteredClients = clients.filter(client =>
        client.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (loading) return <PageLoading message="Synchronizing Client Data..." />

    return (
        <div className="space-y-10 pb-20">

            {/* ── Page Header ── */}
            <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditingClient(null) }}>
                <PageHeader
                    title="Client"
                    titleHighlight="Portfolio"
                    subtitle="Manage institutional partners and project owners."
                    action={
                        <SheetTrigger asChild>
                            <CreateButton label="Create Client" icon={<Plus className="h-4 w-4" />} />
                        </SheetTrigger>
                    }
                />
                <SheetContent className="sm:max-w-[500px] rounded-l-[40px] border-none shadow-2xl p-0">
                    <div className="p-10 overflow-y-auto h-full">
                        <SheetHeader>
                            <SheetTitle className="text-2xl font-bold">
                                {editingClient ? "Modify Client Record" : "Create Client Record"}
                            </SheetTitle>
                            <SheetDescription className="font-medium text-slate-500">
                                {editingClient
                                    ? "Update existing partner credentials and operational details."
                                    : "Register a new institutional client to initialize security operations."}
                            </SheetDescription>
                        </SheetHeader>
                        <div className="mt-10">
                            <ClientForm
                                initialData={editingClient}
                                onSuccess={() => { setOpen(false); setEditingClient(null); fetchClients() }}
                            />
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            {/* ── Search Bar ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-4 rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/50">
                <div className="flex items-center gap-6 px-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center font-bold">
                            {clients.length}
                        </div>
                        <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Active Clients</span>
                    </div>
                </div>
                <div className="flex flex-1 gap-2">
                    <div className="relative group flex-1 md:flex-initial">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-hover:text-primary transition-colors" />
                        <Input
                            placeholder="Find partner..."
                            className="pl-11 pr-4 py-6 bg-slate-50 border-transparent rounded-2xl w-full md:w-[300px] focus:bg-white focus:ring-primary shadow-inner transition-all font-medium"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" className="p-6 rounded-2xl border-slate-100 hover:bg-slate-50 shadow-sm">
                        <Filter className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* ── Content ── */}
            {filteredClients.length === 0 ? (
                <EmptyState
                    icon={<Building className="h-10 w-10" />}
                    title="No Clients Found"
                    description="Create your first client record to begin project management."
                    action={<CreateButton label="Create Client" icon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)} />}
                />
            ) : (
                <DataTable columns={['Affiliated Client', 'Contact Node', 'Operational Projects', 'Actions']}>
                    <AnimatePresence mode="popLayout">
                        {filteredClients.map((client, idx) => (
                            <motion.tr
                                key={client.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="group border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                            >
                                <TableCell className="px-8 py-7">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-slate-100 to-white border border-slate-200 flex items-center justify-center shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all">
                                            <Building className="h-6 w-6 text-slate-400 group-hover:text-primary transition-colors" />
                                        </div>
                                        <div>
                                            <div className="font-extrabold text-slate-900 text-lg tracking-tight group-hover:text-primary transition-colors">{client.name}</div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Client</span>
                                            </div>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2 text-slate-600 font-medium">
                                        <Mail className="h-3.5 w-3.5 text-slate-400" />
                                        {client.email || "N/A"}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <div className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black flex items-center gap-2">
                                            <Activity className="h-3 w-3 text-primary" />
                                            {client.projects?.length || 0} ACTIVE
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right px-8">
                                    <div className="flex items-center justify-end gap-2">
                                        <Button variant="ghost" size="icon" onClick={() => { setEditingClient(client); setOpen(true) }} className="h-10 w-10 rounded-xl text-slate-400 hover:text-primary hover:bg-primary/5 transition-all">
                                            <Edit3 className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => setDeleteModal({ open: true, id: client.id, name: client.name })} className="h-10 w-10 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </motion.tr>
                        ))}
                    </AnimatePresence>
                </DataTable>
            )}

            <AlertModal
                isOpen={deleteModal.open}
                onClose={() => setDeleteModal({ ...deleteModal, open: false })}
                onConfirm={handleDelete}
                loading={isDeleting}
                title="PURGE CLIENT RECORD"
                variant="danger"
                description={`Are you sure you want to permanently delete ${deleteModal.name}? This will remove all associated project links and operational history.`}
                confirmText="Confirm Purge"
            />
        </div>
    )
}
