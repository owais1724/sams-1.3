"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Building2, CheckCircle2, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import api from "@/lib/api"
import { toast } from "@/components/ui/sonner"

interface AssignProjectDialogProps {
    employee: any
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}

export function AssignProjectDialog({ employee, open, onOpenChange, onSuccess }: AssignProjectDialogProps) {
    const [projects, setProjects] = useState<any[]>([])
    const [selectedProjects, setSelectedProjects] = useState<string[]>([])
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (open && employee) {
            fetchProjects()
        }
    }, [open, employee])

    const fetchProjects = async () => {
        setLoading(true)
        try {
            // Get all projects with assigned employees
            const response = await api.get('/projects')
            const allProjects = response.data || []
            setProjects(allProjects)

            // Pre-select projects this employee is already assigned to
            const assignedProjectIds = allProjects
                .filter((p: any) => p.assignedEmployees?.some((emp: any) => emp.id === employee.id))
                .map((p: any) => p.id)
            
            setSelectedProjects(assignedProjectIds)
        } catch (error) {
            toast.error("Failed to load projects")
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            // Update each project's employee assignments
            const updatePromises = projects.map(async (project) => {
                const isCurrentlyAssigned = project.assignedEmployees?.some((emp: any) => emp.id === employee.id)
                const shouldBeAssigned = selectedProjects.includes(project.id)

                // Only update if there's a change
                if (isCurrentlyAssigned !== shouldBeAssigned) {
                    const currentEmployeeIds = project.assignedEmployees?.map((emp: any) => emp.id) || []
                    const newEmployeeIds = shouldBeAssigned
                        ? [...currentEmployeeIds.filter((id: string) => id !== employee.id), employee.id]
                        : currentEmployeeIds.filter((id: string) => id !== employee.id)

                    return api.patch(`/projects/${project.id}`, {
                        employeeIds: newEmployeeIds
                    })
                }
            })

            await Promise.all(updatePromises.filter(Boolean))
            
            toast.success(`Project assignments updated for ${employee.fullName}`)
            onSuccess?.()
            onOpenChange(false)
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to update assignments")
        } finally {
            setSaving(false)
        }
    }

    if (!employee) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] p-0 border-none rounded-[32px] shadow-2xl overflow-hidden">
                <div className="p-8 bg-gradient-to-br from-blue-50 to-indigo-50 border-b border-blue-100">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black font-outfit uppercase tracking-tight text-slate-900 flex items-center gap-3">
                            <Building2 className="h-6 w-6 text-blue-600" />
                            Assign to Projects
                        </DialogTitle>
                        <DialogDescription className="font-bold text-slate-600 font-outfit text-xs uppercase tracking-widest mt-2">
                            Select project sites for {employee.fullName}
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="p-8">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="h-8 w-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                        </div>
                    ) : projects.length === 0 ? (
                        <div className="py-12 text-center">
                            <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-sm font-bold text-slate-400">No projects available</p>
                            <p className="text-xs text-slate-400 mt-1">Create projects first to assign employees</p>
                        </div>
                    ) : (
                        <>
                            <div className="mb-4 p-4 bg-blue-50 rounded-2xl border border-blue-200">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-blue-500 flex items-center justify-center">
                                        <Users className="h-5 w-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-blue-900 uppercase tracking-widest">
                                            Employee: {employee.fullName}
                                        </p>
                                        <p className="text-[10px] font-bold text-blue-600 mt-0.5">
                                            {employee.employeeCode} • {employee.designation?.name || 'No Designation'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                {projects.map((project) => {
                                    const isSelected = selectedProjects.includes(project.id)
                                    const assignedCount = project._count?.assignedEmployees || 0

                                    return (
                                        <label
                                            key={project.id}
                                            className={cn(
                                                "flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer hover:border-blue-200 hover:bg-blue-50/50",
                                                isSelected
                                                    ? "border-blue-500 bg-blue-50"
                                                    : "border-slate-200 bg-white"
                                            )}
                                        >
                                            <Checkbox
                                                checked={isSelected}
                                                onCheckedChange={(checked) => {
                                                    setSelectedProjects(prev =>
                                                        checked
                                                            ? [...prev, project.id]
                                                            : prev.filter(id => id !== project.id)
                                                    )
                                                }}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="h-4 w-4 text-blue-500" />
                                                    <span className="font-black text-slate-900 text-sm tracking-tight truncate">
                                                        {project.name}
                                                    </span>
                                                    {project.isActive && (
                                                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase tracking-wider rounded-full">
                                                            Active
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 mt-1.5">
                                                    <span className="text-[10px] font-bold text-slate-500">
                                                        📍 {project.location || 'No location'}
                                                    </span>
                                                    <span className="text-slate-300">•</span>
                                                    <span className="text-[10px] font-bold text-slate-400">
                                                        {assignedCount} staff assigned
                                                    </span>
                                                </div>
                                            </div>
                                        </label>
                                    )
                                })}
                            </div>
                        </>
                    )}
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-4">
                    <Button
                        onClick={() => onOpenChange(false)}
                        variant="outline"
                        className="flex-1 h-12 rounded-xl border-2 border-slate-200 hover:bg-white font-black uppercase tracking-wide text-xs"
                        disabled={saving}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={saving || loading}
                        className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-wide text-xs shadow-lg shadow-blue-600/30"
                    >
                        {saving ? (
                            <>
                                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Save Assignments
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
