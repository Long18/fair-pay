import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ContributingExpenseItem } from "./contributing-expense-item";
import { useTranslation } from "react-i18next";
import { useGo } from "@refinedev/core";
import { ChevronRightIcon } from "@/components/ui/icons";

interface ContributingExpense {
  id: string;
  expense_id: string;
  description: string;
  amount: number;
  currency: string;
  expense_date: string;
  group_name?: string | null;
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

  if (isLoading) {
    return (
      <div className="space-y-2 p-4 bg-muted/30 rounded-lg">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <div className="p-4 bg-muted/30 rounded-lg text-center">
        <p className="typography-body text-muted-foreground">
          {t('dashboard.noContributingExpenses', 'No expenses found')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1 bg-muted/30 rounded-lg p-2">
      {expenses.slice(0, 3).map((expense) => (
        <ContributingExpenseItem
          key={expense.id}
          id={expense.expense_id}
          description={expense.description}
          amount={expense.amount}
          currency={expense.currency}
          expenseDate={expense.expense_date}
          groupName={expense.group_name}
          myShare={expense.my_share}
          status={expense.status}
          isSettled={expense.is_settled}
        />
      ))}
      {expenses.length > 3 && (
        <div className="pt-2 px-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between"
            onClick={() => go({ to: `/debts/${counterpartyId}` })}
          >
            <span className="typography-body">
              {t('dashboard.viewAllExpenses', 'View all {{count}} expenses', { count: expenses.length })}
            </span>
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
        </div>
      )}
      {expenses.length <= 3 && (
        <div className="pt-2 px-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between"
            onClick={() => go({ to: `/debts/${counterpartyId}` })}
          >
            <span className="typography-body">
              {t('dashboard.viewFullBreakdown', 'View full breakdown')}
            </span>
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
