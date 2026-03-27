"use client"

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface FormModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: string
    description?: string
    trigger?: React.ReactNode
    children: React.ReactNode
    /** Max width of the modal. Default: 640px */
    maxWidth?: number
}

export function FormModal({
    open,
    onOpenChange,
    title,
    description,
    trigger,
    children,
    maxWidth = 640,
}: FormModalProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent 
                className={cn(
                    "w-[calc(100vw-2rem)] sm:w-full border border-border shadow-2xl p-0 overflow-hidden bg-white text-[#111827] max-h-[90vh] flex flex-col",
                )}
                style={{ maxWidth: `${maxWidth}px` }}
            >
                <div className="flex flex-col h-full overflow-hidden">
                    <DialogHeader className="px-6 sm:px-10 pt-6 sm:pt-10 pb-3 sm:pb-4 text-left bg-white z-10">
                        <DialogTitle className="text-2xl sm:text-3xl font-black tracking-tight text-[#0f172a]">{title}</DialogTitle>
                        {description && (
                            <DialogDescription className="font-bold text-[#64748b] uppercase tracking-widest text-[10px] sm:text-xs mt-2">
                                {description}
                            </DialogDescription>
                        )}
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto px-6 sm:px-10 pb-6 sm:pb-10 pt-3 sm:pt-4 scrollbar-hide">
                        {children}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
