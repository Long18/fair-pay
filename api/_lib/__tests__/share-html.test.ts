import { describe, expect, it } from 'vitest'

import { isBot } from '../bots'
import { ogPage, redirectPage, shareLandingPage } from '../share-html'

const baseOpts = {
  title: 'Lunch • 120,000 ₫',
  description: 'paid by Alex',
  shareUrl: 'https://long-pay.vercel.app/share/expenses/abc',
  redirectUrl: 'https://long-pay.vercel.app/expenses/show/abc',
  ogImageUrl: 'https://long-pay.vercel.app/api/og/expense?id=abc',
  bodyText: 'Redirecting…',
  linkText: 'Open expense',
}

describe('shareLandingPage', () => {
  it('omits meta-refresh and JS redirect for bots', async () => {
    const res = shareLandingPage(baseOpts, 'facebookexternalhit/1.1', isBot)
    const html = await res.text()
    expect(html).toContain('og:title')
    expect(html).toContain('Lunch')
    expect(html).not.toContain('http-equiv="refresh"')
    expect(html).not.toContain('window.location.replace')
  })

  it('includes meta-refresh and JS redirect for humans', async () => {
    const res = shareLandingPage(
      baseOpts,
      'Mozilla/5.0 (Macintosh) Chrome/120.0.0.0',
      isBot,
    )
    const html = await res.text()
    expect(html).toContain('http-equiv="refresh"')
    expect(html).toContain('window.location.replace')
  })
})

describe('ogPage / redirectPage', () => {
  it('ogPage never redirects', async () => {
    const html = await ogPage(baseOpts).text()
    expect(html).not.toContain('http-equiv="refresh"')
  })

  it('redirectPage always redirects', async () => {
    const html = await redirectPage(baseOpts).text()
    expect(html).toContain('http-equiv="refresh"')
  })
})
