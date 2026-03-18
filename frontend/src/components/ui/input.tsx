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
        "text-sm font-semibold text-[#0f172a] placeholder:text-[#94a3b8]",
        // Transition & States
        "transition-all duration-150 outline-none",
        "focus:bg-white focus:border-[#06b6d4]/20",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        // Standard input extras
        "file:text-[#0f172a] file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "selection:bg-[#06b6d4]/20 selection:text-[#0f172a]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
