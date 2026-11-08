/**
 * Bank Account settings — VietQR (admin-only).
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useGo } from '@refinedev/core';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { isBankSettingsDevPreviewEnabled } from '@/lib/bank/dev-preview-bank-settings';
import { VietqrBankSettingsForm } from './vietqr-bank-settings-form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BanknoteIcon, LockIcon } from '@/components/ui/icons';
import { useAdminAccess } from '@/modules/admin/hooks/use-admin-access';
import { useHaptics } from '@/hooks/use-haptics';

export function BankSettings() {
  const { t } = useTranslation();
  const { isAdmin, isLoading: adminLoading } = useAdminAccess();
  const go = useGo();
  const { tap } = useHaptics();

  if (adminLoading) {
    return (
      <Card className="rounded-xl border border-border/60 shadow-none">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!isAdmin) {
    return (
      <Card className="rounded-xl border border-border/60 shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BanknoteIcon className="h-5 w-5" />
            {t('settings.bank.title', 'Bank Account Settings')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <LockIcon className="h-4 w-4" />
            <AlertDescription>
              {t(
                'settings.bank.adminOnly',
                'VietQR bank setup is available to administrators only. Configure MoMo to receive payments from friends.'
              )}
            </AlertDescription>
          </Alert>
          <Button
            variant="outline"
            onClick={() => {
              tap();
              go({ to: '/settings/momo' });
            }}
          >
            {t('settings.momoReceive.openSettings', 'Go to MoMo settings')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl border border-border/60 shadow-none">
      <CardHeader>
        <CardTitle>{t('settings.bank.title', 'Bank Account Settings')}</CardTitle>
        <CardDescription>
          {t(
            'settings.bank.adminPageDescription',
            'Configure your bank account so others can pay you via VietQR.'
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isBankSettingsDevPreviewEnabled() && (
          <p className="rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            {t('settings.bank.devPreviewHint', 'Using sample data (dev preview).')}
          </p>
        )}
        <VietqrBankSettingsForm />
      </CardContent>
    </Card>
  );
}
