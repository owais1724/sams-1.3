/**
 * FormSheet — now renders as a centered modal popup
 * (kept for backward compatibility; delegates to FormModal internally)
 */

"use client"

import { FormModal } from "./FormModal"

interface FormSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: string
    description?: string
    trigger?: React.ReactNode
    children: React.ReactNode
    /** Max width of the modal. Default: 500px */
    maxWidth?: number
}

export function FormSheet(props: FormSheetProps) {
    return <FormModal {...props} />
}
