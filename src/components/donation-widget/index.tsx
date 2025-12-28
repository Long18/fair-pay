import React, { useState } from 'react';
import { useGetIdentity } from '@refinedev/core';
import { Profile } from '@/modules/profile/types';
import { useTranslation } from 'react-i18next';
import { useDonationSettings } from '@/hooks/use-donation-settings';
import { DonationDialog } from './DonationDialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

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
        @keyframes float {
          0%, 100% {
            transform: translate(0, 0);
          }
          25% {
            transform: translate(8px, -25px);
          }
          50% {
            transform: translate(-8px, -35px);
          }
          75% {
            transform: translate(-10px, -20px);
          }
        }

        @keyframes float-mobile {
          0%, 100% {
            transform: translate(0, 0);
          }
          25% {
            transform: translate(5px, -20px);
          }
          50% {
            transform: translate(-5px, -28px);
          }
          75% {
            transform: translate(-6px, -15px);
          }
        }

        .floating-widget {
          animation: float-mobile 8s ease-in-out infinite;
        }

        @media (min-width: 640px) {
          .floating-widget {
            animation: float 8s ease-in-out infinite;
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
                    <Heart className="h-8 w-8 text-white fill-current" />
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

