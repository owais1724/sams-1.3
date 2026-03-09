/**
 * FormSheet — Reusable sliding drawer for all Create/Edit forms
 *
 * Replaces this repeated pattern:
 *   <Sheet open={open} onOpenChange={...}>
 *     <SheetTrigger asChild>...</SheetTrigger>
 *     <SheetContent className="w-full sm:max-w-[500px] rounded-l-none sm:rounded-l-[40px] ...">
 *       <div className="p-5 sm:p-10 overflow-y-auto h-full">
 *         <SheetHeader>
 *           <SheetTitle>...</SheetTitle>
 *           <SheetDescription>...</SheetDescription>
 *         </SheetHeader>
 *         <div className="mt-10">{form}</div>
 *       </div>
 *     </SheetContent>
 *   </Sheet>
 *
 * Usage:
 *   <FormSheet
 *     open={open}
 *     onOpenChange={setOpen}
 *     title="Create Client"
 *     description="Register a new client."
 *     trigger={<CreateButton label="Create Client" icon={<Plus />} />}
 *   >
 *     <ClientForm onSuccess={() => { setOpen(false); refetch() }} />
 *   </FormSheet>
 */

"use client"

import {
    Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger
} from "@/components/ui/sheet"

interface FormSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: string
    description?: string
    trigger?: React.ReactNode
    children: React.ReactNode
    /** Max width of the drawer. Default: 500px */
    maxWidth?: number
}

export function FormSheet({
    open,
    onOpenChange,
    title,
    description,
    trigger,
    children,
    maxWidth = 500,
}: FormSheetProps) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
            <SheetContent
                className="w-full sm:w-auto border-none shadow-2xl p-0"
                style={{ maxWidth: `min(100vw, ${maxWidth}px)` }}
            >
                <div className="px-4 py-6 sm:p-10 overflow-y-auto h-full">
                    <SheetHeader>
                        <SheetTitle className="text-xl sm:text-2xl font-bold">{title}</SheetTitle>
                        {description && (
                            <SheetDescription className="font-medium text-slate-500">
                                {description}
                            </SheetDescription>
                        )}
                    </SheetHeader>
                    <div className="mt-6 sm:mt-10">{children}</div>
                </div>
            </SheetContent>
        </Sheet>
    )
}
