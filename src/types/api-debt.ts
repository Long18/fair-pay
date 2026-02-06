/**
 * Public Debt API Types
 * For consuming the public secret API to fetch user debt information
 */

export interface DebtByPerson {
  counterparty_id: string
  counterparty_name: string
  amount: number
  currency: string
  i_owe_them: boolean
  total_amount: number
  settled_amount: number
  remaining_amount: number
  transaction_count: number
  last_transaction_date: string
}

export interface DebtInGroup {
  counterparty_id: string
  counterparty_name: string
  amount: number
  currency: string
  i_owe_them: boolean
}

export interface DebtByGroup {
  group_id: string
  group_name: string
  group_avatar_url?: string
  total_owed_to_me: number
  total_i_owe: number
  net_balance: number
  debts_in_group: DebtInGroup[]
}

export interface SettlementSummary {
  total_expenses: number
  total_settled_splits: number
  total_unsettled_splits: number
  total_settled_amount: number
  total_unsettled_amount: number
}

export interface UserDebtData {
  user_id: string
  user_name: string
  user_email: string
  total_owed_to_me: number
  total_i_owe: number
  net_balance: number
  currency: string
  debts_by_person: DebtByPerson[]
  debts_by_group: DebtByGroup[]
  settlement_summary: SettlementSummary
}

export interface DebtApiResponse {
  success: boolean
  error_message?: string
  data?: UserDebtData
}

/**
 * API Secret Management Types
 */

export interface ApiSecret {
  id: string
  label?: string
  is_active: boolean
  last_used_at?: string
  expires_at?: string
  created_at: string
}

export interface CreateApiSecretResponse {
  id: string
  secret_token: string
  label?: string
  created_at: string
  expires_at?: string
}

export interface ApiSecretError {
  success: false
  message: string
}

export interface ApiSecretSuccess {
  success: true
  message: string
}
