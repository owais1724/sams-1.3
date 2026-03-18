"use client"

import { AnimatePresence, motion } from "framer-motion"
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from "lucide-react"
import { useToastStore, ToastVariant } from "@/store/toastStore"
import { cn } from "@/lib/utils"

const variantStyles: Record<ToastVariant, {
    bg: string,
    border: string,
    icon: any,
    color: string,
    progress: string,
    glow: string
}> = {
    success: {
        bg: "bg-white",
        border: "border-[var(--primary)]/20",
        icon: CheckCircle2,
        color: "text-[var(--primary)]",
        progress: "bg-[var(--primary)]",
        glow: "shadow-[var(--primary)]/10",
    },
    error: {
        bg: "bg-white",
        border: "border-[#dc2626]/20",
        icon: XCircle,
        color: "text-[#dc2626]",
        progress: "bg-[#dc2626]",
        glow: "shadow-[#dc2626]/10",
    },
    info: {
        bg: "bg-white",
        border: "border-[var(--primary)]/20",
        icon: Info,
        color: "text-[var(--primary)]",
        progress: "bg-[var(--primary)]",
        glow: "shadow-[var(--primary)]/10",
    },
    warning: {
        bg: "bg-white",
        border: "border-[#f59e0b]/20",
        icon: AlertTriangle,
        color: "text-[#f59e0b]",
        progress: "bg-[#f59e0b]",
        glow: "shadow-[#f59e0b]/10",
    },
}

export function ToastProvider() {
    const { toasts, removeToast } = useToastStore()

    return (
        <div className="fixed top-4 left-4 right-4 sm:top-6 sm:right-6 sm:left-auto z-[9999] flex flex-col gap-4 pointer-events-none w-auto sm:w-full sm:max-w-sm">
            <AnimatePresence mode="popLayout">
                {toasts.map((t) => {
                    const style = variantStyles[t.variant]
                    const Icon = style.icon

                    return (
                        <motion.div
                            key={t.id}
                            initial={{ opacity: 0, x: 50, scale: 0.95, filter: "blur(10px)" }}
                            animate={{ opacity: 1, x: 0, scale: 1, filter: "blur(0px)" }}
                            exit={{ opacity: 0, scale: 0.9, x: 20, filter: "blur(5px)" }}
                            layout
                            className={cn(
                                "pointer-events-auto relative group overflow-hidden",
                                "rounded-xl border",
                                style.bg,
                                style.border,
                                "shadow-[0_1px_3px_rgba(0,0,0,0.1)]",
                                style.glow
                            )}
                        >
                            <div className="p-5 flex items-start gap-4">
                                <div className={cn(
                                    "h-11 w-11 shrink-0 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-105 border",
                                    style.color,
                                    "bg-slate-50 border-border"
                                )}>
                                    <Icon className="h-6 w-6 stroke-[2.5]" />
                                </div>

                                <div className="flex-1 min-w-0 py-1">
                                    {t.title && (
                                        <div className="text-[12px] font-semibold uppercase tracking-wider text-slate-500 mb-1 leading-none">
                                            {t.title}
                                        </div>
                                    )}
                                    <p className="text-[14px] font-medium text-slate-900 leading-tight">
                                        {t.message}
                                    </p>
                                </div>

                                <button
                                    onClick={() => removeToast(t.id)}
                                    className="shrink-0 h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors active:scale-95"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Progress Bar */}
                            <motion.div
                                initial={{ width: "100%" }}
                                animate={{ width: "0%" }}
                                transition={{ duration: (t.duration || 4000) / 1000, ease: "linear" }}
                                className={cn("absolute bottom-0 left-0 h-1", style.progress)}
                            />
                        </motion.div>
                    )
                })}
            </AnimatePresence>
        </div>
    )
}
