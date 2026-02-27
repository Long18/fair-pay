import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SpendingSummary } from '@/hooks/analytics/use-spending-summary';
import { formatNumber } from '@/lib/locale-utils';
import { useTranslation } from 'react-i18next';

import { TrendingUpIcon, TrendingDownIcon, ReceiptIcon, CreditCardIcon, ArrowUpDownIcon } from "@/components/ui/icons";
interface SpendingSummaryStatsProps {
  summary: SpendingSummary;
}

export function SpendingSummaryStats({ summary }: SpendingSummaryStatsProps) {
  const { t } = useTranslation();
  
  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium">{t('reports.totalSpent')}</CardTitle>
          <TrendingDownIcon className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-xl sm:text-2xl font-bold text-destructive tabular-nums">
            {formatNumber(summary.totalSpent)} ₫
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {summary.expenseCount} {t('analytics.expenses')}
          </p>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium">{t('reports.totalReceived')}</CardTitle>
          <TrendingUpIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
        </CardHeader>
        <CardContent>
          <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400 tabular-nums">
            {formatNumber(summary.totalReceived)} ₫
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {summary.paymentCount} {t('payments.title').toLowerCase()}
          </p>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium">{t('reports.balance')}</CardTitle>
          <ArrowUpDownIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-xl sm:text-2xl font-bold tabular-nums ${summary.netBalance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
            {summary.netBalance >= 0 ? '+' : ''}{formatNumber(summary.netBalance)} ₫
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {summary.netBalance >= 0 ? t('reports.youAreOwed') : t('reports.youOwe')}
          </p>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium">{t('reports.average')}</CardTitle>
          <ReceiptIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-xl sm:text-2xl font-bold tabular-nums">
            {formatNumber(summary.averageExpense)} ₫
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {t('reports.perExpense')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
