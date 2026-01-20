/**
 * Haptic Feedback Utilities
 *
 * Provides tactile feedback for touch interactions on mobile devices.
 * Uses the Vibration API which is supported on most Android devices
 * and some iOS contexts (like PWAs).
 */

export type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

/**
 * Vibration patterns for different feedback types (in milliseconds)
 */
const HAPTIC_PATTERNS: Record<HapticType, number[]> = {
  light: [10],
  medium: [20],
  heavy: [30],
  success: [10, 50, 20],
  warning: [20, 50, 20],
  error: [30, 50, 30, 50, 30],
};

/**
 * Check if haptic feedback is available
 */
export const isHapticAvailable = () =>
  typeof navigator !== 'undefined' && 'vibrate' in navigator;

/**
 * Trigger haptic feedback
 *
 * @param type - The type of haptic feedback
 * @returns true if haptic was triggered, false otherwise
 *
 * @example
 * // On button click
 * <Button onClick={() => {
 *   triggerHaptic('medium');
 *   handleAction();
 * }}>
 *   Pay Now
 * </Button>
 *
 * @example
 * // On swipe action
 * onAction: () => {
 *   triggerHaptic('light');
 *   handleQuickSettle();
 * }
 *
 * @example
 * // On success
 * if (success) {
 *   triggerHaptic('success');
 *   showToast('Payment recorded!');
 * }
 */
export const triggerHaptic = (type: HapticType = 'light'): boolean => {
  if (!isHapticAvailable()) {
    return false;
  }

  try {
    const pattern = HAPTIC_PATTERNS[type];
    navigator.vibrate(pattern);
    return true;
  } catch (error) {
    console.warn('Haptic feedback failed:', error);
    return false;
  }
};

/**
 * Stop any ongoing vibration
 */
export const stopHaptic = (): boolean => {
  if (!isHapticAvailable()) {
    return false;
  }

  try {
    navigator.vibrate(0);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Create a button click handler with haptic feedback
 *
 * @param handler - The original click handler
 * @param hapticType - The type of haptic feedback (default: 'light')
 * @returns A wrapped handler with haptic feedback
 *
 * @example
 * <Button onClick={withHaptic(() => handleSubmit(), 'medium')}>
 *   Submit
 * </Button>
 */
export const withHaptic = <T extends (...args: any[]) => any>(
  handler: T,
  hapticType: HapticType = 'light'
): T => {
  return ((...args: Parameters<T>) => {
    triggerHaptic(hapticType);
    return handler(...args);
  }) as T;
};
