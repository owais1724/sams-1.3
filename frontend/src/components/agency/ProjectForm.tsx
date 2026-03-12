"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useState, useEffect } from "react"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import api from "@/lib/api"
import { toast } from "@/components/ui/sonner"
import { ClientForm } from "./ClientForm"
import { SelectInput } from "@/components/ui/select-input"
import { Users, Shield } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    FormCard,
    FormHeader,
    SubmitButton,
    GhostAction,
    inputVariants,
    selectVariants,
    FormLabelBase
} from "@/components/ui/design-system"

const formSchema = z.object({
    name: z.string().min(2, "Project name is required"),
    clientId: z.string().min(1, "Picking a client is required"),
    location: z.string().min(2, "Site location is required"),
    description: z.string().optional(),
    employeeIds: z.array(z.string()).optional(),
})

interface ProjectFormProps {
    clients: any[]
    onSuccess: () => void
    onRefreshClients: () => void
    initialData?: any
    employees?: any[]
}

export function ProjectForm({ clients, onSuccess, onRefreshClients, initialData, employees = [] }: ProjectFormProps) {
    const [loading, setLoading] = useState(false)
    const [isClientDialogOpen, setIsClientDialogOpen] = useState(false)

    const isEditing = !!initialData

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: { name: "", clientId: "", location: "", description: "", employeeIds: [] },
    })

    useEffect(() => {
        if (initialData) {
            form.reset({
                name: initialData.name || "",
                clientId: initialData.clientId || "",
                location: initialData.location || "",
                description: initialData.description || "",
                employeeIds: initialData.assignedEmployees?.map((emp: any) => emp.id) || [],
            })
        }
    }, [initialData, form])

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true)
        try {
            if (isEditing) {
                await api.patch(`/projects/${initialData.id}`, values)
                toast.success("Project intelligence updated")
            } else {
                await api.post("/projects", values)
                toast.success("Project deployment launched")
            }
            onSuccess()
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Operational failure during save")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormCard>
                    <FormHeader title="Project Intelligence" color="blue" />
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem className="space-y-0">
                                <FormLabelBase label="Project Designation" required />
                                <FormControl>
                                    <Input
                                        placeholder="e.g. Sector-7 Perimeter Control"
                                        className={inputVariants}
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage className="text-[10px] font-bold mt-2 ml-1" />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="clientId"
                        render={({ field }) => (
                            <FormItem className="space-y-0">
                                <div className="flex items-center justify-between mb-2">
                                    <FormLabelBase label="Verified Client Contract" required className="mb-0" />
                                    {!isEditing && (
                                        <Dialog open={isClientDialogOpen} onOpenChange={setIsClientDialogOpen}>
                                            <DialogTrigger asChild>
                                                <GhostAction size="sm" className="text-[9px] h-6 px-3 bg-slate-50 border-slate-100 uppercase font-black tracking-widest">
                                                    Quick Register Partner
                                                </GhostAction>
                                            </DialogTrigger>
                                            <DialogContent className="sm:max-w-[500px] border-none rounded-[40px] shadow-2xl p-0 overflow-hidden bg-white">
                                                <div className="p-10">
                                                    <DialogHeader>
                                                        <DialogTitle className="text-2xl font-black font-outfit uppercase tracking-tight">Add New Partner</DialogTitle>
                                                        <DialogDescription className="font-bold text-slate-400 font-outfit text-xs uppercase tracking-widest mt-2">
                                                            Register a new institutional identity.
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <div className="mt-10">
                                                        <ClientForm
                                                            onSuccess={() => {
                                                                setIsClientDialogOpen(false)
                                                                onRefreshClients()
                                                                toast.success("Identity verified")
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    )}
                                </div>
                                <FormControl>
                                    <SelectInput {...field} placeholder="Link to institutional partner..." className={selectVariants}>
                                        {clients.map(client => (
                                            <option key={client.id} value={client.id}>{client.name}</option>
                                        ))}
                                    </SelectInput>
                                </FormControl>
                                <FormMessage className="text-[10px] font-bold mt-2 ml-1" />
                            </FormItem>
                        )}
                    />
                </FormCard>

                <FormCard>
                    <FormHeader title="Operational Deployment" color="rose" />
                    <FormField
                        control={form.control}
                        name="location"
                        render={({ field }) => (
                            <FormItem className="space-y-0">
                                <FormLabelBase label="Deployment Site Address" required />
                                <FormControl>
                                    <Input
                                        placeholder="Full mission location"
                                        className={inputVariants}
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage className="text-[10px] font-bold mt-2 ml-1" />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                            <FormItem className="space-y-0">
                                <FormLabelBase label="Scope of Protocol" />
                                <FormControl>
                                    <Input
                                        placeholder="Specific mission directives"
                                        className={inputVariants}
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage className="text-[10px] font-bold mt-2 ml-1" />
                            </FormItem>
                        )}
                    />
                </FormCard>

                <FormCard>
                    <FormHeader title="Personnel Assignment" color="emerald" />
                    <FormField
                        control={form.control}
                        name="employeeIds"
                        render={({ field }) => (
                            <FormItem className="space-y-0">
                                <FormLabelBase label="Assign Guards to This Site" />
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                                    Select security personnel for deployment
                                </p>
                                {employees.length === 0 ? (
                                    <div className="p-6 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 text-center">
                                        <Users className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                                        <p className="text-xs font-bold text-slate-400">No employees available</p>
                                        <p className="text-[10px] text-slate-400 mt-1">Add employees first</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-[300px] overflow-y-auto p-4 rounded-2xl border border-slate-200 bg-slate-50/30">
                                        {employees.map((employee: any) => (
                                            <label
                                                key={employee.id}
                                                className={cn(
                                                    "flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer hover:border-emerald-200 hover:bg-white",
                                                    field.value?.includes(employee.id)
                                                        ? "border-emerald-500 bg-emerald-50/50"
                                                        : "border-slate-200 bg-white"
                                                )}
                                            >
                                                <Checkbox
                                                    checked={field.value?.includes(employee.id)}
                                                    onCheckedChange={(checked) => {
                                                        const currentValues = field.value || []
                                                        const newValues = checked
                                                            ? [...currentValues, employee.id]
                                                            : currentValues.filter((id: string) => id !== employee.id)
                                                        field.onChange(newValues)
                                                    }}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <Shield className="h-4 w-4 text-emerald-500" />
                                                        <span className="font-black text-slate-900 text-sm tracking-tight">
                                                            {employee.fullName}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                            {employee.employeeCode}
                                                        </span>
                                                        {employee.designation && (
                                                            <>
                                                                <span className="text-slate-300">•</span>
                                                                <span className="text-[9px] font-bold text-slate-400">
                                                                    {employee.designation.name}
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                )}
                                <FormMessage className="text-[10px] font-bold mt-2 ml-1" />
                            </FormItem>
                        )}
                    />
                </FormCard>

                <div className="pt-4">
                    <SubmitButton
                        label={isEditing ? "Update Mission Specs" : "Launch Operational Project"}
                        loading={loading}
                        disabled={!isEditing && clients.length === 0}
                    />
                </div>
                {!isEditing && clients.length === 0 && (
                    <p className="text-[10px] text-rose-500 font-black uppercase tracking-[0.2em] text-center mt-4 animate-pulse">
                        ⚠ Identity verification required before mission launch.
                    </p>
                )}
            </form>
        </Form>
    )
}
