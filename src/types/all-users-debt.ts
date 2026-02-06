/**
 * All Users Debt API Types
 * Public leaderboard and authenticated detailed debt views
 */

export interface PublicDebtSummary {
  user_id: string
  full_name: string
  net_balance: number
}

export interface DebtByPerson {
  counterparty_id: string
  counterparty_name: string
  remaining_amount: number
  currency: string
  i_owe_them: boolean  // false = they owe me, true = I owe them
}

export interface DebtByGroup {
  group_id: string
  group_name: string
}

export interface DetailedDebtData {
  user_id: string
  full_name: string
  email: string
  total_owed_to_me: number
  total_i_owe: number
  net_balance: number
  active_debt_relationships: number
  debts_by_person: DebtByPerson[]
  debts_by_group: DebtByGroup[]
}

export interface PaginationMetadata {
  limit: number
  offset: number
  total_count: number
}

export interface AllUsersDebtResponse<T> {
  success: boolean
  error?: string
  pagination?: PaginationMetadata
  data?: T[]
}

export type PublicDebtResponse = AllUsersDebtResponse<PublicDebtSummary>
export type DetailedDebtResponse = AllUsersDebtResponse<DetailedDebtData>
