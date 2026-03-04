/**
 * TableActionButtons — Edit + Delete button pair used in every table row
 *
 * Replaces this repeated block:
 *   <Button variant="ghost" size="icon" onClick={() => { setEditing(row); setOpen(true) }}
 *     className="h-10 w-10 rounded-xl text-slate-400 hover:text-primary hover:bg-primary/5">
 *     <Edit3 className="h-4 w-4" />
 *   </Button>
 *   <Button variant="ghost" size="icon" onClick={() => openDelete(row.id, row.name)}
 *     className="h-10 w-10 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50">
 *     <Trash2 className="h-4 w-4" />
 *   </Button>
 *
 * Usage:
 *   <TableActionButtons
 *     onEdit={() => { setEditing(row); setOpen(true) }}
 *     onDelete={() => openDelete(row.id, row.name)}
 *   />
 */

"use client"

import { RowEditButton, RowDeleteButton, RowViewButton } from "@/components/ui/design-system"
import { cn } from "@/lib/utils"

interface TableActionButtonsProps {
    onEdit?: () => void
    onDelete?: () => void
    onView?: () => void
    editLabel?: string
    deleteLabel?: string
    viewLabel?: string
    className?: string
    hideEdit?: boolean
    hideDelete?: boolean
}

export function TableActionButtons({
    onEdit,
    onDelete,
    onView,
    className,
    hideEdit = false,
    hideDelete = false,
}: TableActionButtonsProps) {
    return (
        <div className={cn("flex items-center justify-end gap-1 sm:gap-2", className)}>
            {onView && (
                <RowViewButton onClick={onView} />
            )}
            {!hideEdit && onEdit && (
                <RowEditButton onClick={onEdit} />
            )}
            {!hideDelete && onDelete && (
                <RowDeleteButton onClick={onDelete} />
            )}
        </div>
    )
}
