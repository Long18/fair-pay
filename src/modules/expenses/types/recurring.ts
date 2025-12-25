import { Expense } from '../types';

export type RecurringFrequency =
  | 'weekly'
  | 'bi_weekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly'
  | 'custom';

export const RECURRING_FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  weekly: 'Hàng tuần',
  bi_weekly: 'Hai tuần một lần',
  monthly: 'Hàng tháng',
  quarterly: 'Hàng quý',
  yearly: 'Hàng năm',
  custom: 'Tùy chỉnh',
};

export interface RecurringExpense {
  id: string;
  template_expense_id: string;
  frequency: RecurringFrequency;
  interval: number;
  start_date: string;
  end_date: string | null;
  next_occurrence: string;
  last_created_at: string | null;
  is_active: boolean;
  notify_before_days: number;
  context_type: 'group' | 'friend';
  group_id: string | null;
  friendship_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;

  template_expense?: Expense;
}

export interface RecurringExpenseFormValues {
  is_recurring: boolean;
  frequency: RecurringFrequency;
  interval: number;
  start_date: Date;
  end_date: Date | null;
  notify_before_days: number;
}

export const DEFAULT_RECURRING_VALUES: RecurringExpenseFormValues = {
  is_recurring: false,
  frequency: 'monthly',
  interval: 1,
  start_date: new Date(),
  end_date: null,
  notify_before_days: 1,
};

export interface RecurringExpenseStatus {
  is_active: boolean;
  next_occurrence: string;
  last_created_at: string | null;
  occurrences_count?: number;
  has_end_date: boolean;
  days_until_next: number;
}

export function getRecurringExpenseStatus(recurring: RecurringExpense): RecurringExpenseStatus {
  const today = new Date();
  const nextOccurrence = new Date(recurring.next_occurrence);
  const daysUntil = Math.ceil((nextOccurrence.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  return {
    is_active: recurring.is_active,
    next_occurrence: recurring.next_occurrence,
    last_created_at: recurring.last_created_at,
    has_end_date: recurring.end_date !== null,
    days_until_next: daysUntil,
  };
}

export function getFrequencyDescription(frequency: RecurringFrequency, interval: number): string {
  if (interval === 1) {
    return RECURRING_FREQUENCY_LABELS[frequency];
  }

  switch (frequency) {
    case 'weekly':
      return `Mỗi ${interval} tuần`;
    case 'bi_weekly':
      return `Mỗi ${interval * 2} tuần`;
    case 'monthly':
      return `Mỗi ${interval} tháng`;
    case 'quarterly':
      return `Mỗi ${interval * 3} tháng`;
    case 'yearly':
      return `Mỗi ${interval} năm`;
    case 'custom':
      return `Mỗi ${interval} ngày`;
    default:
      return RECURRING_FREQUENCY_LABELS[frequency];
  }
}

export function calculateNextOccurrence(
  currentDate: Date,
  frequency: RecurringFrequency,
  interval: number
): Date {
  const next = new Date(currentDate);

  switch (frequency) {
    case 'weekly':
      next.setDate(next.getDate() + (7 * interval));
      break;
    case 'bi_weekly':
      next.setDate(next.getDate() + (14 * interval));
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + interval);
      break;
    case 'quarterly':
      next.setMonth(next.getMonth() + (3 * interval));
      break;
    case 'yearly':
      next.setFullYear(next.getFullYear() + interval);
      break;
    case 'custom':
      next.setDate(next.getDate() + interval);
      break;
  }

  return next;
}
