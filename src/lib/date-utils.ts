import { format, formatDistanceToNow, parse, isValid, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';

/**
 * Centralized date utilities using date-fns
 *
 * This is the SINGLE SOURCE for date formatting across the application.
 * Always use these functions instead of formatting dates manually.
 *
 * Benefits:
 * - Consistent formatting across the app
 * - Localization support (Vietnamese locale)
 * - Type safety
 * - Easy to update globally
 */
export const dateUtils = {
  /**
   * Format date as "25 Dec 2025"
   */
  formatDate: (date: Date | string) => {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, 'dd MMM yyyy');
  },

  /**
   * Format time as "14:30"
   */
  formatTime: (date: Date | string) => {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, 'HH:mm');
  },

  /**
   * Format full date and time as "25 Dec 2025 14:30"
   */
  formatDateTime: (date: Date | string) => {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, 'dd MMM yyyy HH:mm');
  },

  /**
   * Format short date as "25/12/2025"
   */
  formatShort: (date: Date | string) => {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, 'dd/MM/yyyy');
  },

  /**
   * Format relative time as "2 hours ago" or "in 3 days"
   * Uses Vietnamese locale
   */
  formatRelative: (date: Date | string) => {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return formatDistanceToNow(d, { addSuffix: true, locale: vi });
  },

  /**
   * Parse date string in format "yyyy-MM-dd"
   */
  parseDate: (dateString: string) => {
    return parse(dateString, 'yyyy-MM-dd', new Date());
  },

  /**
   * Parse ISO date string (from database)
   */
  parseISO: (dateString: string) => {
    return parseISO(dateString);
  },

  /**
   * Validate if a value is a valid date
   */
  isValidDate: (date: any) => {
    if (!date) return false;
    const d = typeof date === 'string' ? parseISO(date) : date;
    return isValid(d);
  },

  /**
   * Get current date as ISO string
   */
  now: () => new Date().toISOString(),

  /**
   * Format for date input fields (yyyy-MM-dd)
   */
  formatForInput: (date: Date | string) => {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, 'yyyy-MM-dd');
  },
};
