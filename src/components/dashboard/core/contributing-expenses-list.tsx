import { useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ContributingExpenseItem } from "./contributing-expense-item";
import { useTranslation } from "react-i18next";
import { useGo } from "@refinedev/core";
import { ChevronRightIcon, CheckCircle2Icon, InboxIcon } from "@/components/ui/icons";
import { formatCurrency } from "@/lib/locale-utils";
import { cn } from "@/lib/utils";

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
  settled_amount: number;
  settled_at?: string | null;
  direction: 'i_owe' | 'they_owe';
  status: 'paid' | 'unpaid' | 'partial';
  is_settled: boolean;
}

interface ParticipantInfo {
  name: string;
  avatarUrl?: string | null;
}

interface ContributingExpensesListProps {
  expenses: ContributingExpense[];
  counterpartyId: string;
  isLoading?: boolean;
  participants?: ParticipantInfo[];
}

export function ContributingExpensesList({
  expenses,
  counterpartyId,
  isLoading = false,
  participants,
}: ContributingExpensesListProps) {
  const { t } = useTranslation();
  const go = useGo();
  const [settledExpanded, setSettledExpanded] = useState(false);

  const { unsettled, settled, settledTotal, currency } = useMemo(() => {
    const unsettled = expenses.filter(e => !e.is_settled);
    const settled = expenses.filter(e => e.is_settled);
    const settledTotal = settled.reduce((sum, e) => sum + e.my_share, 0);
    const currency = expenses[0]?.currency || "VND";
    return { unsettled, settled, settledTotal, currency };
  }, [expenses]);

  // Show max 3 unsettled
  const visibleUnsettled = unsettled.slice(0, 3);
  const hasMore = expenses.length > visibleUnsettled.length + (settled.length > 0 ? 1 : 0);

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
        {settled.length > 0 && (
          <>
            <button
              onClick={() => setSettledExpanded((v) => !v)}
              className={cn(
                "w-full flex items-center gap-1.5 px-3 py-2 rounded-md",
                "bg-status-success-bg/30",
                "cursor-pointer select-none transition-colors hover:bg-status-success-bg/50"
              )}
              aria-expanded={settledExpanded}
            >
              <ChevronRightIcon
                className={cn(
                  "h-3 w-3 text-muted-foreground transition-transform duration-200 shrink-0",
                  settledExpanded && "rotate-90"
                )}
              />
              <CheckCircle2Icon className="h-3 w-3 text-status-success-foreground shrink-0" />
              {participants && participants.length > 0 && (
                <div className="flex -space-x-1 shrink-0" aria-label="Participants">
                  {participants.map((p) => (
                    <Avatar key={p.name} className="h-4 w-4 border border-status-success-border">
                      <AvatarImage src={p.avatarUrl || undefined} alt={p.name} />
                      <AvatarFallback className="text-[6px] font-bold bg-status-success-bg text-status-success-foreground">
                        {p.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
              )}
              <span className="text-[10px] font-medium text-muted-foreground">
                {t("debts.settledExpenses", "Settled")}
              </span>
              <span className="text-[9px] font-semibold px-1 py-0.5 rounded-full bg-status-success-bg border border-status-success-border text-status-success-foreground">
                {settled.length}
              </span>
              {settledTotal > 0 && (
                <span className="text-[10px] font-semibold tabular-nums text-status-success-foreground/70">
                  {formatCurrency(settledTotal, currency)}
                </span>
              )}
              <span className="ml-auto text-[10px] text-muted-foreground">
                {settledExpanded ? t("debts.hide", "Hide") : t("debts.show", "Show")}
              </span>
            </button>
            {settledExpanded && settled.map((expense) => (
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
          </>
        )}
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
