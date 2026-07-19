/**
 * Pure, side-effect-free helpers for the AdminAgentOperations page.
 * Kept in a separate file so they can be imported by tests without
 * triggering the react-refresh/only-export-components warning.
 */

import type {
  AgentOperationRow,
  AgentOperationStatus,
  ExternalAgentSubmissionStatus,
} from "../types";

// ─── Badge variant mapping ───────────────────────────────────────────────────

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

export const STATUS_VARIANT: Record<AgentOperationStatus, BadgeVariant> = {
  pending: "secondary",
  previewed: "outline",
  confirmed: "outline",
  committed: "default",
  failed: "destructive",
  expired: "secondary",
};

export const EXTERNAL_STATUS_VARIANT: Record<
  ExternalAgentSubmissionStatus,
  BadgeVariant
> = {
  pending: "outline",
  approved: "default",
  rejected: "destructive",
  expired: "secondary",
  failed: "destructive",
};

export function statusBadgeVariant(status: AgentOperationStatus): BadgeVariant {
  return STATUS_VARIANT[status];
}

export function externalStatusBadgeVariant(
  status: ExternalAgentSubmissionStatus
): BadgeVariant {
  return EXTERNAL_STATUS_VARIANT[status];
}

/** Known agent source keys → stable i18n lookup keys. */
export const KNOWN_AGENT_SOURCES = [
  "chatgpt",
  "external_agent",
  "internal_mcp",
  "internal_fairpay_agent",
  "in_app_ai_chat",
] as const;

export type KnownAgentSource = (typeof KNOWN_AGENT_SOURCES)[number];

export function normalizeAgentSource(
  source: string | null | undefined
): string | null {
  const trimmed = source?.trim();
  return trimmed ? trimmed.slice(0, 100) : null;
}

export function isKnownAgentSource(source: string): source is KnownAgentSource {
  return (KNOWN_AGENT_SOURCES as readonly string[]).includes(source);
}

// ─── VND formatting ──────────────────────────────────────────────────────────

/**
 * Format an integer VND amount with thousand separators plus ₫ symbol.
 * Returns null when the amount is unavailable (non-committed operations).
 */
const vndNumberFormatter = new Intl.NumberFormat("vi-VN");

export function formatVndAmount(amount: number | null | undefined): string | null {
  if (amount == null) return null;
  return vndNumberFormatter.format(amount) + " ₫";
}

// ─── Security field allowlist ─────────────────────────────────────────────────

/**
 * Fields that MUST NEVER appear in any UI mapping. The server-side RPC strips
 * them, but we double-check on the client to make accidental regressions
 * loud and obvious.
 */
export const FORBIDDEN_AGENT_OPERATION_FIELDS = [
  "preview_hash",
  "confirmation_id",
  "idempotency_key",
  "response_body",
  "preview_data",
  "jwt",
  "access_token",
  "submitted_ip_hash",
  "user_agent",
] as const;

// ─── Detail view model ────────────────────────────────────────────────────────

/**
 * Build the display payload for the detail dialog. By construction the
 * resulting object contains only whitelisted display fields — the test suite
 * asserts the absence of {@link FORBIDDEN_AGENT_OPERATION_FIELDS}.
 */
export function buildDetailViewModel(row: AgentOperationRow) {
  return {
    operation_id: row.operation_id,
    preview_id: row.preview_id,
    user_id: row.user_id,
    user_full_name: row.user_full_name,
    user_email: row.user_email,
    status: row.status,
    source: normalizeAgentSource(row.source),
    group_id: row.group_id,
    group_name: row.group_name,
    description: row.description,
    category: row.category,
    expense_date: row.expense_date,
    split_method: row.split_method,
    payer_user_id: row.payer_user_id,
    payer_full_name: row.payer_full_name,
    expense_id: row.expense_id,
    total_amount: row.total_amount,
    currency: row.currency,
    splits_count: row.splits_count,
    error_code: row.error_code,
    error_message: row.error_message,
    created_at: row.created_at,
    updated_at: row.updated_at,
    preview_expires_at: row.preview_expires_at,
    preview_is_consumed: row.preview_is_consumed,
    has_confirmation: row.has_confirmation,
    confirmation_used: row.confirmation_used,
  } as const;
}

// ─── Threshold alerts ─────────────────────────────────────────────────────────

export const AGENT_ALERT_FAILURE_RATE_PCT = 15;
export const AGENT_ALERT_MIN_OPS = 5;
export const AGENT_ALERT_SPIKE_MULTIPLIER = 3;
export const AGENT_ALERT_SPIKE_FLOOR = 10;

export interface AgentOpsAlertFlags {
  highErrorRate: boolean;
  opsSpike: boolean;
  failureRate: number;
  opsToday: number;
  dailyAvg7d: number;
}

export function evaluateAgentOpsAlerts(metrics: {
  failure_rate: number;
  total: number;
  ops_today: number;
  ops_last_7d: number;
} | null | undefined): AgentOpsAlertFlags | null {
  if (!metrics) return null;

  const dailyAvg7d = metrics.ops_last_7d / 7;
  const highErrorRate =
    metrics.total >= AGENT_ALERT_MIN_OPS &&
    metrics.failure_rate >= AGENT_ALERT_FAILURE_RATE_PCT;
  const opsSpike =
    metrics.ops_today >=
    Math.max(AGENT_ALERT_SPIKE_FLOOR, dailyAvg7d * AGENT_ALERT_SPIKE_MULTIPLIER);

  if (!highErrorRate && !opsSpike) return null;

  return {
    highErrorRate,
    opsSpike,
    failureRate: metrics.failure_rate,
    opsToday: metrics.ops_today,
    dailyAvg7d: Math.round(dailyAvg7d * 10) / 10,
  };
}
