
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
import { motion, AnimatePresence } from "framer-motion"
import { Lock, Mail, ChevronRight, Loader2, ShieldCheck, Cpu, Eye, EyeOff } from "lucide-react"
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
        <div className="min-h-screen flex flex-col items-center justify-center bg-black font-inter p-4 relative overflow-hidden selection:bg-primary/30">
            {/* Premium Gold Glows */}
            <div className="absolute inset-0 z-0 overflow-hidden">
                <div className="absolute top-[-15%] left-[-10%] w-[600px] h-[600px] bg-primary/10 blur-[130px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] bg-[#D9A75B]/5 blur-[110px] rounded-full" />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.98, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="w-full max-w-[460px] z-10"
            >
                {/* Logo Section */}
                <div className="flex flex-col items-center mb-12">
                    <div className="w-24 h-24 bg-gradient-to-tr from-[#D9A75B] via-[#FFB800] to-[#FFD700] shadow-[0_0_50px_rgba(255,184,0,0.3)] rounded-[32px] flex items-center justify-center mb-6 transform -rotate-3 hover:rotate-0 transition-all duration-500">
                        <ShieldCheck className="w-12 h-12 text-black" />
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-[0.3em] uppercase italic">HYPER<span className="text-primary not-italic">CORE</span></h1>
                    <div className="flex items-center gap-2 mt-4">
                        <div className="h-[2px] w-8 bg-primary/30" />
                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.5em]">Global Control</span>
                        <div className="h-[2px] w-8 bg-primary/30" />
                    </div>
                </div>

                <Card className="border border-white/10 bg-white/[0.03] backdrop-blur-3xl rounded-[3rem] shadow-[0_100px_120px_-20px_rgba(0,0,0,0.9)] overflow-hidden relative" suppressHydrationWarning>
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
                    <CardContent className="p-10 md:p-16" suppressHydrationWarning>
                        <div className="mb-10 md:mb-14 text-center">
                            <h2 className="text-2xl md:text-3xl font-black text-white tracking-widest uppercase italic border-b border-white/5 pb-4">Master Access</h2>
                            <p className="text-primary font-black text-[9px] mt-6 uppercase tracking-[0.4em] bg-white/5 py-2 px-8 rounded-full inline-block border border-white/5 shadow-inner">
                                NODE_STAT: <span className="italic">AUTHORITATIVE</span>
                            </p>
                        </div>

                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem className="space-y-3">
                                            <FormLabel className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.25em] pl-1">Superuser ID</FormLabel>
                                            <FormControl>
                                                <div className="relative group">
                                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                                    <Input
                                                        suppressHydrationWarning
                                                        placeholder="root@sams.global"
                                                        className="pl-12 h-16 bg-white/5 border-white/10 text-white placeholder:text-white/20 rounded-2xl focus:bg-white/[0.08] focus:border-primary/40 transition-all font-black uppercase tracking-[0.15em] text-xs italic"
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
                                        <FormItem className="space-y-3">
                                            <FormLabel className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.25em] pl-1">Master Cipher</FormLabel>
                                            <FormControl>
                                                <div className="relative group">
                                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                                    <Input
                                                        suppressHydrationWarning
                                                        type={showPassword ? "text" : "password"}
                                                        placeholder="••••••••"
                                                        className="pl-12 pr-12 h-16 bg-white/5 border-white/10 text-white placeholder:text-white/20 rounded-2xl focus:bg-white/[0.08] focus:border-primary/40 transition-all font-semibold"
                                                        {...field}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                                                    >
                                                        {showPassword ? (
                                                            <EyeOff className="w-5 h-5" />
                                                        ) : (
                                                            <Eye className="w-5 h-5" />
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
                                    className="w-full h-18 mt-8 uppercase tracking-[0.25em] text-sm italic"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-6 h-6 animate-spin mr-3" />
                                            <span>Decrypting...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Authorize Login</span>
                                            <ChevronRight className="w-5 h-5 ml-2" />
                                        </>
                                    )}
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>

                {/* Secure Marker */}
                <div className="mt-20 text-center">
                    <div className="flex items-center justify-center gap-3 mb-6">
                        <div className="h-2 w-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_#FFB800]" />
                        <p className="text-[11px] text-white/40 font-black uppercase tracking-[0.6em]">
                            Global Root Node // Master_SAMS_Engine
                        </p>
                    </div>
                    <p className="text-[10px] text-white/20 font-medium tracking-widest uppercase">© 2026 SAMS HYPERCORE SOLUTIONS. END-TO-END ENCRYPTED.</p>
                </div>
            </motion.div>
        </div>
    )
}
