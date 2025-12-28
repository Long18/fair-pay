import React, { useState } from 'react';
import { useGetIdentity } from '@refinedev/core';
import { Profile } from '@/modules/profile/types';
import { useTranslation } from 'react-i18next';
import { useDonationSettings } from '@/hooks/use-donation-settings';
import { DonationDialog } from './DonationDialog';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

export function DonationWidget() {
  const { data: identity } = useGetIdentity<Profile>();
  const { i18n } = useTranslation();
  const { data: settings, isLoading } = useDonationSettings();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const isAuthenticated = !!identity;
  const currentLang = i18n.language as 'en' | 'vi';

  if (isLoading || !settings || !settings.is_enabled || !isAuthenticated) {
    return null;
  }

  const ctaText = settings.cta_text[currentLang] || settings.cta_text.en;
  const avatarUrl = settings.avatar_image_url;

  return (
    <>
      <TooltipProvider delayDuration={300}>
        <div className="fixed bottom-6 left-6 z-50">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                onClick={() => setIsDialogOpen(true)}
                className={cn(
                  'h-14 w-14 rounded-full shadow-xl',
                  'bg-gradient-to-br from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600',
                  'text-white',
                  'transition-all duration-300 ease-out',
                  'hover:scale-110 active:scale-95',
                  'hover:shadow-2xl hover:ring-4 hover:ring-pink-500/30',
                  'relative overflow-hidden group',
                  'animate-pulse'
                )}
                aria-label={ctaText}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent opacity-60" />

                <div className="absolute inset-0 rounded-full bg-pink-400 animate-ping opacity-20" />

                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Donate"
                    className="relative z-10 h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <Heart className="relative z-10 h-6 w-6 fill-current" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-medium shadow-lg">
              {ctaText}
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>

      <DonationDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        settings={settings}
      />
    </>
  );
}
