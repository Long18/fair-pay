import { DEFAULT_LOCALE, DEFAULT_CURRENCY_SYMBOL, DATE_FORMAT_OPTIONS } from './locale-config';

/**
 * Format a number according to the application's locale
 */
export function formatNumber(value: number): string {
  return value.toLocaleString(DEFAULT_LOCALE);
}

/**
 * Format a currency amount with optional currency symbol
 */
export function formatCurrency(amount: number, currency?: string): string {
  const formattedAmount = Math.abs(amount).toLocaleString(DEFAULT_LOCALE);
  const currencySymbol = currency || DEFAULT_CURRENCY_SYMBOL;
  return `${formattedAmount} ${currencySymbol}`;
}

/**
 * Format a date according to the application's locale
 */
export function formatDate(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = DATE_FORMAT_OPTIONS
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString(DEFAULT_LOCALE, options);
}

/**
 * Format a date with short format (numeric)
 */
export function formatDateShort(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString(DEFAULT_LOCALE);
}
