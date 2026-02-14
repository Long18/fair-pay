import { useState, useMemo, useEffect } from "react";
import { useParams } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingBeam } from "@/components/ui/loading-beam";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { DebtBreakdownHeader } from "@/components/debts/debt-breakdown-header";
import { ExpenseBreakdownItemSelectable } from "@/components/debts/expense-breakdown-item-selectable";
import { useContributingExpenses } from "@/hooks/use-contributing-expenses";
import { useDebtSummary } from "@/hooks/use-debt-summary";
import { useSettleSplits } from "@/hooks/use-settle-splits";
import { useDeleteSplits } from "@/hooks/use-delete-splits";
import { useOne, useGetIdentity } from "@refinedev/core";
import { Profile } from "@/modules/profile/types";
import { useTranslation } from "react-i18next";
import { isAdmin } from "@/lib/rbac";
import { BulkDeleteDialog } from "@/components/bulk-operations/BulkDeleteDialog";
import { PaginationControls, PaginationMetadata } from "@/components/ui/pagination-controls";
import { formatCurrency } from "@/lib/locale-utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import {
  ScaleIcon,
  CheckCircle2Icon,
  Trash2Icon,
  XIcon,
} from "@/components/ui/icons";

const PAGE_SIZE = 10;

export const PersonDebtBreakdown = () => {
  const { userId } = useParams<{ userId: string }>();
  const { t } = useTranslation();

  // Admin detection
  const [userIsAdmin, setUserIsAdmin] = useState(false);
  useEffect(() => {
    isAdmin().then(setUserIsAdmin);
  }, []);

  // Current user identity
  const { data: identity } = useGetIdentity<Profile>();
  const myName = identity?.full_name || t('debts.you', 'You');

  // Fetch counterparty profile
  const { query: counterpartyQuery } = useOne<Profile>({
    resource: "profiles",
    id: userId!,
  });
  const counterparty = counterpartyQuery.data;
  const isLoadingProfile = counterpartyQuery.isLoading;

  // Fetch contributing expenses
  const { expenses, isLoading: isLoadingExpenses, refetch } = useContributingExpenses(userId!);

  // Calculate debt summary
  const { summary, isLoading: isLoadingSummary } = useDebtSummary(
    userId!,
    counterparty?.data?.full_name || '',
    counterparty?.data?.avatar_url
  );

  // Settlement & delete logic
  const { settle, isSettling } = useSettleSplits();
  const { deleteSplits, isDeleting } = useDeleteSplits();
  const [selectedSplitIds, setSelectedSplitIds] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Filter unsettled expenses
  const unsettledExpenses = useMemo(() => {
    return expenses.filter(exp => !exp.is_settled);
  }, [expenses]);

  const selectableExpenses = useMemo(() => {
    return unsettledExpenses.filter(exp => exp.my_share > 0);
  }, [unsettledExpenses]);

  // Calculate selected amount
  const selectedAmount = useMemo(() => {
    return expenses
      .filter(exp => selectedSplitIds.has(exp.id))
      .reduce((sum, exp) => sum + exp.my_share, 0);
  }, [expenses, selectedSplitIds]);

  // Pagination
  const totalPages = Math.ceil(expenses.length / PAGE_SIZE);
  const paginatedExpenses = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return expenses.slice(start, start + PAGE_SIZE);
  }, [expenses, currentPage]);

  const paginationMetadata: PaginationMetadata = useMemo(() => ({
    totalItems: expenses.length,
    totalPages,
    currentPage,
    pageSize: PAGE_SIZE,
  }), [expenses.length, totalPages, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const handleSelectChange = (splitId: string, checked: boolean) => {
    setSelectedSplitIds(prev => {
      const newSet = new Set(prev);
      if (checked) newSet.add(splitId);
      else newSet.delete(splitId);
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSplitIds(new Set(selectableExpenses.map(exp => exp.id)));
    } else {
      setSelectedSplitIds(new Set());
    }
  };

  const handleSettle = async () => {
    const result = await settle(Array.from(selectedSplitIds));
    if (result.success) {
      setSelectedSplitIds(new Set());
      refetch();
    }
  };

  const handleDelete = async () => {
    const result = await deleteSplits(Array.from(selectedSplitIds));
    if (result.success) {
      setSelectedSplitIds(new Set());
      setDeleteDialogOpen(false);
      refetch();
    }
  };

  const isAllSelected = useMemo(() => {
    return selectableExpenses.length > 0 &&
      selectableExpenses.every(exp => selectedSplitIds.has(exp.id));
  }, [selectableExpenses, selectedSplitIds]);

  const hasSelection = selectedSplitIds.size > 0;
  const isLoading = isLoadingProfile || isLoadingExpenses || isLoadingSummary;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <LoadingBeam text={t("debts.loading", "Đang tải chi tiết...")} />
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

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl pb-24">
      <div className="space-y-6">
        {/* Header */}
        <DebtBreakdownHeader
          counterpartyName={counterparty.data.full_name}
          counterpartyAvatarUrl={counterparty.data.avatar_url}
          netAmount={summary.net_amount}
          iOweThem={summary.i_owe_them}
          currency={summary.currency}
          totalIOwe={summary.total_i_owe}
          totalTheyOwe={summary.total_they_owe}
          unpaidCount={summary.unpaid_count}
          partialCount={summary.partial_count}
          paidCount={summary.paid_count}
          counterpartyId={userId!}
        />

        {/* Contributing Expenses */}
        <Card className="rounded-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="typography-section-title">
                  {t('debts.contributingExpenses', 'Contributing Expenses')}
                </CardTitle>
                <p className="typography-metadata mt-1">
                  {t('debts.contributingExpensesDescription', 'Expenses that contribute to this balance')}
                </p>
              </div>
              <Badge variant="secondary">{expenses.length}</Badge>
            </div>
            {/* Select All — only when there are selectable items */}
            {selectableExpenses.length > 0 && (
              <div className="flex items-center space-x-2 pt-3 border-t mt-3">
                <Checkbox
                  id="select-all"
                  checked={isAllSelected}
                  onCheckedChange={handleSelectAll}
                />
                <label
                  htmlFor="select-all"
                  className="typography-body cursor-pointer select-none text-sm"
                >
                  {t('debts.selectAll', 'Select all unsettled expenses')}
                  {hasSelection && (
                    <span className="text-muted-foreground ml-1">
                      ({selectedSplitIds.size}/{selectableExpenses.length})
                    </span>
                  )}
                </label>
              </div>
            )}
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
                {paginatedExpenses.map((expense) => (
                  <ExpenseBreakdownItemSelectable
                    key={expense.id}
                    id={expense.expense_id}
                    splitId={expense.id}
                    description={expense.description}
                    amount={expense.amount}
                    currency={expense.currency}
                    expenseDate={expense.expense_date}
                    groupName={expense.group_name}
                    myShare={expense.my_share}
                    direction={expense.direction}
                    paidByName={expense.direction === 'i_owe'
                      ? counterparty.data.full_name
                      : myName}
                    status={expense.status}
                    isSettled={expense.is_settled}
                    isSelected={selectedSplitIds.has(expense.id)}
                    onSelectChange={handleSelectChange}
                  />
                ))}
                {paginationMetadata.totalPages > 1 && (
                  <div className="mt-4 pt-4 border-t">
                    <PaginationControls
                      metadata={paginationMetadata}
                      onPageChange={setCurrentPage}
                    />
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Floating Action Bar — appears when items are selected */}
      <AnimatePresence>
        {hasSelection && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="bg-primary text-primary-foreground shadow-2xl rounded-xl px-5 py-3 flex items-center gap-3">
              <div className="flex flex-col mr-1">
                <span className="text-xs opacity-80">
                  {t('debts.selectedCount', '{{count}} selected', { count: selectedSplitIds.size })}
                </span>
                <span className="text-sm font-semibold tabular-nums">
                  {formatCurrency(selectedAmount, summary.currency)}
                </span>
              </div>

              <div className="w-px h-8 bg-primary-foreground/20" />

              <Button
                size="sm"
                variant="secondary"
                onClick={handleSettle}
                disabled={isSettling}
              >
                <CheckCircle2Icon className="h-4 w-4 mr-1.5" />
                {isSettling ? t('debts.settling', 'Settling...') : t('debts.settle', 'Settle')}
              </Button>

              {userIsAdmin && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                  disabled={isDeleting}
                >
                  <Trash2Icon className="h-4 w-4 mr-1.5" />
                  {t('common.delete', 'Delete')}
                </Button>
              )}

              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10"
                onClick={() => setSelectedSplitIds(new Set())}
              >
                <XIcon className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Dialog */}
      <BulkDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        selectedCount={selectedSplitIds.size}
        isLoading={isDeleting}
      />
    </div>
  );
};
