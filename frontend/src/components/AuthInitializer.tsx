"use client"

import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'

export function AuthInitializer() {
    useEffect(() => {
        const syncSession = async () => {
            const { user, initialize } = useAuthStore.getState()
            
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
                            headers: {
                                'Content-Type': 'application/json',
                            }
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
