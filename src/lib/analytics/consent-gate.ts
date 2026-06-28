/**
 * Consent gate for analytics initialization.
 * Analytics should only fire after user has explicitly opted in.
 */

const CONSENT_STORAGE_KEY = 'fairpay-consent'

export function isAnalyticsConsentGiven(): boolean {
  try {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY)
    if (!stored) return false
    const parsed = JSON.parse(stored)
    return parsed.analytics === 'accepted'
  } catch {
    return false
  }
}
