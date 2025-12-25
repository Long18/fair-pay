/**
 * Centralized locale configuration for the application
 * Default locale is set to Vietnamese (vi-VN)
 * To change the application locale, modify the DEFAULT_LOCALE constant
 */

export const DEFAULT_LOCALE = 'vi-VN';

export const DEFAULT_CURRENCY = 'VND';
export const DEFAULT_CURRENCY_SYMBOL = '₫';

export const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
};
