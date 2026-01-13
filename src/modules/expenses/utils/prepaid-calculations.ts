import {
  RecurringExpense,
  RecurringFrequency,
  PrepaidCoverageStatus,
  PrepaidCoverageInfo,
  calculateNextOccurrence,
} from '../types/recurring';

/**
 * Adjusts a date to a valid day if it falls on an invalid date
 * (e.g., Feb 30 → Feb 28/29)
 */
export function adjustToValidDate(date: Date): Date {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  // Get last day of month
  const lastDay = new Date(year, month + 1, 0).getDate();

  if (day > lastDay) {
    return new Date(year, month, lastDay);
  }

  return new Date(date);
}

/**
 * Calculates the prepaid_until date based on start date, periods, frequency, and interval
 * Handles month-end edge cases and caps at end_date if specified
 */
export function calculatePrepaidUntil(
  startDate: Date,
  periodsCount: number,
  frequency: RecurringFrequency,
  interval: number,
  endDate?: Date | null
): Date {
  let result = new Date(startDate);

  for (let i = 0; i < periodsCount; i++) {
    result = calculateNextOccurrence(result, frequency, interval);
  }

  // Handle month-end edge cases
  result = adjustToValidDate(result);

  // Cap at end_date if specified
  if (endDate && result > endDate) {
    return new Date(endDate);
  }

  return result;
}


/**
 * Gets the duration of a period in milliseconds (approximate for months/years)
 */
function getPeriodDurationMs(frequency: RecurringFrequency, interval: number): number {
  const DAY_MS = 24 * 60 * 60 * 1000;

  switch (frequency) {
    case 'weekly':
      return 7 * DAY_MS * interval;
    case 'bi_weekly':
      return 14 * DAY_MS * interval;
    case 'monthly':
      return 30 * DAY_MS * interval; // Approximate
    case 'quarterly':
      return 90 * DAY_MS * interval; // Approximate
    case 'yearly':
      return 365 * DAY_MS * interval; // Approximate
    case 'custom':
      return DAY_MS * interval;
    default:
      return 30 * DAY_MS * interval;
  }
}

/**
 * Calculates the number of remaining prepaid periods
 */
export function calculateRemainingPeriods(
  prepaidUntil: Date,
  currentDate: Date,
  frequency: RecurringFrequency,
  interval: number
): number {
  if (prepaidUntil <= currentDate) {
    return 0;
  }

  const periodDurationMs = getPeriodDurationMs(frequency, interval);
  const remainingMs = prepaidUntil.getTime() - currentDate.getTime();

  return Math.ceil(remainingMs / periodDurationMs);
}

/**
 * Gets the prepaid coverage status and info for a recurring expense
 */
export function getPrepaidCoverageStatus(
  recurring: RecurringExpense
): PrepaidCoverageInfo {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to start of day

  if (!recurring.prepaid_until) {
    return {
      status: 'none',
      prepaid_until: null,
      remaining_periods: 0,
      days_until_expiry: 0,
    };
  }

  const prepaidUntil = new Date(recurring.prepaid_until);
  prepaidUntil.setHours(0, 0, 0, 0); // Normalize to start of day

  const daysUntil = Math.ceil(
    (prepaidUntil.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  const remainingPeriods = calculateRemainingPeriods(
    prepaidUntil,
    today,
    recurring.frequency,
    recurring.interval
  );

  let status: PrepaidCoverageStatus;
  if (daysUntil <= 0) {
    status = 'expired';
  } else if (remainingPeriods <= 1) {
    status = 'expiring_soon';
  } else {
    status = 'active';
  }

  return {
    status,
    prepaid_until: recurring.prepaid_until,
    remaining_periods: remainingPeriods,
    days_until_expiry: Math.max(0, daysUntil),
  };
}

/**
 * Calculates the total prepaid amount for a given number of periods
 */
export function calculateTotalPrepaidAmount(
  periodAmount: number,
  periodsCount: number
): number {
  return periodAmount * periodsCount;
}


/**
 * Month names for localization
 */
const MONTH_NAMES = {
  en: [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ],
  vi: [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
  ],
};

/**
 * Formats prepaid_until date as a human-readable string
 * e.g., "Paid until March 2026" (English) or "Đã trả đến Tháng 3 2026" (Vietnamese)
 *
 * @param prepaidUntil - The prepaid_until date string (ISO format)
 * @param language - Language for localization ('en' or 'vi')
 * @returns Human-readable formatted string
 */
export function formatPrepaidCoverage(
  prepaidUntil: string | null,
  language: 'en' | 'vi' = 'vi'
): string {
  if (!prepaidUntil) {
    return language === 'vi' ? 'Chưa trả trước' : 'No prepaid coverage';
  }

  const date = new Date(prepaidUntil);
  const month = date.getMonth();
  const year = date.getFullYear();

  const monthName = MONTH_NAMES[language][month];

  if (language === 'vi') {
    return `Đã trả đến ${monthName} ${year}`;
  }

  return `Paid until ${monthName} ${year}`;
}

/**
 * Formats the coverage period as a human-readable string
 * e.g., "Jan 2026 - Mar 2026" (English) or "Tháng 1 2026 - Tháng 3 2026" (Vietnamese)
 *
 * @param coverageFrom - Start date of coverage (ISO format)
 * @param coverageTo - End date of coverage (ISO format)
 * @param language - Language for localization ('en' or 'vi')
 * @returns Human-readable formatted string
 */
export function formatCoveragePeriod(
  coverageFrom: string,
  coverageTo: string,
  language: 'en' | 'vi' = 'vi'
): string {
  const fromDate = new Date(coverageFrom);
  const toDate = new Date(coverageTo);

  const fromMonth = MONTH_NAMES[language][fromDate.getMonth()];
  const fromYear = fromDate.getFullYear();
  const toMonth = MONTH_NAMES[language][toDate.getMonth()];
  const toYear = toDate.getFullYear();

  // Shorten month names for English
  const shortFromMonth = language === 'en' ? fromMonth.slice(0, 3) : fromMonth;
  const shortToMonth = language === 'en' ? toMonth.slice(0, 3) : toMonth;

  if (fromYear === toYear) {
    return `${shortFromMonth} - ${shortToMonth} ${toYear}`;
  }

  return `${shortFromMonth} ${fromYear} - ${shortToMonth} ${toYear}`;
}

/**
 * Gets a human-readable description of the prepaid status
 *
 * @param status - The prepaid coverage status
 * @param remainingPeriods - Number of remaining prepaid periods
 * @param language - Language for localization ('en' or 'vi')
 * @returns Human-readable status description
 */
export function formatPrepaidStatus(
  status: PrepaidCoverageStatus,
  remainingPeriods: number,
  language: 'en' | 'vi' = 'vi'
): string {
  const strings = {
    en: {
      none: 'No prepaid coverage',
      active: `${remainingPeriods} period${remainingPeriods !== 1 ? 's' : ''} remaining`,
      expiring_soon: 'Expiring soon',
      expired: 'Prepaid coverage expired',
    },
    vi: {
      none: 'Chưa trả trước',
      active: `Còn ${remainingPeriods} kỳ`,
      expiring_soon: 'Sắp hết hạn',
      expired: 'Đã hết hạn trả trước',
    },
  };

  return strings[language][status];
}
