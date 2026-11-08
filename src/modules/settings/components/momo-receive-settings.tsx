/**
 * Per-user MoMo receive settings (all authenticated users).
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { isBankSettingsDevPreviewEnabled } from '@/lib/bank/dev-preview-bank-settings';
import { MomoBankSettingsForm } from './momo-bank-settings-form';

export function MomoReceiveSettings() {
  const { t } = useTranslation();

  return (
    <Card className="rounded-xl border border-border/60 shadow-none">
      <CardHeader>
        <CardTitle>{t('settings.momoReceive.title', 'MoMo receive settings')}</CardTitle>
        <CardDescription>
          {t(
            'settings.momoReceive.pageDescription',
            'Name and phone are enough for friends to pay you. Confirm MoMo receipts manually in FairPay.'
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isBankSettingsDevPreviewEnabled() && (
          <p className="rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            {t('settings.bank.devPreviewHint', 'Using sample data (dev preview).')}
          </p>
        )}
        <MomoBankSettingsForm />
      </CardContent>
    </Card>
  );
}
