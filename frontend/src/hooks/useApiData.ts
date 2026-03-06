/**
 * useApiData — Generic data-fetching hook
 *
 * Eliminates the repeated pattern in every page:
 *   const [data, setData] = useState([])
 *   const [loading, setLoading] = useState(true)
 *   const fetchData = async () => { try { ... } catch { ... } finally { setLoading(false) } }
 *   useEffect(() => { fetchData() }, [])
 *
 * Usage:
 *   const { data: clients, loading, refetch } = useApiData<Client[]>('/clients', [])
 */

import { useState, useEffect, useCallback } from 'react'
import api from '@/lib/api'

interface UseApiDataOptions {
    /** Run immediately on mount? Default: true */
    immediate?: boolean
}

interface UseApiDataReturn<T> {
    data: T
    loading: boolean
    error: string | null
    refetch: () => Promise<void>
}

export function useApiData<T>(
    endpoint: string,
    initialValue: T,
    options: UseApiDataOptions = {}
): UseApiDataReturn<T> {
    const { immediate = true } = options
    const [data, setData] = useState<T>(initialValue)
    const [loading, setLoading] = useState(immediate)
    const [error, setError] = useState<string | null>(null)

    const refetch = useCallback(async (signal?: AbortSignal) => {
        setLoading(true)
        setError(null)
        try {
            const response = await api.get(endpoint, { signal })
            setData(response.data)
        } catch (err: any) {
            if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return
            console.error(`[useApiData] Failed to fetch ${endpoint}:`, err)
            setError(err?.response?.data?.message || 'Failed to load data')
        } finally {
            setLoading(false)
        }
    }, [endpoint])

    useEffect(() => {
        if (!immediate) return
        const controller = new AbortController()
        refetch(controller.signal)
        return () => controller.abort()
    }, [immediate, refetch])

    return { data, loading, error, refetch }
}
