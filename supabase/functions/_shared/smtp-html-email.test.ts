import { describe, expect, it } from 'vitest'
import { smtpSafeSubject } from './smtp-html-email.ts'

describe('smtpSafeSubject', () => {
  it('keeps ASCII-only subjects unchanged', () => {
    expect(smtpSafeSubject('FairPay: 3 new notifications')).toBe(
      'FairPay: 3 new notifications',
    )
  })

  it('transliterates Vietnamese for SMTP Subject (no UTF-8 encoded-word line breaks)', () => {
    const raw = 'FairPay: Còn 844.344₫ chưa settle với 1 người'
    const smtp = smtpSafeSubject(raw)
    expect(smtp).toMatch(/^[\x20-\x7E]+$/)
    expect(smtp).toContain('844.344')
    expect(smtp).toContain('VND')
    expect(smtp).not.toContain('\r')
    expect(smtp).not.toContain('\n')
  })

  it('falls back when nothing ASCII remains', () => {
    expect(smtpSafeSubject('\u{1F600}\u{1F600}', 'FairPay')).toBe('FairPay')
  })
})
