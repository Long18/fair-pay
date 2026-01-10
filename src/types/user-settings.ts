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

  // Banking payment fields (NEW)
  bank_info: BankInfo | null;
  qr_code_image_url: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
}
