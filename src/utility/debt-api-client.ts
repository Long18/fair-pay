/**
 * Public Debt API Client
 * Manages API secret generation, listing, revocation, and debt API calls
 */

import { supabaseClient } from './supabaseClient'
import type {
  ApiSecret,
  CreateApiSecretResponse,
  ApiSecretError,
  ApiSecretSuccess,
  DebtApiResponse,
  UserDebtData
} from '@/types/api-debt'

export class DebtApiClient {
  private supabase = supabaseClient

  /**
   * Create a new API secret for the current user
   */
  async createSecret(label?: string): Promise<CreateApiSecretResponse | ApiSecretError> {
    try {
      const { data, error } = await this.supabase.rpc('create_api_secret', {
        p_label: label || null
      })

      if (error) {
        return {
          success: false,
          message: error.message
        }
      }

      if (!data || data.length === 0) {
        return {
          success: false,
          message: 'Failed to create API secret'
        }
      }

      return data[0] as CreateApiSecretResponse
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Unknown error'
      }
    }
  }

  /**
   * List all API secrets for the current user
   */
  async listSecrets(): Promise<ApiSecret[] | ApiSecretError> {
    try {
      const { data, error } = await this.supabase.rpc('list_api_secrets')

      if (error) {
        return {
          success: false,
          message: error.message
        }
      }

      return (data || []) as ApiSecret[]
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Unknown error'
      }
    }
  }

  /**
   * Revoke an API secret
   */
  async revokeSecret(secretId: string): Promise<ApiSecretSuccess | ApiSecretError> {
    try {
      const { data, error } = await this.supabase.rpc('revoke_api_secret', {
        p_secret_id: secretId
      })

      if (error) {
        return {
          success: false,
          message: error.message
        }
      }

      if (!data || data.length === 0) {
        return {
          success: false,
          message: 'Failed to revoke API secret'
        }
      }

      const result = data[0]
      if (!result.success) {
        return {
          success: false,
          message: result.message
        }
      }

      return {
        success: true,
        message: 'API secret revoked successfully'
      }
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Unknown error'
      }
    }
  }

  /**
   * Fetch debt data using the public API
   * This can be called from anywhere (no auth required if you have valid userId + secret)
   */
  async fetchDebtData(
    userId: string,
    secret: string,
    options?: { baseUrl?: string }
  ): Promise<DebtApiResponse> {
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

      const data: DebtApiResponse = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error_message: data.error_message || `HTTP ${response.status}: ${response.statusText}`
        }
      }

      return data
    } catch (err) {
      return {
        success: false,
        error_message: err instanceof Error ? err.message : 'Failed to fetch debt data'
      }
    }
  }

  /**
   * Get public shareable link for debt data
   * Format: https://long-pay.vercel.app/public/debt?user_id=xxxxx&secret=yyyyy
   */
  getPublicShareLink(userId: string, secret: string, baseUrl: string = 'https://long-pay.vercel.app'): string {
    return `${baseUrl}/public/debt?user_id=${userId}&secret=${secret}`
  }

  /**
   * Get API endpoint URL
   */
  getApiEndpoint(baseUrl?: string): string {
    const endpoint = baseUrl || `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`
    return `${endpoint}/get-user-debt`
  }

  /**
   * Format debt response for display
   */
  formatDebtData(data: UserDebtData): {
    summary: string
    details: string[]
  } {
    const summary =
      data.net_balance >= 0
        ? `${data.user_name} is owed $${Math.abs(data.net_balance).toFixed(2)}`
        : `${data.user_name} owes $${Math.abs(data.net_balance).toFixed(2)}`

    const details: string[] = []

    if (data.debts_by_person.length > 0) {
      details.push(`Debts with ${data.debts_by_person.length} people:`)
      data.debts_by_person.forEach((debt) => {
        const action = debt.i_owe_them ? 'owes' : 'is owed'
        const settled =
          debt.settled_amount > 0
            ? ` (${debt.settled_amount} settled, ${debt.remaining_amount} remaining)`
            : ''
        details.push(`  • ${debt.counterparty_name}: ${action} $${debt.remaining_amount.toFixed(2)}${settled}`)
      })
    }

    if (data.debts_by_group.length > 0) {
      details.push(`\nDebts in ${data.debts_by_group.length} groups:`)
      data.debts_by_group.forEach((group) => {
        const net = group.net_balance >= 0 ? 'is owed' : 'owes'
        details.push(`  • ${group.group_name}: ${net} $${Math.abs(group.net_balance).toFixed(2)}`)
      })
    }

    if (data.settlement_summary.total_unsettled_splits > 0) {
      details.push(
        `\nSettlement: ${data.settlement_summary.total_unsettled_splits} unsettled splits ($${data.settlement_summary.total_unsettled_amount.toFixed(2)})`
      )
    }

    return { summary, details }
  }
}

// Export singleton instance
export const debtApiClient = new DebtApiClient()
