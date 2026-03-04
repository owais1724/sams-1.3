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
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { PhoneInput, validatePhoneNumber } from "@/components/ui/phone-input"
import api from "@/lib/api"
import { cn } from "@/lib/utils"
import { toast } from "@/components/ui/sonner"
import { useAuthStore } from "@/store/authStore"
import { SelectInput } from "@/components/ui/select-input"
import {
    FormCard,
    FormHeader,
    SubmitButton,
    GhostAction,
    inputVariants,
    selectVariants,
    FormLabelBase
} from "@/components/ui/design-system"
import { Button } from "@/components/ui/button"

const knownCountries = [
    { name: "India", code: "+91", iso: "IN", flag: "🇮🇳", length: 10 },
    { name: "United Kingdom", code: "+44", iso: "GB", flag: "🇬🇧", length: 10 },
    { name: "United States", code: "+1", iso: "US", flag: "🇺🇸", length: 10 },
    { name: "Kenya", code: "+254", iso: "KE", flag: "🇰🇪", length: 9 },
    { name: "Nigeria", code: "+234", iso: "NG", flag: "🇳🇬", length: 10 },
    { name: "South Africa", code: "+27", iso: "ZA", flag: "🇿🇦", length: 9 },
]

const currencies = [
    { label: "USD ($)", value: "USD", symbol: "$" },
    { label: "INR (₹)", value: "INR", symbol: "₹" },
    { label: "GBP (£)", value: "GBP", symbol: "£" },
    { label: "EUR (€)", value: "EUR", symbol: "€" },
    { label: "KES (KSh)", value: "KES", symbol: "KSh" },
    { label: "NGN (₦)", value: "NGN", symbol: "₦" },
    { label: "ZAR (R)", value: "ZAR", symbol: "R" },
]

const baseSchema = z.object({
    fullName: z.string().min(2, "Name is required"),
    email: z.string().email("Invalid email"),
    password: z.string().optional(),
    employeeCode: z.string().optional(),
    designationId: z.string().min(1, "Picking a designation is required"),
    phone: z.object({
        countryCode: z.string().min(1, "Country code is required"),
        phoneNumber: z.string().min(1, "Phone number is required")
    }),
    basicSalary: z.string().min(1, "Basic salary is required"),
    salaryCurrency: z.string().min(1, "Currency is required"),
    status: z.string().optional(),
})

interface FormValues {
    fullName: string;
    email: string;
    password?: string;
    employeeCode?: string;
    designationId: string;
    phone: {
        countryCode: string;
        phoneNumber: string;
    };
    basicSalary: string;
    salaryCurrency: string;
    status?: string;
}

