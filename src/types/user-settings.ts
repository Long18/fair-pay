/**
 * User Settings Types
 * 
 * Types for user settings including banking payment configuration.
 * Used by banking payment components to fetch and display payee information.
 */

export interface BankInfo {
  app?: string;          // Default bank app ID (e.g., 'vcb', 'techcombank')
  account?: string;      // Bank account number
  bank?: string;         // Bank code (e.g., 'VCB', 'TCB')
  accountName?: string;  // Account holder name
}

export interface SepayConfig {
  /** SePay API token (from my.sepay.vn → API Token) for webhook auth */
  api_token: string;
  /** Bank account number linked to SePay */
  bank_account_number: string;
  /** Bank short name (e.g., 'Vietcombank', 'MBBank') — must match SePay's bank list */
  bank_name: string;
  /** Account holder name for display */
  account_holder_name?: string;
}

export type SepayOrderStatus = 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'EXPIRED';

export interface SepayPaymentOrder {
  id: string;
  order_invoice_number: string;
  source_type: 'DEBT' | 'EXPENSE';
  source_id: string;
  payer_user_id: string;
  payee_user_id: string;
  amount: number;
  currency: string;
  status: SepayOrderStatus;
  sepay_checkout_url?: string;
  custom_data?: string;
  webhook_payload?: Record<string, unknown>;
  webhook_processed_at?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  user_id: string;

  // Display preferences
  default_currency: string;
  number_format: string;

  // Notification preferences
  email_notifications: boolean;
  notify_on_expense_added: boolean;
  notify_on_payment_received: boolean;
  notify_on_friend_request: boolean;
  notify_on_group_invite: boolean;

  // Privacy settings
  allow_friend_requests: boolean;
  allow_group_invites: boolean;
  profile_visibility: 'public' | 'friends' | 'private';

  // Banking payment fields
  bank_info: BankInfo | null;
  qr_code_image_url: string | null;

  // SePay Payment Gateway config
  sepay_config: SepayConfig | null;

  // Timestamps
  created_at: string;
  updated_at: string;
}
