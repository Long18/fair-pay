import { useTranslation } from 'react-i18next';
import { format, Locale } from 'date-fns';
import { vi, enUS } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { HistoryIcon, CalendarIcon, BanknoteIcon } from '@/components/ui/icons';
import { formatNumber } from '@/lib/locale-utils';
import { usePrepaidPayments, PrepaidPaymentWithCreator } from '../hooks/use-prepaid-payments';
import { formatCoveragePeriod } from '../utils/prepaid-calculations';

interface PrepaidPaymentHistoryProps {
  recurringExpenseId: string;
  currency?: string;
}

/**
 * PrepaidPaymentHistory - Displays the history of prepaid payments
 * 
 * Requirements: 6.2, 6.3, 6.4, 6.5
 * - Display list of prepaid payments
 * - Show payment_date, periods_covered, amount, coverage period
 * - Show total prepaid amount
 * - Order by payment_date descending
 */
export function PrepaidPaymentHistory({
  recurringExpenseId,
  currency = 'VND',
}: PrepaidPaymentHistoryProps) {
  const { t, i18n } = useTranslation();
  const { payments, totalPrepaidAmount, isLoading, error } = usePrepaidPayments(recurringExpenseId);
  
  const dateLocale = i18n.language === 'vi' ? vi : enUS;
  const language = i18n.language === 'vi' ? 'vi' : 'en';

  if (isLoading) {
    return <PrepaidPaymentHistorySkeleton />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-sm text-destructive text-center">
            {t('common.error', 'Error loading data')}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (payments.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <HistoryIcon className="h-4 w-4" />
            {t('recurring.prepaid.paymentHistory', 'Payment history')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            {t('recurring.prepaid.noPayments', 'No prepaid payments yet')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <HistoryIcon className="h-4 w-4" />
            {t('recurring.prepaid.paymentHistory', 'Payment history')}
          </CardTitle>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">
              {t('recurring.prepaid.totalPrepaid', 'Total prepaid')}
            </p>
            <p className="font-semibold text-primary">
              {formatNumber(totalPrepaidAmount)} {currency}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {payments.map((payment) => (
          <PrepaidPaymentItem
            key={payment.id}
            payment={payment}
            currency={currency}
            dateLocale={dateLocale}
            language={language}
          />
        ))}
      </CardContent>
    </Card>
  );
}

interface PrepaidPaymentItemProps {
  payment: PrepaidPaymentWithCreator;
  currency: string;
  dateLocale: Locale;
  language: 'en' | 'vi';
}

function PrepaidPaymentItem({
  payment,
  currency,
  dateLocale,
  language,
}: PrepaidPaymentItemProps) {
  const { t } = useTranslation();
  const coveragePeriod = formatCoveragePeriod(
    payment.coverage_from,
    payment.coverage_to,
    language
  );

  return (
    <div className="p-3 rounded-lg bg-muted/30 border space-y-2">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <CalendarIcon className="h-3 w-3 text-muted-foreground" />
            <span>
              {format(new Date(payment.payment_date), 'PPP', { locale: dateLocale })}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('recurring.prepaid.periodsCovered', { count: payment.periods_covered })}
          </p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 font-semibold">
            <BanknoteIcon className="h-3 w-3 text-primary" />
            <span>{formatNumber(payment.amount)} {currency}</span>
          </div>
        </div>
      </div>
      <div className="pt-2 border-t border-border/50">
        <p className="text-xs text-muted-foreground">
          {t('recurring.prepaid.coveragePeriod', 'Coverage period')}
        </p>
        <p className="text-sm font-medium">{coveragePeriod}</p>
      </div>
      {payment.created_by_name && (
        <p className="text-xs text-muted-foreground">
          {t('common.by', 'by')} {payment.created_by_name}
        </p>
      )}
    </div>
  );
}

function PrepaidPaymentHistorySkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-8 w-24" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="p-3 rounded-lg bg-muted/30 border space-y-2">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-5 w-24" />
            </div>
            <div className="pt-2 border-t border-border/50">
              <Skeleton className="h-3 w-20 mb-1" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
