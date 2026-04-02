"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { AlertCircle, CheckCircle2, Info, X, Trash2, AlertTriangle, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./dialog"
import { Button } from "./button"

interface AlertModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    loading?: boolean
    title: string
    description: React.ReactNode
    variant?: "danger" | "warning" | "success" | "info" | "primary"
    confirmText?: string
    cancelText?: string
}

const variants = {
    danger: {
        icon: Trash2,
        color: "text-red-600",
        bg: "bg-red-50",
        border: "border-red-100",
        button: "bg-red-600 hover:bg-red-700 shadow-red-200",
        glow: "shadow-red-500/10",
    },
    warning: {
        icon: AlertTriangle,
        color: "text-amber-600",
        bg: "bg-amber-50",
        border: "border-amber-100",
        button: "bg-amber-600 hover:bg-amber-700 shadow-amber-200",
        glow: "shadow-amber-500/10",
    },
    success: {
        icon: CheckCircle2,
        color: "text-emerald-600",
        bg: "bg-emerald-50",
        border: "border-emerald-100",
        button: "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200",
        glow: "shadow-emerald-500/10",
    },
    info: {
        icon: Info,
        color: "text-blue-600",
        bg: "bg-blue-50",
        border: "border-blue-100",
        button: "bg-blue-600 hover:bg-blue-700 shadow-blue-200",
        glow: "shadow-blue-500/10",
    },
    primary: {
        icon: AlertCircle,
        color: "text-cyan-600",
        bg: "bg-cyan-50",
        border: "border-cyan-100",
        button: "bg-[#06b6d4] hover:bg-cyan-600 shadow-cyan-200",
        glow: "shadow-cyan-500/10",
    },
}

/**
 * AlertModal - Reusable confirmation modal component
 * 
 * Features:
 * - Dark backdrop overlay
 * - White centered modal box
 * - Smooth fade-in animation
 * - Close on backdrop click or Cancel button
 * - Customizable variants (danger, warning, success, info, primary)
 * - Loading state support
 * 
 * Usage:
 * ```tsx
 * const [showModal, setShowModal] = useState(false)
 * 
 * <AlertModal
 *   isOpen={showModal}
 *   onClose={() => setShowModal(false)}
 *   onConfirm={handleDelete}
 *   title="Delete Deployment"
 *   description="Are you sure? This action cannot be undone."
 *   variant="danger"
 *   confirmText="Delete"
 *   cancelText="Cancel"
 * />
 * ```
 */
export function AlertModal({
    isOpen,
    onClose,
    onConfirm,
    loading,
    title,
    description,
    variant = "primary",
    confirmText = "Confirm",
    cancelText = "Cancel",
}: AlertModalProps) {
    const actionContext = `${title} ${confirmText}`.toLowerCase()
    const isDestructiveAction = /(delete|remove|terminate|demote|deactivate|suspend|sign\s*out|logout|revoke|purge|expunge|discard)/.test(actionContext)

    const resolvedVariant = variant === "primary"
        ? (isDestructiveAction ? "danger" : "success")
        : variant

    const activeVariant = variants[resolvedVariant]
    const Icon = activeVariant.icon
    const isPlainDescription = typeof description === "string" || typeof description === "number"

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden border-none bg-white rounded-[32px] shadow-2xl">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="relative p-8 pt-10 flex flex-col items-center text-center"
                >
                    {/* Backdrop Glow */}
                    <div className={cn("absolute inset-0 -z-10 bg-gradient-to-b from-transparent to-white/50 opacity-50", activeVariant.glow)} />

                    {/* Icon Header */}
                    <div className={cn(
                        "h-20 w-20 rounded-[28px] flex items-center justify-center mb-6 transition-all duration-500",
                        activeVariant.bg,
                        activeVariant.border,
                        "border-2 transform hover:scale-105"
                    )}>
                        <Icon className={cn("h-10 w-10 stroke-[2.5]", activeVariant.color)} />
                    </div>

                    <DialogHeader className="w-full max-w-[380px] !space-y-0 gap-1 text-center items-center mx-auto">
                        <DialogTitle className="text-2xl font-black text-[#0f172a] tracking-tight leading-tight m-0">
                            {title}
                        </DialogTitle>
                        {isPlainDescription ? (
                            <DialogDescription className="text-sm font-bold text-[#64748b] leading-snug !mt-0 text-center mx-auto">
                                {description}
                            </DialogDescription>
                        ) : (
                            <div className="text-sm font-bold text-[#64748b] leading-snug !mt-0 text-center mx-auto">
                                {description}
                            </div>
                        )}
                    </DialogHeader>

                    <DialogFooter className="w-full sm:max-w-[420px] mx-auto flex-col sm:flex-row gap-3 mt-8 sm:justify-center sm:space-x-0">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 h-14 rounded-2xl border-slate-200 hover:bg-slate-50 text-[#374151] font-bold text-sm transition-all"
                        >
                            {cancelText}
                        </Button>
                        <Button
                            type="button"
                            onClick={onConfirm}
                            disabled={loading}
                            className={cn(
                                "flex-1 h-14 rounded-2xl text-white font-black text-sm shadow-xl transition-all active:scale-[0.98]",
                                activeVariant.button
                            )}
                        >
                            {loading ? (
                                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                confirmText
                            )}
                        </Button>
                    </DialogFooter>
                </motion.div>
            </DialogContent>
        </Dialog>
    )
}
