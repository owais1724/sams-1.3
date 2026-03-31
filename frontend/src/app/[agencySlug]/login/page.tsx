
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
import { buildSessionUserKey } from "@/lib/authSession"
import { toast } from "@/components/ui/sonner"
import { useAuthStore } from "@/store/authStore"
import { motion } from "framer-motion"
import { Lock, Mail, ChevronRight, Loader2, Building2, Eye, EyeOff } from "lucide-react"

const formSchema = z.object({
    email: z.string().email("Please enter a valid administrative email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
})

export default function AgencyAdminLogin() {
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

            const currentSlug = Array.isArray(agencySlug) ? agencySlug[0] : agencySlug
            if (user.agencySlug !== currentSlug) {
                toast.error("Invalid credentials")
                // Call logout to clear the cookie we just got
                await api.post("/auth/logout")
                logout()
                setLoading(false)
                return
            }

if (user.employeeId) {
                console.log('[Agency Login] Role check failed - User has employeeId:', {
                    userRole: user.role,
                    employeeId: user.employeeId
                })

                toast.error("Staff and employees should use the staff portal.", {
                    description: `Redirecting to staff login...`,
                    duration: 3000
                })
                await api.post("/auth/logout")
                logout()
                setLoading(false)
                // Redirect to staff login
                setTimeout(() => {
                    window.location.href = `/${agencySlug}/staff-login`     
                }, 1500)
                return
            }

            if (user.role?.toLowerCase() === 'super admin') {
                toast.error("This portal is for Agency Admin only.")
                await api.post("/auth/logout")
                logout()
                setLoading(false)
                return
            }

            console.log('[Agency Login] Role check passed:', user.role)
            login(user)
            sessionStorage.setItem('sams_portal_type', 'agency')
            
            // ✅ Set tab user key for session isolation
            const userKey = `${user.id}:${user.agencySlug?.toLowerCase()?.trim() || ''}:${user.employeeId || 'no-employee'}:${user.role?.toLowerCase()?.trim() || 'no-role'}`
            sessionStorage.setItem('sams_tab_user_key', userKey)
            const normalizedUserKey = buildSessionUserKey(user)
            if (normalizedUserKey) {
                sessionStorage.setItem('sams_tab_user_key', normalizedUserKey)
            }
            
            toast.success("Identity verified. Welcome back.")
            router.replace(`/${agencySlug}/dashboard`)
        } catch (error: any) {
            console.error('[Login Error]', error)
            
            // Better error messages
            if (error.response?.status === 401) {
                toast.error("Invalid credentials")
            } else if (error.message?.includes('Network Error') || error.code === 'ECONNREFUSED') {
                toast.error("Unable to connect to server. Please try again.")
            } else {
                toast.error("Invalid credentials")
            }
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#06b6d4] font-inter p-4 selection:bg-white/20">
            <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="w-full max-w-[520px]"
            >
                <div className="flex flex-col items-center mb-8 text-center">
                    <div className="h-14 w-14 rounded-2xl bg-white/12 border border-white/25 flex items-center justify-center mb-4 shadow-[0_12px_30px_rgba(0,0,0,0.18)]">
                        <Building2 className="h-7 w-7 text-white" />
                    </div>
                    <h1 className="text-[28px] font-bold text-white">SAMS Agency</h1>
                    <p className="text-[14px] text-white/85 mt-1">Admin portal • @{agencySlug}</p>
                </div>

                <Card className="overflow-hidden" suppressHydrationWarning>
                    <CardContent className="p-6 sm:p-8" suppressHydrationWarning>
                        <div className="mb-6 text-center">
                            <h2 className="text-[20px] font-semibold text-slate-900">Agency Admin Login</h2>
                            <p className="text-[14px] text-slate-600 mt-1">Enter your administrative credentials.</p>
                        </div>

                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem className="space-y-2">
                                            <FormLabel className="text-[12px] font-semibold text-slate-600 uppercase tracking-wider">Admin Email</FormLabel>
                                            <FormControl>
                                                <div className="relative group">
                                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                                                    <Input
                                                        suppressHydrationWarning
                                                        placeholder="admin@sams.ops"
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

                <div className="mt-8 text-center text-[12px] text-white/75">
                    Agency node: {agencySlug}
                </div>
            </motion.div>
        </div>
    )
}
