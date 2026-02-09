import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ContributingExpenseItem } from "./contributing-expense-item";
import { useTranslation } from "react-i18next";
import { useGo } from "@refinedev/core";
import { ChevronRightIcon, InboxIcon } from "@/components/ui/icons";

interface ContributingExpense {
  id: string;
  expense_id: string;
  description: string;
  amount: number;
  currency: string;
  expense_date: string;
  group_name?: string | null;
  category?: string | null;
  my_share: number;
  status: 'paid' | 'unpaid' | 'partial';
  is_settled: boolean;
}

interface ContributingExpensesListProps {
  expenses: ContributingExpense[];
  counterpartyId: string;
  isLoading?: boolean;
}

export function ContributingExpensesList({
  expenses,
  counterpartyId,
  isLoading = false,
}: ContributingExpensesListProps) {
  const { t } = useTranslation();
  const go = useGo();

  const { unsettled, settled } = useMemo(() => {
    const unsettled = expenses.filter(e => !e.is_settled);
    const settled = expenses.filter(e => e.is_settled);
    return { unsettled, settled };
  }, [expenses]);

  // Show max 3 unsettled + 1 settled preview
  const visibleUnsettled = unsettled.slice(0, 3);
  const visibleSettled = settled.slice(0, 1);
  const totalVisible = visibleUnsettled.length + visibleSettled.length;
  const hasMore = expenses.length > totalVisible;

  if (isLoading) {
    return (
      <div className="space-y-2 p-3 bg-muted/20 rounded-md">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 animate-pulse">
            <Skeleton className="h-7 w-7 rounded-md shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-2.5 w-1/2" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <div className="py-6 bg-muted/20 rounded-md text-center space-y-2">
        <div className="flex justify-center">
          <div className="h-10 w-10 rounded-lg bg-muted/60 flex items-center justify-center">
            <InboxIcon className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {t('dashboard.noContributingExpenses', 'No expenses found')}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-muted/20 rounded-md p-1.5">
      <div className="space-y-0.5">
        {visibleUnsettled.map((expense) => (
          <ContributingExpenseItem
            key={expense.id}
            id={expense.expense_id}
            description={expense.description}
            amount={expense.amount}
            currency={expense.currency}
            expenseDate={expense.expense_date}
            groupName={expense.group_name}
            category={expense.category}
            myShare={expense.my_share}
            status={expense.status}
            isSettled={expense.is_settled}
          />
        ))}
        {visibleSettled.length > 0 && visibleUnsettled.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
              {t('dashboard.settled', 'Settled')}
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>
        )}
        {visibleSettled.map((expense) => (
          <ContributingExpenseItem
            key={expense.id}
            id={expense.expense_id}
            description={expense.description}
            amount={expense.amount}
            currency={expense.currency}
            expenseDate={expense.expense_date}
            groupName={expense.group_name}
            category={expense.category}
            myShare={expense.my_share}
            status={expense.status}
            isSettled={expense.is_settled}
          />
        ))}
      </div>
      {hasMore && (
        <div className="pt-1.5 px-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between h-8 text-xs"
            onClick={() => go({ to: `/debts/${counterpartyId}` })}
          >
            <span>
              {t('dashboard.viewAllExpenses', 'View all {{count}} expenses', { count: expenses.length })}
            </span>
            <ChevronRightIcon className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
      {!hasMore && (
        <div className="pt-1.5 px-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between h-8 text-xs"
            onClick={() => go({ to: `/debts/${counterpartyId}` })}
          >
            <span>
              {t('dashboard.viewFullBreakdown', 'View full breakdown')}
            </span>
            <ChevronRightIcon className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
