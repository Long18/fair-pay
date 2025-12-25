import { format, parse, parseISO, isValid } from 'date-fns';
import { vi, enUS } from 'date-fns/locale';

/**
 * Supported currencies with their formatting rules
 */
export const SUPPORTED_CURRENCIES = {
  VND: { symbol: '₫', decimals: 0, locale: 'vi-VN' },
  USD: { symbol: '$', decimals: 2, locale: 'en-US' },
  EUR: { symbol: '€', decimals: 2, locale: 'de-DE' },
  GBP: { symbol: '£', decimals: 2, locale: 'en-GB' },
  JPY: { symbol: '¥', decimals: 0, locale: 'ja-JP' },
  CNY: { symbol: '¥', decimals: 2, locale: 'zh-CN' },
  KRW: { symbol: '₩', decimals: 0, locale: 'ko-KR' },
  THB: { symbol: '฿', decimals: 2, locale: 'th-TH' },
  SGD: { symbol: 'S$', decimals: 2, locale: 'en-SG' },
} as const;

export type SupportedCurrency = keyof typeof SUPPORTED_CURRENCIES;

/**
 * Date format patterns
 */
export const DATE_FORMATS = {
  'DD/MM/YYYY': 'dd/MM/yyyy',
  'MM/DD/YYYY': 'MM/dd/yyyy',
  'YYYY-MM-DD': 'yyyy-MM-dd',
} as const;

export type DateFormatPattern = keyof typeof DATE_FORMATS;

/**
 * Get locale object for date-fns
 */
function getDateLocale(language: 'en' | 'vi' = 'vi') {
  return language === 'vi' ? vi : enUS;
}

/**
 * Format a date with the specified pattern
 *
 * @param date - Date string, Date object, or timestamp
 * @param formatPattern - Date format pattern ('DD/MM/YYYY', etc.)
 * @param language - Language for locale-specific formatting
 * @returns Formatted date string
 *
 * @example
 * formatDate('2024-12-26', 'DD/MM/YYYY') // '26/12/2024'
 * formatDate(new Date(), 'MM/DD/YYYY') // '12/26/2024'
 */
export function formatDate(
  date: string | Date | number,
  formatPattern: DateFormatPattern = 'DD/MM/YYYY',
  language: 'en' | 'vi' = 'vi'
): string {
  try {
    let dateObj: Date;

    if (typeof date === 'string') {
      // Try ISO format first
      dateObj = parseISO(date);

      if (!isValid(dateObj)) {
        // Try parsing with various formats
        const formats = ['yyyy-MM-dd', 'dd/MM/yyyy', 'MM/dd/yyyy'];
        for (const fmt of formats) {
          const parsed = parse(date, fmt, new Date());
          if (isValid(parsed)) {
            dateObj = parsed;
            break;
          }
        }
      }
    } else if (typeof date === 'number') {
      dateObj = new Date(date);
    } else {
      dateObj = date;
    }

    if (!isValid(dateObj)) {
      console.error('Invalid date:', date);
      return 'Invalid Date';
    }

    const pattern = DATE_FORMATS[formatPattern];
    const locale = getDateLocale(language);

    return format(dateObj, pattern, { locale });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
}

/**
 * Format a date with time
 *
 * @example
 * formatDateTime('2024-12-26T10:30:00') // '26/12/2024 10:30'
 */
export function formatDateTime(
  date: string | Date | number,
  formatPattern: DateFormatPattern = 'DD/MM/YYYY',
  language: 'en' | 'vi' = 'vi'
): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);

    if (!isValid(dateObj)) {
      return 'Invalid Date';
    }

    const pattern = `${DATE_FORMATS[formatPattern]} HH:mm`;
    const locale = getDateLocale(language);

    return format(dateObj, pattern, { locale });
  } catch (error) {
    console.error('Error formatting datetime:', error);
    return 'Invalid Date';
  }
}

/**
 * Format a date as relative time (e.g., "2 hours ago", "yesterday")
 *
 * @example
 * formatRelativeDate(new Date()) // 'just now'
 * formatRelativeDate(Date.now() - 3600000) // '1 hour ago'
 */
export function formatRelativeDate(
  date: string | Date | number,
  language: 'en' | 'vi' = 'vi'
): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);

    if (!isValid(dateObj)) {
      return 'Invalid Date';
    }

    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    const strings = {
      en: {
        justNow: 'just now',
        minutesAgo: (n: number) => `${n} minute${n !== 1 ? 's' : ''} ago`,
        hoursAgo: (n: number) => `${n} hour${n !== 1 ? 's' : ''} ago`,
        yesterday: 'yesterday',
        daysAgo: (n: number) => `${n} day${n !== 1 ? 's' : ''} ago`,
      },
      vi: {
        justNow: 'vừa xong',
        minutesAgo: (n: number) => `${n} phút trước`,
        hoursAgo: (n: number) => `${n} giờ trước`,
        yesterday: 'hôm qua',
        daysAgo: (n: number) => `${n} ngày trước`,
      },
    };

    const t = strings[language];

    if (diffSec < 60) return t.justNow;
    if (diffMin < 60) return t.minutesAgo(diffMin);
    if (diffHour < 24) return t.hoursAgo(diffHour);
    if (diffDay === 1) return t.yesterday;
    if (diffDay < 7) return t.daysAgo(diffDay);

    // More than a week, show formatted date
    return formatDate(dateObj, 'DD/MM/YYYY', language);
  } catch (error) {
    console.error('Error formatting relative date:', error);
    return 'Invalid Date';
  }
}

