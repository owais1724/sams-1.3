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

const baseFormSchema = z.object({
    name: z.string().min(2, "Agency name must be at least 2 characters"),
    slug: z.string().min(2, "Slug must be at least 2 characters").regex(/^[a-z0-9-]+$/, "Slug must only contain lowercase letters, numbers, and hyphens"),
    adminName: z.string().min(2, "Admin name is required"),
    adminEmail: z.string().email("Invalid email address"),
    adminPassword: z.string().optional(),
    adminPhone: z.object({
        countryCode: z.string().min(1, "Country code is required"),
        phoneNumber: z.string()
    })
});

const createFormSchema = baseFormSchema.refine((data) => {
    return !!data.adminPassword && data.adminPassword.length >= 6;
}, {
    message: "Password must be at least 6 characters",
    path: ["adminPassword"]
});

const editFormSchema = baseFormSchema;

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

    const formSchema = initialData ? editFormSchema : createFormSchema;

    const form = useForm<z.infer<typeof baseFormSchema>>({
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

    async function onSubmit(values: z.infer<typeof baseFormSchema>) {
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10 pb-12">
                <FormCard className="bg-white/5 border-white/5 shadow-2xl rounded-[32px] p-8">
                    <FormHeader title="Infrastructure Matrix" />
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem className="space-y-3">
                                <FormLabel className="text-[10px] font-black text-white/50 uppercase tracking-[0.3em] pl-1">
                                    Strategic Entity Name <span className="text-primary">*</span>
                                </FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="Enter Agency Entity Name..."
                                        className="h-14 bg-white/5 border-white/10 text-white placeholder:text-white/20 rounded-2xl focus:border-primary/50 focus:ring-primary/20 transition-all font-black uppercase tracking-widest italic"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage className="text-rose-500 font-bold text-[10px] uppercase tracking-widest" />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="slug"
                        render={({ field }) => (
                            <FormItem className="space-y-3">
                                <FormLabel className="text-[10px] font-black text-white/50 uppercase tracking-[0.3em] pl-1">
                                    Mission Endpoint <span className="text-primary">*</span>
                                </FormLabel>
                                <FormControl>
                                    <div className="relative group">
                                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-primary font-black text-lg group-focus-within:animate-pulse z-10">/</div>
                                        <Input
                                            placeholder="endpoint-identifier"
                                            className="h-14 pl-12 bg-white/5 border-white/10 text-primary placeholder:text-primary/20 rounded-2xl focus:border-primary/50 focus:ring-primary/20 transition-all font-mono font-black lowercase tracking-[0.1em]"
                                            {...field}
                                        />
                                    </div>
                                </FormControl>
                                <FormMessage className="text-rose-500 font-bold text-[10px] uppercase tracking-widest" />
                            </FormItem>
                        )}
                    />
                </FormCard>

                <FormCard className="bg-white/5 border-white/5 shadow-2xl rounded-[32px] p-8">
                    <FormHeader title="Administrator Credentials" />
                    <FormField
                        control={form.control}
                        name="adminName"
                        render={({ field }) => (
                            <FormItem className="space-y-3">
                                <FormLabel className="text-[10px] font-black text-white/50 uppercase tracking-[0.3em] pl-1">
                                    Root Admin Name <span className="text-primary">*</span>
                                </FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="Administrative Name"
                                        className="h-14 bg-white/5 border-white/10 text-white placeholder:text-white/20 rounded-2xl focus:border-primary/50 focus:ring-primary/20 transition-all font-black uppercase tracking-widest"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage className="text-rose-500 font-bold text-[10px] uppercase tracking-widest" />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="adminEmail"
                        render={({ field }) => (
                            <FormItem className="space-y-3">
                                <FormLabel className="text-[10px] font-black text-white/50 uppercase tracking-[0.3em] pl-1">
                                    Secure Communication Email <span className="text-primary">*</span>
                                </FormLabel>
                                <FormControl>
                                    <Input
                                        type="email"
                                        placeholder="admin@hypercore.system"
                                        className="h-14 bg-white/5 border-white/10 text-white placeholder:text-white/20 rounded-2xl focus:border-primary/50 focus:ring-primary/20 transition-all font-black"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage className="text-rose-500 font-bold text-[10px] uppercase tracking-widest" />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="adminPhone"
                        render={({ field }) => (
                            <FormItem className="space-y-3">
                                <FormControl>
                                    <div className="dark">
                                        <PhoneInput
                                            value={field.value || { countryCode: "+91", phoneNumber: "" }}
                                            onChange={(value) => field.onChange(value)}
                                            label="Authorized Contact Number"
                                            placeholder="Enter phone number"
                                            required={!initialData}
                                        />
                                    </div>
                                </FormControl>
                                {initialData?.users?.[0]?.phoneNumber && (
                                    <p className="text-[9px] font-black text-white/30 pl-1 uppercase tracking-widest">
                                        Existing: <span className="text-primary">{initialData.users[0].phoneNumber}</span>
                                    </p>
                                )}
                                <FormMessage className="text-rose-500 font-bold text-[10px] uppercase tracking-widest" />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="adminPassword"
                        render={({ field }) => (
                            <FormItem className="space-y-3">
                                <FormLabel className="text-[10px] font-black text-white/50 uppercase tracking-[0.3em] pl-1">
                                    Master Authentication Key {!initialData && <span className="text-primary">*</span>}
                                </FormLabel>
                                <FormControl>
                                    <div className="relative group">
                                        <Input
                                            type={showPassword ? "text" : "password"}
                                            placeholder={initialData ? "// KEY ENCRYPTED" : "SET MASTER KEY"}
                                            className="h-14 bg-white/5 border-white/10 text-primary placeholder:text-primary/20 rounded-2xl focus:border-primary/50 focus:ring-primary/20 transition-all font-black tracking-widest"
                                            {...field}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-5 top-1/2 -translate-y-1/2 text-white/20 hover:text-primary transition-colors"
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
                                    <p className="text-[9px] font-black text-emerald-500/60 pl-1 uppercase tracking-widest flex items-center gap-2">
                                        <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
                                        Encryption Key Status: Operational
                                    </p>
                                )}
                                <FormMessage className="text-rose-500 font-bold text-[10px] uppercase tracking-widest" />
                            </FormItem>
                        )}
                    />
                </FormCard>

                <div className="pt-4">
                    <SubmitButton
                        label={initialData ? "Authorize Upgrades" : "Authorize Node Creation"}
                        loading={loading}
                        className="h-20 text-lg shadow-[0_0_50px_rgba(255,184,0,0.15)] hover:shadow-[0_0_70px_rgba(255,184,0,0.25)]"
                    />
                </div>
            </form>
        </Form>
    )
}
