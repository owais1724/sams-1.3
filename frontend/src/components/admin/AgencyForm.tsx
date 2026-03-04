"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useState, useEffect } from "react"
import { Eye, EyeOff } from "lucide-react"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { PhoneInput, validatePhoneNumber } from "@/components/ui/phone-input"
import api from "@/lib/api"
import { toast } from "@/components/ui/sonner"
import { FormCard, FormHeader, SubmitButton } from "@/components/ui/design-system"

const formSchema = z.object({
    name: z.string().min(2, "Agency name must be at least 2 characters"),
    slug: z.string().min(2, "Slug must be at least 2 characters").regex(/^[a-z0-9-]+$/, "Slug must only contain lowercase letters, numbers, and hyphens"),
    adminName: z.string().min(2, "Admin name is required"),
    adminEmail: z.string().email("Invalid email address"),
    adminPassword: z.string().optional(),
    adminPhone: z.object({
        countryCode: z.string().min(1, "Country code is required"),
        phoneNumber: z.string()
    })
}).refine((data) => {
    return true;
}, {
    message: "Invalid data",
    path: ["adminPassword"]
});

function parsePhone(raw: string): { countryCode: string; phoneNumber: string } {
    const knownCodes = ["+254", "+234", "+44", "+27", "+91", "+1"]
    for (const code of knownCodes) {
        if (raw?.startsWith(code)) {
            return { countryCode: code, phoneNumber: raw.slice(code.length) }
        }
    }
    return { countryCode: "+91", phoneNumber: raw || "" }
}

export function AgencyForm({ onSuccess, initialData }: { onSuccess: () => void, initialData?: any }) {
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            slug: "",
            adminName: "",
            adminEmail: "",
            adminPassword: "",
            adminPhone: { countryCode: "+91", phoneNumber: "" },
        },
    })

    useEffect(() => {
        const adminUser = initialData?.users?.[0]
        const rawPhone = adminUser?.phoneNumber || ""
        const parsedPhone = rawPhone ? parsePhone(rawPhone) : { countryCode: "+91", phoneNumber: "" }

        form.reset({
            name: initialData?.name || "",
            slug: initialData?.slug || "",
            adminName: adminUser?.fullName || "",
            adminEmail: adminUser?.email || "",
            adminPassword: "",
            adminPhone: parsedPhone,
        })
    }, [initialData?.id])

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
                if (values.adminPhone?.phoneNumber) {
                    const phoneError = validatePhoneNumber(values.adminPhone.phoneNumber, values.adminPhone.countryCode);
                    if (phoneError) {
                        toast.error(phoneError);
                        setLoading(false);
                        return;
                    }
                    updateData.adminPhone = values.adminPhone;
                }

                await api.patch(`/agencies/${initialData.id}`, updateData)
                toast.success("Agency and administrator updated successfully")
                onSuccess()
            } else {
                if (values.adminPhone?.phoneNumber) {
                    const phoneError = validatePhoneNumber(values.adminPhone.phoneNumber, values.adminPhone.countryCode);
                    if (phoneError) {
                        toast.error(phoneError);
                        setLoading(false);
                        return;
                    }
                }
                await api.post("/agencies", values)
                toast.success("Agency and Admin created successfully")
                onSuccess()
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Something went wrong")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormCard>
                    <FormHeader title="Core Infrastructure" color="blue" />
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem className="space-y-1.5">
                                <FormLabel className="text-[11px] font-bold text-slate-700 uppercase tracking-widest pl-1">
                                    Agency Name <span className="text-red-500">*</span>
                                </FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="Name"
                                        className="italic"
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
                                <FormLabel className="text-[11px] font-bold text-slate-700 uppercase tracking-widest pl-1">
                                    Slug <span className="text-red-500">*</span>
                                </FormLabel>
                                <FormControl>
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm group-focus-within:text-primary transition-colors z-10">/</div>
                                        <Input
                                            placeholder="Slug"
                                            className="pl-10 font-mono font-bold"
                                            {...field}
                                        />
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </FormCard>

                <FormCard>
                    <FormHeader title="Master Credentials" color="emerald" />
                    <FormField
                        control={form.control}
                        name="adminName"
                        render={({ field }) => (
                            <FormItem className="space-y-1.5">
                                <FormLabel className="text-[11px] font-bold text-slate-700 uppercase tracking-widest pl-1">
                                    Name <span className="text-red-500">*</span>
                                </FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="Name"
                                        className="italic"
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
                                <FormLabel className="text-[11px] font-bold text-slate-700 uppercase tracking-widest pl-1">
                                    Email <span className="text-red-500">*</span>
                                </FormLabel>
                                <FormControl>
                                    <Input
                                        type="email"
                                        placeholder="Email"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="adminPhone"
                        render={({ field }) => (
                            <FormItem className="space-y-1.5">
                                <FormControl>
                                    <PhoneInput
                                        value={field.value || { countryCode: "+91", phoneNumber: "" }}
                                        onChange={(value) => field.onChange(value)}
                                        label="Phone Number"
                                        placeholder="Enter phone number"
                                        required={!initialData}
                                    />
                                </FormControl>
                                {initialData?.users?.[0]?.phoneNumber && (
                                    <p className="text-[10px] font-bold text-slate-400 pl-1">
                                        Saved: <span className="text-slate-700 font-black tracking-wide">{initialData.users[0].phoneNumber}</span>
                                    </p>
                                )}
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
                                    Password {!initialData && <span className="text-red-500">*</span>}
                                </FormLabel>
                                <FormControl>
                                    <div className="relative group">
                                        <Input
                                            type={showPassword ? "text" : "password"}
                                            placeholder={initialData ? "Leave blank to keep current password" : "Set a password"}
                                            className="pr-12 font-black"
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
                                {initialData && (
                                    <p className="text-[10px] font-bold text-emerald-600 pl-1 flex items-center gap-1">
                                        <span>✓</span>
                                        <span>Password is set — leave blank to keep it unchanged</span>
                                    </p>
                                )}
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </FormCard>

                <SubmitButton
                    label={initialData ? "Update Agency" : "Create Agency"}
                    loading={loading}
                />
            </form>
        </Form>
    )
}