/**
 * Parse a date string to Date object
 *
 * @param dateStr - Date string to parse
 * @param formatPattern - Expected format pattern
 * @returns Date object or null if invalid
 */
export function parseDate(
  dateStr: string,
  formatPattern: DateFormatPattern = 'DD/MM/YYYY'
): Date | null {
  try {
    const pattern = DATE_FORMATS[formatPattern];
    const parsed = parse(dateStr, pattern, new Date());

    return isValid(parsed) ? parsed : null;
  } catch (error) {
    console.error('Error parsing date:', error);
    return null;
  }
}

/**
 * Format currency amount with locale-specific formatting
 *
 * @param amount - Number to format
 * @param currency - Currency code (VND, USD, etc.)
 * @param options - Additional formatting options
 * @returns Formatted currency string
 *
 * @example
 * formatCurrency(1000000, 'VND') // '1.000.000₫'
 * formatCurrency(1234.56, 'USD') // '$1,234.56'
 */
export function formatCurrency(
  amount: number,
  currency: SupportedCurrency = 'VND',
  options: {
    showSymbol?: boolean;
    compact?: boolean;
    signDisplay?: 'auto' | 'always' | 'never';
  } = {}
): string {
  const { showSymbol = true, compact = false, signDisplay = 'auto' } = options;

  try {
    const currencyInfo = SUPPORTED_CURRENCIES[currency];

    if (!currencyInfo) {
      console.error('Unsupported currency:', currency);
      return amount.toString();
    }

    const { locale, decimals, symbol } = currencyInfo;

    let formatted: string;

    if (compact && Math.abs(amount) >= 1000) {
      // Compact notation for large numbers
      formatted = new Intl.NumberFormat(locale, {
        notation: 'compact',
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
        signDisplay,
      }).format(amount);
    } else {
      // Standard notation
      formatted = new Intl.NumberFormat(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
        signDisplay,
      }).format(amount);
    }

    if (showSymbol) {
      // Currency symbol placement depends on locale
      if (currency === 'VND') {
        return `${formatted}${symbol}`;
      } else {
        return `${symbol}${formatted}`;
      }
    }

    return formatted;
  } catch (error) {
    console.error('Error formatting currency:', error);
    return amount.toString();
  }
}

/**
 * Format a number with locale-specific formatting
 *
 * @param num - Number to format
 * @param locale - Locale string (vi-VN, en-US, etc.)
 * @param options - Intl.NumberFormat options
 * @returns Formatted number string
 *
 * @example
 * formatNumber(1234.56, 'vi-VN') // '1.234,56'
 * formatNumber(1234.56, 'en-US') // '1,234.56'
 */
export function formatNumber(
  num: number,
  locale: string = 'vi-VN',
  options: Intl.NumberFormatOptions = {}
): string {
  try {
    return new Intl.NumberFormat(locale, options).format(num);
  } catch (error) {
    console.error('Error formatting number:', error);
    return num.toString();
  }
}

/**
 * Parse a currency string to number
 *
 * @param str - Currency string to parse (e.g., '1.000.000₫', '$1,234.56')
 * @param currency - Expected currency
 * @returns Parsed number or null if invalid
 */
export function parseCurrency(
  str: string,
  currency: SupportedCurrency = 'VND'
): number | null {
  try {
    const currencyInfo = SUPPORTED_CURRENCIES[currency];

    if (!currencyInfo) {
      return null;
    }

    // Remove currency symbol and spaces
    let cleaned = str.replace(currencyInfo.symbol, '').trim();

    // Handle different decimal separators based on locale
    if (currencyInfo.locale.startsWith('vi')) {
      // Vietnamese: 1.000.000,50 -> 1000000.50
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // English/others: 1,000,000.50 -> 1000000.50
      cleaned = cleaned.replace(/,/g, '');
    }

    const parsed = parseFloat(cleaned);

    return isNaN(parsed) ? null : parsed;
  } catch (error) {
    console.error('Error parsing currency:', error);
    return null;
  }
}

/**
 * Format percentage
 *
 * @example
 * formatPercentage(0.156) // '15.6%'
 * formatPercentage(0.5, 0) // '50%'
 */
export function formatPercentage(
  value: number,
  decimals: number = 1
): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format file size
 *
 * @example
 * formatFileSize(1024) // '1.0 KB'
 * formatFileSize(1536000) // '1.5 MB'
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * Truncate text with ellipsis
 *
 * @example
 * truncateText('Long description here', 10) // 'Long desc...'
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Format phone number (Vietnamese format)
 *
 * @example
 * formatPhoneNumber('0912345678') // '091 234 5678'
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  }

  return phone;
}
