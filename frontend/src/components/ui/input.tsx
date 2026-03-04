import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      suppressHydrationWarning
      className={cn(
        // Base layout
        "flex h-14 w-full min-w-0 px-4 py-2",
        // Shape & Background — matches Select and PhoneInput
        "rounded-2xl border border-transparent bg-slate-50",
        // Typography
        "text-sm font-semibold text-slate-900 placeholder:text-slate-300",
        // Transition & States
        "transition-all duration-150 outline-none",
        "focus:bg-white focus:border-primary/20",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        // Standard input extras
        "file:text-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "selection:bg-primary selection:text-primary-foreground",
        className
      )}
      {...props}
    />
  )
}

export { Input }
