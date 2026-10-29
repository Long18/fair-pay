import { useId, useState } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { FairPayIcon } from '@/components/ui/icons'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { CONSENT_CATEGORIES, type ConsentCategory } from '@/lib/analytics/consent-gate'
import { useConsent, type ConsentChoices } from '@/hooks/use-consent'

const CATEGORY_FALLBACK_LABELS: Record<ConsentCategory, string> = {
  preferences: 'Remember your settings and personal preferences',
  experience: 'Improve service quality and personalize your experience',
  marketing: 'Show products, features and offers that match your interests',
}

interface ConsentCategoryRowProps {
  category: ConsentCategory
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

function ConsentCategoryRow({ category, checked, onCheckedChange }: ConsentCategoryRowProps) {
  const { t } = useTranslation()
  const labelId = useId()

  return (
    <li className="flex items-center justify-between gap-4 py-1.5">
      <span id={labelId} className="text-sm leading-snug">
        {t(`consent.categories.${category}`, CATEGORY_FALLBACK_LABELS[category])}
      </span>
      <Switch aria-labelledby={labelId} checked={checked} onCheckedChange={onCheckedChange} />
    </li>
  )
}

interface ConsentFormProps {
  initialChoices: ConsentChoices
  onConfirm: (choices: ConsentChoices) => void
  onReject: () => void
}

function ConsentForm({ initialChoices, onConfirm, onReject }: ConsentFormProps) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState<ConsentChoices>(initialChoices)

  const setCategory = (category: ConsentCategory, checked: boolean) =>
    setDraft((previous) => ({ ...previous, [category]: checked }))

  const allSelected = CONSENT_CATEGORIES.every((category) => draft[category])

  return (
    <>
      <DialogHeader className="items-center sm:items-start">
        <DialogTitle className="flex items-center gap-2 text-base">
          <FairPayIcon size={28} alt="" aria-hidden="true" className="size-7 shrink-0" />
          {t('consent.title', 'Cookies & your FairPay experience')}
        </DialogTitle>
        <DialogDescription className="text-left leading-relaxed">
          {t(
            'consent.intro',
            'Cookies remember the settings FairPay needs to run reliably and help make splitting expenses smoother.'
          )}
        </DialogDescription>
      </DialogHeader>

      <section className="border-t pt-3" aria-labelledby="consent-categories-title">
        <h3 id="consent-categories-title" className="text-sm font-semibold">
          {t('consent.categoriesTitle', 'Cookie list')}
        </h3>
        <p className="mt-0.5 text-xs italic text-primary">
          {t(
            'consent.categoriesWarning',
            'Declining some cookies may affect how some features work. Sign-in cookies are always on.'
          )}
        </p>
        <ul className="mt-2">
          {CONSENT_CATEGORIES.map((category) => (
            <ConsentCategoryRow
              key={category}
              category={category}
              checked={draft[category]}
              onCheckedChange={(checked) => setCategory(category, checked)}
            />
          ))}
        </ul>
      </section>

      <p className="border-t pt-3 text-sm text-muted-foreground">
        {t('consent.policyPrefix', 'Learn more in our')}{' '}
        <Link to="/privacy" className="font-medium text-primary underline-offset-4 hover:underline">
          {t('consent.policyLinkText', 'Privacy Policy')}
        </Link>
        .
      </p>

      <DialogFooter className="grid grid-cols-2 gap-3 sm:flex-none">
        <Button type="button" variant="outline" onClick={onReject}>
          {t('consent.reject', 'Decline')}
        </Button>
        <Button type="button" onClick={() => onConfirm(draft)}>
          {allSelected ? t('consent.confirmAll', 'Accept all') : t('consent.confirm', 'Confirm')}
        </Button>
      </DialogFooter>
    </>
  )
}

export function ConsentModal() {
  const { choices, isConsentPending, isConsentModalOpen, confirmChoices, rejectAll, closeConsentModal } =
    useConsent()

  const blockDismiss = (event: Event) => {
    if (isConsentPending) event.preventDefault()
  }

  return (
    <Dialog
      open={isConsentModalOpen}
      onOpenChange={(open) => {
        if (!open && !isConsentPending) closeConsentModal()
      }}
    >
      <DialogContent
        showCloseButton={!isConsentPending}
        onEscapeKeyDown={blockDismiss}
        onPointerDownOutside={blockDismiss}
        onInteractOutside={blockDismiss}
        className="gap-3 rounded-2xl p-5 sm:max-w-md sm:top-auto sm:bottom-6 sm:left-6 sm:translate-x-0 sm:translate-y-0"
      >
        <ConsentForm initialChoices={choices} onConfirm={confirmChoices} onReject={rejectAll} />
      </DialogContent>
    </Dialog>
  )
}
