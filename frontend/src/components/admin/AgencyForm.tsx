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
    FormDescription,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import api from "@/lib/api"
import { toast } from "sonner"

const formSchema = z.object({
    name: z.string().min(2, "Agency name must be at least 2 characters"),
    slug: z.string().min(2, "Slug must be at least 2 characters").regex(/^[a-z0-9-]+$/, "Slug must only contain lowercase letters, numbers, and hyphens"),
    adminName: z.string().min(2, "Admin name is required"),
    adminEmail: z.string().email("Invalid email address"),
    adminPassword: z.string().min(6, "Password must be at least 6 characters"),
})

export function AgencyForm({ onSuccess }: { onSuccess: () => void }) {
    const [loading, setLoading] = useState(false)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            slug: "",
            adminName: "",
            adminEmail: "",
            adminPassword: "",
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true)
        try {
            await api.post("/agencies", values)
            toast.success("Agency and Admin created successfully")
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
                <div className="space-y-4 rounded-2xl border border-slate-200/60 p-5 bg-white shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="h-1 w-4 bg-blue-600 rounded-full" />
                        <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Core Infrastructure</h3>
                    </div>
                    
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem className="space-y-1.5">
                                <FormLabel className="text-sm font-semibold text-slate-800">Agency Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="Stark Security" className="h-11 rounded-lg bg-slate-50/50 border-slate-200 focus:bg-white transition-colors" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="slug"
                        render={({ field }) => (
                            <FormItem className="space-y-1.5">
                                <FormLabel className="text-sm font-semibold text-slate-800">Unique Slug</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 font-mono">/</span>
                                        <Input placeholder="stark-security" className="h-11 pl-7 rounded-lg bg-slate-50/50 border-slate-200 font-mono focus:bg-white transition-colors" {...field} />
                                    </div>
                                </FormControl>
                                <FormDescription className="text-[11px] font-medium text-slate-400">Used for your private instance URL.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="space-y-4 rounded-2xl border border-slate-200/60 p-5 bg-white shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="h-1 w-4 bg-emerald-600 rounded-full" />
                        <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Master Credentials</h3>
                    </div>

                    <FormField
                        control={form.control}
                        name="adminName"
                        render={({ field }) => (
                            <FormItem className="space-y-1.5">
                                <FormLabel className="text-sm font-semibold text-slate-800">Agent Full Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="Tony Stark" className="h-11 rounded-lg bg-slate-50/50 border-slate-200 focus:bg-white transition-colors" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="adminEmail"
                        render={({ field }) => (
                            <FormItem className="space-y-1.5">
                                <FormLabel className="text-sm font-semibold text-slate-800">Agent Email</FormLabel>
                                <FormControl>
                                    <Input type="email" placeholder="tony@stark.com" className="h-11 rounded-lg bg-slate-50/50 border-slate-200 focus:bg-white transition-colors" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="adminPassword"
                        render={({ field }) => (
                            <FormItem className="space-y-1.5">
                                <FormLabel className="text-sm font-semibold text-slate-800">Agent Password</FormLabel>
                                <FormControl>
                                    <Input type="password" placeholder="••••••••" className="h-11 rounded-lg bg-slate-50/50 border-slate-200 focus:bg-white transition-colors" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <Button type="submit" className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg shadow-slate-200 transition-all active:scale-[0.98]" disabled={loading}>
                    {loading ? "INITIALIZING..." : "CREATE AGENCY"}
                </Button>
            </form>
        </Form>
    )
}
