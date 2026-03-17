
"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useRouter } from "next/navigation"
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
import { toast } from "@/components/ui/sonner"
import { motion } from "framer-motion"
import { Lock, Mail, ChevronRight, Loader2, ShieldCheck, Eye, EyeOff } from "lucide-react"
import { useAuthStore } from "@/store/authStore"
import api from "@/lib/api"

const formSchema = z.object({
    email: z.string().email("Please enter a valid administrative email"),
    password: z.string().min(6, "Security token must be at least 6 characters"),
})

export default function LoginPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const login = useAuthStore(state => state.login)
    const logout = useAuthStore(state => state.logout)

    useEffect(() => {
        const clearSession = async () => {
            try {
                await api.post("/auth/logout")
            } catch (e) {
                // Silently clear session
            } finally {
                logout()
            }
        }
        clearSession()
    }, [logout])

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: { email: "", password: "" },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true)
        toast.dismiss()

        try {
            const response = await api.post("/auth/login", values)
            const { user } = response.data

            if (user.role !== 'Super Admin') {
                toast.error("Invalid credentials")
                await api.post("/auth/logout")
                logout()
                setLoading(false)
                return
            }

            login(user)
            sessionStorage.setItem('sams_portal_type', 'admin')
            toast.success("Welcome, Administrator")
            router.push("/admin/dashboard")
        } catch (error: any) {
            console.error('[Admin Login Error]', error)
            toast.error("Invalid credentials")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#0d9488] font-inter p-4 selection:bg-white/20">
            <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="w-full max-w-[520px]"
            >
                <div className="flex flex-col items-center mb-8 text-center">
                    <div className="h-14 w-14 rounded-2xl bg-white/12 border border-white/25 flex items-center justify-center mb-4 shadow-[0_12px_30px_rgba(0,0,0,0.18)]">
                        <ShieldCheck className="h-7 w-7 text-white" />
                    </div>
                    <h1 className="text-[28px] font-bold text-white">SAMS Global</h1>
                    <p className="text-[14px] text-white/85 mt-1">Super Admin portal</p>
                </div>

                <Card className="overflow-hidden" suppressHydrationWarning>
                    <CardContent className="p-6 sm:p-8" suppressHydrationWarning>
                        <div className="mb-6 text-center">
                            <h2 className="text-[20px] font-semibold text-slate-900">Super Admin Login</h2>
                            <p className="text-[14px] text-slate-600 mt-1">Enter your administrative credentials.</p>
                        </div>

                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem className="space-y-2.5">
                                            <FormLabel className="text-[12px] font-semibold text-slate-600 uppercase tracking-wider">Admin Email</FormLabel>
                                            <FormControl>
                                                <div className="relative group">
                                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                                                    <Input
                                                        suppressHydrationWarning
                                                        placeholder="admin@sams.global"
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
                                        <FormItem className="space-y-2.5">
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
                                                        suppressHydrationWarning
                                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
                                                    >
                                                        {showPassword ? (
                                                            <EyeOff className="w-5 h-5" />
                                                        ) : (
                                                            <Eye className="w-5 h-5" />
                                                        )}
                                                    </button>
                                                </div>
                                            </FormControl>
                                            <FormMessage className="text-[12px] text-rose-600 font-semibold" />
                                        </FormItem>
                                    )}
                                />

                                <Button
                                    suppressHydrationWarning
                                    type="submit"
                                    variant="success"
                                    size="cta"
                                    className="w-full"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            <span>Signing in...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Sign in</span>
                                            <ChevronRight className="w-5 h-5" />
                                        </>
                                    )}
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
                <div className="mt-8 text-center text-[12px] text-white/75">
                    Strategic Administration Portal
                </div>
            </motion.div>
        </div>
    )
}
