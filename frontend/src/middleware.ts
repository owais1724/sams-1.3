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

  // Session cookies only (middleware must NOT do role/portal checks)
  const session =
    request.cookies.get('access_token')?.value ||
    request.cookies.get('token')?.value ||
    request.cookies.get('auth')?.value ||
    request.cookies.get('session')?.value

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
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|api).*)',
  ],
}


