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
  ExternalLinkIcon,
  HeartIcon,
  QrCodeIcon,
  SparklesIcon,
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
        className="sm:max-w-[34rem] p-0 gap-0 overflow-hidden border-0 bg-transparent shadow-none max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:top-auto max-sm:translate-x-0 max-sm:translate-y-0 max-sm:max-w-none max-sm:rounded-t-3xl max-sm:rounded-b-none max-sm:max-h-[90dvh]"
      >
        <div className="relative rounded-3xl border bg-background/95 shadow-2xl backdrop-blur-sm max-sm:rounded-t-3xl max-sm:rounded-b-none">
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-3 right-3 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/35 bg-black/30 text-white transition-colors hover:bg-black/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            aria-label={t('common.cancel', 'Close')}
          >
            <XIcon className="h-4 w-4" />
          </button>

          <div className="sm:hidden mx-auto mt-2 h-1.5 w-12 rounded-full bg-muted-foreground/30" />

          <div className="max-sm:max-h-[calc(90dvh-1.25rem)] overflow-y-auto px-4 pb-4 pt-3 sm:p-5 space-y-4">
            <section className="relative overflow-hidden rounded-2xl p-4 text-white shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-[#0f172a] via-[#4c1d95] to-[#be185d]" />
              <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
              <div className="absolute -bottom-12 -left-10 h-36 w-36 rounded-full bg-fuchsia-300/20 blur-3xl" />
              <div className="relative">
                <div className="flex items-start gap-3">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-white/60 bg-black/30 shadow-md">
                    {settings.avatar_image_url ? (
                      <img
                        src={settings.avatar_image_url}
                        alt="Donation avatar"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <HeartIcon className="h-7 w-7 fill-current text-white" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-2.5 py-1 text-[11px] font-medium tracking-wide">
                      <SparklesIcon className="h-3.5 w-3.5" />
                      {t('settings.donation.supportBadge', 'Support FairPay')}
                    </p>
                    <h2 className="mt-2 text-lg font-semibold leading-tight">
                      {settings.cta_text[currentLang] || settings.cta_text.en}
                    </h2>
                    <p className="mt-1.5 text-sm text-white/90">
                      {donateMessage}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px]">
                    <QrCodeIcon className="h-3.5 w-3.5" />
                    {t('settings.donation.scanQRCodeHint', 'Scan the QR code with your banking app')}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px]">
                    <BanknoteIcon className="h-3.5 w-3.5" />
                    {t('settings.donation.tapToOpenBank', 'Tap to open bank app')}
                  </span>
                </div>
              </div>
            </section>

            {settings.qr_code_image_url && (
              <section className="rounded-2xl border bg-card/95 p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <p className="inline-flex items-center gap-2 text-sm font-semibold">
                    <QrCodeIcon className="h-4 w-4 text-muted-foreground" />
                    {t('settings.donation.qrCode', 'QR Code')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('settings.donation.tapHint', 'Tap QR code to open banking app directly')}
                  </p>
                </div>
                <div className="flex flex-col items-center gap-3">
                  <button
                    onClick={handleQRClick}
                    className="group relative aspect-square w-full max-w-[292px] overflow-hidden rounded-2xl border bg-white p-2 shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
                    aria-label={t('settings.donation.tapToOpenBank', 'Tap to open bank app')}
                  >
                    <img
                      src={settings.qr_code_image_url}
                      alt="QR Code"
                      className="h-full w-full rounded-xl object-contain"
                    />
                    {hasBankInfo && (
                      <div className="pointer-events-none absolute inset-x-3 bottom-3 rounded-lg bg-black/75 px-2.5 py-1.5 text-center text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                        {t('settings.donation.tapToOpenBank', 'Tap to open bank app')}
                      </div>
                    )}
                  </button>

                  {!hasBankInfo && (
                    <p className="text-xs text-muted-foreground text-center">
                      {t('settings.donation.scanQRCodeHint', 'Scan the QR code with your banking app')}
                    </p>
                  )}
                </div>
              </section>
            )}

            {hasBankInfo && (
              <section className="rounded-2xl border bg-card/95 p-4 shadow-sm space-y-3">
                <Label htmlFor="bank-select" className="text-sm font-medium flex items-center gap-2">
                  <BanknoteIcon className="h-4 w-4 text-muted-foreground" />
                  {t('settings.donation.selectYourBank', 'Select Your Bank App')}
                </Label>
                <Select value={selectedBankId} onValueChange={setSelectedBankId}>
                  <SelectTrigger id="bank-select" className="w-full h-11 rounded-xl">
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
                    className="h-11 w-full rounded-xl bg-gradient-to-r from-fuchsia-600 via-pink-600 to-orange-500 text-white shadow-md transition-transform hover:scale-[1.01] hover:brightness-110"
                  >
                    <ExternalLinkIcon className="h-4.5 w-4.5" />
                    {t('settings.donation.openBankApp', 'Open {{bankName}} App', { bankName: bankDetails.name })}
                    <ArrowUpRightIcon className="h-4 w-4" />
                  </Button>
                )}

                {!bankDetails && (
                  <p className="rounded-xl border border-dashed px-3 py-2 text-xs text-muted-foreground">
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
              <section className="rounded-2xl border bg-card/95 p-4 shadow-sm space-y-2.5">
                <p className="text-sm font-semibold">
                  {t('settings.donation.bankInfo', 'Bank Information')}
                </p>
                {detailRows.map((row) => (
                  <div
                    key={row.key}
                    className="flex items-start justify-between gap-3 rounded-xl border bg-muted/20 px-3 py-2.5"
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
                        className="h-8 w-8 rounded-lg"
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
