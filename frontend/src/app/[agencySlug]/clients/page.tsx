"use client"

import { useState } from "react"
import { TableCell, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Plus, Building, Filter, Mail, Activity } from "lucide-react"
import { ClientForm } from "@/components/agency/ClientForm"
import { motion, AnimatePresence } from "framer-motion"
import { AlertModal } from "@/components/ui/alert-modal"
import { PageHeader, CreateButton, DataTable, PageLoading, EmptyState } from "@/components/ui/design-system"
import { SearchBar } from "@/components/common/SearchBar"
import { TableActionButtons } from "@/components/common/TableActionButtons"
import { FormSheet } from "@/components/common/FormSheet"
import { useApiData } from "@/hooks/useApiData"
import { useDeleteConfirm } from "@/hooks/useDeleteConfirm"

export default function ClientsPage() {
    const { data: clients, loading, refetch } = useApiData<any[]>('/clients', [])
    const [open, setOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [editingClient, setEditingClient] = useState<any | null>(null)

    const { deleteModal, openDelete, closeDelete, handleDelete, isDeleting } = useDeleteConfirm({
        endpoint: '/clients',
        onSuccess: refetch,
        successMessage: 'Client record purged from system',
        errorMessage: 'Failed to delete client',
    })

    const filteredClients = clients.filter(client =>
        client.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (loading) return <PageLoading message="Synchronizing Client Data..." />

    return (
        <div className="space-y-8 sm:space-y-10 pb-20">

            {/* ── Page Header ── */}
            <PageHeader
                title="Client"
                titleHighlight="Portfolio"
                subtitle="Manage institutional partners and project owners."
                action={
                    <CreateButton
                        label="Create Client"
                        icon={<Plus className="h-4 w-4" />}
                        onClick={() => { setEditingClient(null); setOpen(true) }}
                    />
                }
            />

            {/* ── Search Bar ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-3 sm:p-4 rounded-2xl sm:rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/50">
                <div className="flex items-center gap-4 px-2">
                    <div className="h-9 w-9 bg-primary/10 text-primary rounded-xl flex items-center justify-center font-bold text-sm">
                        {clients.length}
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-widest">Active Clients</span>
                </div>
                <div className="flex flex-1 gap-2">
                    <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Find partner..." />
                    <Button variant="outline" className="px-4 sm:px-6 rounded-2xl border-slate-100 hover:bg-slate-50 shadow-sm">
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
                                <TableCell className="px-4 sm:px-8 py-5 sm:py-7">
                                    <div className="flex items-center gap-3 sm:gap-4">
                                        <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-slate-100 to-white border border-slate-200 flex items-center justify-center shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all shrink-0">
                                            <Building className="h-5 w-5 sm:h-6 sm:w-6 text-slate-400 group-hover:text-primary transition-colors" />
                                        </div>
                                        <div>
                                            <div className="font-extrabold text-slate-900 text-sm sm:text-lg tracking-tight group-hover:text-primary transition-colors">{client.name}</div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Client</span>
                                            </div>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2 text-slate-600 font-medium text-sm">
                                        <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                        <span className="truncate max-w-[120px] sm:max-w-none">{client.email || "N/A"}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="px-2 sm:px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black flex items-center gap-1 w-fit">
                                        <Activity className="h-3 w-3 text-primary" />
                                        {client.projects?.length || 0} ACTIVE
                                    </div>
                                </TableCell>
                                <TableCell className="text-right px-4 sm:px-8">
                                    <TableActionButtons
                                        onEdit={() => { setEditingClient(client); setOpen(true) }}
                                        onDelete={() => openDelete(client.id, client.name)}
                                    />
                                </TableCell>
                            </motion.tr>
                        ))}
                    </AnimatePresence>
                </DataTable>
            )}

            {/* ── Form Drawer ── */}
            <FormSheet
                open={open}
                onOpenChange={(v) => { setOpen(v); if (!v) setEditingClient(null) }}
                title={editingClient ? "Modify Client Record" : "Create Client Record"}
                description={editingClient
                    ? "Update existing partner credentials and operational details."
                    : "Register a new institutional client to initialize security operations."}
            >
                <ClientForm
                    initialData={editingClient}
                    onSuccess={() => { setOpen(false); setEditingClient(null); refetch() }}
                />
            </FormSheet>

            {/* ── Delete Confirm ── */}
            <AlertModal
                isOpen={deleteModal.open}
                onClose={closeDelete}
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
