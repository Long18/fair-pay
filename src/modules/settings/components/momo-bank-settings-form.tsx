/**
 * MoMo tab on Bank Account settings — manual QR receive (no auto-confirm).
 */

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useGetIdentity } from '@refinedev/core';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { AlertCircleIcon, CheckIcon, TrashIcon } from '@/components/ui/icons';
import {
  uploadMomoQrImage,
  useMomoInfoSettings,
} from '@/hooks/payment/use-momo-info-settings';
import { isUserSettingsMomoInfoColumnMissing } from '@/lib/supabase/postgrest-errors';
import { useHaptics } from '@/hooks/use-haptics';
import { useTrackEvent } from '@/hooks/use-track-event';
import { MomoInfo } from '@/types/user-settings';
import { Profile } from '@/modules/profile/types';
import { cn } from '@/lib/utils';
import { getSemanticStatusColors } from '@/lib/status-colors';

const errorColors = getSemanticStatusColors('error');

const emptyMomo: MomoInfo = {
  accountName: '',
  phone: '',
  qrCodeImageUrl: '',
};

export function MomoBankSettingsForm() {
  const { t } = useTranslation();
  const { success, warning } = useHaptics();
  const { data: identity } = useGetIdentity<Profile>();
  const {
    momoInfo,
    isLoading,
    isSaving,
    errorCode,
    saveMomoInfo,
    clearMomoInfo,
    isConfigured,
  } = useMomoInfoSettings();
  const { track } = useTrackEvent();

  const [formData, setFormData] = useState<MomoInfo>(emptyMomo);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const qrFileRef = useRef<File | null>(null);

  useEffect(() => {
    if (momoInfo) {
      setFormData({
        accountName: momoInfo.accountName || '',
        phone: momoInfo.phone || '',
        qrCodeImageUrl: momoInfo.qrCodeImageUrl || '',
      });
    }
  }, [momoInfo]);

  const handleQrChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    qrFileRef.current = file;
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({ ...prev, qrCodeImageUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const persistSave = async () => {
    if (!formData.accountName?.trim() || !formData.phone?.trim()) {
      toast.error(
        t('settings.bank.momo.allFieldsRequired', 'Full name and phone number are required')
      );
      return;
    }
    try {
      let qrUrl = formData.qrCodeImageUrl || '';
      if (qrFileRef.current && identity?.id) {
        qrUrl = await uploadMomoQrImage(identity.id, qrFileRef.current);
      }

      const payload: MomoInfo = {
        accountName: formData.accountName.trim(),
        phone: formData.phone.trim(),
        ...(qrUrl ? { qrCodeImageUrl: qrUrl } : {}),
      };

      await saveMomoInfo(payload);
      qrFileRef.current = null;
      success();
      track('settings_bank_momo_save_success');
      toast.success(t('settings.bank.momo.saved', 'MoMo settings saved successfully'));
    } catch (err) {
      track('settings_bank_momo_save_failed');
      toast.error(
        isUserSettingsMomoInfoColumnMissing(err) || errorCode === 'schema_not_ready'
          ? t(
              'settings.bank.momo.schemaNotReady',
              'MoMo settings are not available until the database migration is applied. Run `pnpm db:local:bootstrap` or `supabase db push` (migration 20261108103000_add_momo_info_to_user_settings.sql), then try again.'
            )
          : t('settings.bank.momo.saveError', 'Failed to save MoMo settings')
      );
    }
  };

  const handleSaveClick = () => {
    if (!formData.accountName?.trim() || !formData.phone?.trim()) {
      toast.error(
        t('settings.bank.momo.allFieldsRequired', 'Full name and phone number are required')
      );
      return;
    }
    setConfirmOpen(true);
  };

  const handleClear = async () => {
    warning();
    try {
      await clearMomoInfo();
      setFormData(emptyMomo);
      qrFileRef.current = null;
      toast.success(t('settings.bank.momo.cleared', 'MoMo settings cleared'));
    } catch (err) {
      toast.error(
        isUserSettingsMomoInfoColumnMissing(err) || errorCode === 'schema_not_ready'
          ? t(
              'settings.bank.momo.schemaNotReady',
              'MoMo settings are not available until the database migration is applied. Run `pnpm db:local:bootstrap` or `supabase db push` (migration 20261108103000_add_momo_info_to_user_settings.sql), then try again.'
            )
          : t('settings.bank.momo.clearError', 'Failed to clear MoMo settings')
      );
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {errorCode === 'schema_not_ready' ? (
        <Alert variant="destructive">
          <AlertCircleIcon className="h-4 w-4" />
          <AlertDescription>
            {t('settings.bank.momo.schemaNotReady')}
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="space-y-4 max-w-xl">
        <div className="space-y-2">
          <Label htmlFor="momo-name">
            {t('settings.bank.momo.accountName', 'Full name (account holder)')}{' '}
            <span className={errorColors.icon}>*</span>
          </Label>
          <Input
            id="momo-name"
            value={formData.accountName || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, accountName: e.target.value }))}
            placeholder={t('settings.bank.momo.accountNamePlaceholder', 'NGUYEN VAN A')}
            className="min-h-[44px] text-base"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="momo-phone">
            {t('settings.bank.momo.phone', 'Phone number')}{' '}
            <span className={errorColors.icon}>*</span>
          </Label>
          <Input
            id="momo-phone"
            type="tel"
            inputMode="tel"
            value={formData.phone || ''}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                phone: e.target.value.replace(/[^\d+]/g, ''),
              }))
            }
            placeholder="0901234567"
            className="min-h-[44px] text-base"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="momo-qr">
            {t('settings.bank.momo.qrCode', 'MoMo QR code image')}{' '}
            <span className="text-muted-foreground font-normal">
              ({t('common.optional', 'Optional')})
            </span>
          </Label>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            {formData.qrCodeImageUrl ? (
              <div className="h-40 w-40 shrink-0 rounded-lg border bg-white p-2">
                <img
                  src={formData.qrCodeImageUrl}
                  alt={t('settings.bank.momo.qrPreviewAlt', 'MoMo QR preview')}
                  className="h-full w-full object-contain"
                />
              </div>
            ) : null}
            <Input
              id="momo-qr"
              type="file"
              accept="image/*"
              onChange={handleQrChange}
              className="min-h-[44px] cursor-pointer"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {t('settings.bank.momo.qrHelp', 'Optional: upload a receive QR from the MoMo app.')}
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
            className={cn(errorColors.text, 'hover:opacity-80')}
          >
            <TrashIcon className="h-4 w-4 mr-2" />
            {t('settings.bank.momo.clear', 'Remove MoMo info')}
          </Button>
        )}
        <div className="flex-1" />
        <Button
          onClick={handleSaveClick}
          disabled={isSaving || !formData.accountName?.trim() || !formData.phone?.trim()}
        >
          <CheckIcon className="h-4 w-4 mr-2" />
          {isSaving
            ? t('common.saving', 'Saving...')
            : t('common.save', 'Save Changes')}
        </Button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('settings.bank.momo.confirmTitle', 'Confirm save MoMo settings')}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left space-y-2">
              <p>{t('settings.bank.momo.manualConfirmWarning')}</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async (e) => {
                e.preventDefault();
                setConfirmOpen(false);
                await persistSave();
              }}
            >
              {t('settings.bank.momo.confirmSave', 'Save anyway')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
