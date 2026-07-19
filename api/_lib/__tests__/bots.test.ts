import { describe, expect, it } from 'vitest'

import { BOT_PATTERNS, isBot, OG_CHECKER_USER_AGENT } from '../bots'

describe('isBot', () => {
  it('detects common messenger crawlers', () => {
    expect(isBot('facebookexternalhit/1.1')).toBe(true)
    expect(isBot('WhatsApp/2.23')).toBe(true)
    expect(isBot('Slackbot-LinkExpanding 1.0')).toBe(true)
    expect(isBot('Discordbot/2.0')).toBe(true)
    expect(isBot('Twitterbot/1.0')).toBe(true)
  })

  it('rejects normal browsers', () => {
    expect(isBot('Mozilla/5.0 (Macintosh; Intel Mac OS X) Chrome/120.0.0.0')).toBe(false)
    expect(isBot('FairPay-OG-Checker/1.0')).toBe(false)
  })

  it('keeps admin checker UA in the bot list', () => {
    expect(OG_CHECKER_USER_AGENT.toLowerCase()).toContain('facebookexternalhit')
    expect(isBot(OG_CHECKER_USER_AGENT)).toBe(true)
    expect(BOT_PATTERNS.some((p) => p.toLowerCase() === 'facebookexternalhit')).toBe(true)
  })
})
