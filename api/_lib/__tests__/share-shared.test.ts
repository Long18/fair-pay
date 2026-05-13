import { describe, expect, it } from 'vitest'

import { appendTrackingParams } from '../share-shared'

describe('appendTrackingParams', () => {
  it('preserves compact ref and legacy UTM params across share redirects', () => {
    const sourceUrl = new URL(
      'https://long-pay.vercel.app/share/expenses/expense-123?ref=fp1_facebook~social_share~expense_share~expense_detail_share_button&utm_source=legacy&utm_campaign=legacy_campaign',
    )
    const result = appendTrackingParams(
      'https://long-pay.vercel.app/expenses/show/expense-123?v=100',
      sourceUrl,
    )
    const url = new URL(result)

    expect(url.pathname).toBe('/expenses/show/expense-123')
    expect(url.searchParams.get('v')).toBe('100')
    expect(url.searchParams.get('ref')).toBe('fp1_facebook~social_share~expense_share~expense_detail_share_button')
    expect(url.searchParams.get('utm_source')).toBe('legacy')
    expect(url.searchParams.get('utm_campaign')).toBe('legacy_campaign')
  })

  it('does not overwrite existing destination tracking values', () => {
    const sourceUrl = new URL('https://long-pay.vercel.app/share/debts/token?ref=fp1_facebook~social_share~debt_share~debt_detail_share_button')
    const result = appendTrackingParams(
      'https://long-pay.vercel.app/debts/counterparty?ref=existing',
      sourceUrl,
    )

    expect(new URL(result).searchParams.get('ref')).toBe('existing')
  })
})
