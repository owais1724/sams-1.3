/**
 * SelectInput — Unified styled <select> dropdown used across all forms.
 *
 * Replaces raw <select> tags with inconsistent classNames scattered in forms.
 * All dropdowns (designation, currency, client, etc.) use this single component
 * so any design change only needs to happen here.
 *
 * Usage:
 *   <SelectInput {...field} placeholder="Choose a client...">
 *     {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
 *   </SelectInput>
 */

import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { forwardRef, SelectHTMLAttributes } from "react"

interface SelectInputProps extends SelectHTMLAttributes<HTMLSelectElement> {
    placeholder?: string
    children: React.ReactNode
    className?: string
}

export const SelectInput = forwardRef<HTMLSelectElement, SelectInputProps>(
    ({ placeholder, children, className, ...props }, ref) => {
        return (
            <div className="relative">
                <select
                    ref={ref}
                    className={cn(
                        // Base styles — identical for every dropdown in the app
                        "w-full h-14 rounded-2xl px-4 pr-10",
                        "bg-slate-50 border border-transparent",
                        "text-slate-900 font-semibold",
                        "appearance-none outline-none",
                        "transition-all duration-150",
                        "focus:bg-white focus:border-primary/20 focus:ring-0",
                        "shadow-sm",
                        // Allow per-instance overrides
                        className
                    )}
                    {...props}
                >
                    {placeholder && (
                        <option value="">{placeholder}</option>
                    )}
                    {children}
                </select>
                {/* Consistent chevron arrow on every dropdown */}
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            </div>
        )
    }
)

SelectInput.displayName = "SelectInput"
