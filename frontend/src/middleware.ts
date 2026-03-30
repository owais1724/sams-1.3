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
  
  // Role groups for portal categorization
  const SUPER_ADMIN_ROLES = ['SUPER_ADMIN']
  const AGENCY_ADMIN_ROLES = ['AGENCY_ADMIN']
  const STAFF_ROLES = ['SUPERVISOR', 'GUARD', 'HR', 'STAFF']

  // ── SUPER ADMIN PORTAL PROTECTION ──
  if (pathname.startsWith('/admin')) {
    if (!SUPER_ADMIN_ROLES.includes(normalizedRole)) {
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('access_token');
      response.cookies.delete('token');
      response.cookies.delete('userRole');
      return response;
    }
  }

  // ── AGENCY ADMIN vs STAFF PORTAL PROTECTION ──
  if (agencySlug) {
    // Staff paths are any URL containing /staff/ or /my-schedule
    const isStaffPath = pathname.includes('/staff/') || pathname.includes('/my-schedule')
    // Agency Admin paths are standard /{agencySlug}/... paths that are NOT staff paths 
    // and NOT login/registration pages
    const isAgencyAdminPath = !isStaffPath && 
                             !pathname.endsWith('/login') && 
                             !pathname.endsWith('/staff-login') &&
                             !pathname.endsWith('/register')

    // 1. Block Staff from Agency Admin Portal
    if (isAgencyAdminPath && STAFF_ROLES.includes(normalizedRole)) {
      console.warn(`[Middleware] Staff account ${normalizedRole} blocked from Agency Admin Path: ${pathname}`)
      const response = NextResponse.redirect(new URL(`/${agencySlug}/login`, request.url))
      response.cookies.delete('access_token');
      response.cookies.delete('token');
      response.cookies.delete('userRole');
      return response;
    }

    // 2. Block Agency Admins from Staff Portal
    if (isStaffPath && AGENCY_ADMIN_ROLES.includes(normalizedRole)) {
      console.warn(`[Middleware] Agency Admin ${normalizedRole} blocked from Staff Path: ${pathname}`)
      const response = NextResponse.redirect(new URL(`/${agencySlug}/login`, request.url))
      response.cookies.delete('access_token');
      response.cookies.delete('token');
      response.cookies.delete('userRole');
      return response;
    }
    
    // 3. Block Super Admins from all Agency/Staff portals (they must use /admin)
    if (SUPER_ADMIN_ROLES.includes(normalizedRole)) {
      const response = NextResponse.redirect(new URL('/admin/login', request.url))
      response.cookies.delete('access_token');
      response.cookies.delete('token');
      response.cookies.delete('userRole');
      return response;
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|api).*)',
  ],
}
