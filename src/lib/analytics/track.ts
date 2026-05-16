// src/lib/analytics/track.ts
// Centralized event tracking helper with auto-enrichment and validation

import { analyticsManager } from './instance';
import { journeyTracking } from '@/lib/journey-tracking';
import { getUserDisplay } from './user-display';

const SENSITIVE_FIELDS = new Set([
  'password', 'token', 'secret', 'key', 'auth', 'session',
  'bank_account', 'phone_number', 'card_number', 'cvv', 'pin',
  'private_note', 'raw_amount', 'payment_content', 'transaction_payload',
  'supabase_token', 'access_token', 'refresh_token',
]);

const EVENT_NAME_PATTERN = /^[a-z][a-z0-9]*(?:_[a-z][a-z0-9]*){1,}$/;

function validateEventName(eventName: string): boolean {
  return EVENT_NAME_PATTERN.test(eventName);
}

function sanitizeProperties(props: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (SENSITIVE_FIELDS.has(key.toLowerCase())) {
      if (import.meta.env.DEV) {
        console.warn(`[Analytics] Blocked sensitive field: "${key}"`);
      }
      continue;
    }
    sanitized[key] = value;
  }
  return sanitized;
}

export interface TrackEventOptions {
  eventName: string;
  properties?: Record<string, unknown>;
  // Contextual IDs
  groupId?: string;
  expenseId?: string;
  debtId?: string;
  paymentId?: string;
  counterpartyUserId?: string;
  // Flow tracking
  flowName?: string;
  stepName?: string;
  // Result
  resultStatus?: 'success' | 'failed' | 'pending';
  errorCode?: string;
  errorMessageKey?: string;
}

export function trackEvent(options: TrackEventOptions | string, extraProps?: Record<string, unknown>): void {
  // Support both object and shorthand string form
  const opts: TrackEventOptions = typeof options === 'string'
    ? { eventName: options, properties: extraProps }
    : options;

  const {
    eventName,
    properties = {},
    groupId,
    expenseId,
    debtId,
    paymentId,
    counterpartyUserId,
    flowName,
    stepName,
    resultStatus,
    errorCode,
    errorMessageKey,
  } = opts;

  // Validate naming convention
  if (!validateEventName(eventName)) {
    if (import.meta.env.DEV) {
      console.warn(`[Analytics] Invalid event name format: "${eventName}". Expected: <area>_<object>_<action>`);
    }
  }

  const userDisplay = getUserDisplay();
  const pagePath = typeof window !== 'undefined' ? window.location.pathname : undefined;
  const language = typeof navigator !== 'undefined' ? navigator.language : undefined;

  // Build contextual properties
  const contextual: Record<string, unknown> = {};
  if (groupId) contextual.group_id = groupId;
  if (expenseId) contextual.expense_id = expenseId;
  if (debtId) contextual.debt_id = debtId;
  if (paymentId) contextual.payment_id = paymentId;
  if (counterpartyUserId) contextual.counterparty_user_id = counterpartyUserId;
  if (resultStatus) contextual.result_status = resultStatus;
  if (errorCode) contextual.error_code = errorCode;
  if (errorMessageKey) contextual.error_message_key = errorMessageKey;

  const enrichedProperties = sanitizeProperties({
    ...properties,
    ...contextual,
    page_path: pagePath,
    language,
    platform: typeof navigator !== 'undefined' ? navigator.platform : undefined,
    ...(userDisplay ? {
      user_id: userDisplay.user_id,
      user_display_name: userDisplay.user_display_name,
      user_avatar_url: userDisplay.user_avatar_url,
      user_role: userDisplay.user_role,
      user_role_badge: userDisplay.user_role_badge,
      user_role_label: userDisplay.user_role_label,
    } : {}),
  });

  // Dev logging
  if (import.meta.env.DEV) {
    console.log(
      `%c[Analytics] ${eventName}`,
      'color: #22c55e; font-weight: bold;',
      {
        user: userDisplay ? `${userDisplay.user_display_name} (${userDisplay.user_role_badge})` : 'anonymous',
        page: pagePath,
        properties: enrichedProperties,
        timestamp: new Date().toISOString(),
      }
    );
  }

  // Send to journey tracking (primary)
  journeyTracking.trackEvent({
    event_name: eventName as any,
    event_category: eventName.split('_')[0],
    page_path: pagePath || '/',
    flow_name: flowName,
    step_name: stepName,
    properties: enrichedProperties as Record<string, unknown>,
  });
}
