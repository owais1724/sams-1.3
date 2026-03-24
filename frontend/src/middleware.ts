import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Normalize role names for comparison
const normalizeRole = (role: string) => role.toUpperCase().replace(/\s+/g, '_');

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // PUBLIC ROUTES - NEVER block these
  const publicRoutes = [
    '/',
    '/login',
    '/register',
    '/staff-login',
  ]
  
  // Check if current path is a public route
  const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.endsWith(route))
  
  // Skip middleware for public routes and API routes
  if (isPublicRoute || pathname.startsWith('/api/') || pathname.startsWith('/_next/')) {
    return NextResponse.next()
  }

  // Get auth data from cookies
  const token = request.cookies.get('access_token')?.value || request.cookies.get('token')?.value
  const userRole = request.cookies.get('userRole')?.value

  console.log('[Middleware] Path:', pathname, 'Token:', !!token, 'Role:', userRole);

  // If no token, redirect to home (login will handle it)
  if (!token) {
    console.log('[Middleware] No token, redirecting to home');
    return NextResponse.redirect(new URL('/', request.url))
  }

  // If no role in cookie, allow through (layout will verify with /auth/me)
  if (!userRole) {
    console.log('[Middleware] No role in cookie, allowing through for layout verification');
    return NextResponse.next()
  }

  // Now check role-based access
  const normalizedRole = normalizeRole(userRole);
  console.log('[Middleware] Normalized role:', normalizedRole);

  // Super Admin Portal: /admin/*
  if (pathname.startsWith('/admin')) {
    console.log('[Middleware] Admin portal check');
    if (normalizedRole !== 'SUPER_ADMIN') {
      console.log('[Middleware] BLOCKING: Non-super-admin trying to access admin portal');
      const response = NextResponse.redirect(new URL('/', request.url))
      response.cookies.delete('access_token')
      response.cookies.delete('token')
      response.cookies.delete('userRole')
      response.cookies.delete('user')
      response.cookies.delete('sams-auth-v2')
      return response
    }
    console.log('[Middleware] ALLOWING: Super admin access');
  }

  // Staff/Guard Portal: /[agencySlug]/staff/* AND /[agencySlug]/my-schedule
  // STRICT: Only allow Guard, HR, and Staff roles (NOT Agency Admin, NOT Supervisor)
  const isStaffRoute = (pathname.match(/^\/[^\/]+\/staff\//) && !pathname.includes('/staff-login')) || 
                       pathname.match(/^\/[^\/]+\/my-schedule/)
  
  if (isStaffRoute) {
    console.log('[Middleware] Staff portal check');
    // Staff portal ONLY for Guard, HR, and Staff - NO ADMINS
    const STAFF_ONLY_ROLES = ['GUARD', 'HR', 'STAFF']
    if (!STAFF_ONLY_ROLES.includes(normalizedRole)) {
      console.log('[Middleware] BLOCKING: Non-staff role trying to access staff portal:', normalizedRole);
      const response = NextResponse.redirect(new URL('/', request.url))
      response.cookies.delete('access_token')
      response.cookies.delete('token')
      response.cookies.delete('userRole')
      response.cookies.delete('user')
      response.cookies.delete('sams-auth-v2')
      return response
    }
    console.log('[Middleware] ALLOWING: Staff access');
  }

  // Agency Admin Portal: /[agencySlug]/* (excluding /staff/ routes and /my-schedule)
  const isAgencyRoute = pathname.match(/^\/[^\/]+\/(?!staff\/|my-schedule)/) && 
                        !pathname.startsWith('/admin') &&
                        !pathname.endsWith('/login') &&
                        !pathname.endsWith('/staff-login')
  
  if (isAgencyRoute) {
    console.log('[Middleware] Agency portal check');
    // Only allow Agency Admin and Supervisor
    const allowedAdminRoles = ['AGENCY_ADMIN', 'SUPERVISOR']
    if (!allowedAdminRoles.includes(normalizedRole)) {
      console.log('[Middleware] BLOCKING: Non-admin trying to access agency portal. Role:', normalizedRole);
      const response = NextResponse.redirect(new URL('/', request.url))
      response.cookies.delete('access_token')
      response.cookies.delete('token')
      response.cookies.delete('userRole')
      response.cookies.delete('user')
      response.cookies.delete('sams-auth-v2')
      return response
    }
    console.log('[Middleware] ALLOWING: Agency admin access');
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|api).*)',
  ],
}
