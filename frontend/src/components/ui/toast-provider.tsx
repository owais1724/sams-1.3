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
        bg: "bg-black/95",
        border: "border-[#D9A75B]/40",
        icon: CheckCircle2,
        color: "text-[#D9A75B]",
        progress: "bg-[#D9A75B]",
        glow: "shadow-[#D9A75B]/20",
    },
    error: {
        bg: "bg-black/95",
        border: "border-rose-500/40",
        icon: XCircle,
        color: "text-rose-500",
        progress: "bg-rose-500",
        glow: "shadow-rose-500/20",
    },
    info: {
        bg: "bg-black/95",
        border: "border-[#D9A75B]/40",
        icon: Info,
        color: "text-[#D9A75B]",
        progress: "bg-[#D9A75B]",
        glow: "shadow-[#D9A75B]/20",
    },
    warning: {
        bg: "bg-black/95",
        border: "border-amber-500/40",
        icon: AlertTriangle,
        color: "text-amber-500",
        progress: "bg-amber-500",
        glow: "shadow-amber-500/20",
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
                                    "bg-white/5 border border-white/10 shadow-inner"
                                )}>
                                    <Icon className="h-6 w-6 stroke-[2.5]" />
                                </div>

                                <div className="flex-1 min-w-0 py-1">
                                    {t.title && (
                                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-1 leading-none">
                                            {t.title}
                                        </div>
                                    )}
                                    <p className="text-sm font-bold text-white leading-tight">
                                        {t.message}
                                    </p>
                                </div>

                                <button
                                    onClick={() => removeToast(t.id)}
                                    className="shrink-0 h-8 w-8 rounded-xl flex items-center justify-center text-white/40 hover:bg-white/10 hover:text-white transition-all active:scale-90"
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
