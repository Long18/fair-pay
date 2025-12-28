import React from 'react';
import { useTranslation } from 'react-i18next';
import { DonationSettings } from '@/types/donation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Heart } from 'lucide-react';

interface DonationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: DonationSettings;
}

export function DonationDialog({ open, onOpenChange, settings }: DonationDialogProps) {
  const { i18n } = useTranslation();
  const currentLang = i18n.language as 'en' | 'vi';

  const donateMessage = settings.donate_message[currentLang] || settings.donate_message.en;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            {settings.cta_text[currentLang] || settings.cta_text.en}
          </DialogTitle>
          <DialogDescription>
            {donateMessage}
          </DialogDescription>
        </DialogHeader>

        {settings.qr_code_image_url && (
          <>
            <Separator />
            <div className="flex justify-center py-4">
              <div className="relative w-64 h-64 rounded-lg border bg-white p-2">
                <img
                  src={settings.qr_code_image_url}
                  alt="QR Code"
                  className="h-full w-full object-contain"
                />
              </div>
            </div>
          </>
        )}

        {settings.bank_info && (
          <>
            <Separator />
            <div className="space-y-2 text-sm">
              {settings.bank_info.accountName && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Account Name:</span>
                  <span className="font-medium">{settings.bank_info.accountName}</span>
                </div>
              )}
              {settings.bank_info.account && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Account:</span>
                  <span className="font-medium">{settings.bank_info.account}</span>
                </div>
              )}
              {settings.bank_info.bank && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bank:</span>
                  <span className="font-medium">{settings.bank_info.bank}</span>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
