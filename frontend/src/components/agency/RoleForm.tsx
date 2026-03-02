"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useState, useEffect } from "react"
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
import { toast } from "@/components/ui/sonner"
import { Checkbox } from "@/components/ui/checkbox"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, Shield, Users, Wallet, Activity, ClipboardList } from "lucide-react"
import { cn } from "@/lib/utils"

const formSchema = z.object({
    name: z.string().min(2, "Role name is required"),
    description: z.string().optional(),
    permissionIds: z.array(z.string()).min(1, "Select at least one permission"),
})

export function RoleForm({ permissions, initialData, onSuccess }: {
    permissions: any[],
    initialData?: any,
    onSuccess: () => void
}) {
    const [loading, setLoading] = useState(false)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: initialData?.name || "",
            description: initialData?.description || "",
            permissionIds: initialData?.permissions?.map((p: any) => p.id) || [],
        },
    })

    useEffect(() => {
        if (initialData) {
            form.reset({
                name: initialData.name || "",
                description: initialData.description || "",
                permissionIds: initialData.permissions?.map((p: any) => p.id) || [],
            })
        } else {
            form.reset({
                name: "",
                description: "",
                permissionIds: [],
            })
        }
    }, [initialData, form])

    // Group permissions by category
    const categories = [
        { label: "Agency", keywords: ["agency", "client", "project", "visitor"], icon: Shield },
        { label: "Employee", keywords: ["personnel", "employee", "staff"], icon: Users },
        { label: "Leaves", keywords: ["leave", "attendance"], icon: ClipboardList },
        { label: "Finance", keywords: ["payroll", "role", "permissions", "backup"], icon: Wallet }
    ]

    const getCategory = (action: string) => {
        for (const cat of categories) {
            if (cat.keywords.some(k => action.toLowerCase().includes(k))) return cat.label
        }
        return "Other"
    }

    const groupedPermissions = permissions.reduce((acc: any, p: any) => {
        const cat = getCategory(p.action)
        if (!acc[cat]) acc[cat] = []
        acc[cat].push(p)
        return acc
    }, {})

    const [expandedCats, setExpandedCats] = useState<string[]>([categories[1].label, categories[2].label])

    const toggleCat = (cat: string) => {
        setExpandedCats(prev =>
            prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
        )
    }

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true)
        try {
            if (initialData) {
                await api.put(`/roles/${initialData.id}`, values)
                toast.success("Role updated successfully")
            } else {
                await api.post("/roles", values)
                toast.success("Role created successfully")
            }
            onSuccess()
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to save role")
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
                        <FormItem>
                            <FormLabel className="text-[11px] font-bold text-slate-700 uppercase tracking-widest pl-1">Name</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="Name"
                                    className="h-14 bg-slate-50 border-transparent text-slate-900 placeholder:text-slate-300 rounded-2xl focus:bg-white focus:border-primary/20 transition-all font-semibold italic"
                                    {...field}
                                    disabled={initialData?.isSystem}
                                />
                            </FormControl>
                            {initialData?.isSystem && (
                                <FormDescription className="text-xs text-amber-600">
                                    System names cannot be changed.
                                </FormDescription>
                            )}
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[11px] font-bold text-slate-700 uppercase tracking-widest pl-1">Description</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="Description"
                                    className="h-14 bg-slate-50 border-transparent text-slate-900 placeholder:text-slate-300 rounded-2xl focus:bg-white focus:border-primary/20 transition-all font-semibold italic"
                                    {...field}
                                    disabled={initialData?.isSystem}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="space-y-4">
                    <div className="flex flex-col gap-1">
                        <FormLabel className="text-sm font-black text-slate-900 uppercase tracking-widest">Permissions</FormLabel>
                        <FormDescription className="text-[11px] font-bold text-slate-400">Select permissions for this role</FormDescription>
                    </div>

                    <div className="space-y-3">
                        {Object.entries(groupedPermissions).map(([category, items]: [string, any]) => {
                            const isExpanded = expandedCats.includes(category)
                            const Icon = categories.find(c => c.label === category)?.icon || Activity

                            return (
                                <div key={category} className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-all duration-300">
                                    <button
                                        type="button"
                                        onClick={() => toggleCat(category)}
                                        className="w-full flex items-center justify-between p-5 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-primary shadow-sm">
                                                <Icon className="h-5 w-5" />
                                            </div>
                                            <div className="text-left">
                                                <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">{category}</h3>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{items.length} Authorization Points</p>
                                            </div>
                                        </div>
                                        <ChevronDown className={cn("h-5 w-5 text-slate-400 transition-transform duration-300", isExpanded && "rotate-180")} />
                                    </button>

                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.3, ease: "easeInOut" }}
                                            >
                                                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 bg-white">
                                                    {items.map((perm: any) => (
                                                        <FormField
                                                            key={perm.id}
                                                            control={form.control}
                                                            name="permissionIds"
                                                            render={({ field }) => {
                                                                const label = perm.action
                                                                    .replace('personnel', 'employee')
                                                                    .replace('personnels', 'employees')
                                                                    .split('_')
                                                                    .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
                                                                    .join(' ')

                                                                return (
                                                                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 p-3 rounded-xl border border-transparent hover:border-slate-100 hover:bg-slate-50/50 transition-all cursor-pointer group">
                                                                        <FormControl>
                                                                            <Checkbox
                                                                                checked={field.value?.includes(perm.id)}
                                                                                onCheckedChange={(checked: boolean) => {
                                                                                    return checked
                                                                                        ? field.onChange([...field.value, perm.id])
                                                                                        : field.onChange(
                                                                                            field.value?.filter(
                                                                                                (value: string) => value !== perm.id
                                                                                            )
                                                                                        )
                                                                                }}
                                                                                className="h-5 w-5 rounded-md border-slate-200 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                                                            />
                                                                        </FormControl>
                                                                        <FormLabel className="flex-1 text-xs font-bold text-slate-600 cursor-pointer group-hover:text-slate-900 transition-colors">
                                                                            {label}
                                                                        </FormLabel>
                                                                    </FormItem>
                                                                )
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )
                        })}
                    </div>
                    <FormMessage />
                </div>

                <Button type="submit" className="w-full py-6 text-lg font-bold rounded-2xl bg-slate-900" disabled={loading}>
                    {loading ? "Processing..." : initialData ? "Update Role" : "Create Role"}
                </Button>

            </form>
        </Form>
    )
}
