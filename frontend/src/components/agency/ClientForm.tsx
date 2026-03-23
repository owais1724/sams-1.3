"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useState, useEffect } from "react"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import api from "@/lib/api"
import { toast } from "@/components/ui/sonner"
import { SubmitButton, inputVariants, FormLabelBase } from "@/components/ui/design-system"
import { AlertModal } from "@/components/ui/alert-modal"

const formSchema = z.object({
    name: z.string().min(2, "Client name is required"),
    contact: z.string().min(2, "Contact person is required"),
    email: z.string().email("Invalid email address"),
    address: z.string().optional(),
})

interface ClientFormProps {
    onSuccess: () => void
    initialData?: any
}

export function ClientForm({ onSuccess, initialData }: ClientFormProps) {
    const [loading, setLoading] = useState(false)
    const [showConfirmModal, setShowConfirmModal] = useState(false)
    const [pendingValues, setPendingValues] = useState<z.infer<typeof formSchema> | null>(null)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            contact: "",
            email: "",
            address: ""
        },
    })

    useEffect(() => {
        form.reset({
            name: initialData?.name || "",
            contact: initialData?.contact || "",
            email: initialData?.email || "",
            address: initialData?.address || "",
        })
    }, [initialData, form])

    async function onSubmit(values: z.infer<typeof formSchema>) {
        // Store values and show confirmation modal
        setPendingValues(values)
        setShowConfirmModal(true)
    }

    async function handleConfirmedSubmit() {
        if (!pendingValues) return
        setLoading(true)
        try {
            if (initialData?.id) {
                await api.patch(`/clients/${initialData.id}`, pendingValues)
                toast.success("Client updated successfully")
            } else {
                await api.post("/clients", pendingValues)
                toast.success("Client added successfully")
            }
            setShowConfirmModal(false)
            setPendingValues(null)
            onSuccess()
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Something went wrong")
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem className="space-y-0">
                            <FormLabelBase label="Client Name" required />
                            <FormControl>
                                <Input
                                    placeholder="Enter full legal name"
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
                    name="contact"
                    render={({ field }) => (
                        <FormItem className="space-y-0">
                            <FormLabelBase label="Primary Contact Person" required />
                            <FormControl>
                                <Input
                                    placeholder="Contact person name"
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
                    name="email"
                    render={({ field }) => (
                        <FormItem className="space-y-0">
                            <FormLabelBase label="Email Address" required />
                            <FormControl>
                                <Input
                                    type="email"
                                    placeholder="contact@client.com"
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
                    name="address"
                    render={({ field }) => (
                        <FormItem className="space-y-0">
                            <FormLabelBase label="Address" />
                            <FormControl>
                                <Input
                                    placeholder="Full office address"
                                    className={inputVariants}
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage className="text-[10px] font-bold mt-2 ml-1" />
                        </FormItem>
                    )}
                />

                <div className="pt-4 flex justify-center">
                    <SubmitButton
                        label={initialData?.id ? "Update Client" : "Add New Client"}
                        loading={loading}
                        disabled={!form.formState.isValid || loading}
                    />
                </div>
            </form>
        </Form>

        {/* Confirmation Modal */}
        <AlertModal
            isOpen={showConfirmModal}
            onClose={() => {
                setShowConfirmModal(false)
                setPendingValues(null)
            }}
            onConfirm={handleConfirmedSubmit}
            loading={loading}
            title={initialData?.id ? "Save Changes" : "Create Client"}
            description={
                initialData?.id
                    ? `Are you sure you want to save changes to "${pendingValues?.name}"?`
                    : `Are you sure you want to create the client "${pendingValues?.name}"?`
            }
            variant="primary"
            confirmText={initialData?.id ? "Save Changes" : "Create Client"}
            cancelText="Cancel"
        />
        </>
    )
}
