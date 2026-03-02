import { create } from "zustand"

export type ToastVariant = "success" | "error" | "info" | "warning"

export interface ToastData {
    id: string
    message: string
    title?: string
    variant: ToastVariant
    duration?: number
}

interface ToastStore {
    toasts: ToastData[]
    addToast: (toast: Omit<ToastData, "id">) => void
    removeToast: (id: string) => void
}

export const useToastStore = create<ToastStore>((set) => ({
    toasts: [],
    addToast: (toast) => {
        const id = Math.random().toString(36).substring(2, 9)
        set((state) => ({
            toasts: [...state.toasts, { ...toast, id }],
        }))

        // Auto-remove after duration
        setTimeout(() => {
            set((state) => ({
                toasts: state.toasts.filter((t) => t.id !== id),
            }))
        }, toast.duration || 4000)
    },
    removeToast: (id) =>
        set((state) => ({
            toasts: state.toasts.filter((t) => t.id !== id),
        })),
}))

export const toast = {
    success: (message: string, title?: string) => useToastStore.getState().addToast({ message, title, variant: "success" }),
    error: (message: string, title?: string) => useToastStore.getState().addToast({ message, title, variant: "error" }),
    info: (message: string, title?: string) => useToastStore.getState().addToast({ message, title, variant: "info" }),
    warning: (message: string, title?: string) => useToastStore.getState().addToast({ message, title, variant: "warning" }),
    dismiss: (id?: string) => {
        if (id) {
            useToastStore.getState().removeToast(id)
        } else {
            useToastStore.setState({ toasts: [] })
        }
    },
}
