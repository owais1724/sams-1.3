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
