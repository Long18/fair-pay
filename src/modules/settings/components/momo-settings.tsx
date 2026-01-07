import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGetIdentity } from '@refinedev/core';
import { Profile } from '@/modules/profile/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { AlertCircleIcon, CheckIcon, SettingsIcon } from '@/components/ui/icons';
import { useMomoSettings } from '@/hooks/use-momo-settings';

export function MomoSettings() {
  const { t } = useTranslation();
  const { data: identity } = useGetIdentity<Profile>();
  const { settings, isLoading, updateSettings, isAdmin } = useMomoSettings();
  const [formData, setFormData] = useState({
    receiver_phone: '',
    receiver_name: '',
    enabled: true,
  });
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form data when settings load
  React.useEffect(() => {
    if (settings) {
      setFormData({
        receiver_phone: settings.receiver_phone || '',
        receiver_name: settings.receiver_name || '',
        enabled: settings.enabled ?? true,
      });
    }
  }, [settings]);

  const handleSave = async () => {
    if (!formData.receiver_phone) {
      toast.error(t('settings.momo.phoneRequired', 'Receiver phone is required'));
      return;
    }

    setIsSaving(true);
    try {
      await updateSettings(formData);
      toast.success(t('settings.momo.saved', 'MoMo settings saved successfully'));
    } catch (error) {
      console.error('Error saving MoMo settings:', error);
      toast.error(t('settings.momo.saveError', 'Failed to save MoMo settings'));
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            {t('settings.momo.title', 'MoMo Payment Settings')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircleIcon className="h-4 w-4" />
            <AlertDescription>
              {t('settings.momo.adminOnly', 'Only administrators can configure MoMo settings')}
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
          <SettingsIcon className="h-5 w-5" />
          {t('settings.momo.title', 'MoMo Payment Settings')}
        </CardTitle>
        <CardDescription>
          {t('settings.momo.description', 'Configure MoMo payment integration for expense settlements')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Switch */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="momo-enabled">
              {t('settings.momo.enable', 'Enable MoMo Payments')}
            </Label>
            <p className="text-sm text-muted-foreground">
              {t('settings.momo.enableDescription', 'Allow users to pay via MoMo')}
            </p>
          </div>
          <Switch
            id="momo-enabled"
            checked={formData.enabled}
            onCheckedChange={(checked) =>
              setFormData(prev => ({ ...prev, enabled: checked }))
            }
          />
        </div>

        <Separator />

        {/* Receiver Phone */}
        <div className="space-y-2">
          <Label htmlFor="receiver-phone">
            {t('settings.momo.receiverPhone', 'Receiver Phone Number')}
          </Label>
          <Input
            id="receiver-phone"
            type="tel"
            placeholder="0918399443"
            value={formData.receiver_phone}
            onChange={(e) =>
              setFormData(prev => ({ ...prev, receiver_phone: e.target.value }))
            }
            disabled={!formData.enabled}
          />
          <p className="text-sm text-muted-foreground">
            {t('settings.momo.receiverPhoneHelp', 'The MoMo phone number that will receive payments')}
          </p>
        </div>

        {/* Receiver Name */}
        <div className="space-y-2">
          <Label htmlFor="receiver-name">
            {t('settings.momo.receiverName', 'Receiver Name')}
          </Label>
          <Input
            id="receiver-name"
            type="text"
            placeholder={t('settings.momo.receiverNamePlaceholder', 'Your name or organization')}
            value={formData.receiver_name}
            onChange={(e) =>
              setFormData(prev => ({ ...prev, receiver_name: e.target.value }))
            }
            disabled={!formData.enabled}
          />
        </div>

        {/* API Configuration Status */}
        <Alert>
          <AlertCircleIcon className="h-4 w-4" />
          <AlertDescription>
            {import.meta.env.VITE_MOMO_ACCESS_TOKEN ? (
              <span className="text-green-600">
                {t('settings.momo.apiConfigured', '✓ MoMo API is configured')}
              </span>
            ) : (
              <span className="text-amber-600">
                {t('settings.momo.apiNotConfigured',
                  '⚠ MoMo API token not configured. Set VITE_MOMO_ACCESS_TOKEN in environment variables.'
                )}
              </span>
            )}
          </AlertDescription>
        </Alert>

        {/* Webhook URL Info */}
        <div className="space-y-2">
          <Label>{t('settings.momo.webhookUrl', 'Webhook URL')}</Label>
          <div className="p-3 bg-muted rounded-lg">
            <code className="text-sm break-all">
              {window.location.origin}/api/webhooks/momo
            </code>
          </div>
          <p className="text-sm text-muted-foreground">
            {t('settings.momo.webhookHelp',
              'Configure this URL in your MoMo API dashboard to receive payment notifications'
            )}
          </p>
        </div>

        <Separator />

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={isSaving || isLoading}
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
