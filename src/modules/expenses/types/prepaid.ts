/**
 * Per-Member Prepaid Types
 * Types for the per-member prepaid system
 */

/**
 * Member prepaid balance record
 * Tracks prepaid balance for each member of a recurring expense
 */
export interface MemberPrepaidBalance {
  id: string;
  recurring_expense_id: string;
  user_id: string;
  balance_amount: number;
  monthly_share_amount: number;
  months_remaining: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

/**
 * Prepaid consumption log entry
 * Audit trail of prepaid consumption when instances generated
 */
export interface PrepaidConsumptionLog {
  id: string;
  recurring_expense_id: string;
  expense_instance_id: string;
  user_id: string;
  amount_consumed: number;
  balance_before: number;
  balance_after: number;
  consumed_at: string;
}

/**
 * Comprehensive member prepaid info
 * Includes balance, share, and payment history
 */
export interface MemberPrepaidInfo {
  user_id: string;
  user_name: string;
  balance_amount: number;
  monthly_share: number;
  months_remaining: number;
  currency: string;
  total_prepaid: number;
  payment_count: number;
}

/**
 * Input for recording prepaid for a single member
 */
export interface MemberPrepaidInput {
  user_id: string;
  months: number;
}

/**
 * Result from recording prepaid for a single member
 */
export interface RecordMemberPrepaidResult {
  success: boolean;
  payment_id: string;
  expense_id: string;
  user_id: string;
  months: number;
  amount: number;
  monthly_share: number;
  new_balance: number;
  currency: string;
}

/**
 * Result from recording prepaid for multiple members
 */
export interface RecordMultiMemberPrepaidResult {
  success: boolean;
  payments: Array<{
    user_id: string;
    months: number;
    amount?: number;
    new_balance?: number;
    success: boolean;
    error?: string;
  }>;
  total_amount: number;
  success_count: number;
  error_count?: number;
  errors?: string[];
}

/**
 * Result from consuming prepaid for an instance
 */
export interface ConsumePrepaidResult {
  success: boolean;
  instance_id: string;
  recurring_id?: string;
  consumptions: Array<{
    user_id: string;
    amount: number;
    fully_covered: boolean;
    balance_before: number;
    balance_after: number;
  }>;
  total_consumed: number;
  member_count: number;
  message?: string;
}
