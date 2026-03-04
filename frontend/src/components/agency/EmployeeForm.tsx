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
import { useAuthStore } from "@/store/authStore"
import { SelectInput } from "@/components/ui/select-input"
import { FormCard, FormHeader, SubmitButton, GhostAction } from "@/components/ui/design-system"
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
                toast.success("Employee updated")
            } else {
                await api.post("/employees", { ...payload, agencyId: user?.agencyId })
                toast.success("Employee created")
            }
            onSuccess()
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to save employee")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormCard>
                    <FormHeader title="Personal Information" color="blue" />
                    <FormField
                        control={form.control}
                        name="fullName"
                        render={({ field }) => (
                            <FormItem className="space-y-1">
                                <FormLabel className="text-[11px] font-bold text-slate-700 uppercase tracking-widest pl-1">Name <span className="text-red-500">*</span></FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="Name"
                                        className="h-14 bg-slate-50 border-transparent text-slate-900 placeholder:text-slate-300 rounded-2xl focus:bg-white focus:border-primary/20 transition-all font-semibold italic"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                            <FormItem className="space-y-1">
                                <FormLabel className="text-[11px] font-bold text-slate-700 uppercase tracking-widest pl-1">Phone <span className="text-red-500">*</span></FormLabel>
                                <FormControl>
                                    <PhoneInput
                                        value={field.value}
                                        onChange={(value) => field.onChange(value)}
                                        placeholder="Phone number"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </FormCard>

                <FormCard>
                    <FormHeader title="Professional Role" color="emerald" />
                    <FormField
                        control={form.control}
                        name="designationId"
                        render={({ field }) => (
                            <FormItem className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <FormLabel className="text-[11px] font-bold text-slate-700 uppercase tracking-widest pl-1">Designation <span className="text-red-500">*</span></FormLabel>
                                    {!showQuickAdd && (
                                        <GhostAction onClick={() => setShowQuickAdd(true)} className="text-[9px]">
                                            Quick Add
                                        </GhostAction>
                                    )}
                                </div>

                                {showQuickAdd ? (
                                    <div className="flex gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                        <Input
                                            placeholder="e.g. Supervisor"
                                            value={newDesignationName}
                                            onChange={(e) => setNewDesignationName(e.target.value)}
                                            className="h-10 rounded-xl"
                                        />
                                        <Button
                                            type="button"
                                            onClick={handleQuickAddDesignation}
                                            disabled={designationLoading || !newDesignationName}
                                            className="h-10 rounded-xl bg-slate-900 text-white"
                                        >
                                            {designationLoading ? "..." : "Add"}
                                        </Button>
                                        <GhostAction onClick={() => setShowQuickAdd(false)} className="h-10">Cancel</GhostAction>
                                    </div>
                                ) : (
                                    <FormControl>
                                        <SelectInput {...field} placeholder="Choose designation...">
                                            {designations.map(d => (
                                                <option key={d.id} value={d.id}>{d.name}</option>
                                            ))}
                                        </SelectInput>
                                    </FormControl>
                                )}
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="salaryCurrency"
                            render={({ field }) => (
                                <FormItem className="space-y-1">
                                    <FormLabel className="text-[11px] font-bold text-slate-700 uppercase tracking-widest pl-1">Currency</FormLabel>
                                    <SelectInput {...field}>
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
                                <FormItem className="space-y-1">
                                    <FormLabel className="text-[11px] font-bold text-slate-700 uppercase tracking-widest pl-1">Salary</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            className="h-14 bg-slate-50 border-transparent rounded-2xl font-black"
                                            {...field}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                    </div>
                </FormCard>

                <FormCard>
                    <FormHeader title="Security Controls" color="rose" />
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem className="space-y-1">
                                <FormLabel className="text-[11px] font-bold text-slate-700 uppercase tracking-widest pl-1">Email</FormLabel>
                                <FormControl>
                                    <Input type="email" placeholder="email@agency.com" {...field} className="h-14 rounded-2xl bg-slate-50" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem className="space-y-1">
                                <FormLabel className="text-[11px] font-bold text-slate-700 uppercase tracking-widest pl-1">Password {!initialData && <span className="text-red-500">*</span>}</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Input
                                            type={showPassword ? "text" : "password"}
                                            placeholder={initialData ? "Enter only to change" : "Set password"}
                                            {...field}
                                            className="h-14 rounded-2xl bg-slate-50 pr-12 font-black"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </FormCard>

                <SubmitButton
                    label={initialData ? "Update Employee" : "Register Employee"}
                    loading={loading}
                />
            </form>
        </Form>
    )
}
