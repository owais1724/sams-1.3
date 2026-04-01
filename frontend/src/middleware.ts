import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Skip internal routes
  if (pathname.startsWith('/_next/') || pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  const pathParts = pathname.split('/').filter(Boolean)
  const agencySlug =
    pathParts.length > 0 && !['admin', 'api', '_next', 'register'].includes(pathParts[0])
      ? pathParts[0]
      : null

  // Public routes: never block them
  const isPublicRoute =
    pathname === '/' ||
    pathname.startsWith('/admin/login') ||
    pathname.endsWith('/login') ||
    pathname.endsWith('/staff-login') ||
    pathname.endsWith('/register')

  if (isPublicRoute) return NextResponse.next()

  // Middleware should trust only the backend-set HttpOnly auth cookie.
  const session = request.cookies.get('access_token')?.value

  if (!session) {
    // Super Admin portal
    if (pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    // Agency / Staff portals
    if (agencySlug) {
      return NextResponse.redirect(new URL(`/${agencySlug}/login`, request.url))
    }

    // Fallback
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
}


