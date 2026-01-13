import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2Icon, CalendarIcon, BanknoteIcon } from '@/components/ui/icons';
import { formatNumber } from '@/lib/locale-utils';
import { RecurringExpense } from '../types/recurring';
import {
  calculatePrepaidUntil,
  calculateTotalPrepaidAmount,
  formatCoveragePeriod,
} from '../utils/prepaid-calculations';

interface PrepaidPaymentFormProps {
  recurring: RecurringExpense;
  onSubmit: (periodsCount: number, amount: number) => Promise<void>;
  isSubmitting?: boolean;
}

/**
 * PrepaidPaymentForm - Form for recording prepaid payments
 * 
 * Requirements: 1.1, 1.2, 1.5
 * - Input for number of periods to prepay
 * - Display calculated total amount
 * - Display calculated coverage period
 * - Validate period count >= 1
 * - Submit button to record prepaid payment
 */
export function PrepaidPaymentForm({
  recurring,
  onSubmit,
  isSubmitting = false,
}: PrepaidPaymentFormProps) {
  const { t, i18n } = useTranslation();
  const [periodsCount, setPeriodsCount] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);

  const template = recurring.template_expense || recurring.expenses;
  const periodAmount = template?.amount || 0;
  const currency = template?.currency || 'VND';
  const language = i18n.language === 'vi' ? 'vi' : 'en';

  // Calculate coverage period and total amount
  const { totalAmount, coverageFrom, coverageTo, coveragePeriodText } = useMemo(() => {
    const total = calculateTotalPrepaidAmount(periodAmount, periodsCount);
    
    // Determine start date for coverage calculation
    let startDate: Date;
    if (recurring.prepaid_until && new Date(recurring.prepaid_until) > new Date()) {
      startDate = new Date(recurring.prepaid_until);
    } else {
      startDate = new Date(recurring.next_occurrence);
    }

    const endDate = recurring.end_date ? new Date(recurring.end_date) : null;
    const calculatedEnd = calculatePrepaidUntil(
      startDate,
      periodsCount,
      recurring.frequency,
      recurring.interval,
      endDate
    );

    const fromStr = startDate.toISOString().split('T')[0];
    const toStr = calculatedEnd.toISOString().split('T')[0];
    const periodText = formatCoveragePeriod(fromStr, toStr, language);

    return {
      totalAmount: total,
      coverageFrom: startDate,
      coverageTo: calculatedEnd,
      coveragePeriodText: periodText,
    };
  }, [periodsCount, periodAmount, recurring, language]);

  const handlePeriodsChange = (value: string) => {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 1) {
      setPeriodsCount(1);
      if (value !== '' && (isNaN(num) || num < 1)) {
        setError(t('recurring.prepaid.invalidPeriodCount', 'Period count must be at least 1'));
      }
    } else {
      setPeriodsCount(num);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (periodsCount < 1) {
      setError(t('recurring.prepaid.invalidPeriodCount', 'Period count must be at least 1'));
      return;
    }

    setError(null);
    await onSubmit(periodsCount, totalAmount);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Period Amount Info */}
      <div className="p-3 rounded-lg bg-muted/50 space-y-1">
        <p className="text-sm text-muted-foreground">
          {t('recurring.prepaid.periodAmount', 'Amount per period')}
        </p>
        <p className="text-lg font-semibold">
          {formatNumber(periodAmount)} {currency}
        </p>
      </div>

      {/* Number of Periods Input */}
      <div className="space-y-2">
        <Label htmlFor="periodsCount">
          {t('recurring.prepaid.periodsCount', 'Number of periods')}
        </Label>
        <Input
          id="periodsCount"
          type="number"
          min={1}
          max={24}
          value={periodsCount}
          onChange={(e) => handlePeriodsChange(e.target.value)}
          className="text-lg"
          aria-invalid={!!error}
        />
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>

      {/* Calculated Total Amount */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <BanknoteIcon className="h-4 w-4" />
          {t('recurring.prepaid.totalAmount', 'Total amount')}
        </Label>
        <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
          <p className="text-2xl font-bold text-primary">
            {formatNumber(totalAmount)} {currency}
          </p>
        </div>
      </div>

      {/* Coverage Period */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4" />
          {t('recurring.prepaid.coveragePeriod', 'Coverage period')}
        </Label>
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="font-medium">{coveragePeriodText}</p>
        </div>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full"
        disabled={isSubmitting || periodsCount < 1}
      >
        {isSubmitting ? (
          <>
            <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
            {t('common.loading', 'Loading...')}
          </>
        ) : (
          t('recurring.prepaid.recordPayment', 'Record prepaid payment')
        )}
      </Button>
    </form>
  );
}
