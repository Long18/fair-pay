// Pure duplicate-detection logic.
//
// "Duplicate" here means: same group_id, same payer, same total amount,
// same case-folded description, within a recent window (default 24h).
// Strong duplicates: also same expense_date.

export interface DuplicateCandidate {
  id: string
  description: string
  amount: number
  paid_by_user_id: string
  expense_date: string
  created_at: string
}

export interface DuplicateMatch {
  expense_id: string
  match_type: 'strong' | 'likely'
  reason: string
}

const DEFAULT_WINDOW_HOURS = 24

export function findDuplicates(
  candidates: readonly DuplicateCandidate[],
  query: {
    description: string
    amount: number
    payer_user_id: string
    expense_date?: string
    now?: Date
    window_hours?: number
  }
): DuplicateMatch[] {
  const wnd = query.window_hours ?? DEFAULT_WINDOW_HOURS
  const now = query.now ?? new Date()
  const minTs = now.getTime() - wnd * 60 * 60 * 1000
  const normalizedQueryDesc = normalizeDesc(query.description)

  const matches: DuplicateMatch[] = []
  for (const c of candidates) {
    if (c.amount !== query.amount) continue
    if (c.paid_by_user_id !== query.payer_user_id) continue
    if (normalizeDesc(c.description) !== normalizedQueryDesc) continue
    const ts = new Date(c.created_at).getTime()
    if (ts < minTs) continue

    if (query.expense_date && c.expense_date === query.expense_date) {
      matches.push({
        expense_id: c.id,
        match_type: 'strong',
        reason: 'same group, payer, description, amount, and expense_date',
      })
    } else {
      matches.push({
        expense_id: c.id,
        match_type: 'likely',
        reason: `same group, payer, description, amount within ${wnd}h`,
      })
    }
  }
  return matches
}

function normalizeDesc(d: string): string {
  return d.trim().toLowerCase().replace(/\s+/g, ' ')
}
