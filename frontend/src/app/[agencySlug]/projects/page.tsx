"use client"

import { useEffect, useState } from "react"
import api from "@/lib/api"
import { TableCell, TableRow } from "@/components/ui/table"
import { Plus, Briefcase, MapPin, Edit3, Activity, Globe, Shield, Clock } from "lucide-react"
import { ProjectForm } from "@/components/agency/ProjectForm"
import { Button } from "@/components/ui/button"
import {
    PageHeader,
    CreateButton,
    DataTable,
    PageLoading,
    StatusBadge,
    TableRowLoading,
    TableRowEmpty,
    StatCard
} from "@/components/ui/design-system"
import { FormSheet } from "@/components/common/FormSheet"
import { useAuthStore } from "@/store/authStore"
import { toast } from "@/components/ui/sonner"
import { motion, AnimatePresence } from "framer-motion"

export default function ProjectsPage() {
    const { user: authUser } = useAuthStore()
    const [projects, setProjects] = useState<any[]>([])
    const [clients, setClients] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [open, setOpen] = useState(false)
    const [editingProject, setEditingProject] = useState<any>(null)

    // Permission flags — Strictly following the database matrix
    const canViewClients = authUser?.role === 'Super Admin' || authUser?.permissions?.includes('view_clients')
    const canCreate = authUser?.role === 'Super Admin' || authUser?.permissions?.includes('create_project')
    const canEdit = authUser?.role === 'Super Admin' || authUser?.permissions?.includes('edit_project')

    const fetchData = async () => {
        try {
            // First fetch projects (primary intent of the page)
            const projectsRes = await api.get("/projects")
            setProjects(projectsRes.data)

            // Then try to fetch clients if user has permission
            if (canViewClients) {
                try {
                    const clientsRes = await api.get("/clients")
                    setClients(clientsRes.data)
                } catch (err: any) {
                    if (err.status !== 403) {
                        console.error("Failed to fetch clients", err)
                    }
                }
            }
        } catch (error) {
            console.error("Critical fetch error", error)
            toast.error("Failed to load project database. Please verify your clearance.")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchData() }, [])

    const openCreate = () => { setEditingProject(null); setOpen(true) }
    const openEdit = (project: any) => { setEditingProject(project); setOpen(true) }

    const activeProjectCount = projects.filter(p => p.isActive).length

    if (loading) return <PageLoading message="Synchronizing Operational Projects..." />

    return (
        <div className="space-y-8 pb-20">
            {/* ── Page Header ─────────────────────────────────────────── */}
            <PageHeader
                title="Operational"
                titleHighlight="Projects"
                subtitle="High-level management of security sites and strategic assets."
                action={canCreate ? (
                    <CreateButton
                        label="Initialize Project"
                        icon={<Plus className="h-4 w-4" />}
                        onClick={openCreate}
                    />
                ) : null}
            />

            {/* ── Stats ──────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    title="Total Projects"
                    value={projects.length}
                    icon={<Briefcase />}
                    color="teal"
                />
                <StatCard
                    title="Active Sites"
                    value={activeProjectCount}
                    icon={<Activity />}
                    color="emerald"
                />
                <StatCard
                    title="Clients Managed"
                    value={clients.length}
                    icon={<Shield />}
                    color="blue"
                />
            </div>

            {/* ── Content ────────────────────────────────────────────── */}
            <DataTable columns={['Project / Site Name', 'Affiliated Client', 'Site Location', 'Operational Status', 'Actions']}>
                <AnimatePresence mode="popLayout">
                    {projects.length === 0 ? (
                        <TableRowEmpty
                            colSpan={5}
                            icon={<Briefcase className="h-10 w-10 text-slate-300" />}
                            title="No Projects Found"
                            description="Initialize your first security project to begin operational tracking."
                            action={canCreate && (
                                <CreateButton label="Start New Project" icon={<Plus className="h-4 w-4" />} onClick={openCreate} />
                            )}
                        />
                    ) : (
                        projects.map((project, idx) => (
                            <motion.tr
                                key={project.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="group border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                            >
                                <TableCell className="px-8 py-5">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 group-hover:scale-105 group-hover:text-primary group-hover:bg-primary/5 transition-all shadow-sm">
                                            <Globe className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <div className="font-extrabold text-slate-900 text-lg tracking-tight group-hover:text-primary transition-colors">{project.name}</div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <Clock className="h-3 w-3 text-slate-400" />
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID: {project.id.slice(-6).toUpperCase()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2 font-bold text-slate-700">
                                        <Shield className="h-3.5 w-3.5 text-slate-400" />
                                        {project.client?.name || "Independent"}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center text-slate-500 font-medium text-sm">
                                        <MapPin className="h-3.5 w-3.5 mr-2 text-slate-400" />
                                        {project.location || "On-site Deployment"}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <StatusBadge status={project.isActive ? "ACTIVE" : "INACTIVE"} />
                                </TableCell>
                                <TableCell className="text-right px-8">
                                    {canEdit ? (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-10 px-5 rounded-xl font-bold text-slate-400 hover:text-primary hover:bg-primary/5 transition-all group/btn"
                                            onClick={() => openEdit(project)}
                                        >
                                            <Edit3 className="h-3.5 w-3.5 mr-2 group-hover/btn:translate-x-0.5 transition-transform" />
                                            Modify
                                        </Button>
                                    ) : (
                                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">View Only</span>
                                    )}
                                </TableCell>
                            </motion.tr>
                        ))
                    )}
                </AnimatePresence>
            </DataTable>

            {/* ── Form Drawer ────────────────────────────────────────── */}
            <FormSheet
                open={open}
                onOpenChange={(v) => { setOpen(v); if (!v) setEditingProject(null) }}
                title={editingProject ? "Update Project Parameters" : "Initialize New Project"}
                description={editingProject
                    ? "Modify operational boundaries and project assignments for this site."
                    : "Register a new security site to a client and initialize operational protocols."}
            >
                <ProjectForm
                    clients={clients}
                    initialData={editingProject}
                    onSuccess={() => { setOpen(false); setEditingProject(null); fetchData() }}
                    onRefreshClients={fetchData}
                />
            </FormSheet>
        </div>
    )
}
