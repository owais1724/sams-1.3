"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Eye, EyeOff } from "lucide-react"
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
    adminName: z.string().min(2, "Admin name is required").optional().or(z.literal('')),
    adminEmail: z.string().email("Invalid email address").optional().or(z.literal('')),
    adminPassword: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/,
            "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
        )
        .optional()
        .or(z.literal('')),
})

export function AgencyForm({ onSuccess, initialData }: { onSuccess: () => void, initialData?: any }) {
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: initialData?.name || "",
            slug: initialData?.slug || "",
            adminName: initialData?.users?.[0]?.fullName || "",
            adminEmail: initialData?.users?.[0]?.email || "",
            adminPassword: "",
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true)
        try {
            if (initialData) {
                const updateData: any = {
                    name: values.name,
                    slug: values.slug
                }
                if (values.adminName) updateData.adminName = values.adminName;
                if (values.adminEmail) updateData.adminEmail = values.adminEmail;
                if (values.adminPassword) updateData.adminPassword = values.adminPassword;

                await api.patch(`/agencies/${initialData.id}`, updateData)
                toast.success("Agency and administrator updated successfully")
            } else {
                await api.post("/agencies", values)
                toast.success("Agency and Admin created successfully")
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
                                <FormLabel className="text-sm font-semibold text-slate-800">
                                    {initialData ? "Update Agent Password" : "Agent Password"}
                                </FormLabel>
                                <FormControl>
                                    <div className="relative group">
                                        <Input
                                            type={showPassword ? "text" : "password"}
                                            placeholder={initialData ? "Leave blank to keep current" : "••••••••"}
                                            className="h-11 rounded-lg bg-slate-50/50 border-slate-200 focus:bg-white transition-colors pr-10"
                                            {...field}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                            {showPassword ? (
                                                <EyeOff className="h-4 w-4" />
                                            ) : (
                                                <Eye className="h-4 w-4" />
                                            )}
                                        </button>
                                    </div>
                                </FormControl>
                                <div className="mt-2 space-y-1.5">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Security Standards:</p>
                                    <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
                                        <li className={`text-[9px] flex items-center ${(field.value?.length ?? 0) >= 8 ? 'text-emerald-600' : 'text-slate-400'}`}>
                                            <div className={`h-1 w-1 rounded-full mr-1.5 ${(field.value?.length ?? 0) >= 8 ? 'bg-emerald-600' : 'bg-slate-300'}`} />
                                            8+ Characters
                                        </li>
                                        <li className={`text-[9px] flex items-center ${/[A-Z]/.test(field.value || '') ? 'text-emerald-600' : 'text-slate-400'}`}>
                                            <div className={`h-1 w-1 rounded-full mr-1.5 ${/[A-Z]/.test(field.value || '') ? 'bg-emerald-600' : 'bg-slate-300'}`} />
                                            Uppercase Letter
                                        </li>
                                        <li className={`text-[9px] flex items-center ${/[a-z]/.test(field.value || '') ? 'text-emerald-600' : 'text-slate-400'}`}>
                                            <div className={`h-1 w-1 rounded-full mr-1.5 ${/[a-z]/.test(field.value || '') ? 'bg-emerald-600' : 'bg-slate-300'}`} />
                                            Lowercase Letter
                                        </li>
                                        <li className={`text-[9px] flex items-center ${/[0-9]/.test(field.value || '') ? 'text-emerald-600' : 'text-slate-400'}`}>
                                            <div className={`h-1 w-1 rounded-full mr-1.5 ${/[0-9]/.test(field.value || '') ? 'bg-emerald-600' : 'bg-slate-300'}`} />
                                            Number Included
                                        </li>
                                        <li className={`text-[9px] flex items-center ${/[!@#$%^&*]/.test(field.value || '') ? 'text-emerald-600' : 'text-slate-400'}`}>
                                            <div className={`h-1 w-1 rounded-full mr-1.5 ${/[!@#$%^&*]/.test(field.value || '') ? 'bg-emerald-600' : 'bg-slate-300'}`} />
                                            Special Symbol
                                        </li>
                                    </ul>
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <Button type="submit" className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg shadow-slate-200 transition-all active:scale-[0.98]" disabled={loading}>
                    {loading ? (initialData ? "SAVING..." : "INITIALIZING...") : (initialData ? "UPDATE AGENCY" : "CREATE AGENCY")}
                </Button>
            </form>
        </Form>
    )
}
