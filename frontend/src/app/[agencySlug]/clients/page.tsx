"use client"

import { useState } from "react"
import { TableCell, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Plus, Building, Filter, Mail, Activity, Eye, Edit3, Trash2 } from "lucide-react"
import { ClientForm } from "@/components/agency/ClientForm"
import { motion, AnimatePresence } from "framer-motion"
import { AlertModal } from "@/components/ui/alert-modal"
import {
    PageHeader,
    CreateButton,
    DataTable,
    PageLoading,
    EmptyState,
    ControlPanel,
    RowEditButton,
    RowDeleteButton,
    StatusBadge
} from "@/components/ui/design-system"
import { SearchBar } from "@/components/common/SearchBar"
import { FormSheet } from "@/components/common/FormSheet"
import { PermissionGuard } from "@/components/common/PermissionGuard"
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

    if (loading) return <PageLoading message="Synchronizing Client Intelligence..." />

    return (
        <div className="space-y-10 pb-20">
            <PageHeader
                title="Client"
                titleHighlight="Portfolio"
                subtitle="Manage institutional partners and global project owners."
                action={
                    <PermissionGuard permission="create_client">
                        <CreateButton
                            label="Register Client"
                            icon={<Plus className="h-4 w-4" />}
                            onClick={() => { setEditingClient(null); setOpen(true) }}
                        />
                    </PermissionGuard>
                }
            />

            <ControlPanel count={clients.length} totalLabel="Active Partners">
                <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Find institutional partner..." />
                <Button variant="outline" className="h-14 px-6 rounded-2xl border-slate-100 hover:bg-slate-50 shadow-sm shrink-0">
                    <Filter className="h-4 w-4 mr-2" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Filter</span>
                </Button>
            </ControlPanel>

            {filteredClients.length === 0 ? (
                <EmptyState
                    icon={<Building className="h-10 w-10" />}
                    title="No Records Found"
                    description="The client database is currently empty. Initialize a new partnership record to begin."
                    action={
                        <PermissionGuard permission="create_client">
                            <CreateButton label="Initialize Client" icon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)} />
                        </PermissionGuard>
                    }
                />
            ) : (
                <DataTable columns={['Institutional Partner', 'Communication Node', 'Assigned Units', 'Actions']}>
                    <AnimatePresence mode="popLayout">
                        {filteredClients.map((client, idx) => (
                            <motion.tr
                                key={client.id}
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.98 }}
                                transition={{ duration: 0.2, delay: idx * 0.03 }}
                                className="group hover:bg-slate-50/50 transition-colors"
                            >
                                <TableCell className="px-8 py-7">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center shadow-sm group-hover:shadow-md group-hover:scale-110 group-hover:border-primary/20 transition-all shrink-0">
                                            <Building className="h-6 w-6 text-slate-300 group-hover:text-primary transition-colors" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-black text-slate-900 text-lg tracking-tight group-hover:text-primary transition-colors truncate">{client.name}</div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Verified Node</span>
                                            </div>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                                            <Mail className="h-3.5 w-3.5 text-slate-400" />
                                            {client.email || "NO_DATA"}
                                        </div>
                                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest pl-5">Primary Contact</p>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <StatusBadge status="ACTIVE" className="bg-slate-50 border-slate-100 text-slate-500">
                                        {client.projects?.length || 0} Projects
                                    </StatusBadge>
                                </TableCell>
                                <TableCell className="text-right px-8">
                                    <div className="flex justify-end gap-2 opactiy-0 group-hover:opacity-100 transition-opacity">
                                        <PermissionGuard permission="edit_client">
                                            <RowEditButton onClick={() => { setEditingClient(client); setOpen(true) }} />
                                        </PermissionGuard>
                                        <PermissionGuard permission="delete_client">
                                            <RowDeleteButton onClick={() => openDelete(client.id, client.name)} />
                                        </PermissionGuard>
                                    </div>
                                </TableCell>
                            </motion.tr>
                        ))}
                    </AnimatePresence>
                </DataTable>
            )}

            <FormSheet
                open={open}
                onOpenChange={(v) => { setOpen(v); if (!v) setEditingClient(null) }}
                title={editingClient ? "Modify Partner dossier" : "Register Institutional Partner"}
                description={editingClient
                    ? "Update and re-verify client credentials within the operational network."
                    : "Initialize a new institutional identity for security project deployment."}
            >
                <ClientForm
                    initialData={editingClient}
                    onSuccess={() => { setOpen(false); setEditingClient(null); refetch() }}
                />
            </FormSheet>

            <AlertModal
                isOpen={deleteModal.open}
                onClose={closeDelete}
                onConfirm={handleDelete}
                loading={isDeleting}
                title="TERMINATE PARTNER PROTOCOL"
                variant="danger"
                description={`Acknowledge termination of ${deleteModal.name}. This is an irreversible forensic action that will purge all associated institutional links.`}
                confirmText="Execute Termination"
            />
        </div>
    )
}
