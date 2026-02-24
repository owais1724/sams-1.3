"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useState } from "react"
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
import { toast } from "sonner"
import { Plus } from "lucide-react"
import { ClientForm } from "./ClientForm"
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

export function ProjectForm({ clients, onSuccess, onRefreshClients }: { clients: any[], onSuccess: () => void, onRefreshClients: () => void }) {
    const [loading, setLoading] = useState(false)
    const [isClientDialogOpen, setIsClientDialogOpen] = useState(false)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: { name: "", clientId: "", location: "", description: "" },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true)
        try {
            await api.post("/projects", values)
            toast.success("Project launched successfully")
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
                            <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Project / Site Name</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="Downtown Mall Security"
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
                                <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Client</FormLabel>
                                <Dialog open={isClientDialogOpen} onOpenChange={setIsClientDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 px-2 text-[9px] font-black text-primary uppercase tracking-widest hover:bg-primary/5 rounded-lg"
                                        >
                                            <Plus className="h-3 w-3 mr-1" />
                                            Quick Register
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[500px] border-none rounded-[40px] shadow-2xl p-0 overflow-hidden">
                                        <div className="p-10">
                                            <DialogHeader>
                                                <DialogTitle className="text-2xl font-bold">New Client Protocol</DialogTitle>
                                                <DialogDescription className="font-medium text-slate-500">
                                                    Initialize a new institutional partner before site deployment.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="mt-6">
                                                <ClientForm
                                                    onSuccess={() => {
                                                        setIsClientDialogOpen(false)
                                                        onRefreshClients()
                                                        toast.success("Client synchronized with project deck")
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            </div>
                            <select
                                {...field}
                                className="w-full h-14 bg-slate-50 border-transparent text-slate-900 rounded-2xl focus:bg-white focus:border-teal-100 transition-all font-semibold px-4 appearance-none outline-none shadow-sm"
                            >
                                <option value="">Choose a client...</option>
                                {clients.map(client => (
                                    <option key={client.id} value={client.id}>{client.name}</option>
                                ))}
                            </select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                        <FormItem className="space-y-2">
                            <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Site Location</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="456 Commerce Ave, Block B"
                                    className="h-14 bg-slate-50 border-transparent text-slate-900 placeholder:text-slate-300 rounded-2xl focus:bg-white focus:border-teal-100 transition-all font-semibold italic"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black shadow-lg transition-all active:scale-[0.98] uppercase tracking-widest mt-4" disabled={loading || clients.length === 0}>
                    {loading ? "Launching..." : "Establish Project"}
                </Button>
                {clients.length === 0 && (
                    <p className="text-[10px] text-red-500 mt-2 font-bold uppercase tracking-widest text-center">Protocol Violation: Client registration required first.</p>
                )}
            </form>
        </Form>
    )
}
