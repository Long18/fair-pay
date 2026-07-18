import { useConsent } from '@/hooks/use-consent'
import { useTranslation } from 'react-i18next'

export function ConsentBanner() {
  const { isConsentPending, acceptAnalytics, rejectAnalytics } = useConsent()
  const { t } = useTranslation()

  if (!isConsentPending) return null

  return (
    <div
      role="dialog"
      aria-label={t('consent.title', 'Cookie preferences')}
      className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background border-t shadow-lg"
    >
      <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center gap-4">
        <p className="text-sm text-muted-foreground flex-1">
          {t(
            'consent.message',
            'We use analytics to improve your experience. You can accept or decline non-essential tracking.'
          )}
        </p>
        <div className="flex gap-2 shrink-0">
          <button type="button"
            onClick={rejectAnalytics}
            className="px-4 py-2 text-sm border rounded-md hover:bg-muted transition-colors"
          >
            {t('consent.reject', 'Decline')}
          </button>
          <button type="button"
            onClick={acceptAnalytics}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            {t('consent.accept', 'Accept')}
          </button>
        </div>
      </div>
    </div>
  )
}
