"use client"

import { useState } from "react"
import { TableCell, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
                subtitle="Manage clients and project owners."
                action={
                    <PermissionGuard permission="create_client">
                        <CreateButton
                            label="Add Client"
                            icon={<Plus className="h-4 w-4" />}
                            onClick={() => { setEditingClient(null); setOpen(true) }}
                        />
                    </PermissionGuard>
                }
            />

            <ControlPanel count={clients.length} totalLabel="Active Clients" className="bg-white/5 border-white/10 px-4">
                <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Find client..." className="bg-transparent border-none text-white placeholder:text-white/20" />
                <Button variant="outline" className="h-14 px-6 rounded-2xl border-white/10 hover:bg-white/5 shadow-sm shrink-0 bg-white/5">
                    <Filter className="h-4 w-4 mr-2" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Filter</span>
                </Button>
            </ControlPanel>

            {filteredClients.length === 0 ? (
                <EmptyState
                    icon={<Building className="h-10 w-10" />}
                    title="No Records Found"
                    description="The client database is currently empty. Initialize a new client record to begin."
                    action={
                        <PermissionGuard permission="create_client">
                            <CreateButton label="Add Client" icon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)} />
                        </PermissionGuard>
                    }
                />
            ) : (
                <DataTable columns={['Client', 'Contact Info', 'Assigned Projects', 'Actions']}>
                    <AnimatePresence mode="popLayout">
                        {filteredClients.map((client, idx) => (
                            <motion.tr
                                key={client.id}
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.98 }}
                                transition={{ duration: 0.2, delay: idx * 0.03 }}
                                className="group hover:bg-white/[0.02] transition-colors border-b border-white/5"
                            >
                                <TableCell className="px-4 sm:px-8 py-4 sm:py-6">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-2xl bg-black border border-white/10 flex items-center justify-center shadow-xl group-hover:scale-110 group-hover:border-[#D9A75B]/20 transition-all shrink-0">
                                            <Building className="h-6 w-6 text-white/40 group-hover:text-[#D9A75B] transition-colors" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-black text-white text-lg tracking-tight group-hover:text-[#D9A75B] transition-colors truncate">{client.name}</div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Verified Client</span>
                                            </div>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-white font-bold text-sm">
                                            <Mail className="h-3.5 w-3.5 text-white/40" />
                                            {client.email || "N/A"}
                                        </div>
                                        <p className="text-[9px] font-black text-white/20 uppercase tracking-widest pl-5">Primary Contact</p>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge className="bg-white/5 border border-white/10 text-white font-black text-[10px] uppercase tracking-widest px-3 py-1 rounded-xl">
                                        {client.projects?.length || 0} Projects
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right px-4 sm:px-8">
                                    <div className="flex justify-end gap-2">
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
            )
            }

            <FormSheet
                open={open}
                onOpenChange={(v) => { setOpen(v); if (!v) setEditingClient(null) }}
                title={editingClient ? "Modify Portfolio Content" : "Establish New Link"}
                description={editingClient
                    ? "Update client assets and communication protocols."
                    : "Initialize new client intelligence and project linkage."}
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
                title="DELETE CLIENT"
                variant="danger"
                description={`Are you sure you want to delete ${deleteModal.name}? This action will permanently remove the client and all associated projects.`}
                confirmText="Delete Client"
            />
        </div >
    )
}
