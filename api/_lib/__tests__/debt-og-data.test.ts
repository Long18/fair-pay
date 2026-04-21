import { describe, expect, it } from 'vitest'

import {
  selectRecentTransactions,
  type DebtOgRecentTransaction,
} from '../debt-og-data'

function tx(overrides: Partial<DebtOgRecentTransaction>): DebtOgRecentTransaction {
  return {
    expense_id: overrides.expense_id ?? 'exp',
    description: overrides.description ?? 'Lunch',
    expense_date: overrides.expense_date ?? '2026-04-20',
    group_name: overrides.group_name ?? null,
    remaining_amount: overrides.remaining_amount ?? 0,
    split_amount: overrides.split_amount ?? 0,
    is_settled: overrides.is_settled ?? false,
    i_owe_them: overrides.i_owe_them ?? false,
  }
}

describe('selectRecentTransactions', () => {
  it('returns up to 3 open transactions, preserving order', () => {
    const result = selectRecentTransactions([
      tx({ expense_id: 'a', is_settled: false }),
      tx({ expense_id: 'b', is_settled: false }),
      tx({ expense_id: 'c', is_settled: false }),
      tx({ expense_id: 'd', is_settled: false }),
    ])

    expect(result.map((t) => t.expense_id)).toEqual(['a', 'b', 'c'])
  })

  it('fills remaining slots with settled transactions when open count is low', () => {
    const result = selectRecentTransactions([
      tx({ expense_id: 'open-1', is_settled: false }),
      tx({ expense_id: 'settled-1', is_settled: true }),
      tx({ expense_id: 'settled-2', is_settled: true }),
      tx({ expense_id: 'settled-3', is_settled: true }),
    ])

    expect(result.map((t) => t.expense_id)).toEqual([
      'open-1',
      'settled-1',
      'settled-2',
    ])
  })

  it('returns only settled transactions when no open items exist', () => {
    const result = selectRecentTransactions([
      tx({ expense_id: 's1', is_settled: true }),
      tx({ expense_id: 's2', is_settled: true }),
    ])

    expect(result.map((t) => t.expense_id)).toEqual(['s1', 's2'])
  })

  it('returns empty array when no candidates', () => {
    expect(selectRecentTransactions([])).toEqual([])
  })

  it('honors custom limit', () => {
    const result = selectRecentTransactions(
      [
        tx({ expense_id: 'a', is_settled: false }),
        tx({ expense_id: 'b', is_settled: false }),
      ],
      1,
    )

    expect(result.map((t) => t.expense_id)).toEqual(['a'])
  })
})
