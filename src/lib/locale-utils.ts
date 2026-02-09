import { DEFAULT_LOCALE, DEFAULT_CURRENCY_SYMBOL, DATE_FORMAT_OPTIONS } from './locale-config';

/**
 * Format a number according to the application's locale
 */
export function formatNumber(value: number): string {
  return value.toLocaleString(DEFAULT_LOCALE);
}

/**
 * Format a currency amount with optional currency symbol
 * Rounds to nearest whole number for VND (>0.50 rounds up, ≤0.50 truncates)
 */
export function formatCurrency(amount: number, currency?: string): string {
  const rounded = Math.round(Math.abs(amount));
  const formattedAmount = rounded.toLocaleString(DEFAULT_LOCALE, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
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
