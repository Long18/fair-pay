import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * CSP violation report collector.
 * Receives violation reports from Content-Security-Policy-Report-Only header.
 * Logs to Vercel function logs for analysis during CSP migration.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const report = req.body

    // Log the violation for analysis (visible in Vercel function logs)
    console.log('[CSP-VIOLATION]', JSON.stringify({
      documentUri: report?.['csp-report']?.['document-uri'] || report?.documentURL,
      violatedDirective: report?.['csp-report']?.['violated-directive'] || report?.violatedDirective,
      blockedUri: report?.['csp-report']?.['blocked-uri'] || report?.blockedURL,
      sourceFile: report?.['csp-report']?.['source-file'] || report?.sourceFile,
      lineNumber: report?.['csp-report']?.['line-number'] || report?.lineNumber,
      timestamp: new Date().toISOString(),
    }))

    return res.status(204).end()
  } catch {
    return res.status(400).json({ error: 'Invalid report' })
  }
}
