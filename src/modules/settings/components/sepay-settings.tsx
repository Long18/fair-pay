/**
 * SePay Settings Component
 *
 * Allows admin users to configure SePay QR payment settings.
 * Stores bank account info for QR code generation + API token for webhook.
 * Non-admin users see a blocking message.
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useGetIdentity } from '@refinedev/core';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  CheckIcon,
  AlertCircleIcon,
  TrashIcon,
  ExternalLinkIcon,
  LockIcon,
  CreditCardIcon,
} from '@/components/ui/icons';
import { useSepaySettings } from '@/hooks/payment/use-sepay-settings';
import { useHaptics } from '@/hooks/use-haptics';
import { isAdmin } from '@/lib/rbac';
import { Profile } from '@/modules/profile/types';
import { SepayConfig } from '@/types/user-settings';

export function SepaySettings() {
  const { t } = useTranslation();
  const { success, warning } = useHaptics();
  const { data: identity } = useGetIdentity<Profile>();
  const { sepayConfig, isLoading, isSaving, saveSepayConfig, clearSepayConfig, isConfigured } = useSepaySettings();
  const [userIsAdmin, setUserIsAdmin] = useState(false);
  const [adminChecked, setAdminChecked] = useState(false);

  const [formData, setFormData] = useState<SepayConfig>({
    api_token: '',
    bank_account_number: '',
    bank_name: '',
    account_holder_name: '',
  });

  useEffect(() => {
    isAdmin().then((result) => {
      setUserIsAdmin(result);
      setAdminChecked(true);
    });
  }, []);

  useEffect(() => {
    if (sepayConfig) {
      setFormData({
        api_token: sepayConfig.api_token || '',
        bank_account_number: sepayConfig.bank_account_number || '',
        bank_name: sepayConfig.bank_name || '',
        account_holder_name: sepayConfig.account_holder_name || '',
      });
    }
  }, [sepayConfig]);

  const handleSave = async () => {
    if (!formData.bank_account_number || !formData.bank_name) {
      toast.error(t('settings.sepay.bankRequired', 'Bank account number and bank name are required'));
      return;
    }

    try {
      await saveSepayConfig(formData);
      success();
      toast.success(t('settings.sepay.saved', 'SePay settings saved successfully'));
    } catch {
      toast.error(t('settings.sepay.saveError', 'Failed to save SePay settings'));
    }
  };

  const handleClear = async () => {
    warning();
    try {
      await clearSepayConfig();
      setFormData({ api_token: '', bank_account_number: '', bank_name: '', account_holder_name: '' });
      toast.success(t('settings.sepay.cleared', 'SePay settings cleared'));
    } catch {
      toast.error(t('settings.sepay.clearError', 'Failed to clear SePay settings'));
    }
  };

  if (isLoading || !adminChecked) {
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

  if (!userIsAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCardIcon className="h-5 w-5" />
            {t('settings.sepay.title', 'SePay QR Payment')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <LockIcon className="h-4 w-4" />
            <AlertDescription>
              {t('settings.sepay.adminOnly',
                'This feature is currently available for Admin only. Please donate to support development and unlock for all users.'
              )}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCardIcon className="h-5 w-5" />
          {t('settings.sepay.title', 'SePay QR Payment')}
          {isConfigured && (
            <Badge variant="secondary" className="ml-2 text-xs bg-green-100 text-green-700">
              Active
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          {t('settings.sepay.description', 'Configure your bank account for QR code payments via SePay')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isConfigured ? (
          <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
            <CheckIcon className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700 dark:text-green-300">
              {t('settings.sepay.configured', 'SePay is configured. Others can pay you via QR.')}
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <AlertCircleIcon className="h-4 w-4" />
            <AlertDescription>
              {t('settings.sepay.notConfigured', 'Set up your bank account so others can pay you via QR code.')}
              <a
                href="https://my.sepay.vn"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 ml-1 text-primary hover:underline"
              >
                {t('settings.sepay.goToSepay', 'Go to SePay')}
                <ExternalLinkIcon className="h-3 w-3" />
              </a>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {/* Bank Account Number */}
          <div className="space-y-2">
            <Label htmlFor="sepay-account">
              {t('settings.sepay.bankAccountNumber', 'Bank Account Number')} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="sepay-account"
              type="text"
              placeholder="0123456789"
              value={formData.bank_account_number}
              onChange={(e) => setFormData(prev => ({ ...prev, bank_account_number: e.target.value }))}
              className="min-h-[44px] text-base font-mono"
            />
          </div>

          {/* Bank Name */}
          <div className="space-y-2">
            <Label htmlFor="sepay-bank">
              {t('settings.sepay.bankName', 'Bank Name')} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="sepay-bank"
              type="text"
              placeholder="MBBank, Vietcombank, Techcombank..."
              value={formData.bank_name}
              onChange={(e) => setFormData(prev => ({ ...prev, bank_name: e.target.value }))}
              className="min-h-[44px] text-base"
            />
            <p className="text-xs text-muted-foreground">
              {t('settings.sepay.bankNameHelp', 'Use the short name as shown on SePay (e.g., MBBank, Vietcombank, Techcombank)')}
            </p>
          </div>

          {/* Account Holder Name */}
          <div className="space-y-2">
            <Label htmlFor="sepay-holder">
              {t('settings.sepay.accountHolderName', 'Account Holder Name')}
            </Label>
            <Input
              id="sepay-holder"
              type="text"
              placeholder="NGUYEN VAN A"
              value={formData.account_holder_name || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, account_holder_name: e.target.value }))}
              className="min-h-[44px] text-base"
            />
          </div>

          {/* API Token */}
          <div className="space-y-2">
            <Label htmlFor="sepay-token">
              {t('settings.sepay.apiToken', 'SePay API Token')}
            </Label>
            <Input
              id="sepay-token"
              type="password"
              placeholder="••••••••••••"
              value={formData.api_token}
              onChange={(e) => setFormData(prev => ({ ...prev, api_token: e.target.value }))}
              className="min-h-[44px] text-base font-mono"
            />
            <p className="text-xs text-muted-foreground">
              {t('settings.sepay.apiTokenHelp', 'Optional. Get from my.sepay.vn → API Token. Used for webhook authentication.')}
            </p>
          </div>
        </div>

        <Separator />

        <div className="flex justify-between">
          {isConfigured && (
            <Button
              variant="outline"
              onClick={handleClear}
              disabled={isSaving}
              className="text-red-600 hover:text-red-700"
            >
              <TrashIcon className="h-4 w-4 mr-2" />
              {t('settings.sepay.clear', 'Remove Config')}
            </Button>
          )}
          <div className="flex-1" />
          <Button
            onClick={handleSave}
            disabled={isSaving || !formData.bank_account_number || !formData.bank_name}
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
