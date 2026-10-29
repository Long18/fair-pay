import { useCallback, useSyncExternalStore } from 'react'
import {
  clearConsentState,
  readConsentState,
  subscribeConsent,
  writeConsentState,
  type ConsentChoices,
  type ConsentState,
} from '@/lib/analytics/consent-gate'
import { clearAttributionStorage } from '@/lib/utm'

export type { ConsentCategory, ConsentChoices, ConsentDecision, ConsentState } from '@/lib/analytics/consent-gate'

export const DEFAULT_CONSENT_CHOICES: ConsentChoices = {
  preferences: true,
  experience: true,
  marketing: true,
}

const REJECT_ALL_CHOICES: ConsentChoices = {
  preferences: false,
  experience: false,
  marketing: false,
}

const manageListeners = new Set<() => void>()
let isManageOpen = false

function setManageOpen(open: boolean) {
  if (isManageOpen === open) return
  isManageOpen = open
  for (const listener of manageListeners) listener()
}

function subscribeManage(listener: () => void) {
  manageListeners.add(listener)
  return () => {
    manageListeners.delete(listener)
  }
}

const getManageOpen = () => isManageOpen
const getServerConsent = () => null
const getServerManageOpen = () => false

export function toConsentChoices(state: ConsentState | null): ConsentChoices {
  if (!state) return DEFAULT_CONSENT_CHOICES
  return {
    preferences: state.preferences === 'accepted',
    experience: state.experience === 'accepted',
    marketing: state.marketing === 'accepted',
  }
}

export function useConsent() {
  const consent = useSyncExternalStore(subscribeConsent, readConsentState, getServerConsent)
  const manageOpen = useSyncExternalStore(subscribeManage, getManageOpen, getServerManageOpen)

  const confirmChoices = useCallback((choices: ConsentChoices) => {
    writeConsentState(choices)
    if (!choices.marketing) clearAttributionStorage()
    setManageOpen(false)
  }, [])

  const rejectAll = useCallback(() => confirmChoices(REJECT_ALL_CHOICES), [confirmChoices])
  const acceptAll = useCallback(() => confirmChoices(DEFAULT_CONSENT_CHOICES), [confirmChoices])
  const openConsentModal = useCallback(() => setManageOpen(true), [])
  const closeConsentModal = useCallback(() => setManageOpen(false), [])
  const resetConsent = useCallback(() => {
    clearConsentState()
    setManageOpen(false)
  }, [])

  const isConsentPending = consent === null

  return {
    consent,
    choices: toConsentChoices(consent),
    isConsentPending,
    isConsentModalOpen: isConsentPending || manageOpen,
    isAnalyticsAllowed: consent?.experience === 'accepted',
    isExperienceAllowed: consent?.experience === 'accepted',
    isMarketingAllowed: consent?.marketing === 'accepted',
    confirmChoices,
    acceptAll,
    rejectAll,
    openConsentModal,
    closeConsentModal,
    resetConsent,
  }
}
