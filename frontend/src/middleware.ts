import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Normalize role names for comparison
const normalizeRole = (role: string) => role.trim().toUpperCase().replace(/\s+/g, '_');

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // Extract agency slug from path if present (e.g. /agencySlug/login -> agencySlug)
  const pathParts = pathname.split('/').filter(Boolean)
  const agencySlug = pathParts.length > 0 && !['admin', 'api', '_next', 'register'].includes(pathParts[0]) ? pathParts[0] : null
  
  // PUBLIC ROUTES - NEVER block these
  const publicRoutes = [
    '/',
    '/login',
    '/register',
    '/staff-login',
    '/admin/login'
  ]
  
  // Check if current path is a public route
  const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.endsWith(route))
  
  // Skip middleware for public routes and API routes
  if (isPublicRoute || pathname.startsWith('/api/') || pathname.startsWith('/_next/')) {
    return NextResponse.next()
  }

  // Get auth data from cookies (session simulation)
  const token = request.cookies.get('access_token')?.value || request.cookies.get('token')?.value
  const userRole = request.cookies.get('userRole')?.value

  // If no token, redirect to proper login page immediately without deleting anything
  if (!token) {
    if (pathname.startsWith('/admin')) {
        return NextResponse.redirect(new URL('/admin/login', request.url))
    }
    if (agencySlug) {
        return NextResponse.redirect(new URL(`/${agencySlug}/login`, request.url))
    }
    return NextResponse.redirect(new URL('/', request.url))
  }

  // If token exists but no role cookie, let layouts verify via /auth/me
  if (!userRole) {
    return NextResponse.next()
  }

  const normalizedRole = normalizeRole(userRole);

  // Super Admin Portal protection
  if (pathname.startsWith('/admin')) {
    if (normalizedRole !== 'SUPER_ADMIN') {
      const redirectUrl = agencySlug ? `/${agencySlug}/login` : '/'
      return NextResponse.redirect(new URL(redirectUrl, request.url))
    }
  }

  // Staff Portal protection
  const isStaffRoute = (pathname.match(/^\/[^\/]+\/staff\//) && !pathname.includes('/staff-login')) || 
                       pathname.match(/^\/[^\/]+\/my-schedule/)
  if (isStaffRoute) {
    const ADMIN_ROLES = ['AGENCY_ADMIN', 'SUPER_ADMIN']
    if (ADMIN_ROLES.includes(normalizedRole)) {
      return NextResponse.redirect(new URL(`/${agencySlug}/login`, request.url))
    }
  }

  // Agency Portal protection (Blocks staff from accessing some purely administrative routes)
  // HOWEVER we must allow them to access components that rely on permission checks like /attendance, /projects
  // So we will NOT aggressively log them out if they have the wrong role. The layouts/pages will handle RBAC.
  // We only block purely Super Admin from entering agency.
  if (normalizedRole === 'SUPER_ADMIN' && agencySlug) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|api).*)',
  ],
}
