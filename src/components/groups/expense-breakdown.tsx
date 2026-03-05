import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ReceiptIcon, HistoryIcon, BanknoteIcon } from '@/components/ui/icons';
import { formatNumber, formatDate } from '@/lib/locale-utils';
import { cn } from '@/lib/utils';
import { useHaptics } from '@/hooks/use-haptics';

interface ExpenseBreakdownItem {
  id: string;
  description: string;
  amount: number;
  your_share: number;
  expense_date: string;
  category: string | null;
  is_settled: boolean;
}

interface SettlementItem {
  id: string;
  amount: number;
  payment_date: string;
}

interface ExpenseBreakdownProps {
  expenses: ExpenseBreakdownItem[];
  settlements?: SettlementItem[];
  totalAmount: number;
  currency?: string;
  onSettleUp?: () => void;
  userName: string;
}

export function ExpenseBreakdown({
  expenses,
  settlements = [],
  totalAmount,
  currency = '₫',
  onSettleUp,
  userName,
}: ExpenseBreakdownProps) {
  const { success } = useHaptics();
  return (
    <div className="space-y-4">
      {/* Expense Breakdown */}
      <div>
        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <ReceiptIcon className="h-4 w-4" />
          Expense Breakdown
        </h4>
        <div className="space-y-2">
          {expenses.slice(0, 5).map((expense) => (
            <div
              key={expense.id}
              className="flex justify-between items-center p-2 rounded bg-muted/50"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{expense.description}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(expense.expense_date, {
                    month: 'short',
                    day: 'numeric',
                  })}
                  {expense.category && ` • ${expense.category}`}
                </p>
              </div>
              <div className="text-right ml-2">
                <p className="text-sm font-semibold">
                  {formatNumber(expense.your_share)} {currency}
                </p>
                <p className="text-xs text-muted-foreground">
                  of {formatNumber(expense.amount)} {currency}
                </p>
              </div>
            </div>
          ))}
          {expenses.length > 5 && (
            <p className="text-xs text-muted-foreground text-center pt-1">
              +{expenses.length - 5} more expense(s)
            </p>
          )}
        </div>
      </div>

      {/* Running Total */}
      <div className="pt-2 border-t flex justify-between items-center">
        <span className="text-sm font-medium">Total:</span>
        <span className="text-lg font-bold">{formatNumber(totalAmount)} {currency}</span>
      </div>

      {/* Settlement History */}
      {settlements.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <HistoryIcon className="h-4 w-4" />
            Recent Settlements
          </h4>
          <div className="space-y-1">
            {settlements.slice(0, 3).map((settlement) => (
              <div
                key={settlement.id}
                className="flex justify-between items-center text-sm p-2 rounded bg-green-50"
              >
                <span className="text-muted-foreground">
                  {formatDate(settlement.payment_date, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
                <span className="font-medium text-green-700">
                  -{formatNumber(settlement.amount)} {currency}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Settle Button */}
      {onSettleUp && totalAmount > 0 && (
        <Button
          onClick={(e) => {
            e.stopPropagation();
            success();
            onSettleUp();
          }}
          className="w-full"
          size="lg"
        >
          <BanknoteIcon className="h-4 w-4 mr-2" />
          Settle Up with {userName}
        </Button>
      )}
    </div>
  );
}
