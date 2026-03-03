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
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import api from "@/lib/api"
import { toast } from "@/components/ui/sonner"
import { ClientForm } from "./ClientForm"
import { SelectInput } from "@/components/ui/select-input"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { FormCard, FormHeader, SubmitButton, GhostAction } from "@/components/ui/design-system"

const formSchema = z.object({
    name: z.string().min(2, "Project name is required"),
    clientId: z.string().min(1, "Picking a client is required"),
    location: z.string().min(2, "Site location is required"),
    description: z.string().optional(),
})

interface ProjectFormProps {
    clients: any[]
    onSuccess: () => void
    onRefreshClients: () => void
    initialData?: any
}

export function ProjectForm({ clients, onSuccess, onRefreshClients, initialData }: ProjectFormProps) {
    const [loading, setLoading] = useState(false)
    const [isClientDialogOpen, setIsClientDialogOpen] = useState(false)

    const isEditing = !!initialData

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: { name: "", clientId: "", location: "", description: "" },
    })

    useEffect(() => {
        if (initialData) {
            form.reset({
                name: initialData.name || "",
                clientId: initialData.clientId || "",
                location: initialData.location || "",
                description: initialData.description || "",
            })
        }
    }, [initialData, form])

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true)
        try {
            if (isEditing) {
                await api.patch(`/projects/${initialData.id}`, values)
                toast.success("Project updated")
            } else {
                await api.post("/projects", values)
                toast.success("Project launched")
            }
            onSuccess()
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to save project")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormCard>
                    <FormHeader title="Project Details" color="blue" />
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem className="space-y-1">
                                <FormLabel className="text-[11px] font-bold text-slate-700 uppercase tracking-widest pl-1">Project Name <span className="text-red-500">*</span></FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="e.g. Corporate HQ Patrol"
                                        className="h-14 bg-slate-50 border-transparent text-slate-900 rounded-2xl focus:bg-white focus:border-primary/20 transition-all font-semibold italic px-4"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="clientId"
                        render={({ field }) => (
                            <FormItem className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <FormLabel className="text-[11px] font-bold text-slate-700 uppercase tracking-widest pl-1">Client Contract <span className="text-red-500">*</span></FormLabel>
                                    {!isEditing && (
                                        <Dialog open={isClientDialogOpen} onOpenChange={setIsClientDialogOpen}>
                                            <DialogTrigger asChild>
                                                <GhostAction size="sm" className="text-[9px]">
                                                    Quick Add Client
                                                </GhostAction>
                                            </DialogTrigger>
                                            <DialogContent className="sm:max-w-[500px] border-none rounded-[40px] shadow-2xl p-0 overflow-hidden">
                                                <div className="p-10">
                                                    <DialogHeader>
                                                        <DialogTitle className="text-2xl font-bold font-outfit">Add New Client</DialogTitle>
                                                        <DialogDescription className="font-medium text-slate-500 font-outfit">
                                                            Quickly register a new client for this project.
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <div className="mt-8">
                                                        <ClientForm
                                                            onSuccess={() => {
                                                                setIsClientDialogOpen(false)
                                                                onRefreshClients()
                                                                toast.success("Client added")
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    )}
                                </div>
                                <FormControl>
                                    <SelectInput {...field} placeholder="Choose a client...">
                                        {clients.map(client => (
                                            <option key={client.id} value={client.id}>{client.name}</option>
                                        ))}
                                    </SelectInput>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </FormCard>

                <FormCard>
                    <FormHeader title="Operational Deployment" color="amber" />
                    <FormField
                        control={form.control}
                        name="location"
                        render={({ field }) => (
                            <FormItem className="space-y-1">
                                <FormLabel className="text-[11px] font-bold text-slate-700 uppercase tracking-widest pl-1">Deployment Site <span className="text-red-500">*</span></FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="Full address or site name"
                                        className="h-14 bg-slate-50 border-transparent text-slate-900 rounded-2xl focus:bg-white focus:border-primary/20 transition-all font-semibold italic px-4"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                            <FormItem className="space-y-1">
                                <FormLabel className="text-[11px] font-bold text-slate-700 uppercase tracking-widest pl-1">Scope of Work</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="Deployment notes or requirements"
                                        className="h-14 bg-slate-50 border-transparent text-slate-900 rounded-2xl focus:bg-white focus:border-primary/20 transition-all font-semibold italic px-4"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </FormCard>

                <SubmitButton
                    label={isEditing ? "Update Deployment" : "Launch Project"}
                    loading={loading}
                    disabled={!isEditing && clients.length === 0}
                />
                {!isEditing && clients.length === 0 && (
                    <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest text-center mt-2 animate-pulse">
                        ⚠ You must register a client before launching a project.
                    </p>
                )}
            </form>
        </Form>
    )
}
