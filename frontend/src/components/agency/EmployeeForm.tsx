"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Eye, EyeOff } from "lucide-react"
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
import { PhoneInput, validatePhoneNumber } from "@/components/ui/phone-input"
import api from "@/lib/api"
import { toast } from "@/components/ui/sonner"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/store/authStore"

const countries = [
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
    password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/,
            "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
        ),
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

const formSchema = baseSchema.refine((data) => {
    return !validatePhoneNumber(data.phone.phoneNumber, data.phone.countryCode)
}, {
    message: "Invalid phone number for selected country",
    path: ["phone"]
})

const editFormSchema = baseSchema.extend({
    password: z.string().optional()
}).refine((data) => {
    return !validatePhoneNumber(data.phone.phoneNumber, data.phone.countryCode)
}, {
    message: "Invalid phone number for selected country",
    path: ["phone"]
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
    console.log("EmployeeForm designations prop:", designations) // Debug log
    const [loading, setLoading] = useState(false)
    const [showQuickAdd, setShowQuickAdd] = useState(false)
    const [newDesignationName, setNewDesignationName] = useState("")
    const [designationLoading, setDesignationLoading] = useState(false)
    const { user } = useAuthStore()


    const handleQuickAddDesignation = async () => {
        if (!newDesignationName) return
        setDesignationLoading(true)
        try {
            const response = await api.post("/designations", {
                name: newDesignationName,
                agencyId: user?.agencyId
            })
            toast.success("Designation created successfully")
            const newId = response.data.id;
            setNewDesignationName("")
            setShowQuickAdd(false)

            // Refresh parent list immediately
            await refetchDesignations();

            // Small delay to ensure state is updated before setting the value
            setTimeout(() => {
                form.setValue("designationId", newId);
                form.trigger("designationId"); // Trigger validation
            }, 100);
        } catch (error: any) {
            console.error("Designation creation error:", error)
            toast.error(error.response?.data?.message || "Failed to create designation")
        } finally {
            setDesignationLoading(false)
        }
    }

    const form = useForm<FormValues>({
        resolver: zodResolver(initialData ? editFormSchema : formSchema) as any,
        defaultValues: {
            fullName: initialData?.fullName || "",
            email: initialData?.email || "",
            password: "",
            employeeCode: initialData?.employeeCode || "",
            designationId: initialData?.designationId || "",
            phone: {
                countryCode: "+91",
                phoneNumber: ""
            },
            basicSalary: initialData?.basicSalary?.toString() || "0",
            salaryCurrency: initialData?.salaryCurrency || "USD"
        },
    })

    useEffect(() => {
        if (initialData) {
            // Parse existing phone number
            const phone = initialData.phoneNumber || ""
            let countryCode = "+91"
            let phoneNumber = phone

            // Try to extract country code from the phone number
            for (const country of countries) {
                if (phone.startsWith(country.code)) {
                    countryCode = country.code
                    phoneNumber = phone.slice(country.code.length)
                    break
                }
            }

            form.reset({
                fullName: initialData.fullName || "",
                email: initialData.email || "",
                password: "",
                employeeCode: initialData.employeeCode || "",
                designationId: initialData.designationId || "",
                phone: {
                    countryCode,
                    phoneNumber
                },
                basicSalary: initialData.basicSalary?.toString() || "0",
                salaryCurrency: initialData.salaryCurrency || "USD",
                status: initialData.status
            })
        }
    }, [initialData, form])

    // Update form when designations change
    useEffect(() => {
        if (designations.length > 0 && !form.getValues("designationId")) {
            // If no designation is selected and we have designations, don't auto-select
            // Let the user choose explicitly
        }
    }, [designations, form])


    const [showPassword, setShowPassword] = useState(false)

    async function onSubmit(values: FormValues) {
        setLoading(true)
        try {
            // Validate phone number
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
                // If password is empty, don't send it to the backend
                if (!payload.password) {
                    const { password, ...updatePayload } = payload
                    await api.patch(`/employees/${initialData.id}`, updatePayload)
                } else {
                    await api.patch(`/employees/${initialData.id}`, payload)
                }
                toast.success("Employee updated successfully")
            } else {
                await api.post("/employees", { ...payload, agencyId: user?.agencyId })
                toast.success("Employee created successfully")
            }
            onSuccess()
        } catch (error: any) {
            console.error("Employee Save Error:", error)
            const message = error.response?.data?.message || error.message || "Unknown error occurred"
            toast.error(`Failed: ${message}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

                <div className="space-y-1">
                    <FormField
                        control={form.control}
                        name="designationId"
                        render={({ field }) => (
                            <FormItem className="space-y-1">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex flex-col">
                                        <FormLabel className="text-[11px] font-bold text-slate-700 uppercase tracking-widest pl-1">Designation <span className="text-red-500">*</span></FormLabel>
                                        {designations.length === 0 && (
                                            <span className="text-[9px] font-bold text-amber-600 uppercase mt-0.5">⚠️ No designations available. Create one below.</span>
                                        )}
                                    </div>
                                </div>

                                {(!showQuickAdd && designations.length > 0) ? (
                                    <FormControl>
                                        <select
                                            {...field}
                                            className="w-full h-14 bg-slate-50 border-transparent text-slate-900 rounded-2xl focus:bg-white focus:border-primary/20 transition-all font-semibold px-4 appearance-none outline-none shadow-sm"
                                        >
                                            <option value="">Choose a designation...</option>
                                            {designations.map(d => (
                                                <option key={d.id} value={d.id}>{d.name}</option>
                                            ))}
                                        </select>
                                    </FormControl>
                                ) : (
                                    <div className="flex flex-col gap-2 p-4 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/30">
                                        <div className="flex space-x-2">
                                            <Input
                                                placeholder="e.g. Security Supervisor"
                                                value={newDesignationName}
                                                onChange={(e) => setNewDesignationName(e.target.value)}
                                                className="flex-1 h-12 rounded-xl border-slate-200 bg-white"
                                            />
                                            <Button
                                                type="button"
                                                onClick={handleQuickAddDesignation}
                                                disabled={designationLoading || !newDesignationName}
                                                className="h-12 rounded-xl bg-primary text-white hover:bg-primary/90 px-6 font-bold shadow-lg shadow-primary/10"
                                            >
                                                {designationLoading ? "..." : "Create"}
                                            </Button>
                                            {designations.length > 0 && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    onClick={() => setShowQuickAdd(false)}
                                                    className="h-12 rounded-xl border border-slate-200 font-bold"
                                                >
                                                    Cancel
                                                </Button>
                                            )}
                                        </div>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight ml-1">
                                            Creating a designation also auto-configures the corresponding security role.
                                        </p>
                                    </div>
                                )}
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                        <FormItem className="space-y-1">
                            <FormLabel className="text-[11px] font-bold text-slate-700 uppercase tracking-widest pl-1">Phone <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                                <PhoneInput
                                    value={field.value || { countryCode: "+91", phoneNumber: "" }}
                                    onChange={(value) => field.onChange(value)}
                                    label="Phone Number"
                                    placeholder="Enter phone number"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="salaryCurrency"
                        render={({ field }) => (
                            <FormItem className="space-y-1">
                                <FormLabel className="text-[11px] font-bold text-slate-700 uppercase tracking-widest pl-1">Currency</FormLabel>
                                <FormControl>
                                    <select
                                        {...field}
                                        className="w-full h-14 bg-slate-50 border-transparent text-slate-900 rounded-2xl focus:bg-white focus:border-primary/20 transition-all font-semibold px-4 appearance-none outline-none shadow-sm"
                                    >
                                        {currencies.map(c => (
                                            <option key={c.value} value={c.value}>{c.label}</option>
                                        ))}
                                    </select>
                                </FormControl>
                                <FormMessage />
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
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                                            {currencies.find(c => c.value === form.watch("salaryCurrency"))?.symbol}
                                        </div>
                                        <Input
                                            type="number"
                                            placeholder="Salary"
                                            className="h-14 bg-slate-50 border-transparent text-slate-900 rounded-2xl focus:bg-white focus:border-primary/20 transition-all font-black pl-12"
                                            {...field}
                                        />
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="space-y-4 rounded-2xl border border-slate-100 p-6 bg-slate-50/50">
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem className="space-y-1">
                                <FormLabel className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">Email</FormLabel>
                                <FormControl>
                                    <Input type="email" placeholder="Email" {...field} className="h-12 rounded-xl bg-white border-slate-200" />
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
                                    <div className="relative group">
                                        <Input
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Password"
                                            {...field}
                                            className="h-12 rounded-xl bg-white border-slate-200 pr-10"
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
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <Button type="submit" className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-2xl shadow-xl shadow-slate-200 transition-all active:scale-[0.98]" disabled={loading || designations.length === 0}>
                    {loading ? "Processing..." : initialData ? "Update Employee" : "Create Employee"}
                </Button>
            </form>
        </Form>
    )
}
