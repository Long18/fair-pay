/**
 * SePay Settings Component
 *
 * Allows admin users to configure SePay Payment Gateway credentials.
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { useSepaySettings } from '@/hooks/use-sepay-settings';
import { isAdmin } from '@/lib/rbac';
import { Profile } from '@/modules/profile/types';
import { SepayConfig } from '@/types/user-settings';

export function SepaySettings() {
  const { t } = useTranslation();
  const { data: identity } = useGetIdentity<Profile>();
  const { sepayConfig, isLoading, isSaving, saveSepayConfig, clearSepayConfig, isConfigured } = useSepaySettings();
  const [userIsAdmin, setUserIsAdmin] = useState(false);
  const [adminChecked, setAdminChecked] = useState(false);

  const [formData, setFormData] = useState<SepayConfig>({
    merchant_id: '',
    secret_key: '',
    environment: 'sandbox',
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
        merchant_id: sepayConfig.merchant_id || '',
        secret_key: sepayConfig.secret_key || '',
        environment: sepayConfig.environment || 'sandbox',
      });
    }
  }, [sepayConfig]);

  const handleSave = async () => {
    if (!formData.merchant_id || !formData.secret_key) {
      toast.error(t('settings.sepay.allFieldsRequired', 'Merchant ID and Secret Key are required'));
      return;
    }

    try {
      await saveSepayConfig(formData);
      toast.success(t('settings.sepay.saved', 'SePay settings saved successfully'));
    } catch {
      toast.error(t('settings.sepay.saveError', 'Failed to save SePay settings'));
    }
  };

  const handleClear = async () => {
    try {
      await clearSepayConfig();
      setFormData({ merchant_id: '', secret_key: '', environment: 'sandbox' });
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

  // Non-admin blocking message
  if (!userIsAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCardIcon className="h-5 w-5" />
            {t('settings.sepay.title', 'SePay Payment Gateway')}
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
          {t('settings.sepay.title', 'SePay Payment Gateway')}
          <Badge variant="secondary" className="ml-2 text-xs">
            {formData.environment === 'production' ? 'Production' : 'Sandbox'}
          </Badge>
        </CardTitle>
        <CardDescription>
          {t('settings.sepay.description', 'Configure SePay to receive QR payments from others')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Banner */}
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
              {t('settings.sepay.notConfigured', 'Set up SePay so others can pay you via QR code.')}
              <a
                href="https://developer.sepay.vn/en/cong-thanh-toan/bat-dau"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 ml-1 text-primary hover:underline"
              >
                {t('settings.sepay.learnMore', 'Learn more')}
                <ExternalLinkIcon className="h-3 w-3" />
              </a>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {/* Environment */}
          <div className="space-y-2">
            <Label htmlFor="sepay-env">
              {t('settings.sepay.environment', 'Environment')} <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.environment}
              onValueChange={(value: 'sandbox' | 'production') =>
                setFormData(prev => ({ ...prev, environment: value }))
              }
            >
              <SelectTrigger id="sepay-env" className="min-h-[44px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sandbox">Sandbox (Testing)</SelectItem>
                <SelectItem value="production">Production (Live)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Merchant ID */}
          <div className="space-y-2">
            <Label htmlFor="sepay-merchant">
              {t('settings.sepay.merchantId', 'Merchant ID')} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="sepay-merchant"
              type="text"
              placeholder="your-merchant-id"
              value={formData.merchant_id}
              onChange={(e) => setFormData(prev => ({ ...prev, merchant_id: e.target.value }))}
              className="min-h-[44px] text-base font-mono"
            />
          </div>

          {/* Secret Key */}
          <div className="space-y-2">
            <Label htmlFor="sepay-secret">
              {t('settings.sepay.secretKey', 'Secret Key')} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="sepay-secret"
              type="password"
              placeholder="••••••••••••"
              value={formData.secret_key}
              onChange={(e) => setFormData(prev => ({ ...prev, secret_key: e.target.value }))}
              className="min-h-[44px] text-base font-mono"
            />
            <p className="text-xs text-muted-foreground">
              {t('settings.sepay.secretKeyHelp', 'Your secret key is stored securely and never exposed to the client.')}
            </p>
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
              {t('settings.sepay.clear', 'Remove SePay Config')}
            </Button>
          )}
          <div className="flex-1" />
          <Button
            onClick={handleSave}
            disabled={isSaving || !formData.merchant_id || !formData.secret_key}
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
