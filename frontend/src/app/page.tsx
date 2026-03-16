"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useRouter } from "next/navigation"
import { useState } from "react"
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
import { ShieldCheck, Lock, Mail, ChevronRight, Loader2, Globe, Eye, EyeOff } from "lucide-react"
import { motion } from "framer-motion"
import { useAuthStore } from "@/store/authStore"
import { useEffect } from "react"

const formSchema = z.object({
  email: z.string().email("Authorized email required"),
  password: z.string().min(6, "Security token must be at least 6 characters"),
})

export default function RootLoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { login, logout } = useAuthStore()

  useEffect(() => {
    const clearSession = async () => {
      try {
        await api.post("/auth/logout")
      } catch (e) {
        // Silently fail session clearing
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

      // RESTRICTION: Root login is EXCLUSIVELY for Super Admins
      if (user.role !== 'Super Admin') {
        toast.error("Invalid credentials")
        await api.post("/auth/logout")
        setLoading(false)
        return
      }

      login(user)
      sessionStorage.setItem('sams_portal_type', 'admin')
      toast.success(`Welcome, Administrator. Authorization successful.`)
      router.push("/admin/dashboard")

    } catch (error: any) {
      console.error(error)
      toast.error("Invalid credentials")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black font-inter p-4 relative overflow-hidden selection:bg-primary/30">
      {/* Dynamic Background Effects */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-primary/10 blur-[150px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full animate-pulse delay-700" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-[500px] z-10"
      >
        {/* Branding Hub */}
        <div className="flex flex-col items-center mb-12">
          <motion.div 
            whileHover={{ scale: 1.05, rotate: 5 }}
            className="w-20 h-20 bg-gradient-to-tr from-[#D9A75B] via-[#FFB800] to-[#FFD700] p-[2px] rounded-[24px] mb-6 shadow-[0_0_50px_rgba(255,184,0,0.3)]"
          >
            <div className="w-full h-full bg-black rounded-[22px] flex items-center justify-center">
              <ShieldCheck className="w-10 h-10 text-primary" />
            </div>
          </motion.div>
          <h1 className="text-3xl font-black text-white tracking-[0.4em] uppercase italic">HYPER<span className="text-primary not-italic">CORE</span></h1>
          <div className="flex items-center gap-3 mt-4">
            <div className="h-[1px] w-8 bg-primary/30" />
            <span className="text-[10px] text-primary/60 font-black uppercase tracking-[0.5em]">Command & Control Hub</span>
            <div className="h-[1px] w-8 bg-primary/30" />
          </div>
        </div>

        <Card className="border border-white/10 bg-black/60 backdrop-blur-3xl rounded-[40px] shadow-[0_50px_100px_rgba(0,0,0,0.8)] overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          <CardContent className="p-8 md:p-16">
            <div className="mb-12 text-center">
              <h2 className="text-2xl md:text-3xl font-black text-white tracking-tighter uppercase italic">Authorize <span className="text-primary not-italic">Session</span></h2>
              <p className="text-primary/50 font-black text-[9px] mt-4 uppercase tracking-[0.3em] inline-flex items-center gap-2 bg-primary/5 px-4 py-2 rounded-full border border-primary/10">
                <Globe className="h-3 w-3" /> System level verification required
              </p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-[10px] font-black text-white/50 uppercase tracking-[0.4em] pl-1">Authorized User ID</FormLabel>
                      <FormControl>
                        <div className="relative group">
                          <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-primary transition-colors" />
                          <Input
                            placeholder="OPERATOR_CORE_ALPHA"
                            className="h-16 pl-14 bg-white/5 border-white/5 text-white placeholder:text-white/10 rounded-2xl focus:border-primary/50 focus:bg-white/[0.08] transition-all font-black uppercase tracking-widest italic"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-[10px] text-rose-500 font-bold uppercase tracking-widest" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-[10px] font-black text-white/50 uppercase tracking-[0.4em] pl-1">Cryptographic Token</FormLabel>
                      <FormControl>
                        <div className="relative group">
                          <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-primary transition-colors" />
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••••••"
                            className="h-16 pl-14 pr-14 bg-white/5 border-white/5 text-white placeholder:text-white/10 rounded-2xl focus:border-primary/50 focus:bg-white/[0.08] transition-all font-black tracking-[0.5em]"
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-5 top-1/2 -translate-y-1/2 text-white/20 hover:text-primary transition-colors"
                          >
                            {showPassword ? (
                              <EyeOff className="w-5 h-5" />
                            ) : (
                              <Eye className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage className="text-[10px] text-rose-500 font-bold uppercase tracking-widest" />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  variant="premium"
                  size="cta"
                  className="w-full h-20 shadow-[0_20px_40px_rgba(255,184,0,0.15)] mt-6 text-lg tracking-[0.2em]"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center gap-4">
                      <div className="h-5 w-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>Verifying Authority...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span>Establish Connection</span>
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Neural Grid Footer */}
        <div className="mt-16 text-center">
          <p className="text-[10px] text-white/30 font-black uppercase tracking-[0.6em] mb-4">
            Unified Global Infrastructure // encrypted layer-7
          </p>
          <div className="flex justify-center gap-6 opacity-30">
            <div className="h-1 w-1 rounded-full bg-white animate-pulse" />
            <div className="h-1 w-1 rounded-full bg-white animate-pulse delay-700" />
            <div className="h-1 w-1 rounded-full bg-white animate-pulse delay-1000" />
          </div>
        </div>
      </motion.div>
    </div>
  )
}
