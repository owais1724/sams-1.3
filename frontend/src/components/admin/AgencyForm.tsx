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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="space-y-6 rounded-[1.5rem] border border-slate-100 p-6 bg-slate-50/50">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Core Infrastructure</h3>
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem className="space-y-1">
                                <FormLabel className="text-[11px] font-bold text-slate-700">AGENCY_NAME</FormLabel>
                                <FormControl>
                                    <Input placeholder="Stark Security" className="h-12 rounded-xl bg-white border-slate-200" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="slug"
                        render={({ field }) => (
                            <FormItem className="space-y-1">
                                <FormLabel className="text-[11px] font-bold text-slate-700">UNIQUE_SLUG</FormLabel>
                                <FormControl>
                                    <div className="flex items-center space-x-2">
                                        <span className="text-sm font-black text-slate-400 font-mono">/</span>
                                        <Input placeholder="stark-security" className="h-12 rounded-xl bg-white border-slate-200 font-mono" {...field} />
                                    </div>
                                </FormControl>
                                <FormDescription className="text-[10px] font-medium text-slate-400 italic">This identifier will be used for your private instance URL.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="space-y-6 rounded-[1.5rem] border border-slate-100 p-6 bg-slate-50/50">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Master Credentials</h3>
                    <FormField
                        control={form.control}
                        name="adminName"
                        render={({ field }) => (
                            <FormItem className="space-y-1">
                                <FormLabel className="text-[11px] font-bold text-slate-700">AGENT_FULL_NAME</FormLabel>
                                <FormControl>
                                    <Input placeholder="Tony Stark" className="h-12 rounded-xl bg-white border-slate-200" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="adminEmail"
                        render={({ field }) => (
                            <FormItem className="space-y-1">
                                <FormLabel className="text-[11px] font-bold text-slate-700">AGENT_EMAIL</FormLabel>
                                <FormControl>
                                    <Input type="email" placeholder="tony@stark.com" className="h-12 rounded-xl bg-white border-slate-200" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="adminPassword"
                        render={({ field }) => (
                            <FormItem className="space-y-1">
                                <FormLabel className="text-[11px] font-bold text-slate-700">AGENT_PASSWORD</FormLabel>
                                <FormControl>
                                    <Input type="password" placeholder="••••••••" className="h-12 rounded-xl bg-white border-slate-200" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <Button type="submit" className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-2xl shadow-xl shadow-slate-200 transition-all active:scale-[0.98]" disabled={loading}>
                    {loading ? "INITIALIZING..." : "CREATE AGENCY"}
                </Button>
            </form>
        </Form>
    )
}
