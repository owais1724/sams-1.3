import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        // ── Shadcn base variants ──────────────────────────────────────────────
        default: "bg-[#06b6d4] text-white hover:bg-[#0891b2]",
        destructive:
          "bg-[#dc2626] text-white hover:bg-[#b91c1c] focus-visible:ring-destructive/20",
        outline:
          "border border-border bg-white hover:bg-slate-50 text-[#0f172a]",
        secondary:
          "bg-white text-[#06b6d4] border border-[#06b6d4] hover:bg-slate-50",
        ghost:
          "hover:bg-slate-100 text-[#374151]",
        link: "text-[#06b6d4] underline-offset-4 hover:underline",

        // ── App-specific semantic variants ────────────────────────────────────
        /**
         * primary — Cyan brand CTA button
         */
        primary:
          "bg-[#06b6d4] text-white hover:bg-[#0891b2] shadow-sm font-semibold",

        /**
         * premium — Cyan variant
         */
        premium:
          "bg-[#06b6d4] text-white hover:bg-[#0891b2] shadow-sm font-semibold",

        /**
         * admin — Cyan variant for admin
         */
        admin:
          "bg-[#06b6d4] text-white hover:bg-[#0891b2] shadow-sm font-semibold",

        /**
         * danger-solid — Red confirmation
         */
        "danger-solid":
          "bg-[#dc2626] text-white hover:bg-[#b91c1c] shadow-sm font-semibold",

        /**
         * success — Green check-in / approve action
         */
        success:
          "bg-[#06b6d4] text-white hover:bg-[#0891b2] shadow-sm font-semibold",
      },
      size: {
        default: "h-10 px-5 py-2 has-[>svg]:pl-4 has-[>svg]:pr-5",
        xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-1.5 px-4 has-[>svg]:pl-3 has-[>svg]:pr-4",
        lg: "h-11 px-6 has-[>svg]:pl-5 has-[>svg]:pr-6",
        /** cta — Tall page-level action button (matches the h-12 px-8 pattern) */
        cta: "h-11 sm:h-12 px-5 sm:px-6 text-sm sm:text-base w-full md:w-auto",
        icon: "size-9",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      suppressHydrationWarning
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
