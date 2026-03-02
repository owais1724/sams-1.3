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
        bg: "bg-white/80",
        border: "border-emerald-100",
        icon: CheckCircle2,
        color: "text-emerald-600",
        progress: "bg-emerald-500",
        glow: "shadow-emerald-500/10",
    },
    error: {
        bg: "bg-white/80",
        border: "border-red-100",
        icon: XCircle,
        color: "text-red-600",
        progress: "bg-red-500",
        glow: "shadow-red-500/10",
    },
    info: {
        bg: "bg-white/80",
        border: "border-blue-100",
        icon: Info,
        color: "text-blue-600",
        progress: "bg-blue-500",
        glow: "shadow-blue-500/10",
    },
    warning: {
        bg: "bg-white/80",
        border: "border-amber-100",
        icon: AlertTriangle,
        color: "text-amber-600",
        progress: "bg-amber-500",
        glow: "shadow-amber-500/10",
    },
}

export function ToastProvider() {
    const { toasts, removeToast } = useToastStore()

    return (
        <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-4 pointer-events-none w-full max-w-sm">
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
                                "backdrop-blur-xl rounded-[28px] border-2",
                                style.bg,
                                style.border,
                                "shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)]",
                                style.glow
                            )}
                        >
                            <div className="p-5 flex items-start gap-4">
                                <div className={cn(
                                    "h-12 w-12 shrink-0 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110",
                                    style.color,
                                    "bg-white border border-slate-50 shadow-sm"
                                )}>
                                    <Icon className="h-6 w-6 stroke-[2.5]" />
                                </div>

                                <div className="flex-1 min-w-0 py-1">
                                    {t.title && (
                                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1 leading-none">
                                            {t.title}
                                        </div>
                                    )}
                                    <p className="text-sm font-bold text-slate-700 leading-tight">
                                        {t.message}
                                    </p>
                                </div>

                                <button
                                    onClick={() => removeToast(t.id)}
                                    className="shrink-0 h-8 w-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-slate-900 transition-all active:scale-90"
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
