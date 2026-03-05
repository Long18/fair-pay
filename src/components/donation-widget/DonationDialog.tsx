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

export function DonationDialog({ open, onOpenChange, settings }: DonationDialogProps) {
  const { i18n, t } = useTranslation();
  const { tap } = useHaptics();
  const currentLang = i18n.language as 'en' | 'vi';
  const [selectedBankId, setSelectedBankId] = useState<string>('');

  const donateMessage = settings.donate_message[currentLang] || settings.donate_message.en;
  const bankInfo = settings.bank_info;
  const hasBankInfo = Boolean(bankInfo?.account && bankInfo?.bank);

  // Use selected bank or default to admin's configured bank.
  const activeBankId = selectedBankId || bankInfo?.app || '';
  const bankDetails = activeBankId ? findBankById(activeBankId) : null;
  const selectedBankDetails = selectedBankId ? findBankById(selectedBankId) : null;

  const detailRows = useMemo<DetailRow[]>(() => {
    if (!bankInfo) return [];

    const rows: DetailRow[] = [];
    if (bankInfo.accountName) {
      rows.push({
        key: 'account-name',
        label: t('settings.donation.accountName', 'Account Name'),
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
        label: t('settings.donation.bankCode', 'Bank'),
        value: bankInfo.bank,
        copyable: true,
      });
    }

    return rows;
  }, [bankInfo, t]);

  const handleOpenBankApp = (bankId?: string) => {
    const targetBankId = bankId || activeBankId;

    tap();

    if (hasBankInfo && targetBankId && bankInfo?.account && bankInfo?.bank) {
      const deeplink = generateVietQRDeeplink(
        targetBankId,
        bankInfo.account,
        bankInfo.bank
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-md max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:top-auto max-sm:translate-x-0 max-sm:translate-y-0 max-sm:max-w-none max-sm:rounded-t-2xl max-sm:rounded-b-none max-sm:border-x-0 max-sm:border-b-0 max-sm:max-h-[88dvh] max-sm:overflow-hidden"
      >
        <div className="relative">
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-2.5 right-2.5 z-20 inline-flex h-10 w-10 items-center justify-center rounded-md border bg-background text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={t('common.cancel', 'Close')}
          >
            <XIcon className="h-4 w-4" />
          </button>

          <div className="sm:hidden mx-auto mt-2 h-1.5 w-12 rounded-full bg-muted-foreground/30" />

          <div className="max-sm:max-h-[calc(88dvh-1.25rem)] overflow-y-auto px-4 pb-4 pt-3 sm:p-5 space-y-4">
            <section className="rounded-xl border bg-card p-4">
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full border bg-muted">
                    {settings.avatar_image_url ? (
                      <img
                        src={settings.avatar_image_url}
                        alt="Donation avatar"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <HeartIcon className="h-5 w-5 text-primary" />
                      </div>
                    )}
                </div>
                <div className="min-w-0 pr-11">
                  <h2 className="flex items-center gap-2 text-base font-semibold">
                    <HeartIcon className="h-4 w-4 text-primary" />
                    {settings.cta_text[currentLang] || settings.cta_text.en}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {donateMessage}
                  </p>
                </div>
              </div>
            </section>

            {settings.qr_code_image_url && (
              <section className="rounded-xl border bg-card p-4 space-y-3">
                <p className="inline-flex items-center gap-2 text-sm font-semibold">
                    <QrCodeIcon className="h-4 w-4 text-muted-foreground" />
                    {t('settings.donation.qrCode', 'QR Code')}
                </p>
                <div className="flex flex-col items-center gap-3">
                  <button
                    onClick={handleQRClick}
                    className="group relative aspect-square w-full max-w-[292px] overflow-hidden rounded-xl border bg-background p-2 transition-shadow hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={t('settings.donation.tapToOpenBank', 'Tap to open bank app')}
                  >
                    <img
                      src={settings.qr_code_image_url}
                      alt="QR Code"
                      className="h-full w-full rounded-lg object-contain"
                    />
                    {hasBankInfo && (
                      <div className="pointer-events-none absolute inset-x-3 bottom-3 rounded-md bg-foreground/85 px-2 py-1 text-center text-xs text-background opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                        {t('settings.donation.tapToOpenBank', 'Tap to open bank app')}
                      </div>
                    )}
                  </button>

                  <p className="text-xs text-muted-foreground text-center">
                    {hasBankInfo
                      ? t('settings.donation.tapHint', 'Tap QR code to open banking app directly')
                      : t('settings.donation.scanQRCodeHint', 'Scan the QR code with your banking app')}
                  </p>
                </div>
              </section>
            )}

            {hasBankInfo && (
              <section className="rounded-xl border bg-card p-4 space-y-3">
                <Label htmlFor="bank-select" className="text-sm font-medium flex items-center gap-2">
                  <BanknoteIcon className="h-4 w-4 text-muted-foreground" />
                  {t('settings.donation.selectYourBank', 'Select Your Bank App')}
                </Label>
                <Select value={selectedBankId} onValueChange={setSelectedBankId}>
                  <SelectTrigger id="bank-select" className="w-full h-10">
                    <SelectValue placeholder={
                      bankInfo?.app && findBankById(bankInfo.app)?.name ||
                      t('settings.donation.chooseBank', 'Choose your bank app')
                    } />
                  </SelectTrigger>
                  <SelectContent className="max-h-[320px]">
                    {VIETQR_BANKS.map((bank) => (
                      <SelectItem key={bank.id} value={bank.id}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{bank.name}</span>
                          <span className="text-xs text-muted-foreground">({bank.code})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {bankDetails && (
                  <Button
                    onClick={() => handleOpenBankApp()}
                    size="lg"
                    className="w-full"
                  >
                    <BanknoteIcon className="h-4 w-4" />
                    {t('settings.donation.openBankApp', 'Open {{bankName}} App', { bankName: bankDetails.name })}
                    <ArrowUpRightIcon className="h-4 w-4" />
                  </Button>
                )}

                {!bankDetails && (
                  <p className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
                    {t('settings.donation.selectBankToOpen', 'Select a bank app to open it directly')}
                  </p>
                )}

                {selectedBankDetails && (
                  <p className="text-xs text-muted-foreground">
                    {t('settings.donation.bankAppHint', 'Opens {{bankName}} app to complete payment', { bankName: selectedBankDetails.shortName })}
                  </p>
                )}
              </section>
            )}

            {detailRows.length > 0 && (
              <section className="rounded-xl border bg-card p-4 space-y-2.5">
                <p className="text-sm font-semibold">
                  {t('settings.donation.bankInfo', 'Bank Information')}
                </p>
                {detailRows.map((row) => (
                  <div
                    key={row.key}
                    className="flex items-start justify-between gap-3 rounded-md border bg-muted/20 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        {row.label}
                      </p>
                      <p className={row.monospace ? 'mt-1 font-semibold break-all font-mono' : 'mt-1 font-semibold break-words'}>
                        {row.value}
                      </p>
                    </div>
                    {row.copyable && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-md"
                        onClick={() => copyDetail(row.label, row.value)}
                        aria-label={t('settings.donation.copyField', 'Copy {{label}}', { label: row.label })}
                      >
                        <CopyIcon className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </section>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
