import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SpendingSummary } from '@/hooks/use-spending-summary';
import { formatNumber } from '@/lib/locale-utils';

import { TrendingUpIcon, TrendingDownIcon, ReceiptIcon, CreditCardIcon, ArrowUpDownIcon } from "@/components/ui/icons";
interface SpendingSummaryStatsProps {
  summary: SpendingSummary;
}

export function SpendingSummaryStats({ summary }: SpendingSummaryStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tổng chi</CardTitle>
          <TrendingDownIcon className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">
            {formatNumber(summary.totalSpent)} ₫
          </div>
          <p className="text-xs text-muted-foreground">
            {summary.expenseCount} chi tiêu
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tổng thu</CardTitle>
          <TrendingUpIcon className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {formatNumber(summary.totalReceived)} ₫
          </div>
          <p className="text-xs text-muted-foreground">
            {summary.paymentCount} thanh toán
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Cân bằng</CardTitle>
          <ArrowUpDownIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${summary.netBalance >= 0 ? 'text-green-600' : 'text-destructive'}`}>
            {summary.netBalance >= 0 ? '+' : ''}{formatNumber(summary.netBalance)} ₫
          </div>
          <p className="text-xs text-muted-foreground">
            {summary.netBalance >= 0 ? 'Bạn đang được nợ' : 'Bạn đang nợ'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Trung bình</CardTitle>
          <ReceiptIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatNumber(summary.averageExpense)} ₫
          </div>
          <p className="text-xs text-muted-foreground">
            Mỗi chi tiêu
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
