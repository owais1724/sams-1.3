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
                <div className="space-y-6 rounded-[32px] border border-slate-100 p-8 bg-white shadow-xl shadow-slate-200/50">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="h-2 w-2 bg-blue-600 rounded-full animate-pulse" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Core Infrastructure</h3>
                    </div>

                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem className="space-y-1.5">
                                <FormLabel className="text-[11px] font-bold text-slate-700 uppercase tracking-widest pl-1">Agency Legal Name</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="Enter agency name"
                                        className="h-14 rounded-2xl bg-slate-50 border-transparent text-slate-900 placeholder:text-slate-300 focus:bg-white focus:border-primary/20 transition-all font-semibold italic px-4"
                                        {...field}
                                    />
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
                                <FormLabel className="text-[11px] font-bold text-slate-700 uppercase tracking-widest pl-1">Unique Instance Identifier (Slug)</FormLabel>
                                <FormControl>
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm group-focus-within:text-primary transition-colors">/</div>
                                        <Input
                                            placeholder="identifier-code"
                                            className="h-14 pl-8 rounded-2xl bg-slate-50 border-transparent text-slate-900 placeholder:text-slate-300 font-mono font-bold focus:bg-white focus:border-primary/20 transition-all px-4"
                                            {...field}
                                        />
                                    </div>
                                </FormControl>
                                <FormDescription className="text-[9px] font-bold text-slate-400 uppercase tracking-tight pl-2">This defines the private access URL for this agency instance.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="space-y-6 rounded-[32px] border border-slate-100 p-8 bg-white shadow-xl shadow-slate-200/50">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="h-2 w-2 bg-emerald-600 rounded-full animate-pulse" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Master Credentials</h3>
                    </div>

                    <FormField
                        control={form.control}
                        name="adminName"
                        render={({ field }) => (
                            <FormItem className="space-y-1.5">
                                <FormLabel className="text-[11px] font-bold text-slate-700 uppercase tracking-widest pl-1">Principal Officer Full Name</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="Full legal name"
                                        className="h-14 rounded-2xl bg-slate-50 border-transparent text-slate-900 placeholder:text-slate-300 focus:bg-white focus:border-primary/20 transition-all font-semibold italic px-4"
                                        {...field}
                                    />
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
                                <FormLabel className="text-[11px] font-bold text-slate-700 uppercase tracking-widest pl-1">System Access Email</FormLabel>
                                <FormControl>
                                    <Input
                                        type="email"
                                        placeholder="admin@instance.com"
                                        className="h-14 rounded-2xl bg-slate-50 border-transparent text-slate-900 placeholder:text-slate-300 focus:bg-white focus:border-primary/20 transition-all font-semibold px-4"
                                        {...field}
                                    />
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
                                <FormLabel className="text-[11px] font-bold text-slate-700 uppercase tracking-widest pl-1">
                                    {initialData ? "Rotate Access Secret" : "Primary Access Secret"}
                                </FormLabel>
                                <FormControl>
                                    <div className="relative group">
                                        <Input
                                            type={showPassword ? "text" : "password"}
                                            placeholder={initialData ? "Leave blank to maintain current" : "••••••••"}
                                            className="h-14 rounded-2xl bg-slate-50 border-transparent text-slate-900 placeholder:text-slate-300 focus:bg-white focus:border-primary/20 transition-all font-black px-4 pr-12"
                                            {...field}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                            {showPassword ? (
                                                <EyeOff className="h-5 w-5" />
                                            ) : (
                                                <Eye className="h-5 w-5" />
                                            )}
                                        </button>
                                    </div>
                                </FormControl>
                                <div className="mt-4 p-4 rounded-xl bg-slate-50/50 border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Security Requirements:</p>
                                    <ul className="grid grid-cols-2 gap-x-6 gap-y-2">
                                        <li className={`text-[9px] font-extrabold flex items-center ${((field.value?.length || 0)) >= 8 ? 'text-emerald-600' : 'text-slate-400'}`}>
                                            <div className={`h-1.5 w-1.5 rounded-full mr-2 ${((field.value?.length || 0)) >= 8 ? 'bg-emerald-600' : 'bg-slate-300'}`} />
                                            8+ Characters
                                        </li>
                                        <li className={`text-[9px] font-extrabold flex items-center ${/[A-Z]/.test(field.value || '') ? 'text-emerald-600' : 'text-slate-400'}`}>
                                            <div className={`h-1.5 w-1.5 rounded-full mr-2 ${/[A-Z]/.test(field.value || '') ? 'bg-emerald-600' : 'bg-slate-300'}`} />
                                            Uppercase
                                        </li>
                                        <li className={`text-[9px] font-extrabold flex items-center ${/[a-z]/.test(field.value || '') ? 'text-emerald-600' : 'text-slate-400'}`}>
                                            <div className={`h-1.5 w-1.5 rounded-full mr-2 ${/[a-z]/.test(field.value || '') ? 'bg-emerald-600' : 'bg-slate-300'}`} />
                                            Lowercase
                                        </li>
                                        <li className={`text-[9px] font-extrabold flex items-center ${/[0-9]/.test(field.value || '') ? 'text-emerald-600' : 'text-slate-400'}`}>
                                            <div className={`h-1.5 w-1.5 rounded-full mr-2 ${/[0-9]/.test(field.value || '') ? 'bg-emerald-600' : 'bg-slate-300'}`} />
                                            Number
                                        </li>
                                    </ul>
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <Button type="submit" className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-2xl shadow-xl shadow-slate-200 transition-all active:scale-[0.98]" disabled={loading}>
                    {loading ? "PROCESSING..." : (initialData ? "SAVE AGENCY CONFIGURATION" : "FINALIZE AGENCY DEPLOYMENT")}
                </Button>
            </form>
        </Form>
    )
}
