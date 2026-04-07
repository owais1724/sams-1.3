"use client"

import { useEffect, useState } from "react"
import api from "@/lib/api"
import { TableCell } from "@/components/ui/table"
import { Plus, Briefcase, MapPin, Activity, Globe, Shield, Clock, Search, Filter, Users, Power } from "lucide-react"
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
import { FormModal } from "@/components/common/FormModal"
import { useAuthStore } from "@/store/authStore"
import { toast } from "@/components/ui/sonner"
import { motion, AnimatePresence } from "framer-motion"
import { PermissionGuard } from "@/components/common/PermissionGuard"
import { AlertModal } from "@/components/ui/alert-modal"
import { SearchBar } from "@/components/common/SearchBar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function ProjectsPage() {
    const { user: authUser } = useAuthStore()
    const [projects, setProjects] = useState<any[]>([])
    const [clients, setClients] = useState<any[]>([])
    const [employees, setEmployees] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [open, setOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [editingProject, setEditingProject] = useState<any>(null)
    const [showFilters, setShowFilters] = useState(false)
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")
    const [staffFilter, setStaffFilter] = useState<"all" | "with-staff" | "without-staff">("all")
    const [sortBy, setSortBy] = useState<"name-asc" | "name-desc" | "newest" | "oldest">("newest")
    const [deleteModal, setDeleteModal] = useState<{ open: boolean, id: string, name: string }>({
        open: false,
        id: "",
        name: ""
    })
    const [isDeleting, setIsDeleting] = useState(false)
    const [toggleModal, setToggleModal] = useState<{ open: boolean, id: string, name: string, isActive: boolean }>({
        open: false,
        id: "",
        name: "",
        isActive: false,
    })
    const [isToggling, setIsToggling] = useState(false)

    const canViewClients = authUser?.role === 'Super Admin' || authUser?.role?.toLowerCase().includes('admin') || authUser?.permissions?.includes('view_clients') || authUser?.permissions?.includes('edit_project') || authUser?.permissions?.includes('create_project')
    const canViewEmployees = authUser?.role === 'Super Admin' || authUser?.role?.toLowerCase().includes('admin') || authUser?.permissions?.includes('view_employee') || authUser?.permissions?.includes('edit_project') || authUser?.permissions?.includes('create_project')

    const fetchData = async () => {
        try {
            const [projectsRes, clientsRes, employeesRes] = await Promise.allSettled([
                api.get("/projects"),
                canViewClients ? api.get("/clients") : Promise.resolve({ data: [] }),
                canViewEmployees ? api.get("/employees") : Promise.resolve({ data: [] })
            ])

            if (projectsRes.status === 'fulfilled') setProjects(projectsRes.value.data)
            if (clientsRes.status === 'fulfilled') setClients(clientsRes.value.data)
            if (employeesRes.status === 'fulfilled') setEmployees(employeesRes.value.data)
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

    const handleToggleActive = async () => {
        if (!toggleModal.id) return
        setIsToggling(true)
        try {
            await api.patch(`/projects/${toggleModal.id}`, {
                isActive: !toggleModal.isActive,
            })
            toast.success(`Project ${toggleModal.isActive ? "deactivated" : "activated"} successfully`)
            setToggleModal({ open: false, id: "", name: "", isActive: false })
            fetchData()
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to update project status")
        } finally {
            setIsToggling(false)
        }
    }

    const filteredProjects = projects
        .filter((p) =>
            p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.location?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .filter((p) => {
            if (statusFilter === "active") return Boolean(p.isActive)
            if (statusFilter === "inactive") return !p.isActive
            return true
        })
        .filter((p) => {
            const assigned = p._count?.assignedEmployees || 0
            if (staffFilter === "with-staff") return assigned > 0
            if (staffFilter === "without-staff") return assigned === 0
            return true
        })

    const sortedProjects = [...filteredProjects].sort((a, b) => {
        if (sortBy === "name-asc") return (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })
        if (sortBy === "name-desc") return (b.name || "").localeCompare(a.name || "", undefined, { sensitivity: "base" })

        const aCreated = new Date(a.createdAt || 0).getTime()
        const bCreated = new Date(b.createdAt || 0).getTime()
        return sortBy === "oldest" ? aCreated - bCreated : bCreated - aCreated
    })

    const activeFilterCount = (statusFilter !== "all" ? 1 : 0) + (staffFilter !== "all" ? 1 : 0)
    const filterButtonActive = showFilters || activeFilterCount > 0

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
                <StatCard title="Total Projects" value={projects.length} icon={<Briefcase className="text-teal-700" />} color="teal" />
                <StatCard title="Active Projects" value={activeProjectCount} icon={<Activity className="text-green-700" />} color="emerald" />
                <PermissionGuard permission="view_clients">
                    <StatCard title="Client Contracts" value={clients.length} icon={<Shield className="text-sky-700" />} color="blue" />
                </PermissionGuard>
            </div>

            <ControlPanel count={projects.length} totalLabel="Registered Projects">
                <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search project by name or location..." className="bg-white border border-border text-slate-900 placeholder:text-slate-400" />
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
                    {activeFilterCount > 0 && (
                        <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-cyan-100 px-1.5 text-[11px] font-bold text-cyan-700">
                            {activeFilterCount}
                        </span>
                    )}
                </Button>
            </ControlPanel>

            {showFilters && (
                <div className="rounded-2xl border border-border bg-white p-3 flex flex-wrap items-center gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        className={statusFilter === "all"
                            ? "bg-cyan-500 border-cyan-500 text-white hover:bg-cyan-600 hover:border-cyan-600"
                            : "hover:bg-cyan-50 hover:border-cyan-300 hover:text-cyan-700"
                        }
                        onClick={() => setStatusFilter("all")}
                    >
                        All Status
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        className={statusFilter === "active"
                            ? "bg-cyan-500 border-cyan-500 text-white hover:bg-cyan-600 hover:border-cyan-600"
                            : "hover:bg-cyan-50 hover:border-cyan-300 hover:text-cyan-700"
                        }
                        onClick={() => setStatusFilter((prev) => prev === "active" ? "all" : "active")}
                    >
                        Active Projects
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        className={statusFilter === "inactive"
                            ? "bg-cyan-500 border-cyan-500 text-white hover:bg-cyan-600 hover:border-cyan-600"
                            : "hover:bg-cyan-50 hover:border-cyan-300 hover:text-cyan-700"
                        }
                        onClick={() => setStatusFilter((prev) => prev === "inactive" ? "all" : "inactive")}
                    >
                        Inactive Projects
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        className={staffFilter === "with-staff"
                            ? "bg-cyan-500 border-cyan-500 text-white hover:bg-cyan-600 hover:border-cyan-600"
                            : "hover:bg-cyan-50 hover:border-cyan-300 hover:text-cyan-700"
                        }
                        onClick={() => setStaffFilter((prev) => prev === "with-staff" ? "all" : "with-staff")}
                    >
                        With Staff
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        className={staffFilter === "without-staff"
                            ? "bg-cyan-500 border-cyan-500 text-white hover:bg-cyan-600 hover:border-cyan-600"
                            : "hover:bg-cyan-50 hover:border-cyan-300 hover:text-cyan-700"
                        }
                        onClick={() => setStaffFilter((prev) => prev === "without-staff" ? "all" : "without-staff")}
                    >
                        Without Staff
                    </Button>
                    <Select value={sortBy} onValueChange={(value) => setSortBy(value as "name-asc" | "name-desc" | "newest" | "oldest")}>
                        <SelectTrigger className="h-9 min-w-[190px] rounded-lg border border-[#e2e8f0] bg-white px-3 text-sm font-medium text-slate-700">
                            <div className="flex items-center gap-2 truncate">
                                <span className="text-slate-500">Sort by</span>
                                <span className="text-slate-300">|</span>
                                <SelectValue />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="name-asc">A → Z</SelectItem>
                            <SelectItem value="name-desc">Z → A</SelectItem>
                            <SelectItem value="newest">Newest first</SelectItem>
                            <SelectItem value="oldest">Oldest first</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            )}

            <DataTable columns={['Project Name', 'Client', 'Location', 'Assigned Staff', 'Status', 'Actions']}>
                <AnimatePresence mode="popLayout">
                    {sortedProjects.length === 0 ? (
                        <TableRowEmpty
                            colSpan={6}
                            icon={<Briefcase className="h-10 w-10 text-slate-300" />}
                            title="No Results Identified"
                            description="No projects match your current search parameters."
                        />
                    ) : (
                        sortedProjects.map((project, idx) => (
                            <motion.tr
                                key={project.id}
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.98 }}
                                transition={{ duration: 0.2, delay: idx * 0.03 }}
                                className="group transition-colors"
                            >
                                <TableCell className="py-4">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-xl bg-slate-50 border border-border flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform shrink-0">
                                            <Globe className="h-6 w-6 text-slate-500 group-hover:text-primary transition-colors" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-semibold text-slate-900 text-lg tracking-tight group-hover:text-primary transition-colors truncate">{project.name}</div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                <span className="text-[12px] text-slate-500">ID: {project.id.slice(-6).toUpperCase()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2 font-medium text-slate-700 text-[14px]">
                                        <Shield className="h-3.5 w-3.5 text-primary" />
                                        {project.client?.name || "No Client Assigned"}
                                    </div>
                                    <p className="text-[12px] text-slate-500 pl-5 mt-0.5">Client</p>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center text-slate-600 font-medium text-sm">
                                        <MapPin className="h-3.5 w-3.5 mr-2 text-slate-400" />
                                        <span className="truncate max-w-[150px]">{project.location || "N/A"}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                            <Users className="h-4 w-4 text-emerald-500" />
                                        </div>
                                        <div>
                                            <div className="font-black text-slate-900 text-sm">
                                                {project._count?.assignedEmployees || 0}
                                            </div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                {project._count?.assignedEmployees === 1 ? 'Guard' : 'Guards'}
                                            </p>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <StatusBadge status={project.isActive ? "ACTIVE" : "INACTIVE"} />
                                </TableCell>
                                <TableCell className="text-right px-4 sm:px-8">
                                    <div className="flex items-center justify-end gap-2">
                                        <PermissionGuard permission="edit_project">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setToggleModal({
                                                    open: true,
                                                    id: project.id,
                                                    name: project.name,
                                                    isActive: Boolean(project.isActive),
                                                })}
                                                className={`h-9 px-3 rounded-xl text-[11px] font-bold ${project.isActive
                                                    ? "text-amber-600 hover:bg-amber-50"
                                                    : "text-emerald-600 hover:bg-emerald-50"
                                                    }`}
                                            >
                                                <Power className="h-3.5 w-3.5 mr-1.5" />
                                                {project.isActive ? "Deactivate" : "Activate"}
                                            </Button>
                                        </PermissionGuard>
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

            <FormModal
                open={open}
                onOpenChange={(v) => { setOpen(v); if (!v) setEditingProject(null) }}
                title={editingProject ? "Modify Project Parameters" : "Create New Project"}
                description={editingProject
                    ? "Update and modify project specifications."
                    : "Create a new project and assign to a site."}
            >
                <ProjectForm
                    clients={clients}
                    employees={employees}
                    initialData={editingProject}
                    onSuccess={() => { setOpen(false); setEditingProject(null); fetchData() }}
                    onRefreshClients={fetchData}
                />
            </FormModal>

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

            <AlertModal
                isOpen={toggleModal.open}
                onClose={() => setToggleModal({ ...toggleModal, open: false })}
                onConfirm={handleToggleActive}
                loading={isToggling}
                title={toggleModal.isActive ? "DEACTIVATE PROJECT" : "ACTIVATE PROJECT"}
                variant={toggleModal.isActive ? "warning" : "primary"}
                description={toggleModal.isActive
                    ? `Are you sure you want to deactivate the project: ${toggleModal.name}?`
                    : `Are you sure you want to activate the project: ${toggleModal.name}?`}
                confirmText={toggleModal.isActive ? "Deactivate Project" : "Activate Project"}
            />
        </div>
    )
}
