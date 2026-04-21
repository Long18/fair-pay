import { createClient } from '@supabase/supabase-js'

import { formatOgAmount } from './og-format'

type DebtDetailRow = {
  expense_id: string
  description: string
  expense_date: string
  currency: string
  settled_amount: number | string | null
  remaining_amount: number | string | null
  is_settled: boolean | null
  i_owe_them: boolean | null
  created_at: string | null
}

type ProfileRow = {
  id: string
  full_name: string | null
  avatar_url: string | null
}

export interface DebtOgData {
  viewer_id: string
  viewer_name: string
  viewer_avatar_url: string | null
  counterparty_id: string
  counterparty_name: string
  counterparty_avatar_url: string | null
  total_i_owe: number
  total_they_owe: number
  net_amount: number
  i_owe_them: boolean
  currency: string
  transaction_count: number
  unpaid_count: number
  partial_count: number
  paid_count: number
  latest_activity_at: string | null
  all_settled: boolean
}

function toNumber(value: unknown): number {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function pickLatestActivity(rows: DebtDetailRow[]): string | null {
  const candidates = rows
    .flatMap((row) => [row.created_at, row.expense_date])
    .filter((value): value is string => Boolean(value))

  return candidates.sort().pop() ?? null
}

export async function fetchDebtOgData(
  viewerId: string,
  counterpartyId: string,
): Promise<DebtOgData | null> {
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return null
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const [{ data: rawRows, error: debtError }, { data: profiles, error: profileError }] = await Promise.all([
      supabase.rpc('get_user_debt_details', {
        p_user_id: viewerId,
        p_counterparty_id: counterpartyId,
      }),
      supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', [viewerId, counterpartyId]),
    ])

    if (debtError || profileError) {
      return null
    }

    const rows = (rawRows ?? []) as DebtDetailRow[]
    const profileMap = new Map(
      ((profiles ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]),
    )

    const viewerProfile = profileMap.get(viewerId)
    const counterpartyProfile = profileMap.get(counterpartyId)

    if (!counterpartyProfile && rows.length === 0) {
      return null
    }

    let totalIOwe = 0
    let totalTheyOwe = 0
    let unpaidCount = 0
    let partialCount = 0
    let paidCount = 0

    for (const row of rows) {
      const remainingAmount = toNumber(row.remaining_amount)
      const settledAmount = toNumber(row.settled_amount)
      const isSettled = Boolean(row.is_settled) || remainingAmount <= 0

      if (isSettled) {
        paidCount += 1
      } else if (settledAmount > 0) {
        partialCount += 1
      } else {
        unpaidCount += 1
      }

      if (!isSettled) {
        if (row.i_owe_them) {
          totalIOwe += remainingAmount
        } else {
          totalTheyOwe += remainingAmount
        }
      }
    }

    const netAmount = Math.abs(totalTheyOwe - totalIOwe)
    const allSettled = totalIOwe <= 0 && totalTheyOwe <= 0

    return {
      viewer_id: viewerId,
      viewer_name: viewerProfile?.full_name || 'You',
      viewer_avatar_url: viewerProfile?.avatar_url || null,
      counterparty_id: counterpartyId,
      counterparty_name: counterpartyProfile?.full_name || 'Unknown user',
      counterparty_avatar_url: counterpartyProfile?.avatar_url || null,
      total_i_owe: totalIOwe,
      total_they_owe: totalTheyOwe,
      net_amount: netAmount,
      i_owe_them: totalIOwe > totalTheyOwe,
      currency: rows[0]?.currency || 'VND',
      transaction_count: rows.length,
      unpaid_count: unpaidCount,
      partial_count: partialCount,
      paid_count: paidCount,
      latest_activity_at: pickLatestActivity(rows),
      all_settled: allSettled,
    }
  } catch {
    return null
  }
}

export function buildDebtRelationshipLabel(debt: DebtOgData): string {
  if (debt.all_settled) {
    return `All settled with ${debt.counterparty_name}`
  }

  return debt.i_owe_them
    ? `You owe ${debt.counterparty_name}`
    : `${debt.counterparty_name} owes you`
}

export function buildDebtOgTitle(debt: DebtOgData | null): string {
  if (!debt) {
    return 'FairPay Balance Summary'
  }

  return debt.all_settled
    ? `${debt.counterparty_name} Balance Summary`
    : `Debt Summary with ${debt.counterparty_name}`
}

export function buildDebtOgDescription(debt: DebtOgData | null): string {
  if (!debt) {
    return 'Open debt details in FairPay.'
  }

  if (debt.all_settled) {
    return `No outstanding balance with ${debt.counterparty_name}.`
  }

  return [
    `You owe ${formatOgAmount(debt.total_i_owe, debt.currency)}.`,
    `You are owed ${formatOgAmount(debt.total_they_owe, debt.currency)}.`,
    `Net balance: ${formatOgAmount(debt.net_amount, debt.currency)}.`,
  ].join(' ')
}
