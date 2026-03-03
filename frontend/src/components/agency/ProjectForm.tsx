"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
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
import { Plus } from "lucide-react"
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
    initialData?: any   // when editing an existing project
}

export function ProjectForm({ clients, onSuccess, onRefreshClients, initialData }: ProjectFormProps) {
    const [loading, setLoading] = useState(false)
    const [isClientDialogOpen, setIsClientDialogOpen] = useState(false)

    const isEditing = !!initialData

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: { name: "", clientId: "", location: "", description: "" },
    })

    // Re-populate when switching between projects
    useEffect(() => {
        form.reset({
            name: initialData?.name || "",
            clientId: initialData?.clientId || "",
            location: initialData?.location || "",
            description: initialData?.description || "",
        })
    }, [initialData?.id]) // eslint-disable-line react-hooks/exhaustive-deps

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true)
        try {
            if (isEditing) {
                await api.patch(`/projects/${initialData.id}`, values)
                toast.success("Project updated successfully")
            } else {
                await api.post("/projects", values)
                toast.success("Project launched successfully")
            }
            onSuccess()
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Something went wrong")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem className="space-y-2">
                            <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Name <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="Project name"
                                    className="h-14 bg-slate-50 border-transparent text-slate-900 placeholder:text-slate-300 rounded-2xl focus:bg-white focus:border-teal-100 transition-all font-semibold italic"
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
                        <FormItem className="space-y-2">
                            <div className="flex items-center justify-between pl-1">
                                <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Client <span className="text-red-500">*</span></FormLabel>
                                {/* Only show Quick Add when creating, not editing */}
                                {!isEditing && (
                                    <Dialog open={isClientDialogOpen} onOpenChange={setIsClientDialogOpen}>
                                        <DialogTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 px-2 text-[9px] font-black text-primary uppercase tracking-widest hover:bg-primary/5 rounded-lg"
                                            >
                                                <Plus className="h-3 w-3 mr-1" />
                                                Quick Add
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-[500px] border-none rounded-[40px] shadow-2xl p-0 overflow-hidden">
                                            <div className="p-10">
                                                <DialogHeader>
                                                    <DialogTitle className="text-2xl font-bold">Add Client</DialogTitle>
                                                    <DialogDescription className="font-medium text-slate-500">
                                                        Add a new client
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <div className="mt-6">
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
                            <SelectInput
                                {...field}
                                placeholder="Choose a client..."
                            >
                                {clients.map(client => (
                                    <option key={client.id} value={client.id}>{client.name}</option>
                                ))}
                            </SelectInput>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                        <FormItem className="space-y-2">
                            <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Location <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="Site location"
                                    className="h-14 bg-slate-50 border-transparent text-slate-900 placeholder:text-slate-300 rounded-2xl focus:bg-white focus:border-teal-100 transition-all font-semibold italic"
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
                        <FormItem className="space-y-2">
                            <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Description</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="Optional notes"
                                    className="h-14 bg-slate-50 border-transparent text-slate-900 placeholder:text-slate-300 rounded-2xl focus:bg-white focus:border-teal-100 transition-all font-semibold italic"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button
                    type="submit"
                    className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black shadow-lg transition-all active:scale-[0.98] uppercase tracking-widest mt-4"
                    disabled={loading || (!isEditing && clients.length === 0)}
                >
                    {loading ? "Processing..." : isEditing ? "Update Project" : "Create Project"}
                </Button>
                {!isEditing && clients.length === 0 && (
                    <p className="text-[10px] text-red-500 mt-2 font-bold uppercase tracking-widest text-center">Client required first.</p>
                )}
            </form>
        </Form>
    )
}
