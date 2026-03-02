"use client"

import { useEffect, useState } from "react"
import api from "@/lib/api"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Plus, Briefcase, MapPin } from "lucide-react"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import { ProjectForm } from "@/components/agency/ProjectForm"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export default function ProjectsPage() {
    const [projects, setProjects] = useState<any[]>([])
    const [clients, setClients] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [open, setOpen] = useState(false)

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

    useEffect(() => {
        fetchData()
    }, [])

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Projects</h1>
                    <p className="text-slate-500">Security sites and operational projects</p>
                </div>
                <Sheet open={open} onOpenChange={setOpen}>
                    <SheetTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Project
                        </Button>
                    </SheetTrigger>
                    <SheetContent className="sm:max-w-[500px] rounded-l-[40px] border-none shadow-2xl p-0">
                        <div className="p-10 overflow-y-auto h-full">
                            <SheetHeader>
                                <SheetTitle className="text-2xl font-bold">Initialize New Project</SheetTitle>
                                <SheetDescription className="font-medium text-slate-500">
                                    Register a security site to a client and prepare for operational deployment.
                                </SheetDescription>
                            </SheetHeader>
                            <div className="mt-10">
                                <ProjectForm
                                    clients={clients}
                                    onSuccess={() => {
                                        setOpen(false)
                                        fetchData()
                                    }}
                                    onRefreshClients={fetchData}
                                />
                            </div>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>

            <div className="bg-white rounded-[32px] md:rounded-[40px] border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden">
                <div className="overflow-x-auto">
                    <Table className="min-w-[800px] lg:min-w-full">
                        <TableHeader className="bg-slate-50/50 border-b border-slate-100">
                            <TableRow className="h-14">
                                <TableHead className="px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">Project / Site Name</TableHead>
                                <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Client</TableHead>
                                <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Location</TableHead>
                                <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</TableHead>
                                <TableHead className="text-right px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8">Loading projects...</TableCell>
                                </TableRow>
                            ) : projects.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-12">
                                        <Briefcase className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                                        <div className="text-slate-900 font-medium">No Projects Found</div>
                                        <div className="text-slate-500 text-sm">Initialize a project to start managing operational presence.</div>
                                    </TableCell>
                                </TableRow>
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
                                            <Badge className={cn(
                                                "shadow-none px-3 py-1 rounded-full text-[10px] font-black",
                                                project.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-100 text-slate-500"
                                            )}>
                                                {project.isActive ? "ACTIVE" : "INACTIVE"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right px-8">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-10 px-6 rounded-xl font-bold text-slate-400 hover:text-primary hover:bg-primary/5 transition-all"
                                            >
                                                View Details
                                            </Button>
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
