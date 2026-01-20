/**
 * Mobile Utilities
 *
 * Touch target helpers and mobile-specific utilities
 * following Apple HIG and Material Design guidelines.
 */

import { cn } from './utils';

/**
 * Minimum touch target size (44px × 44px)
 * Apple HIG: https://developer.apple.com/design/human-interface-guidelines/accessibility
 * Material Design: https://m3.material.io/foundations/accessible-design/accessibility-basics
 */
export const TOUCH_TARGET_MIN = 44;

/**
 * Creates touch-friendly class names with minimum 44px target size
 *
 * @example
 * <Button className={touchTarget()}>Pay Now</Button>
 * <IconButton className={touchTarget('p-2')}>...</IconButton>
 */
export const touchTarget = (className?: string) =>
  cn('min-h-[44px] min-w-[44px] touch-manipulation', className);

/**
 * Creates touch-friendly class names for inline elements
 * Adds padding to create larger hit area without changing visual size
 */
export const touchTargetInline = (className?: string) =>
  cn('relative -m-2 p-2 touch-manipulation', className);

/**
 * Check if device supports touch
 */
export const isTouchDevice = () =>
  typeof window !== 'undefined' &&
  ('ontouchstart' in window || navigator.maxTouchPoints > 0);

/**
 * Check if running on iOS
 */
export const isIOS = () =>
  typeof navigator !== 'undefined' &&
  /iPad|iPhone|iPod/.test(navigator.userAgent);

/**
 * Check if running on Android
 */
export const isAndroid = () =>
  typeof navigator !== 'undefined' && /Android/.test(navigator.userAgent);

/**
 * Check if running in standalone mode (PWA)
 */
export const isPWA = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true);

/**
 * Prevent iOS zoom on input focus
 * Call this on input focus to prevent viewport zoom
 */
export const preventIOSZoom = () => {
  if (!isIOS()) return;

  const viewport = document.querySelector('meta[name=viewport]');
  if (viewport) {
    const content = viewport.getAttribute('content') || '';
    if (!content.includes('maximum-scale')) {
      viewport.setAttribute(
        'content',
        `${content}, maximum-scale=1.0, user-scalable=no`
      );
    }
  }
};

/**
 * Safe area inset values (for iOS notch)
 */
export const getSafeAreaInsets = () => {
  if (typeof window === 'undefined') {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  const style = getComputedStyle(document.documentElement);
  return {
    top: parseInt(style.getPropertyValue('--sat') || '0', 10),
    right: parseInt(style.getPropertyValue('--sar') || '0', 10),
    bottom: parseInt(style.getPropertyValue('--sab') || '0', 10),
    left: parseInt(style.getPropertyValue('--sal') || '0', 10),
  };
};
