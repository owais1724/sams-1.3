/**
 * SelectInput — Unified styled dropdown used across all forms.
 *
 * Now uses Radix UI Select for consistent, custom-styled dropdowns.
 * Replaces native <select> with a proper custom dropdown component.
 *
 * Usage:
 *   <SelectInput value={value} onValueChange={setValue} placeholder="Choose...">
 *     <SelectOption value="id1">Option 1</SelectOption>
 *     <SelectOption value="id2">Option 2</SelectOption>
 *   </SelectInput>
 */

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface SelectInputProps {
    value?: string
    onValueChange?: (value: string) => void
    placeholder?: string
    children: React.ReactNode
    className?: string
    disabled?: boolean
    name?: string
}

export const SelectInput = React.forwardRef<HTMLButtonElement, SelectInputProps>(
    ({ value, onValueChange, placeholder, children, className, disabled, name }, ref) => {
        return (
            <SelectPrimitive.Root value={value} onValueChange={onValueChange} disabled={disabled} name={name}>
                <SelectPrimitive.Trigger
                    ref={ref}
                    className={cn(
                        "flex h-14 w-full items-center justify-between",
                        "rounded-2xl border-2 border-slate-200 bg-white px-4",
                        "text-sm font-semibold text-slate-900 placeholder:text-slate-400",
                        "focus:outline-none focus:border-[#06b6d4]",
                        "transition-all duration-150",
                        "disabled:cursor-not-allowed disabled:opacity-50",
                        "data-[state=open]:border-[#06b6d4]",
                        className
                    )}
                >
                    <SelectPrimitive.Value placeholder={placeholder} />
                    <SelectPrimitive.Icon asChild>
                        <ChevronDown className="h-5 w-5 text-slate-400 shrink-0" />
                    </SelectPrimitive.Icon>
                </SelectPrimitive.Trigger>
                <SelectPrimitive.Portal>
                    <SelectPrimitive.Content
                        className={cn(
                            "relative z-50 overflow-hidden",
                            "rounded-2xl border-2 border-slate-200 bg-white shadow-xl",
                            "data-[state=open]:animate-in data-[state=closed]:animate-out",
                            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
                            "w-[var(--radix-select-trigger-width)]"
                        )}
                        position="popper"
                        sideOffset={8}
                        align="start"
                    >
                        <SelectPrimitive.ScrollUpButton className="flex cursor-default items-center justify-center py-1">
                            <ChevronUp className="h-4 w-4 text-slate-400" />
                        </SelectPrimitive.ScrollUpButton>
                        <SelectPrimitive.Viewport className="p-2 max-h-60">
                            {children}
                        </SelectPrimitive.Viewport>
                        <SelectPrimitive.ScrollDownButton className="flex cursor-default items-center justify-center py-1">
                            <ChevronDown className="h-4 w-4 text-slate-400" />
                        </SelectPrimitive.ScrollDownButton>
                    </SelectPrimitive.Content>
                </SelectPrimitive.Portal>
            </SelectPrimitive.Root>
        )
    }
)

SelectInput.displayName = "SelectInput"

// SelectOption component for use with SelectInput
interface SelectOptionProps {
    value: string
    children: React.ReactNode
    disabled?: boolean
}

export const SelectOption = React.forwardRef<HTMLDivElement, SelectOptionProps>(
    ({ value, children, disabled }, ref) => {
        return (
            <SelectPrimitive.Item
                ref={ref}
                value={value}
                disabled={disabled}
                className={cn(
                    "relative flex w-full cursor-pointer select-none items-center",
                    "rounded-xl py-3 px-4",
                    "text-sm font-medium text-slate-700",
                    "outline-none transition-colors",
                    "hover:bg-[#ecfeff]",
                    "data-[state=checked]:bg-[#ecfeff] data-[state=checked]:text-[#06b6d4] data-[state=checked]:font-semibold",
                    "data-[disabled]:pointer-events-none data-[disabled]:opacity-40"
                )}
            >
                <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="ml-auto">
                    <Check className="h-4 w-4 text-[#06b6d4]" />
                </SelectPrimitive.ItemIndicator>
            </SelectPrimitive.Item>
        )
    }
)

SelectOption.displayName = "SelectOption"
