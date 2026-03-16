
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
import { toast } from "@/components/ui/sonner"
import { useAuthStore } from "@/store/authStore"
import { motion } from "framer-motion"
import { Lock, Mail, ChevronRight, Loader2, Building2, Activity, Eye, EyeOff } from "lucide-react"

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

    useEffect(() => {
        // Clear local and backend session on mount
        const clearSession = async () => {
            try {
                await api.post("/auth/logout")
            } catch (e) {
                // Ignore errors during preemptive logout
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

            const currentSlug = Array.isArray(agencySlug) ? agencySlug[0] : agencySlug
            if (user.agencySlug !== currentSlug) {
                toast.error("Invalid credentials")
                // Call logout to clear the cookie we just got
                await api.post("/auth/logout")
                logout()
                setLoading(false)
                return
            }

            if (user.role !== 'Agency Admin') {
                toast.error("Invalid credentials")
                await api.post("/auth/logout")
                logout()
                setLoading(false)
                return
            }

            login(user)
            sessionStorage.setItem('sams_portal_type', 'agency')
            toast.success("Identity verified. Welcome back.")
            router.push(`/${agencySlug}/dashboard`)
        } catch (error: any) {
            console.error('[Login Error]', error)
            toast.error("Invalid credentials")
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-black font-inter p-4 relative overflow-hidden selection:bg-primary/30">
            {/* Premium Gold Glows */}
            <div className="absolute inset-0 z-0 overflow-hidden">
                <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/10 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-[#D9A75B]/5 blur-[100px] rounded-full" />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.98, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="w-full max-w-[460px] z-10"
            >
                {/* Logo Section */}
                <div className="flex flex-col items-center mb-10">
                    <div className="w-20 h-20 bg-gradient-to-tr from-[#D9A75B] via-[#FFB800] to-[#FFD700] shadow-[0_0_40px_rgba(255,184,0,0.3)] rounded-[24px] flex items-center justify-center mb-6 transform rotate-3 hover:rotate-6 transition-transform">
                        <Building2 className="w-10 h-10 text-black" />
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-[0.25em] uppercase italic">SAMS <span className="text-primary not-italic">ENGINE</span></h1>
                    <div className="h-1 w-12 bg-primary/40 rounded-full mt-3" />
                </div>

                <Card className="border border-white/10 bg-white/[0.03] backdrop-blur-3xl rounded-[2.5rem] shadow-[0_80px_100px_-20px_rgba(0,0,0,0.8)] overflow-hidden relative" suppressHydrationWarning>
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                    <CardContent className="p-8 md:p-14" suppressHydrationWarning>
                        <div className="mb-8 md:mb-12 text-center">
                            <h2 className="text-2xl md:text-3xl font-black text-white tracking-widest uppercase italic">Authentication</h2>
                            <p className="text-primary font-bold text-[10px] mt-3 uppercase tracking-[0.3em] bg-white/5 py-1.5 px-6 rounded-full inline-block border border-white/5">
                                SECURE NODE: <span className="italic">@{agencySlug}</span>
                            </p>
                        </div>

                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem className="space-y-2">
                                            <FormLabel className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] pl-1">Command ID</FormLabel>
                                            <FormControl>
                                                <div className="relative group">
                                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                                    <Input
                                                        suppressHydrationWarning
                                                        placeholder="admin@sams.ops"
                                                        className="pl-12 h-14 bg-white/5 border-white/10 text-white placeholder:text-white/20 rounded-2xl focus:bg-white/[0.08] focus:border-primary/30 transition-all font-black uppercase tracking-wider text-xs italic"
                                                        {...field}
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormMessage className="text-[10px] text-rose-500 font-bold" />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem className="space-y-2">
                                            <FormLabel className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] pl-1">Access Cipher</FormLabel>
                                            <FormControl>
                                                <div className="relative group">
                                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                                    <Input
                                                        suppressHydrationWarning
                                                        type={showPassword ? "text" : "password"}
                                                        placeholder="••••••••"
                                                        className="pl-12 pr-12 h-14 bg-white/5 border-white/10 text-white placeholder:text-white/20 rounded-2xl focus:bg-white/[0.08] focus:border-primary/30 transition-all font-semibold"
                                                        {...field}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                                                    >
                                                        {showPassword ? (
                                                            <EyeOff className="w-4 h-4" />
                                                        ) : (
                                                            <Eye className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                </div>
                                            </FormControl>
                                            <FormMessage className="text-[10px] text-rose-500 font-bold" />
                                        </FormItem>
                                    )}
                                />

                                <Button
                                    suppressHydrationWarning
                                    type="submit"
                                    variant="premium"
                                    size="cta"
                                    className="w-full h-16 mt-6 uppercase tracking-[0.2em]"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                            <span>Validating...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Initialize Login</span>
                                            <ChevronRight className="w-4 h-4 ml-2" />
                                        </>
                                    )}
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>

                {/* Footer Section */}
                <div className="mt-16 text-center">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                        <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.5em]">
                            System Operative // Agency Node: {agencySlug}
                        </p>
                    </div>
                    <p className="text-[9px] text-white/20 font-medium">© 2026 SAMS HYPERCORE. ALL RIGHTS RESERVED.</p>
                </div>
            </motion.div>
        </div>
    )
}
