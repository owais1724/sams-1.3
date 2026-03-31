"use client"

import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'

export function AuthInitializer() {
    useEffect(() => {
        const { initialize } = useAuthStore.getState()
        initialize()
    }, [])

    return null
}
