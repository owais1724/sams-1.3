
"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useRouter, useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import api from "@/lib/api"
import { loginWithRetry, waitForBackend } from "@/lib/apiWithRetry"
import { toast } from "@/components/ui/sonner"
import { useAuthStore } from "@/store/authStore"
import { motion } from "framer-motion"
import { Lock, Mail, ChevronRight, Loader2, Contact, Fingerprint, Eye, EyeOff } from "lucide-react"

const formSchema = z.object({
    email: z.string().email("Please enter a valid staff email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
})

export default function StaffLogin() {
    const router = useRouter()
    const { agencySlug } = useParams()
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const login = useAuthStore(state => state.login)
    const logout = useAuthStore(state => state.logout)
    const clearLocalAuth = useAuthStore(state => state.clearLocalAuth)

    useEffect(() => {
        clearLocalAuth()
    }, [clearLocalAuth])

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: { email: "", password: "" },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true)
        
        try {
            // Check if backend is ready (cold start handling)
            const isBackendReady = await waitForBackend()
            
            if (!isBackendReady) {
                toast.error("Server is starting up. Please try again in a moment.")
                setLoading(false)
                return
            }

            // Login with retry logic
            const data = await loginWithRetry(values)
            const { user } = data

            // STRICT MULTI-TENANCY CHECK: Verify user belongs to this specific agency
            const currentSlug = Array.isArray(agencySlug) ? agencySlug[0] : agencySlug
            if (user.agencySlug !== currentSlug) {
                toast.error(`Deployment Mismatch: Identity detected for unit @${user.agencySlug?.toUpperCase()}. Access to this terminal is restricted to @${currentSlug?.toUpperCase()} employee only.`, {
                    duration: 5000,
                })
                await api.post("/auth/logout")
                logout()
                return
            }

            // Block only Agency Admin and Super Admin from staff portal
            const blockedRoles = ['Agency Admin', 'Super Admin'];
            if (blockedRoles.includes(user.role)) {
                toast.error("Administrative profiles must use the agency admin portal.")
                await api.post("/auth/logout")
                logout()
                return
            }

            // Allow all other roles (Supervisor, Guard, HR, Staff, or any custom designation-based role)
            // Require that they have an employeeId (meaning they're linked to an employee record)
            if (!user.employeeId) {
                toast.error("Account not verified for operational access. Please contact your administrator.")
                await api.post("/auth/logout")
                logout()
                return
            }

            login(user)
            sessionStorage.setItem('sams_portal_type', 'staff')
            
            // Debug logging
            console.log('[Staff Login] User logged in:', {
                role: user.role,
                permissions: user.permissions,
                hasDashboardPermission: user.permissions?.includes('view_dashboard')
            })
            
            toast.success("Ready for duty. Welcome back.")
            
            // Check if user has dashboard permission
            const hasDashboardPermission = user.permissions?.includes('view_dashboard')
            const redirectPath = hasDashboardPermission 
                ? `/${agencySlug}/staff/dashboard` 
                : `/${agencySlug}/my-schedule`
            
            console.log('[Staff Login] Redirecting to:', redirectPath)
            
            router.replace(redirectPath)
        } catch (error: any) {
            console.group("[StaffLogin] Authentication Error");
            console.error("Message:", error.message);
            console.error("Status:", error.response?.status);
            console.error("Payload:", error.response?.data);
            console.groupEnd();

            // Better error messages
            if (error.response?.status === 401) {
                toast.error("Invalid credentials. Please check your email and password.")
            } else if (error.message?.includes('Network Error') || error.code === 'ECONNREFUSED') {
                toast.error("Unable to connect to server. Please check your connection and try again.")
            } else {
                const message = error.response?.data?.message || error.message || "Authentication failed"
                toast.error(`Login Error: ${message}`)
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#06b6d4] font-inter p-4 relative overflow-hidden selection:bg-white/20">
            <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="w-full max-w-[520px]"
            >
                <div className="flex flex-col items-center mb-8 text-center">
                    <div className="h-14 w-14 rounded-2xl bg-white/12 border border-white/25 flex items-center justify-center mb-4 shadow-[0_12px_30px_rgba(0,0,0,0.18)]">
                        <Contact className="h-7 w-7 text-white" />
                    </div>
                    <h1 className="text-[28px] font-bold text-white">SAMS Staff</h1>
                    <p className="text-[14px] text-white/85 mt-1">Field portal • @{agencySlug}</p>
                </div>

                <Card className="overflow-hidden" suppressHydrationWarning>
                    <CardContent className="p-6 sm:p-8" suppressHydrationWarning>
                        <div className="mb-6 text-center">
                            <h2 className="text-[20px] font-semibold text-slate-900">Staff Login</h2>
                            <p className="text-[14px] text-slate-600 mt-1">Enter your credentials to continue.</p>
                        </div>

                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem className="space-y-2">
                                            <FormLabel className="text-[12px] font-semibold text-slate-600 uppercase tracking-wider">Email</FormLabel>
                                            <FormControl>
                                                <div className="relative group">
                                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                                                    <Input
                                                        suppressHydrationWarning
                                                        placeholder="operator@agency.ops"
                                                        className="pl-11 h-12 sm:h-14 bg-white border border-border text-slate-900 placeholder:text-slate-400 rounded-xl focus:border-primary/40 focus:ring-primary/20 transition-all font-medium"
                                                        {...field}
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormMessage className="text-[12px] text-rose-600 font-semibold" />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem className="space-y-2">
                                            <FormLabel className="text-[12px] font-semibold text-slate-600 uppercase tracking-wider">Password</FormLabel>
                                            <FormControl>
                                                <div className="relative group">
                                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                                                    <Input
                                                        suppressHydrationWarning
                                                        type={showPassword ? "text" : "password"}
                                                        placeholder="••••••••"
                                                        className="pl-11 pr-11 h-12 sm:h-14 bg-white border border-border text-slate-900 placeholder:text-slate-400 rounded-xl focus:border-primary/40 focus:ring-primary/20 transition-all font-medium"
                                                        {...field}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
                                                    >
                                                        {showPassword ? (
                                                            <EyeOff className="w-4 h-4" />
                                                        ) : (
                                                            <Eye className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                </div>
                                            </FormControl>
                                            <FormMessage className="text-[12px] text-rose-600 font-semibold" />
                                        </FormItem>
                                    )}
                                />

                                <div className="flex justify-center">
                                    <Button
                                        suppressHydrationWarning
                                        type="submit"
                                        variant="primary"
                                        size="cta"
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                                <span>Signing in...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Fingerprint className="w-5 h-5 mr-3" />
                                                <span>Sign in</span>
                                                <ChevronRight className="w-4 h-4 ml-2" />
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </CardContent>
                </Card>

                <div className="mt-8 text-center text-[12px] text-white/75">Deployment portal • Node: {agencySlug}</div>
            </motion.div>
        </div>
    )
}
