"use client"

import { useEffect, useState } from "react"
import api from "@/lib/api"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Briefcase, MapPin, Edit3 } from "lucide-react"
import { ProjectForm } from "@/components/agency/ProjectForm"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    PageHeader,
    CreateButton,
    TableCardWrapper,
    TableColHead,
    TableRowLoading,
    TableRowEmpty,
    StatusBadge,
} from "@/components/ui/design-system"
import { FormSheet } from "@/components/common/FormSheet"
import { useAuthStore } from "@/store/authStore"

export default function ProjectsPage() {
    const { user: authUser } = useAuthStore()
    const [projects, setProjects] = useState<any[]>([])
    const [clients, setClients] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [open, setOpen] = useState(false)
    const [editingProject, setEditingProject] = useState<any>(null)

    // Permission flags — Strictly following the database matrix
    // Only the Platform Super Admin bypasses these. Agency owners must have the box checked.
    const canCreate = authUser?.role === 'super admin' || authUser?.permissions?.includes('create_project')
    const canEdit = authUser?.role === 'super admin' || authUser?.permissions?.includes('edit_project')

    if (process.env.NODE_ENV !== 'production') {
        console.log(`[Permission Check] canCreate: ${canCreate}, canEdit: ${canEdit}`, authUser?.permissions)
    }

    const fetchData = async () => {
        try {
            const [projectsRes, clientsRes] = await Promise.all([
                api.get("/projects"),
                api.get("/clients")
            ])
            setProjects(projectsRes.data)
            setClients(clientsRes.data)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchData() }, [])

    const openCreate = () => { setEditingProject(null); setOpen(true) }
    const openEdit = (project: any) => { setEditingProject(project); setOpen(true) }

    return (
        <div className="space-y-6">
            {/* ── Page Header ─────────────────────────────────────────── */}
            <PageHeader
                title="Projects"
                subtitle="Security sites and operational projects"
                action={canCreate ? (
                    <CreateButton
                        label="Create Project"
                        icon={<Plus className="h-4 w-4" />}
                        onClick={openCreate}
                    />
                ) : null}
            />

            {/* ── Form Sheet (create / edit) ───────────────────────────── */}
            <FormSheet
                open={open}
                onOpenChange={(v) => { setOpen(v); if (!v) setEditingProject(null) }}
                title={editingProject ? "Edit Project" : "Initialize New Project"}
                description={editingProject
                    ? "Update the project details below."
                    : "Register a security site to a client and prepare for operational deployment."}
            >
                <ProjectForm
                    clients={clients}
                    initialData={editingProject}
                    onSuccess={() => { setOpen(false); setEditingProject(null); fetchData() }}
                    onRefreshClients={fetchData}
                />
            </FormSheet>

            {/* ── Data Table ──────────────────────────────────────────── */}
            <TableCardWrapper minWidth="700px">
                <Table>
                    <TableHeader className="bg-slate-50/50 border-b border-slate-100">
                        <TableRow className="h-14">
                            <TableColHead className="px-8">Project / Site Name</TableColHead>
                            <TableColHead>Client</TableColHead>
                            <TableColHead>Location</TableColHead>
                            <TableColHead>Status</TableColHead>
                            <TableColHead align="right" className="px-8">Actions</TableColHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRowLoading colSpan={5} message="Loading projects..." />
                        ) : projects.length === 0 ? (
                            <TableRowEmpty
                                colSpan={5}
                                icon={<Briefcase className="h-8 w-8" />}
                                title="No Projects Found"
                                description="Initialize a project to start managing operational presence."
                            />
                        ) : (
                            projects.map((project) => (
                                <TableRow key={project.id} className="group border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                    <TableCell className="px-8 py-6">
                                        <div className="font-extrabold text-slate-900 group-hover:text-primary transition-colors">{project.name}</div>
                                        <div className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mt-0.5">ID: {project.id.slice(-6).toUpperCase()}</div>
                                    </TableCell>
                                    <TableCell className="font-bold text-slate-700">{project.client?.name}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center text-slate-500 font-medium text-sm">
                                            <MapPin className="h-3.5 w-3.5 mr-2 text-slate-400" />
                                            {project.location || "On-site"}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge status={project.isActive ? "ACTIVE" : "INACTIVE"} />
                                    </TableCell>
                                    <TableCell className="text-right px-8">
                                        {canEdit && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-10 px-5 rounded-2xl font-bold text-slate-400 hover:text-primary hover:bg-primary/5 transition-all active:scale-95"
                                                onClick={() => openEdit(project)}
                                            >
                                                <Edit3 className="h-3.5 w-3.5 mr-1.5" />
                                                Edit
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableCardWrapper>
        </div>
    )
}
