"use client"

import { useEffect } from 'react'
import { getCsrfTokenFromCookie, useAuthStore, withCsrfHeaders } from '@/store/authStore'

export function AuthInitializer() {
    useEffect(() => {
        if (typeof window !== 'undefined' && !(window as typeof window & { __samsCsrfFetchPatched?: boolean }).__samsCsrfFetchPatched) {
            const originalFetch = window.fetch.bind(window)

            window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
                const request = input instanceof Request ? input : null
                const method = init?.method || request?.method || 'GET'
                const csrfToken = getCsrfTokenFromCookie()

                if (!csrfToken || !['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())) {
                    return originalFetch(input, init)
                }

                const headers = withCsrfHeaders(method, init?.headers ?? request?.headers)
                return originalFetch(input, { ...init, headers })
            }) as typeof window.fetch

            ;(window as typeof window & { __samsCsrfFetchPatched?: boolean }).__samsCsrfFetchPatched = true
        }

        const syncSession = async () => {
            const { initialize } = useAuthStore.getState()
            
            // Always try to initialize from cookies
            await initialize()
            
            // Double-check: if still no user but we have cookies, try again
            const currentUser = useAuthStore.getState().user
            if (!currentUser && typeof document !== 'undefined') {
                const hasAuthCookie = 
                    document.cookie.includes('access_token') || 
                    document.cookie.includes('userRole')
                
                if (hasAuthCookie) {
                        console.log('[AuthInitializer] Cookies exist but no user, syncing from backend...')
                        try {
                            const response = await fetch('/api/auth/me', {
                                credentials: 'include',
                                headers: withCsrfHeaders('GET', {
                                    'Content-Type': 'application/json',
                                })
                            })
                        
                        if (response.ok) {
                            const userData = await response.json()
                            console.log('[AuthInitializer] Session restored from backend:', userData.email)
                            useAuthStore.setState({
                                user: userData,
                                isAuthenticated: true,
                                isLoading: false
                            })
                            
                            // Store role in cookie for middleware
                            if (userData.role) {
                                document.cookie = `userRole=${userData.role}; path=/; max-age=86400; SameSite=Lax`
                            }
                        }
                    } catch (error) {
                        console.warn('[AuthInitializer] Failed to sync session:', error)
                    }
                }
            }
        }
        
        syncSession()
        
        // Also sync on page visibility change (when user switches tabs)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                syncSession()
            }
        }
        
        document.addEventListener('visibilitychange', handleVisibilityChange)
        
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
    }, [])

    return null
}
