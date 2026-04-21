import { createClient } from '@supabase/supabase-js'

import { formatOgAmount } from './og-format'

type DebtDetailRow = {
  expense_id: string
  description: string
  expense_date: string
  currency: string
  settled_amount: number | string | null
  remaining_amount: number | string | null
  split_amount: number | string | null
  is_settled: boolean | null
  i_owe_them: boolean | null
  group_name: string | null
  created_at: string | null
}

type ProfileRow = {
  id: string
  full_name: string | null
  avatar_url: string | null
}

export interface DebtOgCounterparty {
  counterparty_id: string
  counterparty_name: string
  counterparty_avatar_url: string | null
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
  recent_transactions: DebtOgRecentTransaction[]
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

async function fetchProfilesByIds(profileIds: string[]): Promise<Map<string, ProfileRow> | null> {
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return null
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', profileIds)

    if (error) {
      return null
    }

    return new Map(((data ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]))
  } catch {
    return null
  }
}

export async function fetchDebtOgData(
  viewerId: string,
  counterpartyId: string,
): Promise<DebtOgData | null> {
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return null
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const [{ data: rawRows, error: debtError }, profiles] = await Promise.all([
      supabase.rpc('get_user_debt_details', {
        p_user_id: viewerId,
        p_counterparty_id: counterpartyId,
      }),
      fetchProfilesByIds([viewerId, counterpartyId]),
    ])

    if (debtError || !profiles) {
      return null
    }

    const rows = (rawRows ?? []) as DebtDetailRow[]
    const profileMap = profiles

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

    const recentCandidates: DebtOgRecentTransaction[] = rows.slice(0, 10).map((row) => {
      const remainingAmount = toNumber(row.remaining_amount)
      const splitAmount = toNumber(row.split_amount)
      const isSettled = Boolean(row.is_settled) || remainingAmount <= 0

      return {
        expense_id: row.expense_id,
        description: row.description,
        expense_date: row.expense_date,
        group_name: row.group_name,
        remaining_amount: remainingAmount,
        split_amount: splitAmount || remainingAmount,
        is_settled: isSettled,
        i_owe_them: Boolean(row.i_owe_them),
      }
    })

    const recentTransactions = selectRecentTransactions(recentCandidates)

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
      recent_transactions: recentTransactions,
    }
  } catch {
    return null
  }
}

export async function fetchDebtOgCounterparty(
  counterpartyId: string,
): Promise<DebtOgCounterparty | null> {
  const profileMap = await fetchProfilesByIds([counterpartyId])
  const counterparty = profileMap?.get(counterpartyId)

  if (!counterparty) {
    return null
  }

  return {
    counterparty_id: counterpartyId,
    counterparty_name: counterparty.full_name || 'Unknown user',
    counterparty_avatar_url: counterparty.avatar_url || null,
  }
}

export interface DebtOgRecentTransaction {
  expense_id: string
  description: string
  expense_date: string
  group_name: string | null
  remaining_amount: number
  split_amount: number
  is_settled: boolean
  i_owe_them: boolean
}

export function selectRecentTransactions(
  candidates: DebtOgRecentTransaction[],
  limit = 3,
): DebtOgRecentTransaction[] {
  const open = candidates.filter((tx) => !tx.is_settled)
  const settled = candidates.filter((tx) => tx.is_settled)
  const selected = open.slice(0, limit)

  if (selected.length < limit) {
    selected.push(...settled.slice(0, limit - selected.length))
  }

  return selected
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

export function buildDebtDirectOgTitle(counterparty: DebtOgCounterparty | null): string {
  if (!counterparty) {
    return 'FairPay Debt Detail'
  }

  return `Debt details with ${counterparty.counterparty_name}`
}

export function buildDebtOgDescription(debt: DebtOgData | null): string {
  if (!debt) {
    return 'Open debt details in FairPay.'
  }

  if (debt.all_settled) {
    return `No outstanding balance with ${debt.counterparty_name}.`
  }

  const parts: string[] = []

  if (debt.total_i_owe > 0) {
    parts.push(`Open: you owe ${formatOgAmount(debt.total_i_owe, debt.currency)}.`)
  }

  if (debt.total_they_owe > 0) {
    parts.push(`Open: ${debt.counterparty_name} owes you ${formatOgAmount(debt.total_they_owe, debt.currency)}.`)
  }

  if (debt.net_amount > 0) {
    parts.push(`Net balance: ${formatOgAmount(debt.net_amount, debt.currency)}.`)
  }

  return parts.join(' ')
}

export function buildDebtDirectOgDescription(counterparty: DebtOgCounterparty | null): string {
  if (!counterparty) {
    return 'Open debt details in FairPay.'
  }

  return `Open balances between you and ${counterparty.counterparty_name} on FairPay.`
}
