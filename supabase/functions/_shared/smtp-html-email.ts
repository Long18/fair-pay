import type { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'

/**
 * denomailer applies quotedPrintableEncodeInline() to Subject. Long UTF-8 subjects
 * get soft line breaks (=\r\n) inside the encoded word, which splits the Subject
 * header and can make clients show raw MIME / garbled subjects (=c6=b0...).
 * Use an ASCII-only SMTP subject; keep full Vietnamese in HTML/text parts.
 */
export function smtpSafeSubject(subject: string, fallback = 'FairPay'): string {
  const ascii = subject
    .replace(/₫/g, ' VND')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return ascii.length > 0 ? ascii.slice(0, 200) : fallback
}

export async function sendHtmlEmail(
  smtp: SMTPClient,
  options: {
    fromName: string
    fromEmail: string
    to: string
    subject: string
    text: string
    html: string
    tag: string
  },
): Promise<void> {
  await smtp.send({
    from: `${options.fromName} <${options.fromEmail}>`,
    to: options.to,
    subject: smtpSafeSubject(options.subject),
    content: options.text,
    html: options.html,
    headers: {
      'X-FairPay-Email-Type': options.tag,
    },
  })
}
