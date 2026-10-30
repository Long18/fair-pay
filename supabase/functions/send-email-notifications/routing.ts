// Pure helpers for the email worker: no Deno or network APIs so vitest can cover them.
import type {
  ReminderContextInput,
  ReminderDebtBreakdownItem,
  ReminderGroupBreakdownItem,
} from '../_shared/transactional-email.bundle.mjs'

export const SETTLEMENT_REMINDER = 'settlement_reminder'

export interface QueueRow {
  notification_id: string
  user_id: string
  user_email: string
  user_name: string
  has_auth_account: boolean
  notification_type: string
  title: string
  message: string
  link: string | null
  created_at: string
  email_context: unknown | null
}

export interface DebtTransaction {
  expense_id: string
  description: string
  amount: number
  currency: string
  expense_date: string | null
}

export interface DebtBreakdownItem {
  counterparty_key: string
  counterparty_name: string
  counterparty_email: string | null
  amount: number
  currency: string
  direction: 'user_owes_counterparty'
  transactions: DebtTransaction[]
}

export interface GroupBreakdownItem {
  group_id: string | null
  group_name: string
  group_avatar_url: string | null
  subtotal_amount: number
  currency: string
  counterparties: DebtBreakdownItem[]
}

export interface ReminderEmailContext {
  total_amount: number
  debt_breakdown: DebtBreakdownItem[]
  group_breakdown: GroupBreakdownItem[]
  primary_currency: string | null
  sender_display_name: string | null
  primary_group_name: string | null
  computed_at: string | null
}

function optionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function normalizeDebtTransactions(value: unknown, fallbackCurrency: string): DebtTransaction[] {
  if (!Array.isArray(value)) return []

  return value.reduce<DebtTransaction[]>((acc, transaction) => {
    const tx = transaction as Record<string, unknown>
    const expenseId = String(tx.expense_id || '')
    const amount = Number(tx.amount || 0)
    if (expenseId && amount > 0) {
      acc.push({
        expense_id: expenseId,
        description: String(tx.description || 'Chi phí'),
        amount,
        currency: String(tx.currency || fallbackCurrency),
        expense_date: tx.expense_date ? String(tx.expense_date) : null,
      })
    }
    return acc
  }, [])
}

function normalizeDebtBreakdownItems(value: unknown): DebtBreakdownItem[] {
  if (!Array.isArray(value)) return []

  return value.reduce<DebtBreakdownItem[]>((acc, item) => {
    const debt = item as Record<string, unknown>
    const currency = String(debt.currency || 'VND')
    const counterpartyKey = String(debt.counterparty_key || '')
    const amount = Number(debt.amount || 0)

    if (counterpartyKey && amount > 0) {
      acc.push({
        counterparty_key: counterpartyKey,
        counterparty_name: String(debt.counterparty_name || ''),
        counterparty_email: debt.counterparty_email ? String(debt.counterparty_email) : null,
        amount,
        currency,
        direction: 'user_owes_counterparty' as const,
        transactions: normalizeDebtTransactions(debt.transactions, currency),
      })
    }
    return acc
  }, [])
}

function normalizeGroupBreakdownItems(value: unknown): GroupBreakdownItem[] {
  if (!Array.isArray(value)) return []

  return value.reduce<GroupBreakdownItem[]>((acc, item) => {
    const group = item as Record<string, unknown>
    const currency = String(group.currency || 'VND')
    const subtotalAmount = Number(group.subtotal_amount || 0)
    const counterparties = normalizeDebtBreakdownItems(group.counterparties)

    if (subtotalAmount > 0 && counterparties.length > 0) {
      acc.push({
        group_id: group.group_id ? String(group.group_id) : null,
        group_name: String(group.group_name || ''),
        group_avatar_url: group.group_avatar_url ? String(group.group_avatar_url) : null,
        subtotal_amount: subtotalAmount,
        currency,
        counterparties,
      })
    }
    return acc
  }, [])
}

/** Returns null for rows without a usable snapshot; those reminders fall back to a digest row. */
export function normalizeReminderEmailContext(value: unknown): ReminderEmailContext | null {
  if (!value || typeof value !== 'object') return null

  const raw = value as Record<string, unknown>
  const debtBreakdown = normalizeDebtBreakdownItems(raw.debt_breakdown)
  const groupBreakdown = normalizeGroupBreakdownItems(raw.group_breakdown)

  if (!debtBreakdown.length && !groupBreakdown.length) return null

  const totalAmount = Number(raw.total_amount || 0)
  return {
    total_amount: totalAmount > 0 ? totalAmount : 0,
    debt_breakdown: debtBreakdown,
    group_breakdown: groupBreakdown,
    primary_currency: optionalString(raw.primary_currency),
    sender_display_name: optionalString(raw.sender_display_name),
    primary_group_name: optionalString(raw.primary_group_name),
    computed_at: optionalString(raw.computed_at),
  }
}

function toReminderDebtItem(debt: DebtBreakdownItem): ReminderDebtBreakdownItem {
  return {
    counterpartyKey: debt.counterparty_key,
    counterpartyName: debt.counterparty_name,
    counterpartyEmail: debt.counterparty_email,
    amount: debt.amount,
    currency: debt.currency,
  }
}

function toReminderGroupItem(group: GroupBreakdownItem): ReminderGroupBreakdownItem {
  return {
    groupId: group.group_id,
    groupName: group.group_name,
    subtotalAmount: group.subtotal_amount,
    currency: group.currency,
    counterparties: group.counterparties.map(toReminderDebtItem),
  }
}

export function toReminderContextInput(context: ReminderEmailContext): ReminderContextInput {
  return {
    totalAmount: context.total_amount || null,
    debtBreakdown: context.debt_breakdown.map(toReminderDebtItem),
    groupBreakdown: context.group_breakdown.map(toReminderGroupItem),
    primaryCurrency: context.primary_currency,
    senderDisplayName: context.sender_display_name,
    primaryGroupName: context.primary_group_name,
    computedAt: context.computed_at,
  }
}

export interface ReminderBatch {
  /** Every reminder for the recipient, marked together once the merged email is sent or skipped. */
  rows: QueueRow[]
  latest: QueueRow
  context: ReminderEmailContext
}

export interface RecipientBatches {
  reminder: ReminderBatch | null
  digestRows: QueueRow[]
}

/**
 * Reminders with a valid snapshot always get their own email (newest snapshot wins), so a new
 * expense landing in the same cron run can no longer push them into the digest layout.
 */
export function splitRecipientBatch(rows: QueueRow[]): RecipientBatches {
  const reminders = rows.filter((row) => row.notification_type === SETTLEMENT_REMINDER)
  const others = rows.filter((row) => row.notification_type !== SETTLEMENT_REMINDER)

  const valid = reminders
    .map((row) => ({ row, context: normalizeReminderEmailContext(row.email_context) }))
    .filter((entry): entry is { row: QueueRow; context: ReminderEmailContext } => entry.context !== null)
    .sort((a, b) => b.row.created_at.localeCompare(a.row.created_at))

  if (!valid.length) return { reminder: null, digestRows: [...others, ...reminders] }

  return {
    reminder: { rows: reminders, latest: valid[0].row, context: valid[0].context },
    digestRows: others,
  }
}

export type BatchOutcome = 'sent' | 'skipped' | 'failed'

/** Failed sends stay unmarked so the next cron run regroups and retries them. */
export function shouldMarkSent(outcome: BatchOutcome): boolean {
  return outcome !== 'failed'
}
