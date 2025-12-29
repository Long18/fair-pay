import React, { useState } from 'react';
import { useGetIdentity } from '@refinedev/core';
import { Profile } from '@/modules/profile/types';
import { useTranslation } from 'react-i18next';
import { useDonationSettings } from '@/hooks/use-donation-settings';
import { DonationDialog } from './DonationDialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import { HeartIcon } from "@/components/ui/icons";
// Admin email that can always see the widget (even when disabled)
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'admin@fairpay.com';

export function DonationWidget() {
  const { data: identity } = useGetIdentity<Profile>();
  const { i18n } = useTranslation();
  const { data: settings, isLoading } = useDonationSettings();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const currentLang = i18n.language as 'en' | 'vi';
  const isAdmin = identity?.email === ADMIN_EMAIL;

  // Show widget if enabled OR if user is admin
  // Widget is now visible to all users (authenticated and anonymous)
  if (isLoading || !settings) {
    return null;
  }

  // Only show if enabled or admin is viewing
  if (!settings.is_enabled && !isAdmin) {
    return null;
  }

  const ctaText = settings.cta_text[currentLang] || settings.cta_text.en;
  const avatarUrl = settings.avatar_image_url;

  return (
    <>
      <style>{`
        @keyframes float-fullscreen {
          0%, 100% {
            transform: translate(0, 0);
          }
          25% {
            transform: translate(calc(100vw - 120px), -30px);
          }
          50% {
            transform: translate(calc(50vw - 60px), -50px);
          }
          75% {
            transform: translate(calc(80vw - 100px), -25px);
          }
        }

        @keyframes float-mobile {
          0%, 100% {
            transform: translate(0, 0);
          }
          25% {
            transform: translate(calc(100vw - 100px), -25px);
          }
          50% {
            transform: translate(calc(60vw - 80px), -40px);
          }
          75% {
            transform: translate(calc(30vw - 60px), -20px);
          }
        }

        .floating-widget {
          animation: float-mobile 12s ease-in-out infinite;
        }

        @media (min-width: 640px) {
          .floating-widget {
            animation: float-fullscreen 12s ease-in-out infinite;
          }
        }
      `}</style>

      <TooltipProvider delayDuration={300}>
        <div className="fixed bottom-6 left-6 z-50 floating-widget">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setIsDialogOpen(true)}
                className={cn(
                  'h-16 w-16 rounded-full shadow-xl',
                  'bg-transparent border-2 border-white/20',
                  'transition-all duration-300 ease-out',
                  'hover:scale-110 active:scale-95',
                  'hover:shadow-2xl',
                  'relative overflow-hidden group',
                  'cursor-pointer'
                )}
                aria-label={ctaText}
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Donate"
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full w-full bg-gradient-to-br from-pink-500 to-red-500">
                    <HeartIcon className="h-8 w-8 text-white fill-current" />
                  </div>
                )}
              </button>
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
