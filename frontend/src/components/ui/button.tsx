import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        // ── Shadcn base variants ──────────────────────────────────────────────
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",

        // ── App-specific semantic variants ────────────────────────────────────
        // Use these instead of writing className strings on every button.

        /**
         * primary — Teal brand CTA button (Create Client, Create Employee, etc.)
         * Was: className="h-12 bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 ..."
         */
        primary:
          "bg-primary text-white hover:bg-primary/90 shadow-xl shadow-primary/20 font-bold rounded-xl active:scale-[0.98]",

        /**
         * admin — Blue admin portal button (Initialize Agency, etc.)
         * Was: className="bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl ..."
         */
        admin:
          "bg-blue-600 text-white hover:bg-blue-700 shadow-xl shadow-blue-200 font-black rounded-2xl active:scale-[0.98]",

        /**
         * danger-solid — Red confirmation / destructive action
         * Was: className="bg-red-600 hover:bg-red-700 text-white font-bold ..."
         */
        "danger-solid":
          "bg-red-600 text-white hover:bg-red-700 shadow-lg font-bold rounded-xl active:scale-[0.98]",

        /**
         * success — Green check-in / approve action
         * Was: className="bg-emerald-600 hover:bg-emerald-700 text-white ..."
         */
        success:
          "bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-100 font-bold rounded-2xl active:scale-[0.98]",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        /** cta — Tall page-level action button (matches the h-12 px-8 pattern) */
        cta: "h-11 sm:h-12 px-6 sm:px-8 text-sm sm:text-base w-full md:w-auto",
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
