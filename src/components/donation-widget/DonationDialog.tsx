import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DonationSettings } from '@/types/donation';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { generateVietQRDeeplink, findBankById, VIETQR_BANKS } from '@/lib/vietqr-banks';
import { toast } from 'sonner';
import {
  ArrowUpRightIcon,
  BanknoteIcon,
  CopyIcon,
  HeartIcon,
  QrCodeIcon,
  XIcon,
} from "@/components/ui/icons";
import { useHaptics } from "@/hooks/use-haptics";
import { useIsMobile } from '@/hooks/ui/use-mobile';
import { formatCurrency } from '@/lib/locale-utils';
import { cn } from '@/lib/utils';

interface DonationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: DonationSettings;
}

interface DetailRow {
  key: string;
  label: string;
  value: string;
  copyable?: boolean;
  monospace?: boolean;
}

const sectionCardClass =
  'rounded-xl border border-border/60 bg-card p-3 shadow-none space-y-2';

function parseDonationAmount(amount?: string): number | null {
  if (!amount?.trim()) return null;
  const digits = amount.replace(/\D/g, '');
  if (!digits) return null;
  const parsed = Number(digits);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function DonationDialog({ open, onOpenChange, settings }: DonationDialogProps) {
  const { i18n, t } = useTranslation();
  const { tap } = useHaptics();
  const isMobile = useIsMobile();
  const currentLang = i18n.language as 'en' | 'vi';
  const [selectedBankId, setSelectedBankId] = useState<string>('');

  const donateMessage = settings.donate_message[currentLang] || settings.donate_message.en;
  const bankInfo = settings.bank_info;
  const hasBankInfo = Boolean(bankInfo?.account && bankInfo?.bank);
  const suggestedAmount = parseDonationAmount(bankInfo?.amount);

  const activeBankId = selectedBankId || bankInfo?.app || '';
  const bankDetails = activeBankId ? findBankById(activeBankId) : null;

  const detailRows = useMemo<DetailRow[]>(() => {
    if (!bankInfo) return [];

    const rows: DetailRow[] = [];
    if (bankInfo.accountName) {
      rows.push({
        key: 'account-name',
        label: t('settings.donation.accountName', 'Account Holder Name'),
        value: bankInfo.accountName,
      });
    }
    if (bankInfo.account) {
      rows.push({
        key: 'account-number',
        label: t('settings.donation.bankAccount', 'Account Number'),
        value: bankInfo.account,
        copyable: true,
        monospace: true,
      });
    }
    if (bankInfo.bank) {
      rows.push({
        key: 'bank-name',
        label: t('settings.donation.bankCode', 'Bank Code'),
        value: bankInfo.bank,
        copyable: true,
      });
    }

    return rows;
  }, [bankInfo, t]);

  const accountNumberRow = detailRows.find((row) => row.key === 'account-number');
  const accordionDetailRows = detailRows.filter((row) => row.key !== 'account-number');

  const handleOpenBankApp = (bankId?: string) => {
    const targetBankId = bankId || activeBankId;

    tap();

    if (hasBankInfo && targetBankId && bankInfo?.account && bankInfo?.bank) {
      const deeplink = generateVietQRDeeplink(
        targetBankId,
        bankInfo.account,
        bankInfo.bank,
        bankInfo.amount,
        bankInfo.description
      );

      window.location.href = deeplink;
      const bank = findBankById(targetBankId);
      toast.success(
        t('settings.donation.openingBankApp', 'Opening bank app...') +
        (bank ? ` (${bank.name})` : '')
      );
    } else {
      toast.info(t('settings.donation.scanQRCode', 'Please scan the QR code with your banking app'));
    }
  };

  const handleQRClick = () => {
    tap();
    if (activeBankId) {
      handleOpenBankApp();
      return;
    }
    toast.info(t('settings.donation.selectBankFirst', 'Please select your bank app first'));
  };

  const handleClose = () => {
    tap();
    onOpenChange(false);
  };

  const copyDetail = async (label: string, value: string) => {
    tap();
    try {
      await navigator.clipboard.writeText(value);
      toast.success(
        t('settings.donation.copySuccess', '{{label}} copied', { label })
      );
    } catch {
      toast.error(
        t('settings.donation.copyFailed', 'Unable to copy {{label}}', { label })
      );
    }
  };

  const openBankLabel = bankDetails
    ? t('settings.donation.openBankApp', 'Open {{bankName}} App', { bankName: bankDetails.name })
    : t('settings.donation.openBankApp', 'Open {{bankName}} App', { bankName: '…' });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          'gap-0 border-border/60 p-0 shadow-none sm:max-w-2xl sm:max-h-[min(90vh,52rem)]',
          'max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:top-auto max-sm:w-full',
          'max-sm:translate-x-0 max-sm:translate-y-0 max-sm:max-w-none max-sm:rounded-t-2xl max-sm:rounded-b-none',
          'max-sm:border-x-0 max-sm:border-b-0 max-sm:max-h-[88dvh] max-sm:overflow-hidden',
        )}
      >
        <div className="relative">
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-2 right-2 z-20 inline-flex h-9 w-9 items-center justify-center rounded-md border border-border/60 bg-background text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={t('common.cancel', 'Close')}
          >
            <XIcon className="h-4 w-4" />
          </button>

          <div className="sm:hidden mx-auto mt-1.5 h-1 w-10 rounded-full bg-muted-foreground/30" />

          <div className="max-sm:max-h-[calc(88dvh-1rem)] overflow-y-auto px-4 pb-4 pt-2 sm:px-5 sm:pb-5 sm:pt-4 space-y-3.5">
            <section className={sectionCardClass}>
              <div className="flex items-start gap-2.5 pr-8">
                <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-border/60 bg-muted">
                  {settings.avatar_image_url ? (
                    <img
                      src={settings.avatar_image_url}
                      alt="Donation avatar"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <HeartIcon className="h-4 w-4 text-primary" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-sm font-semibold leading-snug">
                      {settings.cta_text[currentLang] || settings.cta_text.en}
                    </h2>
                    {suggestedAmount !== null && (
                      <div className="shrink-0 text-right">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          {t('settings.donation.amountLabel', 'Suggested amount')}
                        </p>
                        <p className="text-base font-semibold tabular-nums text-primary leading-tight">
                          {formatCurrency(suggestedAmount)}
                        </p>
                      </div>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2 leading-snug">
                    {donateMessage}
                  </p>
                </div>
              </div>
            </section>

            <section
              className={cn(
                sectionCardClass,
                'grid grid-cols-1 gap-3.5 space-y-0 sm:grid-cols-2',
              )}
            >
              {settings.qr_code_image_url && (
                <div className="space-y-1.5 md:flex md:flex-col md:items-center">
                  <p className="inline-flex items-center gap-1.5 text-xs font-semibold">
                    <QrCodeIcon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                    {t('settings.donation.qrCode', 'QR Code Image')}
                  </p>
                  <button
                    type="button"
                    onClick={handleQRClick}
                    className="group relative mx-auto aspect-square w-full max-w-[min(100%,13.5rem)] overflow-hidden rounded-lg border border-border/60 bg-background p-2 transition-shadow hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-[14.5rem] md:max-w-[15.5rem]"
                    aria-label={t('settings.donation.tapToOpenBank', 'Tap to open bank app')}
                  >
                    <img
                      src={settings.qr_code_image_url}
                      alt="QR Code"
                      className="h-full w-full rounded-md object-contain"
                    />
                    {hasBankInfo && (
                      <div
                        className={cn(
                          'pointer-events-none absolute inset-x-2 bottom-2 rounded-md bg-foreground/90 px-2 py-1 text-center text-[10px] font-medium text-background',
                          isMobile
                            ? 'opacity-100'
                            : 'opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100'
                        )}
                      >
                        {t('settings.donation.tapToOpenBank', 'Tap to open bank app')}
                      </div>
                    )}
                  </button>
                  <p className="text-[10px] text-muted-foreground text-center leading-snug">
                    {hasBankInfo
                      ? t('settings.donation.tapHint', 'Tap QR code to open banking app directly')
                      : t('settings.donation.scanQRCodeHint', 'Scan the QR code with your banking app')}
                  </p>
                </div>
              )}

              {hasBankInfo && (
                <div
                  className={cn(
                    'flex min-w-0 flex-col gap-2',
                    !settings.qr_code_image_url && 'sm:col-span-2',
                  )}
                >
                  <Label htmlFor="bank-select" className="text-xs font-semibold flex items-center gap-1.5">
                    <BanknoteIcon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                    {t('settings.donation.selectYourBank', 'Select Your Bank App')}
                  </Label>
                  <Select value={selectedBankId} onValueChange={setSelectedBankId}>
                    <SelectTrigger id="bank-select" className="h-11 min-h-11 w-full">
                      <SelectValue placeholder={
                        bankInfo?.app && findBankById(bankInfo.app)?.name ||
                        t('settings.donation.chooseBank', 'Choose your bank app')
                      } />
                    </SelectTrigger>
                    <SelectContent className="max-h-[320px]">
                      {VIETQR_BANKS.map((bank) => (
                        <SelectItem key={bank.id} value={bank.id} className="min-h-10">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{bank.name}</span>
                            <span className="text-xs text-muted-foreground">({bank.code})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    onClick={() => handleOpenBankApp()}
                    disabled={!bankDetails}
                    className="h-auto min-h-11 w-full gap-2 px-3 py-2.5"
                    aria-label={openBankLabel}
                  >
                    <BanknoteIcon className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="min-w-0 flex-1 text-center text-xs leading-snug whitespace-normal [text-wrap:balance] line-clamp-2 sm:text-left sm:text-sm">
                      {bankDetails
                        ? t('settings.donation.openBankApp', 'Open {{bankName}} App', {
                            bankName: bankDetails.shortName,
                          })
                        : t('settings.donation.chooseBank', 'Choose your bank app')}
                    </span>
                    <ArrowUpRightIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  </Button>
                </div>
              )}
            </section>

            {detailRows.length > 0 && (
              <section className={sectionCardClass}>
                {accountNumberRow && (
                  <div className="rounded-lg border border-border/60 bg-muted/20 px-2.5 py-2">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {accountNumberRow.label}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <p className="min-w-0 flex-1 break-all font-mono text-sm font-semibold tabular-nums">
                        {accountNumberRow.value}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 shrink-0 gap-1 border-border/60 px-2 shadow-none"
                        onClick={() => copyDetail(accountNumberRow.label, accountNumberRow.value)}
                        aria-label={t('settings.donation.copyField', 'Copy {{label}}', {
                          label: accountNumberRow.label,
                        })}
                      >
                        <CopyIcon className="h-3.5 w-3.5" />
                        <span className="text-xs">{t('settings.donation.copyButton', 'Copy')}</span>
                      </Button>
                    </div>
                  </div>
                )}

                {accordionDetailRows.length > 0 && (
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="bank-details" className="border-0">
                      <AccordionTrigger className="py-1.5 text-xs font-semibold hover:no-underline">
                        {t('settings.donation.bankInfo', 'Bank Information')}
                      </AccordionTrigger>
                      <AccordionContent className="pb-1">
                        <div className="space-y-2">
                          {accordionDetailRows.map((row) => (
                            <div
                              key={row.key}
                              className="rounded-lg border border-border/60 bg-muted/20 px-2.5 py-2"
                            >
                              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                {row.label}
                              </p>
                              <div className="mt-1 flex items-center gap-2">
                                <p
                                  className={cn(
                                    'min-w-0 flex-1 break-all text-sm font-semibold',
                                    row.monospace && 'font-mono tabular-nums'
                                  )}
                                >
                                  {row.value}
                                </p>
                                {row.copyable && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 shrink-0 gap-1 border-border/60 px-2 shadow-none"
                                    onClick={() => copyDetail(row.label, row.value)}
                                    aria-label={t('settings.donation.copyField', 'Copy {{label}}', {
                                      label: row.label,
                                    })}
                                  >
                                    <CopyIcon className="h-3.5 w-3.5" />
                                    <span className="text-xs">
                                      {t('settings.donation.copyButton', 'Copy')}
                                    </span>
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                )}

              </section>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
