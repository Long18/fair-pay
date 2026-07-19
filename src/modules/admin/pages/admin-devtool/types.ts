import type { useAdminTranslation } from "../../i18n";

export interface DebtTransactionRow {
  expense_id: string;
  description: string;
  amount: number;
  currency: string;
  expense_date: string | null;
}

export interface DebtBreakdownRow {
  counterparty_key: string;
  counterparty_name: string;
  counterparty_email: string | null;
  amount: number;
  currency: string;
  direction: "user_owes_counterparty";
  transactions: DebtTransactionRow[];
}

export interface GroupBreakdownRow {
  group_id: string | null;
  group_name: string;
  group_avatar_url: string | null;
  subtotal_amount: number;
  currency: string;
  counterparties: DebtBreakdownRow[];
}

export interface UserEmailOption {
  id: string;
  user_id: string;
  email: string;
  is_primary: boolean;
  receives_notifications: boolean;
  is_verified: boolean;
}

export interface DebtReminderRow {
  user_id: string;
  full_name: string;
  email: string | null;
  emails: UserEmailOption[];
  avatar_url: string | null;
  has_auth_account: boolean;
  total_i_owe: number;
  net_balance: number;
  active_debt_relationships: number;
  debt_breakdown: DebtBreakdownRow[];
  group_breakdown: GroupBreakdownRow[];
}

export interface EmailSendResult {
  success: boolean;
  sent?: number;
  failed?: number;
  skipped?: number;
  errors?: string[];
  message?: string;
  error?: string;
}

/** Gmail-style undo window before the first email leaves the outbox. */
export const UNDO_DELAY_MIN_MS = 10_000;
export const UNDO_DELAY_MAX_MS = 30_000;
/** Stagger between cold-outreach sends to reduce instant-spam signals. */
export const STAGGER_DELAY_MIN_MS = 60_000;
export const STAGGER_DELAY_MAX_MS = 90_000;

export type ScheduledSendPhase = "undo" | "sending" | "waiting" | "done" | "cancelled";

export interface ScheduledSendState {
  phase: ScheduledSendPhase;
  total: number;
  currentIndex: number;
  sent: number;
  failed: number;
  skipped: number;
  deadlineMs: number | null;
  currentName: string | null;
  errors: string[];
}

export interface EmailOverviewResponse {
  success: boolean;
  pending_queue_count?: number;
  debtors?: unknown[];
  error?: string;
}

export interface AttachUserEmailsResult {
  rows: DebtReminderRow[];
  warning?: string;
}

export interface SendReminderResponse {
  success: boolean;
  notification_ids?: string[];
  error?: string;
}

export type PreviewViewport = "desktop" | "mobile";

export type AdminT = ReturnType<typeof useAdminTranslation>["tAdmin"];
