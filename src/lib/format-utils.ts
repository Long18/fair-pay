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

// Bounded key space (locale x decimals x signDisplay x compact), safe to cache.
const numberFormatterCache = new Map<string, Intl.NumberFormat>();
function getCachedNumberFormatter(
  locale: string,
  options: Intl.NumberFormatOptions
): Intl.NumberFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let formatter = numberFormatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, options);
    numberFormatterCache.set(key, formatter);
  }
  return formatter;
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

    // Round to whole number for zero-decimal currencies (VND, JPY, KRW)
    const roundedAmount = decimals === 0 ? Math.round(amount) : amount;

    if (compact && Math.abs(roundedAmount) >= 1000) {
      // Compact notation for large numbers
      formatted = getCachedNumberFormatter(locale, {
        notation: 'compact',
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
        signDisplay,
      }).format(roundedAmount);
    } else {
      // Standard notation
      formatted = getCachedNumberFormatter(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
        signDisplay,
      }).format(roundedAmount);
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

