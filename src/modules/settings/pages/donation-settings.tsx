import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDonationSettings, useUpdateDonationSettings, uploadDonationImage } from '@/hooks/settings/use-donation-settings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { VIETQR_BANKS } from '@/lib/vietqr-banks';

import { Loader2Icon, UploadIcon } from "@/components/ui/icons";
export const DonationSettings = () => {
  const { t, i18n } = useTranslation();
  const { data: settings, isLoading } = useDonationSettings();
  const updateSettings = useUpdateDonationSettings();

  const [isEnabled, setIsEnabled] = useState(false);
  const [ctaTextEn, setCtaTextEn] = useState('');
  const [ctaTextVi, setCtaTextVi] = useState('');
  const [donateMessageEn, setDonateMessageEn] = useState('');
  const [donateMessageVi, setDonateMessageVi] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [qrCodeFile, setQrCodeFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Bank info state
  const [bankApp, setBankApp] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [accountName, setAccountName] = useState('');

  useEffect(() => {
    if (settings) {
      setIsEnabled(settings.is_enabled);
      setCtaTextEn(settings.cta_text.en);
      setCtaTextVi(settings.cta_text.vi);
      setDonateMessageEn(settings.donate_message.en);
      setDonateMessageVi(settings.donate_message.vi);
      setAvatarUrl(settings.avatar_image_url || '');
      setQrCodeUrl(settings.qr_code_image_url || '');

      // Load bank info
      if (settings.bank_info) {
        setBankApp(settings.bank_info.app || '');
        setBankAccount(settings.bank_info.account || '');
        setBankCode(settings.bank_info.bank || '');
        setAccountName(settings.bank_info.accountName || '');
      }
    }
  }, [settings]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleQrCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setQrCodeFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setQrCodeUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    try {
      setUploading(true);

      let newAvatarUrl = avatarUrl;
      let newQrCodeUrl = qrCodeUrl;

      if (avatarFile) {
        newAvatarUrl = await uploadDonationImage(avatarFile, 'avatar');
      }

      if (qrCodeFile) {
        newQrCodeUrl = await uploadDonationImage(qrCodeFile, 'qr-code');
      }

      await updateSettings.mutateAsync({
        is_enabled: isEnabled,
        avatar_image_url: newAvatarUrl || null,
        qr_code_image_url: newQrCodeUrl || null,
        cta_text: { en: ctaTextEn, vi: ctaTextVi },
        donate_message: { en: donateMessageEn, vi: donateMessageVi },
        bank_info: {
          app: bankApp || undefined,
          account: bankAccount || undefined,
          bank: bankCode || undefined,
          accountName: accountName || undefined,
        },
      });

      toast.success(t('settings.donation.saved', 'Donation settings saved successfully'));
      setAvatarFile(null);
      setQrCodeFile(null);
    } catch (error) {
      console.error('Error saving donation settings:', error);
      toast.error(t('settings.donation.error', 'Failed to save donation settings'));
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2Icon className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          {t('settings.donation.title', 'Donation Widget Settings')}
        </h2>
        <p className="text-muted-foreground">
          {t('settings.donation.description', 'Configure the donation widget for your FairPay instance')}
        </p>
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('settings.donation.enableWidget', 'Enable Widget')}</CardTitle>
              <CardDescription>
                {t('settings.donation.enableWidgetDescription', 'Show the donation widget to authenticated users')}
              </CardDescription>
            </div>
            <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.donation.images', 'Images')}</CardTitle>
          <CardDescription>
            {t('settings.donation.imagesDescription', 'Upload avatar and QR code images')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="avatar">{t('settings.donation.avatar', 'Avatar Image')}</Label>
            <div className="flex items-center gap-4">
              {avatarUrl && (
                <div className="relative h-20 w-20 rounded-full overflow-hidden border">
                  <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                </div>
              )}
              <div className="flex-1">
                <Input
                  id="avatar"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="qrCode">{t('settings.donation.qrCode', 'QR Code Image')}</Label>
            <div className="flex items-center gap-4">
              {qrCodeUrl && (
                <div className="relative h-32 w-32 rounded border">
                  <img src={qrCodeUrl} alt="QR Code" className="h-full w-full object-contain" />
                </div>
              )}
              <div className="flex-1">
                <Input
                  id="qrCode"
                  type="file"
                  accept="image/*"
                  onChange={handleQrCodeChange}
                  className="cursor-pointer"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.donation.bankInfo', 'Bank Information')}</CardTitle>
          <CardDescription>
            {t('settings.donation.bankInfoDescription', 'Configure VietQR bank information for direct app deeplinks')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bankApp">{t('settings.donation.bankApp', 'Bank App')}</Label>
            <Select value={bankApp} onValueChange={setBankApp}>
              <SelectTrigger>
                <SelectValue placeholder={t('settings.donation.selectBank', 'Select bank app')} />
              </SelectTrigger>
              <SelectContent>
                {VIETQR_BANKS.map((bank) => (
                  <SelectItem key={bank.id} value={bank.id}>
                    {bank.name} ({bank.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountName">{t('settings.donation.accountName', 'Account Holder Name')}</Label>
            <Input
              id="accountName"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="NGUYEN VAN A"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bankAccount">{t('settings.donation.bankAccount', 'Account Number')}</Label>
            <Input
              id="bankAccount"
              value={bankAccount}
              onChange={(e) => setBankAccount(e.target.value)}
              placeholder="1234567890"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bankCode">{t('settings.donation.bankCode', 'Bank Code')}</Label>
            <Input
              id="bankCode"
              value={bankCode}
              onChange={(e) => setBankCode(e.target.value)}
              placeholder="VCB"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.donation.text', 'Text Content')}</CardTitle>
          <CardDescription>
            {t('settings.donation.textDescription', 'Customize text in different languages')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="en" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="en">English</TabsTrigger>
              <TabsTrigger value="vi">Tiếng Việt</TabsTrigger>
            </TabsList>

            <TabsContent value="en" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ctaEn">{t('settings.donation.ctaText', 'Call-to-Action Text')}</Label>
                <Input
                  id="ctaEn"
                  value={ctaTextEn}
                  onChange={(e) => setCtaTextEn(e.target.value)}
                  placeholder="Support FairPay"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="messageEn">{t('settings.donation.donateMessage', 'Donation Message')}</Label>
                <Textarea
                  id="messageEn"
                  value={donateMessageEn}
                  onChange={(e) => setDonateMessageEn(e.target.value)}
                  placeholder="Thank you for your support!"
                  rows={4}
                />
              </div>
            </TabsContent>

            <TabsContent value="vi" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ctaVi">{t('settings.donation.ctaText', 'Call-to-Action Text')}</Label>
                <Input
                  id="ctaVi"
                  value={ctaTextVi}
                  onChange={(e) => setCtaTextVi(e.target.value)}
                  placeholder="Ủng hộ FairPay"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="messageVi">{t('settings.donation.donateMessage', 'Donation Message')}</Label>
                <Textarea
                  id="messageVi"
                  value={donateMessageVi}
                  onChange={(e) => setDonateMessageVi(e.target.value)}
                  placeholder="Cảm ơn bạn đã ủng hộ!"
                  rows={4}
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={uploading || updateSettings.isPending}
          size="lg"
        >
          {uploading || updateSettings.isPending ? (
            <>
              <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              {t('common.saving', 'Saving...')}
            </>
          ) : (
            t('common.save', 'Save Changes')
          )}
        </Button>
      </div>
    </div>
  );
};
