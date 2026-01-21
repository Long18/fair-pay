/**
 * Bank Settings Component
 *
 * Allows users to configure their bank account for receiving VietQR payments.
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useBankSettings } from '@/hooks/use-bank-settings';
import { getPopularBanks, generateVietQRUrl, getBankByCode, createVietQRConfig } from '@/lib/vietqr';
import { BankInfo } from '@/types/user-settings';

export function BankSettings() {
  const { t } = useTranslation();
  const { bankInfo, isLoading, isSaving, saveBankInfo, clearBankInfo, isConfigured } = useBankSettings();

  const [formData, setFormData] = useState<BankInfo>({
    bank: '',
    account: '',
    accountName: '',
  });

  const banks = getPopularBanks();

  // Initialize form data when settings load
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
      toast.success(t('settings.bank.saved', 'Bank settings saved successfully'));
    } catch {
      toast.error(t('settings.bank.saveError', 'Failed to save bank settings'));
    }
  };

  const handleClear = async () => {
    try {
      await clearBankInfo();
      setFormData({ bank: '', account: '', accountName: '' });
      toast.success(t('settings.bank.cleared', 'Bank settings cleared'));
    } catch {
      toast.error(t('settings.bank.clearError', 'Failed to clear bank settings'));
    }
  };

  // Generate preview QR URL
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
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCodeIcon className="h-5 w-5" />
          {t('settings.bank.title', 'Bank Account Settings')}
        </CardTitle>
        <CardDescription>
          {t('settings.bank.description', 'Configure your bank account to receive payments via VietQR')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Banner */}
        {isConfigured ? (
          <Alert className="border-green-200 bg-green-50">
            <CheckIcon className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">
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
          {/* Form Section */}
          <div className="space-y-4">
            {/* Bank Selection */}
            <div className="space-y-2">
              <Label htmlFor="bank">
                {t('settings.bank.bankName', 'Bank')} <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.bank}
                onValueChange={(value) => setFormData(prev => ({ ...prev, bank: value }))}
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

            {/* Account Number */}
            <div className="space-y-2">
              <Label htmlFor="account">
                {t('settings.bank.accountNumber', 'Account Number')} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="account"
                type="text"
                placeholder="1234567890"
                value={formData.account}
                onChange={(e) => setFormData(prev => ({ ...prev, account: e.target.value }))}
                className="min-h-[44px] text-base"
              />
            </div>

            {/* Account Name */}
            <div className="space-y-2">
              <Label htmlFor="accountName">
                {t('settings.bank.accountName', 'Account Holder Name')} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="accountName"
                type="text"
                placeholder="NGUYEN VAN A"
                value={formData.accountName}
                onChange={(e) => setFormData(prev => ({ ...prev, accountName: e.target.value.toUpperCase() }))}
                className="min-h-[44px] text-base uppercase"
              />
              <p className="text-xs text-muted-foreground">
                {t('settings.bank.accountNameHelp', 'Enter exactly as shown on your bank account')}
              </p>
            </div>
          </div>

          {/* QR Preview Section */}
          <div className="space-y-4">
            <Label>{t('settings.bank.preview', 'QR Preview')}</Label>
            <div className="flex flex-col items-center p-4 border rounded-lg bg-muted/50">
              {previewUrl ? (
                <>
                  <div className="w-48 h-48 bg-white rounded-lg p-2 shadow-sm">
                    <img
                      src={previewUrl}
                      alt="VietQR Preview"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    {t('settings.bank.previewNote', 'Sample QR with 10,000 VND')}
                  </p>
                </>
              ) : (
                <div className="w-48 h-48 flex items-center justify-center border-2 border-dashed rounded-lg text-muted-foreground">
                  <div className="text-center">
                    <QrCodeIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">{t('settings.bank.fillToPreview', 'Fill in details to preview QR')}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <Separator />

        {/* Action Buttons */}
        <div className="flex justify-between">
          {isConfigured && (
            <Button
              variant="outline"
              onClick={handleClear}
              disabled={isSaving}
              className="text-red-600 hover:text-red-700"
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
            {isSaving
              ? t('common.saving', 'Saving...')
              : t('common.save', 'Save Changes')
            }
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
