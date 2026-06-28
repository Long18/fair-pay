import { useState, useEffect, useCallback } from 'react'

export type ConsentCategory = 'necessary' | 'analytics'
export type ConsentStatus = 'pending' | 'accepted' | 'rejected'

interface ConsentState {
  analytics: ConsentStatus
  timestamp: string | null
}

const CONSENT_STORAGE_KEY = 'fairpay-consent'

function getStoredConsent(): ConsentState {
  try {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch {}
  return { analytics: 'pending', timestamp: null }
}

function storeConsent(state: ConsentState): void {
  localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(state))
}

export function useConsent() {
  const [consent, setConsent] = useState<ConsentState>(getStoredConsent)

  const acceptAnalytics = useCallback(() => {
    const newState: ConsentState = { analytics: 'accepted', timestamp: new Date().toISOString() }
    storeConsent(newState)
    setConsent(newState)
  }, [])

  const rejectAnalytics = useCallback(() => {
    const newState: ConsentState = { analytics: 'rejected', timestamp: new Date().toISOString() }
    storeConsent(newState)
    setConsent(newState)
  }, [])

  const resetConsent = useCallback(() => {
    localStorage.removeItem(CONSENT_STORAGE_KEY)
    setConsent({ analytics: 'pending', timestamp: null })
  }, [])

  const isAnalyticsAllowed = consent.analytics === 'accepted'
  const isConsentPending = consent.analytics === 'pending'

  return {
    consent,
    isAnalyticsAllowed,
    isConsentPending,
    acceptAnalytics,
    rejectAnalytics,
    resetConsent,
  }
}
