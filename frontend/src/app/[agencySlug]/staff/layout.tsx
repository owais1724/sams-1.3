"use client"

import { usePathname } from "next/navigation"

export default function StaffLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const isLoginPage = pathname?.includes('staff-login') || pathname?.includes('/login')

    // Middleware already handles all auth checks
    // No need for additional verification in layout
    
    if (isLoginPage) {
        return <>{children}</>
    }

    return <>{children}</>
}
