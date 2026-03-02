"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { AlertCircle, CheckCircle2, Info, X, Trash2, AlertTriangle } from "lucide-react"
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
    variant?: "danger" | "warning" | "success" | "info"
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
}

export function AlertModal({
    isOpen,
    onClose,
    onConfirm,
    loading,
    title,
    description,
    variant = "danger",
    confirmText = "Confirm",
    cancelText = "Cancel",
}: AlertModalProps) {
    const activeVariant = variants[variant]
    const Icon = activeVariant.icon

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden border-none bg-white rounded-[32px] shadow-2xl">
                <div className="relative p-8 pt-10 flex flex-col items-center text-center">
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

                    <DialogHeader className="w-full">
                        <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight leading-tight mb-2">
                            {title}
                        </DialogTitle>
                        <DialogDescription className="text-sm font-bold text-slate-400 leading-relaxed max-w-[300px] mx-auto">
                            {description}
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter className="w-full flex-col sm:flex-row gap-3 mt-8">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 h-14 rounded-2xl border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-sm transition-all"
                        >
                            {cancelText}
                        </Button>
                        <Button
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
                </div>
            </DialogContent>
        </Dialog>
    )
}
