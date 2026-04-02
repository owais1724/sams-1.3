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
import { FormModal } from "@/components/common/FormModal"
import { PermissionGuard } from "@/components/common/PermissionGuard"
import { useApiData } from "@/hooks/useApiData"
import { useDeleteConfirm } from "@/hooks/useDeleteConfirm"

export default function ClientsPage() {
    const { data: clients, loading, refetch } = useApiData<any[]>('/clients', [])
    const [open, setOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [editingClient, setEditingClient] = useState<any | null>(null)
    const [showFilters, setShowFilters] = useState(false)
    const [projectFilter, setProjectFilter] = useState<"all" | "with-projects" | "without-projects">("all")

    const { deleteModal, openDelete, closeDelete, handleDelete, isDeleting } = useDeleteConfirm({
        endpoint: '/clients',
        onSuccess: refetch,
        successMessage: 'Client record purged from system',
        errorMessage: 'Failed to delete client',
    })

    const filterButtonActive = showFilters || projectFilter !== "all"

    const filteredClients = clients
        .filter(client =>
            client.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            client.email?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .filter((client) => {
            const projectCount = client.projects?.length || 0
            if (projectFilter === "with-projects") return projectCount > 0
            if (projectFilter === "without-projects") return projectCount === 0
            return true
        })

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

            <ControlPanel count={clients.length} totalLabel="Active Clients">
                <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Find client..." className="bg-white border border-border text-slate-900 placeholder:text-slate-400" />
                <Button
                    variant="outline"
                    className={`shrink-0 transition-colors ${
                        filterButtonActive
                            ? "bg-cyan-500 border-cyan-500 text-white hover:bg-cyan-600 hover:border-cyan-600"
                            : "hover:bg-cyan-50 hover:border-cyan-300 hover:text-cyan-700"
                    }`}
                    onClick={() => setShowFilters((prev) => !prev)}
                >
                    <Filter className="h-4 w-4 mr-2" />
                    <span className="text-[14px] font-medium">Filter</span>
                    {projectFilter !== "all" && (
                        <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-cyan-100 px-1.5 text-[11px] font-bold text-cyan-700">
                            1
                        </span>
                    )}
                </Button>
            </ControlPanel>

            {showFilters && (
                <div className="rounded-2xl border border-border bg-white p-3 flex flex-wrap items-center gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        className={projectFilter === "all"
                            ? "bg-cyan-500 border-cyan-500 text-white hover:bg-cyan-600 hover:border-cyan-600"
                            : "hover:bg-cyan-50 hover:border-cyan-300 hover:text-cyan-700"
                        }
                        onClick={() => setProjectFilter("all")}
                    >
                        All Clients
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        className={projectFilter === "with-projects"
                            ? "bg-cyan-500 border-cyan-500 text-white hover:bg-cyan-600 hover:border-cyan-600"
                            : "hover:bg-cyan-50 hover:border-cyan-300 hover:text-cyan-700"
                        }
                        onClick={() => setProjectFilter("with-projects")}
                    >
                        With Projects
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        className={projectFilter === "without-projects"
                            ? "bg-cyan-500 border-cyan-500 text-white hover:bg-cyan-600 hover:border-cyan-600"
                            : "hover:bg-cyan-50 hover:border-cyan-300 hover:text-cyan-700"
                        }
                        onClick={() => setProjectFilter("without-projects")}
                    >
                        Without Projects
                    </Button>
                </div>
            )}

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
                                className="group transition-colors"
                            >
                                <TableCell className="py-4">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-xl bg-slate-50 border border-border flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform shrink-0">
                                            <Building className="h-6 w-6 text-slate-500 group-hover:text-primary transition-colors" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-semibold text-slate-900 text-lg tracking-tight group-hover:text-primary transition-colors truncate">{client.name}</div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                <span className="text-[12px] text-slate-500">Verified client</span>
                                            </div>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-slate-700 font-medium text-sm">
                                            <Mail className="h-3.5 w-3.5 text-slate-400" />
                                            {client.email || "N/A"}
                                        </div>
                                        <p className="text-[12px] text-slate-500 pl-5">Primary contact</p>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {Array.isArray(client.projects) && client.projects.length > 0 ? (
                                        <div className="space-y-1.5">
                                            {client.projects.slice(0, 2).map((project: any) => (
                                                <p
                                                    key={project.id}
                                                    className="text-base font-bold text-slate-900 leading-tight"
                                                >
                                                    {project.name}
                                                </p>
                                            ))}
                                            {client.projects.length > 2 && (
                                                <p className="text-sm font-semibold text-slate-600">
                                                    +{client.projects.length - 2} more assigned
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-sm font-medium text-slate-500">No project assigned</span>
                                    )}
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

            <FormModal
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
            </FormModal>

            <AlertModal
                isOpen={deleteModal.open}
                onClose={closeDelete}
                onConfirm={handleDelete}
                loading={isDeleting}
                title="DELETE CLIENT"
                variant="danger"
                description={`Are you sure you want to delete ${deleteModal.name}? This action will permanently remove the client and all associated projects and deployments.`}
                confirmText="Delete Client"
            />
        </div >
    )
}
