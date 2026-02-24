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

const formSchema = z.object({
    name: z.string().min(2, "Client name is required"),
    contact: z.string().min(2, "Contact person is required"),
    email: z.string().email("Invalid email address"),
    address: z.string().optional(),
})

interface ClientFormProps {
    onSuccess: () => void
    initialData?: any
}

export function ClientForm({ onSuccess, initialData }: ClientFormProps) {
    const [loading, setLoading] = useState(false)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: initialData?.name || "",
            contact: initialData?.contact || "",
            email: initialData?.email || "",
            address: initialData?.address || ""
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true)
        try {
            if (initialData?.id) {
                await api.post(`/clients/${initialData.id}`, values)
                toast.success("Client updated successfully")
            } else {
                await api.post("/clients", values)
                toast.success("Client added successfully")
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
                            <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Name</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="Name"
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
                    name="contact"
                    render={({ field }) => (
                        <FormItem className="space-y-2">
                            <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Contact</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="Contact"
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
                    name="email"
                    render={({ field }) => (
                        <FormItem className="space-y-2">
                            <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Email</FormLabel>
                            <FormControl>
                                <Input
                                    type="email"
                                    placeholder="Email"
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
                    name="address"
                    render={({ field }) => (
                        <FormItem className="space-y-2">
                            <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Address</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="Address"
                                    className="h-14 bg-slate-50 border-transparent text-slate-900 placeholder:text-slate-300 rounded-2xl focus:bg-white focus:border-teal-100 transition-all font-semibold italic"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black shadow-lg transition-all active:scale-[0.98] uppercase tracking-widest mt-4" disabled={loading}>
                    {loading ? "Processing..." : initialData?.id ? "Update Client" : "Register Client"}
                </Button>
            </form>
        </Form>
    )
}
