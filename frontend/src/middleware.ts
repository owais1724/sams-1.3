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
  if (isPublicRoute || pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Get auth data from cookies
  const token = request.cookies.get('access_token')?.value || request.cookies.get('token')?.value
  const userRole = request.cookies.get('userRole')?.value

  // If no token, redirect to home (login will handle it)
  if (!token) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // If no role in cookie, allow through (layout will verify with /auth/me)
  if (!userRole) {
    return NextResponse.next()
  }

  // Now check role-based access
  const normalizedRole = normalizeRole(userRole);

  // Super Admin Portal: /admin/*
  if (pathname.startsWith('/admin')) {
    if (normalizedRole !== 'SUPER_ADMIN') {
      const response = NextResponse.redirect(new URL('/', request.url))
      response.cookies.delete('access_token')
      response.cookies.delete('token')
      response.cookies.delete('userRole')
      response.cookies.delete('user')
      response.cookies.delete('sams-auth-v2')
      return response
    }
  }

  // Staff/Guard Portal: /[agencySlug]/staff/*
  const isStaffRoute = pathname.match(/^\/[^\/]+\/staff\//) && !pathname.includes('/staff-login')
  if (isStaffRoute) {
    // Only allow Guard role
    if (normalizedRole !== 'GUARD' && normalizedRole !== 'STAFF') {
      const response = NextResponse.redirect(new URL('/', request.url))
      response.cookies.delete('access_token')
      response.cookies.delete('token')
      response.cookies.delete('userRole')
      response.cookies.delete('user')
      response.cookies.delete('sams-auth-v2')
      return response
    }
  }

  // Agency Admin Portal: /[agencySlug]/* (excluding /staff/ routes)
  const isAgencyRoute = pathname.match(/^\/[^\/]+\/(?!staff\/)/) && 
                        !pathname.startsWith('/admin') &&
                        !pathname.endsWith('/login') &&
                        !pathname.endsWith('/staff-login')
  
  if (isAgencyRoute) {
    // Only allow Agency Admin and Supervisor
    const allowedRoles = ['AGENCY_ADMIN', 'SUPERVISOR']
    if (!allowedRoles.includes(normalizedRole)) {
      const response = NextResponse.redirect(new URL('/', request.url))
      response.cookies.delete('access_token')
      response.cookies.delete('token')
      response.cookies.delete('userRole')
      response.cookies.delete('user')
      response.cookies.delete('sams-auth-v2')
      return response
    }
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
