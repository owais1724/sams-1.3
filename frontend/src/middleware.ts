import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Decode a JWT payload without verifying the signature.
 * We only need the claims (role, agencySlug) for routing purposes.
 * The backend's AuthGuard is still the authoritative security gate for every API call.
 */
function decodeJwtPayload(token: string): Record<string, any> | null {
    try {
        const parts = token.split('.')
        if (parts.length !== 3) return null
        // Base64url → Base64 → JSON
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
        const json = Buffer.from(base64, 'base64').toString('utf8')
        return JSON.parse(json)
    } catch {
        return null
    }
}

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl
    const token = request.cookies.get('access_token')?.value

    // ─── Routes that are always public (login pages) ─────────────────────────
    const isAdminLogin = pathname === '/admin/login'
    const isRootLogin = pathname === '/'
    const isAgencyLogin = /^\/[^/]+\/login$/.test(pathname)
    const isAgencyStaffLogin = /^\/[^/]+\/staff-login$/.test(pathname)

    if (isAdminLogin || isRootLogin || isAgencyLogin || isAgencyStaffLogin) {
        return NextResponse.next()
    }

    // ─── Protect /admin/* routes ─────────────────────────────────────────────
    if (pathname.startsWith('/admin')) {
        if (!token) {
            return NextResponse.redirect(new URL('/admin/login', request.url))
        }
        const payload = decodeJwtPayload(token)
        if (!payload || payload.role !== 'Super Admin') {
            // Wrong role or invalid token – hard redirect to admin login
            const response = NextResponse.redirect(new URL('/admin/login', request.url))
            // Also clear the bad cookie
            response.cookies.set('access_token', '', { maxAge: 0, path: '/' })
            return response
        }
        return NextResponse.next()
    }

    // ─── Protect /<agencySlug>/* routes ──────────────────────────────────────
    // Match paths like /sentinel/dashboard, /sentinel/employees, etc.
    const agencyRouteMatch = pathname.match(/^\/([^/]+)\/(.+)$/)
    if (agencyRouteMatch) {
        const agencySlugFromUrl = agencyRouteMatch[1]

        // Skip Next.js internals and api routes
        if (agencySlugFromUrl.startsWith('_') || agencySlugFromUrl === 'api' || agencySlugFromUrl === 'favicon.ico') {
            return NextResponse.next()
        }

        if (!token) {
            return NextResponse.redirect(new URL(`/${agencySlugFromUrl}/login`, request.url))
        }

        const payload = decodeJwtPayload(token)

        if (!payload) {
            const response = NextResponse.redirect(new URL(`/${agencySlugFromUrl}/login`, request.url))
            response.cookies.set('access_token', '', { maxAge: 0, path: '/' })
            return response
        }

        // Super Admins are NEVER allowed in agency portals
        if (payload.role === 'Super Admin') {
            const response = NextResponse.redirect(new URL(`/${agencySlugFromUrl}/login`, request.url))
            response.cookies.set('access_token', '', { maxAge: 0, path: '/' })
            return response
        }

        // The token's agencySlug must match the URL slug — the definitive check
        if (payload.agencySlug !== agencySlugFromUrl) {
            const response = NextResponse.redirect(new URL(`/${agencySlugFromUrl}/login`, request.url))
            response.cookies.set('access_token', '', { maxAge: 0, path: '/' })
            return response
        }

        return NextResponse.next()
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        /*
         * Match all request paths EXCEPT:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico
         * - Public assets
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
