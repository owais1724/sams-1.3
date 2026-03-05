"use client"

import { useEffect, useState } from "react"
import api from "@/lib/api"
import { TableCell } from "@/components/ui/table"
import { Plus, Briefcase, MapPin, Activity, Globe, Shield, Clock, Search, Filter } from "lucide-react"
import { ProjectForm } from "@/components/agency/ProjectForm"
import { Button } from "@/components/ui/button"
import {
    PageHeader,
    CreateButton,
    DataTable,
    PageLoading,
    StatusBadge,
    TableRowEmpty,
    StatCard,
    RowEditButton,
    RowDeleteButton,
    ControlPanel
} from "@/components/ui/design-system"
import { FormSheet } from "@/components/common/FormSheet"
import { useAuthStore } from "@/store/authStore"
import { toast } from "@/components/ui/sonner"
import { motion, AnimatePresence } from "framer-motion"
import { PermissionGuard } from "@/components/common/PermissionGuard"
import { AlertModal } from "@/components/ui/alert-modal"
import { SearchBar } from "@/components/common/SearchBar"

export default function ProjectsPage() {
    const { user: authUser } = useAuthStore()
    const [projects, setProjects] = useState<any[]>([])
    const [clients, setClients] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [open, setOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [editingProject, setEditingProject] = useState<any>(null)
    const [deleteModal, setDeleteModal] = useState<{ open: boolean, id: string, name: string }>({
        open: false,
        id: "",
        name: ""
    })
    const [isDeleting, setIsDeleting] = useState(false)

    const canViewClients = authUser?.role === 'Super Admin' || authUser?.permissions?.includes('view_clients')

    const fetchData = async () => {
        try {
            const [projectsRes, clientsRes] = await Promise.allSettled([
                api.get("/projects"),
                canViewClients ? api.get("/clients") : Promise.resolve({ data: [] })
            ])

            if (projectsRes.status === 'fulfilled') setProjects(projectsRes.value.data)
            if (clientsRes.status === 'fulfilled') setClients(clientsRes.value.data)
        } catch (error) {
            toast.error("Failed to load project intelligence.")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchData() }, [])

    const handleDelete = async () => {
        if (!deleteModal.id) return
        setIsDeleting(true)
        try {
            await api.delete(`/projects/${deleteModal.id}`)
            toast.success("Project deleted successfully")
            setDeleteModal({ open: false, id: "", name: "" })
            fetchData()
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to delete project")
        } finally {
            setIsDeleting(false)
        }
    }

    const filteredProjects = projects.filter(p =>
        p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.location?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const activeProjectCount = projects.filter(p => p.isActive).length

    if (loading) return <PageLoading message="Synchronizing Projects..." />

    return (
        <div className="space-y-10 pb-20">
            <PageHeader
                title="Operational"
                titleHighlight="Projects"
                subtitle="Manage your projects, security sites and strategic assets."
                action={
                    <PermissionGuard permission="create_project">
                        <CreateButton
                            label="New Project"
                            icon={<Plus className="h-4 w-4" />}
                            onClick={() => { setEditingProject(null); setOpen(true) }}
                        />
                    </PermissionGuard>
                }
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Total Projects" value={projects.length} icon={<Briefcase />} color="teal" />
                <StatCard title="Active Deployments" value={activeProjectCount} icon={<Activity />} color="emerald" />
                <PermissionGuard permission="view_clients">
                    <StatCard title="Client Contracts" value={clients.length} icon={<Shield />} color="blue" />
                </PermissionGuard>
            </div>

            <ControlPanel count={projects.length} totalLabel="Registered Projects">
                <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search project by name or location..." />
            </ControlPanel>

            <DataTable columns={['Project Name', 'Client', 'Location', 'Status', 'Actions']}>
                <AnimatePresence mode="popLayout">
                    {filteredProjects.length === 0 ? (
                        <TableRowEmpty
                            colSpan={5}
                            icon={<Briefcase className="h-10 w-10 text-slate-300" />}
                            title="No Results Identified"
                            description="No projects match your current search parameters."
                        />
                    ) : (
                        filteredProjects.map((project, idx) => (
                            <motion.tr
                                key={project.id}
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.98 }}
                                transition={{ duration: 0.2, delay: idx * 0.03 }}
                                className="group hover:bg-slate-50/50 transition-colors"
                            >
                                <TableCell className="px-8 py-7">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center shadow-sm group-hover:shadow-md group-hover:scale-110 group-hover:border-primary/20 transition-all shrink-0">
                                            <Globe className="h-6 w-6 text-slate-300 group-hover:text-primary transition-colors" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-black text-slate-900 text-lg tracking-tight group-hover:text-primary transition-colors truncate">{project.name}</div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">PROJECT_{project.id.slice(-6).toUpperCase()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2 font-black text-slate-900 text-[13px] tracking-tight">
                                        <Shield className="h-3.5 w-3.5 text-primary" />
                                        {project.client?.name || "No Client Assigned"}
                                    </div>
                                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest pl-5 mt-0.5">Verified Client</p>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center text-slate-500 font-bold text-sm">
                                        <MapPin className="h-3.5 w-3.5 mr-2 text-slate-400" />
                                        <span className="truncate max-w-[150px]">{project.location || "N/A"}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <StatusBadge status={project.isActive ? "ACTIVE" : "INACTIVE"} />
                                </TableCell>
                                <TableCell className="text-right px-8">
                                    <div className="flex items-center justify-end gap-2">
                                        <PermissionGuard permission="edit_project">
                                            <RowEditButton onClick={() => { setEditingProject(project); setOpen(true) }} />
                                        </PermissionGuard>
                                        <PermissionGuard permission="delete_project">
                                            <RowDeleteButton onClick={() => setDeleteModal({ open: true, id: project.id, name: project.name })} />
                                        </PermissionGuard>
                                    </div>
                                </TableCell>
                            </motion.tr>
                        ))
                    )}
                </AnimatePresence>
            </DataTable>

            <FormSheet
                open={open}
                onOpenChange={(v) => { setOpen(v); if (!v) setEditingProject(null) }}
                title={editingProject ? "Modify Project Parameters" : "Create New Project"}
                description={editingProject
                    ? "Update and modify project specifications."
                    : "Create a new project and assign to a site."}
            >
                <ProjectForm
                    clients={clients}
                    initialData={editingProject}
                    onSuccess={() => { setOpen(false); setEditingProject(null); fetchData() }}
                    onRefreshClients={fetchData}
                />
            </FormSheet>

            <AlertModal
                isOpen={deleteModal.open}
                onClose={() => setDeleteModal({ ...deleteModal, open: false })}
                onConfirm={handleDelete}
                loading={isDeleting}
                title="DELETE PROJECT"
                variant="danger"
                description={`Are you sure you want to delete the project: ${deleteModal.name}? This action cannot be undone and will remove all associated data.`}
                confirmText="Delete Project"
            />
        </div>
    )
}