export function EmployeeForm({ designations, refetchDesignations, onSuccess, initialData }: {
    designations: any[],
    refetchDesignations: () => void,
    onSuccess: () => void,
    initialData?: any
}) {
    const [loading, setLoading] = useState(false)
    const [showQuickAdd, setShowQuickAdd] = useState(false)
    const [newDesignationName, setNewDesignationName] = useState("")
    const [designationLoading, setDesignationLoading] = useState(false)
    const { user } = useAuthStore()
    const [showPassword, setShowPassword] = useState(false)

    const form = useForm<FormValues>({
        resolver: zodResolver(baseSchema) as any,
        defaultValues: {
            fullName: "",
            email: "",
            password: "",
            employeeCode: "",
            designationId: "",
            phone: { countryCode: "+91", phoneNumber: "" },
            basicSalary: "0",
            salaryCurrency: "USD"
        },
    })

    useEffect(() => {
        if (initialData) {
            const rawPhone = initialData.phoneNumber || ""
            let countryCode = "+91"
            let phoneNumber = rawPhone

            for (const country of knownCountries) {
                if (rawPhone.startsWith(country.code)) {
                    countryCode = country.code
                    phoneNumber = rawPhone.slice(country.code.length)
                    break
                }
            }

            form.reset({
                fullName: initialData.fullName || "",
                email: initialData.email || "",
                password: "",
                employeeCode: initialData.employeeCode || "",
                designationId: initialData.designationId || "",
                phone: { countryCode, phoneNumber },
                basicSalary: initialData.basicSalary?.toString() || "0",
                salaryCurrency: initialData.salaryCurrency || "USD",
                status: initialData.status
            })
        }
    }, [initialData, form])

    const handleQuickAddDesignation = async () => {
        if (!newDesignationName) return
        setDesignationLoading(true)
        try {
            const response = await api.post("/designations", {
                name: newDesignationName,
                agencyId: user?.agencyId
            })
            toast.success("Designation created")
            const newId = response.data.id;
            setNewDesignationName("")
            setShowQuickAdd(false)
            await refetchDesignations();
            setTimeout(() => {
                form.setValue("designationId", newId);
            }, 100);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to create designation")
        } finally {
            setDesignationLoading(false)
        }
    }

    async function onSubmit(values: FormValues) {
        setLoading(true)
        try {
            const phoneError = validatePhoneNumber(values.phone.phoneNumber, values.phone.countryCode);
            if (phoneError) {
                toast.error(phoneError);
                setLoading(false);
                return;
            }

            const { phone, employeeCode, ...apiValues } = values
            const payload: any = {
                ...apiValues,
                phoneNumber: `${phone.countryCode}${phone.phoneNumber}`,
                basicSalary: parseFloat(values.basicSalary || "0")
            }

            if (initialData) {
                if (!payload.password) delete payload.password;
                await api.patch(`/employees/${initialData.id}`, payload)
                toast.success("Personnel update successful")
            } else {
                await api.post("/employees", { ...payload, agencyId: user?.agencyId })
                toast.success("Personnel enrollment successful")
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
                    <FormHeader title="Personal Intelligence" color="blue" />
                    <FormField
                        control={form.control}
                        name="fullName"
                        render={({ field }) => (
                            <FormItem className="space-y-0">
                                <FormLabelBase label="Personnel Full Name" required />
                                <FormControl>
                                    <Input
                                        placeholder="Full legal name"
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
                        name="phone"
                        render={({ field }) => (
                            <FormItem className="space-y-0">
                                <FormLabelBase label="Primary Contact Node (Phone)" required />
                                <FormControl>
                                    <PhoneInput
                                        value={field.value}
                                        onChange={(value) => field.onChange(value)}
                                        placeholder="Mobile communication line"
                                    />
                                </FormControl>
                                <FormMessage className="text-[10px] font-bold mt-2 ml-1" />
                            </FormItem>
                        )}
                    />
                </FormCard>

                <FormCard>
                    <FormHeader title="Institutional Assignment" color="emerald" />
                    <FormField
                        control={form.control}
                        name="designationId"
                        render={({ field }) => (
                            <FormItem className="space-y-0">
                                <div className="flex items-center justify-between mb-2">
                                    <FormLabelBase label="Institutional Rank" required className="mb-0" />
                                    {!showQuickAdd && (
                                        <GhostAction onClick={() => setShowQuickAdd(true)} className="text-[9px] h-6 px-3 bg-slate-50 border-slate-100">
                                            Quick Assign
                                        </GhostAction>
                                    )}
                                </div>

                                {showQuickAdd ? (
                                    <div className="flex gap-2 p-4 bg-slate-50/50 rounded-3xl border border-slate-100 mb-2">
                                        <Input
                                            placeholder="e.g. Tactical Lead"
                                            value={newDesignationName}
                                            onChange={(e) => setNewDesignationName(e.target.value)}
                                            className="h-12 rounded-2xl bg-white"
                                        />
                                        <Button
                                            type="button"
                                            onClick={handleQuickAddDesignation}
                                            disabled={designationLoading || !newDesignationName}
                                            className="h-12 rounded-2xl bg-slate-900 text-white font-black text-xs px-6"
                                        >
                                            {designationLoading ? "..." : "ADD"}
                                        </Button>
                                        <GhostAction onClick={() => setShowQuickAdd(false)} className="h-12 rounded-2xl">X</GhostAction>
                                    </div>
                                ) : (
                                    <FormControl>
                                        <SelectInput {...field} placeholder="Choose operational rank..." className={selectVariants}>
                                            {designations.map(d => (
                                                <option key={d.id} value={d.id}>{d.name}</option>
                                            ))}
                                        </SelectInput>
                                    </FormControl>
                                )}
                                <FormMessage className="text-[10px] font-bold mt-2 ml-1" />
                            </FormItem>
                        )}
                    />

                    <div className="grid grid-cols-2 gap-6">
                        <FormField
                            control={form.control}
                            name="salaryCurrency"
                            render={({ field }) => (
                                <FormItem className="space-y-0">
                                    <FormLabelBase label="Currency" />
                                    <SelectInput {...field} className={selectVariants}>
                                        {currencies.map(c => (
                                            <option key={c.value} value={c.value}>{c.label}</option>
                                        ))}
                                    </SelectInput>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="basicSalary"
                            render={({ field }) => (
                                <FormItem className="space-y-0">
                                    <FormLabelBase label="Monthly Protocol" />
                                    <FormControl>
                                        <Input
                                            type="number"
                                            className={cn(inputVariants, "font-black italic")}
                                            {...field}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                    </div>
                </FormCard>

                <FormCard>
                    <FormHeader title="Security & Authentication" color="rose" />
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem className="space-y-0">
                                <FormLabelBase label="Institutional Email" />
                                <FormControl>
                                    <Input type="email" placeholder="node@agency-hq.com" {...field} className={inputVariants} />
                                </FormControl>
                                <FormMessage className="text-[10px] font-bold mt-2 ml-1" />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem className="space-y-0">
                                <FormLabelBase label="Access Credential" required={!initialData} />
                                <FormControl>
                                    <div className="relative">
                                        <Input
                                            type={showPassword ? "text" : "password"}
                                            placeholder={initialData ? "RETAIN EXISTING" : "SET ACCESS KEY"}
                                            {...field}
                                            className={cn(inputVariants, "pr-14 font-black")}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-primary transition-colors"
                                        >
                                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                        </button>
                                    </div>
                                </FormControl>
                                <FormMessage className="text-[10px] font-bold mt-2 ml-1" />
                            </FormItem>
                        )}
                    />
                </FormCard>

                <div className="pt-4">
                    <SubmitButton
                        label={initialData ? "Update Personnel Dossier" : "Enroll Personnel Record"}
                        loading={loading}
                    />
                </div>
            </form>
        </Form>
    )
}
