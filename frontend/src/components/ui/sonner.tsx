import { toast as customToast } from "@/store/toastStore"

export { ToastProvider as Toaster } from "./toast-provider"

// Export a proxy for toast to maintain compatibility with sonner
export const toast = {
  success: (message: string, options?: any) => customToast.success(message, options?.description),
  error: (message: string, options?: any) => customToast.error(message, options?.description),
  info: (message: string, options?: any) => customToast.info(message, options?.description),
  warning: (message: string, options?: any) => customToast.warning(message, options?.description),
  message: (message: string, options?: any) => customToast.info(message, options?.description),
  dismiss: (id?: string) => customToast.dismiss(id),
}
