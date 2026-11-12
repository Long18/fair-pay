/**
 * Pay2S OAuth integration types (client-visible subset).
 * Tokens and webhook secrets are never exposed to the client.
 */

export type Pay2SConnectionStatus = 'active' | 'expired' | 'revoked' | 'error';

export interface Pay2SConnection {
  id: string;
  status: Pay2SConnectionStatus;
  scope: string;
  bank_label: string | null;
  connected_at: string;
  connection_expires_at: string | null;
  last_event_at: string | null;
  last_error: string | null;
}

export type Pay2SMatchStatus = 'unmatched' | 'suggested' | 'dismissed';

export interface Pay2SBankTransaction {
  id: string;
  gateway: string | null;
  account_number: string | null;
  amount: number;
  content: string | null;
  direction: 'IN' | 'OUT';
  tx_time: string | null;
  payment_code: string | null;
  match_status: Pay2SMatchStatus;
  matched_source_type: string | null;
  matched_source_id: string | null;
}

/** `status` values the OAuth callback puts on /settings/pay2s?status=... */
export type Pay2SCallbackStatus =
  | 'connected'
  | 'denied'
  | 'invalid_request'
  | 'invalid_state'
  | 'invalid_issuer'
  | 'no_bank'
  | 'app_not_approved'
  | 'personal_app_owner_only'
  | 'active_plan_required'
  | 'invalid_grant'
  | 'webhook_secret_missing'
  | 'error';
