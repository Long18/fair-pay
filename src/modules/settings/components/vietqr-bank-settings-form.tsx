/**
 * VietQR tab — bank account for dynamic VietQR payments.
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { CheckIcon, AlertCircleIcon, QrCodeIcon, TrashIcon } from '@/components/ui/icons';
import { useBankSettings } from '@/hooks/payment/use-bank-settings';
import { useHaptics } from '@/hooks/use-haptics';
import { useTrackEvent } from '@/hooks/use-track-event';
import { getPopularBanks, generateVietQRUrl, getBankByCode, createVietQRConfig } from '@/lib/vietqr';
import { BankInfo } from '@/types/user-settings';
import { cn } from '@/lib/utils';
import { getSemanticStatusColors } from '@/lib/status-colors';

const successColors = getSemanticStatusColors('success');
const errorColors = getSemanticStatusColors('error');

export function VietqrBankSettingsForm() {
  const { t } = useTranslation();
  const { success, warning } = useHaptics();
  const { bankInfo, isLoading, isSaving, saveBankInfo, clearBankInfo, isConfigured } = useBankSettings();
  const { track } = useTrackEvent();

  const [formData, setFormData] = useState<BankInfo>({
    bank: '',
    account: '',
    accountName: '',
  });

  const banks = getPopularBanks();

  useEffect(() => {
    if (bankInfo) {
      setFormData({
        bank: bankInfo.bank || '',
        account: bankInfo.account || '',
        accountName: bankInfo.accountName || '',
      });
    }
  }, [bankInfo]);

  const handleSave = async () => {
    if (!formData.bank || !formData.account || !formData.accountName) {
      toast.error(t('settings.bank.allFieldsRequired', 'All fields are required'));
      return;
    }

    try {
      await saveBankInfo(formData);
      success();
      track('settings_bank_save_success');
      toast.success(t('settings.bank.saved', 'Bank settings saved successfully'));
    } catch {
      track('settings_bank_save_failed');
      toast.error(t('settings.bank.saveError', 'Failed to save bank settings'));
    }
  };

  const handleClear = async () => {
    warning();
    try {
      await clearBankInfo();
      setFormData({ bank: '', account: '', accountName: '' });
      toast.success(t('settings.bank.cleared', 'Bank settings cleared'));
    } catch {
      toast.error(t('settings.bank.clearError', 'Failed to clear bank settings'));
    }
  };

  const getPreviewQRUrl = () => {
    if (!formData.bank || !formData.account || !formData.accountName) return null;

    try {
      const config = createVietQRConfig({
        bankCode: formData.bank,
        accountNo: formData.account,
        accountName: formData.accountName,
      });
      if (!config) return null;
      return generateVietQRUrl(config, { amount: 10000 });
    } catch {
      return null;
    }
  };

  const previewUrl = getPreviewQRUrl();
  const selectedBank = formData.bank ? getBankByCode(formData.bank) : null;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isConfigured ? (
        <Alert className={cn(successColors.border, successColors.bg)}>
          <CheckIcon className={cn('h-4 w-4', successColors.icon)} />
          <AlertDescription className={successColors.text}>
            {t('settings.bank.configured', 'Your bank account is configured. Others can pay you via VietQR.')}
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <AlertCircleIcon className="h-4 w-4" />
          <AlertDescription>
            {t('settings.bank.notConfigured', 'Set up your bank account so others can pay you via VietQR.')}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bank">
              {t('settings.bank.bankName', 'Bank')}{' '}
              <span className={errorColors.icon}>*</span>
            </Label>
            <Select
              value={formData.bank}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, bank: value }))}
            >
              <SelectTrigger id="bank" className="min-h-[44px]">
                <SelectValue placeholder={t('settings.bank.selectBank', 'Select your bank')} />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {banks.map((bank) => (
                  <SelectItem key={bank.code} value={bank.code} className="min-h-[44px]">
                    <span className="font-medium">{bank.shortName}</span>
                    <span className="text-muted-foreground ml-2 text-xs">{bank.code}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedBank && (
              <p className="text-xs text-muted-foreground">{selectedBank.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="account">
              {t('settings.bank.accountNumber', 'Account Number')}{' '}
              <span className={errorColors.icon}>*</span>
            </Label>
            <Input
              id="account"
              type="text"
              placeholder="1234567890"
              value={formData.account}
              onChange={(e) => setFormData((prev) => ({ ...prev, account: e.target.value }))}
              className="min-h-[44px] text-base"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountName">
              {t('settings.bank.accountName', 'Account Holder Name')}{' '}
              <span className={errorColors.icon}>*</span>
            </Label>
            <Input
              id="accountName"
              type="text"
              placeholder="NGUYEN VAN A"
              value={formData.accountName}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, accountName: e.target.value.toUpperCase() }))
              }
              className="min-h-[44px] text-base uppercase"
            />
            <p className="text-xs text-muted-foreground">
              {t('settings.bank.accountNameHelp', 'Enter exactly as shown on your bank account')}
            </p>
          </div>
        </div>

        <div className="space-y-4 max-md:order-last">
          <Label>{t('settings.bank.preview', 'QR Preview')}</Label>
          <div className="flex flex-col items-center rounded-lg border bg-muted/50 p-4">
            {previewUrl ? (
              <>
                <div className="h-48 w-48 rounded-lg bg-white p-2 shadow-sm">
                  <img
                    src={previewUrl}
                    alt="VietQR Preview"
                    className="h-full w-full object-contain"
                  />
                </div>
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  {t('settings.bank.previewNote', 'Sample QR with 10,000 VND')}
                </p>
              </>
            ) : (
              <div className="flex h-40 w-full max-w-xs items-center justify-center rounded-lg border-2 border-dashed text-muted-foreground md:h-48 md:w-48">
                <div className="text-center">
                  <QrCodeIcon className="mx-auto mb-2 h-12 w-12 opacity-50" />
                  <p className="text-xs">
                    {t('settings.bank.fillToPreview', 'Fill in details to preview QR')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Separator />

      <div className="flex justify-between">
        {isConfigured && (
          <Button
            variant="outline"
            onClick={handleClear}
            disabled={isSaving}
            className={cn(errorColors.text, 'hover:opacity-80')}
          >
            <TrashIcon className="h-4 w-4 mr-2" />
            {t('settings.bank.clear', 'Remove Bank Info')}
          </Button>
        )}
        <div className="flex-1" />
        <Button
          onClick={handleSave}
          disabled={isSaving || !formData.bank || !formData.account || !formData.accountName}
        >
          <CheckIcon className="h-4 w-4 mr-2" />
          {isSaving ? t('common.saving', 'Saving...') : t('common.save', 'Save Changes')}
        </Button>
      </div>
    </div>
  );
}
