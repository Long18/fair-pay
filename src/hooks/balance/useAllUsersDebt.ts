/**
 * Hook for consuming all-users debt API
 * Supports both public (summary) and authenticated (detailed) endpoints
 */

import { useState, useCallback } from 'react'
import type {
  PublicDebtSummary,
  DetailedDebtData,
  WhoOwesWhoPair,
  PaginationMetadata
} from '@/types/all-users-debt'

interface UseAllUsersDebtOptions {
  baseUrl?: string
  authenticated?: boolean // true = detailed endpoint, false = summary
  token?: string // auth token for detailed endpoint
}

interface UseAllUsersDebtState<T> {
  data: T[] | null
  loading: boolean
  error: string | null
  pagination: PaginationMetadata | null
}

/**
 * Hook to fetch all users debt (public summary or authenticated detailed)
 */
export function useAllUsersDebt(options?: UseAllUsersDebtOptions) {
  const isAuthenticated = options?.authenticated || false
  const [state, setState] = useState<UseAllUsersDebtState<PublicDebtSummary | DetailedDebtData>>({
    data: null,
    loading: false,
    error: null,
    pagination: null
  })

  const fetchDebt = useCallback(
    async (limit: number = 50, offset: number = 0) => {
      setState({
        data: null,
        loading: true,
        error: null,
        pagination: null
      })

      try {
        const baseUrl = options?.baseUrl || '/api/debt'
        const endpoint = isAuthenticated ? 'all-users-detailed' : 'all-users-summary'
        const url = new URL(`${baseUrl}/${endpoint}`, typeof window !== 'undefined' ? window.location.origin : 'http://localhost')

        url.searchParams.append('limit', Math.min(limit, 100).toString())
        url.searchParams.append('offset', offset.toString())

        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        }

        if (isAuthenticated && options?.token) {
          headers['Authorization'] = `Bearer ${options.token}`
        }

        const response = await fetch(url.toString(), {
          method: 'GET',
          headers
        })

        const responseData = await response.json()

        if (!response.ok) {
          setState({
            data: null,
            loading: false,
            error: responseData.error || `HTTP ${response.status}: ${response.statusText}`,
            pagination: null
          })
          return {
            success: false,
            error: responseData.error || 'Failed to fetch debt data'
          }
        }

        if (responseData.success) {
          setState({
            data: responseData.data || [],
            loading: false,
            error: null,
            pagination: responseData.pagination || null
          })
        } else {
          setState({
            data: null,
            loading: false,
            error: responseData.error || 'Unknown error',
            pagination: null
          })
        }

        return responseData
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch debt data'
        setState({
          data: null,
          loading: false,
          error: errorMessage,
          pagination: null
        })
        return {
          success: false,
          error: errorMessage
        }
      }
    },
    [isAuthenticated, options?.baseUrl, options?.token]
  )

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
      pagination: null
    })
  }, [])

  return {
    ...state,
    fetchDebt,
    reset
  }
}

/**
 * Hook specifically for public summary endpoint
 */
export function useAllUsersDebtSummary(baseUrl?: string) {
  return useAllUsersDebt({
    baseUrl,
    authenticated: false
  })
}

/**
 * Hook specifically for authenticated detailed endpoint
 */
export function useAllUsersDebtDetailed(token?: string, baseUrl?: string) {
  return useAllUsersDebt({
    baseUrl,
    authenticated: true,
    token
  })
}

/**
 * Hook for who-owes-who public endpoint
 */
export function useWhoOwesWho(baseUrl?: string) {
  const [state, setState] = useState<{
    data: WhoOwesWhoPair[] | null
    loading: boolean
    error: string | null
    pagination: PaginationMetadata | null
  }>({
    data: null,
    loading: false,
    error: null,
    pagination: null
  })

  const fetchWhoOwesWho = useCallback(
    async (limit: number = 50, offset: number = 0) => {
      setState({ data: null, loading: true, error: null, pagination: null })

      try {
        const base = baseUrl || '/api/debt'
        const url = new URL(
          `${base}/who-owes-who`,
          typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
        )
        url.searchParams.append('limit', Math.min(limit, 100).toString())
        url.searchParams.append('offset', offset.toString())

        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        })

        const responseData = await response.json()

        if (!response.ok) {
          setState({
            data: null,
            loading: false,
            error: responseData.error || `HTTP ${response.status}: ${response.statusText}`,
            pagination: null
          })
          return { success: false, error: responseData.error || 'Failed to fetch' }
        }

        if (responseData.success) {
          setState({
            data: responseData.data || [],
            loading: false,
            error: null,
            pagination: responseData.pagination || null
          })
        } else {
          setState({
            data: null,
            loading: false,
            error: responseData.error || 'Unknown error',
            pagination: null
          })
        }

        return responseData
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch who-owes-who data'
        setState({ data: null, loading: false, error: errorMessage, pagination: null })
        return { success: false, error: errorMessage }
      }
    },
    [baseUrl]
  )

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null, pagination: null })
  }, [])

  return { ...state, fetchWhoOwesWho, reset }
}
