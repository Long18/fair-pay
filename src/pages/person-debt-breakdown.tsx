import { useState, useMemo } from "react";
import { useParams } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DebtBreakdownHeader } from "@/components/debts/debt-breakdown-header";
import { WhatToPayNowPanel } from "@/components/debts/what-to-pay-now-panel";
import { ExpenseBreakdownItemSelectable } from "@/components/debts/expense-breakdown-item-selectable";
import { useContributingExpenses } from "@/hooks/use-contributing-expenses";
import { useDebtSummary } from "@/hooks/use-debt-summary";
import { useSettleSplits } from "@/hooks/use-settle-splits";
import { useOne } from "@refinedev/core";
import { Profile } from "@/modules/profile/types";
import { useTranslation } from "react-i18next";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { ScaleIcon } from "@/components/ui/icons";

export const PersonDebtBreakdown = () => {
  const { userId } = useParams<{ userId: string }>();
  const { t } = useTranslation();

  // Fetch counterparty profile
  const { query: counterpartyQuery } = useOne<Profile>({
    resource: "profiles",
    id: userId!,
  });
  const counterparty = counterpartyQuery.data;
  const isLoadingProfile = counterpartyQuery.isLoading;

  // Fetch contributing expenses
  const { expenses, isLoading: isLoadingExpenses } = useContributingExpenses(userId!);

  // Calculate debt summary
  const { summary, isLoading: isLoadingSummary } = useDebtSummary(
    userId!,
    counterparty?.data?.full_name || '',
    counterparty?.data?.avatar_url
  );

  // Settlement logic
  const { settle, isSettling } = useSettleSplits();
  const [selectedSplitIds, setSelectedSplitIds] = useState<Set<string>>(new Set());

  // Filter unsettled expenses
  const unsettledExpenses = useMemo(() => {
    return expenses.filter(exp => !exp.is_settled);
  }, [expenses]);

  // Calculate selected amount
  const selectedAmount = useMemo(() => {
    return expenses
      .filter(exp => selectedSplitIds.has(exp.id))
      .reduce((sum, exp) => sum + exp.my_share, 0);
  }, [expenses, selectedSplitIds]);

  const handleSelectChange = (splitId: string, checked: boolean) => {
    setSelectedSplitIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(splitId);
      } else {
        newSet.delete(splitId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allUnsettledIds = new Set(
        unsettledExpenses.filter(exp => exp.my_share > 0).map(exp => exp.id)
      );
      setSelectedSplitIds(allUnsettledIds);
    } else {
      setSelectedSplitIds(new Set());
    }
  };

  const handleSettle = async () => {
    const result = await settle(Array.from(selectedSplitIds));
    if (result.success) {
      setSelectedSplitIds(new Set());
      // Expenses will auto-refetch due to hook dependencies
    }
  };

  const isAllSelected = useMemo(() => {
    const unsettledWithDebt = unsettledExpenses.filter(exp => exp.my_share > 0);
    return unsettledWithDebt.length > 0 &&
      unsettledWithDebt.every(exp => selectedSplitIds.has(exp.id));
  }, [unsettledExpenses, selectedSplitIds]);

  const isLoading = isLoadingProfile || isLoadingExpenses || isLoadingSummary;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!counterparty?.data || !summary) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="rounded-xl">
          <CardContent className="p-8">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ScaleIcon className="h-8 w-8" />
                </EmptyMedia>
                <EmptyTitle>
                  {t('debts.personNotFound', 'Person not found')}
                </EmptyTitle>
                <EmptyDescription>
                  {t('debts.personNotFoundDescription', 'Unable to load debt information')}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalOutstanding = unsettledExpenses
    .filter(exp => exp.my_share > 0)
    .reduce((sum, exp) => sum + exp.my_share, 0);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <DebtBreakdownHeader
          counterpartyName={counterparty.data.full_name}
          counterpartyAvatarUrl={counterparty.data.avatar_url}
          netAmount={summary.net_amount}
          iOweThem={summary.i_owe_them}
          currency={summary.currency}
          unpaidCount={summary.unpaid_count}
          partialCount={summary.partial_count}
          paidCount={summary.paid_count}
          counterpartyId={userId!}
        />

        {/* What to Pay Now Panel */}
        <WhatToPayNowPanel
          totalAmount={totalOutstanding}
          selectedAmount={selectedAmount}
          currency={summary.currency}
          selectedCount={selectedSplitIds.size}
          totalCount={unsettledExpenses.filter(exp => exp.my_share > 0).length}
          onSelectAll={handleSelectAll}
          onSettle={handleSettle}
          isSettling={isSettling}
          isAllSelected={isAllSelected}
          iOweThem={summary.i_owe_them}
        />

        {/* Contributing Expenses */}
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="typography-section-title">
              {t('debts.contributingExpenses', 'Contributing Expenses')}
            </CardTitle>
            <p className="typography-metadata mt-1">
              {t('debts.contributingExpensesDescription', 'Expenses that contribute to this balance')}
            </p>
          </CardHeader>
          <CardContent>
            {expenses.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <ScaleIcon className="h-8 w-8" />
                  </EmptyMedia>
                  <EmptyTitle>
                    {t('debts.noExpenses', 'No expenses found')}
                  </EmptyTitle>
                  <EmptyDescription>
                    {t('debts.noExpensesDescription', 'No shared expenses with this person')}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="space-y-2">
                {expenses.map((expense) => (
                  <ExpenseBreakdownItemSelectable
                    key={expense.id}
                    id={expense.id}
                    splitId={expense.id}
                    description={expense.description}
                    amount={expense.amount}
                    currency={expense.currency}
                    expenseDate={expense.expense_date}
                    groupName={expense.group_name}
                    myShare={expense.my_share}
                    status={expense.status}
                    isSettled={expense.is_settled}
                    isSelected={selectedSplitIds.has(expense.id)}
                    onSelectChange={handleSelectChange}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
