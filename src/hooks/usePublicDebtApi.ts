/**
 * Hook for consuming the public debt API
 * Allows fetching user debt data using public secret tokens
 */

import { useState, useCallback } from 'react'
import { DebtApiResponse, UserDebtData } from '@/types/api-debt'

interface UsePublicDebtApiOptions {
  baseUrl?: string // Defaults to VITE_SUPABASE_URL/functions/v1
}

interface UsePublicDebtApiState {
  data: UserDebtData | null
  loading: boolean
  error: string | null
}

export function usePublicDebtApi(options?: UsePublicDebtApiOptions) {
  const [state, setState] = useState<UsePublicDebtApiState>({
    data: null,
    loading: false,
    error: null
  })

  const fetchDebt = useCallback(
    async (userId: string, secret: string): Promise<DebtApiResponse> => {
      setState({
        data: null,
        loading: true,
        error: null
      })

      try {
        const baseUrl = options?.baseUrl || `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`
        const url = new URL(`${baseUrl}/get-user-debt`)
        url.searchParams.append('user_id', userId)
        url.searchParams.append('secret', secret)

        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        })

        const responseData: DebtApiResponse = await response.json()

        if (!response.ok) {
          const errorMessage = responseData.error_message || `HTTP ${response.status}: ${response.statusText}`
          setState({
            data: null,
            loading: false,
            error: errorMessage
          })
          return {
            success: false,
            error_message: errorMessage
          }
        }

        if (responseData.success && responseData.data) {
          setState({
            data: responseData.data,
            loading: false,
            error: null
          })
        } else {
          const errorMessage = responseData.error_message || 'Unknown error occurred'
          setState({
            data: null,
            loading: false,
            error: errorMessage
          })
        }

        return responseData
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch debt data'
        setState({
          data: null,
          loading: false,
          error: errorMessage
        })
        return {
          success: false,
          error_message: errorMessage
        }
      }
    },
    [options?.baseUrl]
  )

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null
    })
  }, [])

  return {
    ...state,
    fetchDebt,
    reset
  }
}
