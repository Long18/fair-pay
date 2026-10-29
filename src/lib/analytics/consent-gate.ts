/**
 * Consent gate for analytics, journey tracking and marketing attribution.
 * Non-essential tracking only fires after the user has explicitly opted in.
 * Auth/session storage is strictly necessary and never gated here.
 */

export type ConsentCategory = 'preferences' | 'experience' | 'marketing'
export type ConsentDecision = 'accepted' | 'rejected'

export interface ConsentState {
  schema: 2
  preferences: ConsentDecision
  experience: ConsentDecision
  marketing: ConsentDecision
  timestamp: string | null
}

export type ConsentChoices = Record<ConsentCategory, boolean>

export const CONSENT_CATEGORIES: readonly ConsentCategory[] = ['preferences', 'experience', 'marketing']

export const CONSENT_STORAGE_KEY = 'fairpay-consent:v2'
const V1_CONSENT_STORAGE_KEY = 'fairpay-consent:v1'
const LEGACY_CONSENT_STORAGE_KEY = 'fairpay-consent'

type Listener = () => void

const listeners = new Set<Listener>()
let cached: { loaded: boolean; value: ConsentState | null } = { loaded: false, value: null }

function getStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

function toDecision(value: unknown): ConsentDecision | null {
  return value === 'accepted' || value === 'rejected' ? value : null
}

function parseV2(raw: string): ConsentState | null {
  const parsed = JSON.parse(raw) as Partial<ConsentState>
  const preferences = toDecision(parsed.preferences)
  const experience = toDecision(parsed.experience)
  const marketing = toDecision(parsed.marketing)
  if (parsed.schema !== 2 || !preferences || !experience || !marketing) return null
  return { schema: 2, preferences, experience, marketing, timestamp: parsed.timestamp ?? null }
}

function migrateV1(raw: string): ConsentState | null {
  const parsed = JSON.parse(raw) as { analytics?: unknown; timestamp?: string | null }
  const analytics = toDecision(parsed.analytics)
  if (!analytics) return null
  return {
    schema: 2,
    preferences: 'accepted',
    experience: analytics,
    marketing: analytics,
    timestamp: parsed.timestamp ?? null,
  }
}

function loadFromStorage(): ConsentState | null {
  const storage = getStorage()
  if (!storage) return null

  try {
    const current = storage.getItem(CONSENT_STORAGE_KEY)
    if (current) return parseV2(current)

    const previous = storage.getItem(V1_CONSENT_STORAGE_KEY) ?? storage.getItem(LEGACY_CONSENT_STORAGE_KEY)
    if (!previous) return null

    const migrated = migrateV1(previous)
    storage.removeItem(V1_CONSENT_STORAGE_KEY)
    storage.removeItem(LEGACY_CONSENT_STORAGE_KEY)
    if (migrated) storage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(migrated))
    return migrated
  } catch {
    return null
  }
}

function notify(): void {
  for (const listener of listeners) listener()
}

/** Returns the stored decision, or `null` while consent is still pending. */
export function readConsentState(): ConsentState | null {
  if (!cached.loaded) cached = { loaded: true, value: loadFromStorage() }
  return cached.value
}

export function writeConsentState(choices: ConsentChoices): ConsentState {
  const next: ConsentState = {
    schema: 2,
    preferences: choices.preferences ? 'accepted' : 'rejected',
    experience: choices.experience ? 'accepted' : 'rejected',
    marketing: choices.marketing ? 'accepted' : 'rejected',
    timestamp: new Date().toISOString(),
  }

  try {
    getStorage()?.setItem(CONSENT_STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Storage unavailable: keep the decision for this tab only.
  }

  cached = { loaded: true, value: next }
  notify()
  return next
}

export function clearConsentState(): void {
  try {
    getStorage()?.removeItem(CONSENT_STORAGE_KEY)
  } catch {
    // Storage unavailable.
  }
  cached = { loaded: true, value: null }
  notify()
}

export function subscribeConsent(listener: Listener): () => void {
  listeners.add(listener)

  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== CONSENT_STORAGE_KEY) return
    cached = { loaded: false, value: null }
    listener()
  }
  if (typeof window !== 'undefined') window.addEventListener('storage', onStorage)

  return () => {
    listeners.delete(listener)
    if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage)
  }
}

/** Test-only: drop the in-memory snapshot so the next read hits storage. */
export function resetConsentCacheForTests(): void {
  cached = { loaded: false, value: null }
}

function isAccepted(category: ConsentCategory): boolean {
  return readConsentState()?.[category] === 'accepted'
}

export const isPreferencesConsentGiven = () => isAccepted('preferences')
export const isExperienceConsentGiven = () => isAccepted('experience')
export const isMarketingConsentGiven = () => isAccepted('marketing')

/** Backwards-compatible alias: analytics maps to the `experience` category. */
export const isAnalyticsConsentGiven = isExperienceConsentGiven
