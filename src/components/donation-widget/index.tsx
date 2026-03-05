import React, { useState, useEffect, useRef } from 'react';
import { useGetIdentity } from '@refinedev/core';
import { Profile } from '@/modules/profile/types';
import { useTranslation } from 'react-i18next';
import { useDonationSettings } from '@/hooks/settings/use-donation-settings';
import { DonationDialog } from './DonationDialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/ui/use-mobile';

import { HeartIcon } from "@/components/ui/icons";
// Admin email that can always see the widget (even when disabled)
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'admin@fairpay.com';

export function DonationWidget() {
  const { data: identity } = useGetIdentity<Profile>();
  const { i18n } = useTranslation();
  const { data: settings, isLoading } = useDonationSettings();
  const isMobile = useIsMobile();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showRandomTooltip, setShowRandomTooltip] = useState(false);
  const tooltipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animationRef = useRef<HTMLDivElement>(null);

  const currentLang = i18n.language as 'en' | 'vi';
  const isAdmin = identity?.email === ADMIN_EMAIL;

  // Generate random duration between 10 seconds (10000ms) and 2 minutes (120000ms)
  const getRandomDuration = () => {
    const min = 10; // 10 seconds
    const max = 120; // 2 minutes
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  // Generate random delay for tooltip (10 seconds to 2 minutes)
  const getRandomTooltipDelay = () => {
    const min = 10000; // 10 seconds in ms
    const max = 120000; // 2 minutes in ms
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  // Set random animation duration on mount
  useEffect(() => {
    const clearTooltipTimers = () => {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
        tooltipTimeoutRef.current = null;
      }
      if (tooltipHideTimeoutRef.current) {
        clearTimeout(tooltipHideTimeoutRef.current);
        tooltipHideTimeoutRef.current = null;
      }
    };

    const updateAnimationDuration = () => {
      const duration = getRandomDuration();

      // Update CSS variable for animation duration
      if (animationRef.current) {
        const isDesktop = window.innerWidth >= 640;
        // Desktop keeps random roaming speed, mobile keeps signature horizontal motion.
        const finalDuration = isDesktop ? duration : 16;
        animationRef.current.style.setProperty('--animation-duration', `${finalDuration}s`);
      }
    };

    updateAnimationDuration();

    // Update on window resize
    const handleResize = () => {
      updateAnimationDuration();
    };
    window.addEventListener('resize', handleResize);

    // Set up random tooltip showing
    const scheduleRandomTooltip = () => {
      const delay = getRandomTooltipDelay();

      clearTooltipTimers();

      tooltipTimeoutRef.current = setTimeout(() => {
        setShowRandomTooltip(true);

        // Hide tooltip after 3 seconds
        tooltipHideTimeoutRef.current = setTimeout(() => {
          setShowRandomTooltip(false);
          // Schedule next random tooltip
          scheduleRandomTooltip();
        }, 3000);
      }, delay);
    };

    if (isDialogOpen || isMobile) {
      setShowRandomTooltip(false);
      clearTooltipTimers();
    } else {
      scheduleRandomTooltip();
    }

    return () => {
      clearTooltipTimers();
      window.removeEventListener('resize', handleResize);
    };
  }, [isDialogOpen, isMobile]);

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
            transform: translate(0, 0) scaleX(1);
          }
          12.5% {
            transform: translate(calc((100vw - 120px) * 0.5), -15px) scaleX(1);
          }
          25% {
            transform: translate(calc(100vw - 120px), -30px) scaleX(-1);
          }
          37.5% {
            transform: translate(calc((100vw - 120px) * 0.75), -40px) scaleX(-1);
          }
          50% {
            transform: translate(calc(50vw - 60px), -50px) scaleX(-1);
          }
          62.5% {
            transform: translate(calc((80vw - 100px) * 0.85), -37px) scaleX(-1);
          }
          75% {
            transform: translate(calc(80vw - 100px), -25px) scaleX(1);
          }
          87.5% {
            transform: translate(calc((80vw - 100px) * 0.4), -12px) scaleX(1);
          }
        }

        @keyframes float-mobile {
          0%, 100% {
            transform: translate3d(0, 0, 0) scaleX(1);
          }
          25% {
            transform: translate3d(calc((100vw - 5.5rem) * 0.45), -10px, 0) scaleX(1);
          }
          50% {
            transform: translate3d(calc(100vw - 5.5rem), -18px, 0) scaleX(-1);
          }
          75% {
            transform: translate3d(calc((100vw - 5.5rem) * 0.35), -8px, 0) scaleX(-1);
          }
        }

        .floating-widget {
          --animation-duration: 16s;
          animation: float-mobile var(--animation-duration) ease-in-out infinite;
        }

        @media (min-width: 640px) {
          .floating-widget {
            --animation-duration: 60s;
            animation: float-fullscreen var(--animation-duration) ease-in-out infinite;
          }
        }
      `}</style>

      <TooltipProvider delayDuration={300}>
        <div
          ref={animationRef}
          className={cn(
            "fixed z-40 floating-widget transition-opacity duration-200",
            "bottom-20 left-4 sm:bottom-6 sm:left-6",
            isDialogOpen && "pointer-events-none opacity-0"
          )}
          aria-hidden={isDialogOpen}
        >
          <Tooltip open={showRandomTooltip} onOpenChange={setShowRandomTooltip}>
            <TooltipTrigger asChild>
              <button
                onClick={() => setIsDialogOpen(true)}
                className={cn(
                  'h-14 w-14 sm:h-16 sm:w-16 rounded-full shadow-xl',
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
            <TooltipContent side={isMobile ? "top" : "right"} className="font-medium shadow-lg">
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
