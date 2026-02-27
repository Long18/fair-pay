import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingBeam } from "@/components/ui/loading-beam";
import { Button } from "@/components/ui/button";
import { DebtBreakdownHeader } from "@/components/debts/debt-breakdown-header";
import { DebtStickyNav } from "@/components/debts/debt-sticky-nav";
import { DebtFilterTabs } from "@/components/debts/debt-filter-tabs";
import { DebtMonthGroup } from "@/components/debts/debt-month-group";
import { ExpenseBreakdownItemSelectable } from "@/components/debts/expense-breakdown-item-selectable";
import { useContributingExpenses } from "@/hooks/use-contributing-expenses";
import { useDebtSummary } from "@/hooks/balance/use-debt-summary";
import { useSettleSplits } from "@/hooks/balance/use-settle-splits";
import { useDeleteSplits } from "@/hooks/use-delete-splits";
import { useOne, useGetIdentity } from "@refinedev/core";
import { Profile } from "@/modules/profile/types";
import { useTranslation } from "react-i18next";
import { isAdmin } from "@/lib/rbac";
import { BulkDeleteDialog } from "@/components/bulk-operations/BulkDeleteDialog";
import { formatCurrency } from "@/lib/locale-utils";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
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
import type { DebtFilterTab } from "@/components/debts/debt-filter-tabs";

// Group expenses by month key "YYYY-MM"
function getMonthKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}



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
  const myName = identity?.full_name || t("debts.you", "You");

  // Fetch counterparty profile
  const { query: counterpartyQuery } = useOne<Profile>({
    resource: "profiles",
    id: userId!,
  });
  const counterparty = counterpartyQuery.data;
  const isLoadingProfile = counterpartyQuery.isLoading;

  // Fetch contributing expenses
  const {
    expenses,
    isLoading: isLoadingExpenses,
    refetch,
  } = useContributingExpenses(userId!);

  // Calculate debt summary
  const { summary, isLoading: isLoadingSummary } = useDebtSummary(
    userId!,
    counterparty?.data?.full_name || "",
    counterparty?.data?.avatar_url
  );

  // Settlement & delete logic
  const { settle, isSettling } = useSettleSplits();
  const { deleteSplits, isDeleting } = useDeleteSplits();
  const [selectedSplitIds, setSelectedSplitIds] = useState<Set<string>>(
    new Set()
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Filter tab state
  const [activeTab, setActiveTab] = useState<DebtFilterTab>("unsettled");

  // Sticky nav via IntersectionObserver
  const heroRef = useRef<HTMLDivElement>(null);
  const [stickyNavVisible, setStickyNavVisible] = useState(false);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setStickyNavVisible(!entry.isIntersecting),
      { threshold: 0, rootMargin: "-50px 0px 0px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [counterparty?.data, summary]);

  // Only allow selecting expenses where current user is the PAYER (they_owe direction)
  // or user is admin — debtors cannot settle their own splits
  const selectableExpenses = useMemo(() => {
    return expenses.filter(
      (exp) =>
        !exp.is_settled &&
        exp.my_share > 0 &&
        (userIsAdmin || exp.direction === "they_owe")
    );
  }, [expenses, userIsAdmin]);

  // Tab counts
  const tabCounts = useMemo(() => {
    const settled = expenses.filter((e) => e.is_settled).length;
    return {
      all: expenses.length,
      unsettled: expenses.length - settled,
      settled,
    };
  }, [expenses]);

  // Group expenses by month
  const monthGroups = useMemo(() => {
    const grouped = new Map<
      string,
      { unsettled: typeof expenses; settled: typeof expenses; net: number }
    >();

    for (const exp of expenses) {
      const key = getMonthKey(exp.expense_date);
      if (!grouped.has(key)) {
        grouped.set(key, { unsettled: [], settled: [], net: 0 });
      }
      const group = grouped.get(key)!;

      if (exp.is_settled) {
        group.settled.push(exp);
      } else {
        group.unsettled.push(exp);
        // Net: positive = they owe me, negative = I owe them
        group.net +=
          exp.direction === "they_owe" ? exp.my_share : -exp.my_share;
      }
    }

    // Sort by month descending
    return [...grouped.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, data]) => ({
        key,
        unsettled: data.unsettled,
        settled: data.settled,
        netAmount: data.net,
      }));
  }, [expenses]);

  // Filter month groups based on active tab
  const filteredMonthGroups = useMemo(() => {
    if (activeTab === "all") return monthGroups;
    if (activeTab === "unsettled") {
      return monthGroups
        .map((g) => ({ ...g, settled: [] as typeof g.settled }))
        .filter((g) => g.unsettled.length > 0);
    }
    // settled tab
    return monthGroups
      .map((g) => ({
        ...g,
        unsettled: [] as typeof g.unsettled,
      }))
      .filter((g) => g.settled.length > 0);
  }, [monthGroups, activeTab]);

  // Calculate selected amount
  const selectedAmount = useMemo(() => {
    return expenses
      .filter((exp) => selectedSplitIds.has(exp.id))
      .reduce((sum, exp) => sum + exp.my_share, 0);
  }, [expenses, selectedSplitIds]);

  const handleSelectChange = useCallback(
    (splitId: string, checked: boolean) => {
      setSelectedSplitIds((prev) => {
        const next = new Set(prev);
        if (checked) next.add(splitId);
        else next.delete(splitId);
        return next;
      });
    },
    []
  );

  const handleSettle = useCallback(async () => {
    const result = await settle(Array.from(selectedSplitIds));
    if (result.success) {
      setSelectedSplitIds(new Set());
      refetch();
    }
  }, [selectedSplitIds, settle, refetch]);

  const handleInlineSettle = useCallback(
    async (splitId: string) => {
      const result = await settle([splitId]);
      if (result.success) {
        setSelectedSplitIds((prev) => {
          const next = new Set(prev);
          next.delete(splitId);
          return next;
        });
        refetch();
      }
    },
    [settle, refetch]
  );

  const handleSettleAll = useCallback(async () => {
    const allSettleable = selectableExpenses.map((e) => e.id);
    if (allSettleable.length === 0) return;
    const result = await settle(allSettleable);
    if (result.success) {
      setSelectedSplitIds(new Set());
      refetch();
    }
  }, [selectableExpenses, settle, refetch]);

  const handleDelete = useCallback(async () => {
    const result = await deleteSplits(Array.from(selectedSplitIds));
    if (result.success) {
      setSelectedSplitIds(new Set());
      setDeleteDialogOpen(false);
      refetch();
    }
  }, [selectedSplitIds, deleteSplits, refetch]);

  const canSettleSplit = useCallback(
    (splitId: string) => {
      return selectableExpenses.some((e) => e.id === splitId);
    },
    [selectableExpenses]
  );

  const hasSelection = selectedSplitIds.size > 0;
  const isLoading = isLoadingProfile || isLoadingExpenses || isLoadingSummary;
  const prefersReducedMotion = useReducedMotion();

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <LoadingBeam text={t("debts.loading", "Đang tải chi tiết\u2026")} />
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
                  {t("debts.personNotFound", "Person not found")}
                </EmptyTitle>
                <EmptyDescription>
                  {t(
                    "debts.personNotFoundDescription",
                    "Unable to load debt information"
                  )}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl pb-28">
      {/* Sticky compact nav on scroll */}
      <DebtStickyNav
        visible={stickyNavVisible}
        counterpartyName={counterparty.data.full_name}
        counterpartyAvatarUrl={counterparty.data.avatar_url}
        netAmount={summary.net_amount}
        iOweThem={summary.i_owe_them}
        currency={summary.currency}
      />

      <div className="space-y-0">
        {/* Hero Header */}
        <DebtBreakdownHeader
          ref={heroRef}
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
          onPaymentComplete={refetch}
          onSettleAll={handleSettleAll}
        />

        {/* Filter Tabs */}
        <div className="mt-4 rounded-xl border overflow-hidden bg-card shadow-sm">
          <DebtFilterTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            counts={tabCounts}
          />

          {/* Transaction List */}
          {filteredMonthGroups.length === 0 ? (
            <div className="py-12">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <ScaleIcon className="h-8 w-8" />
                  </EmptyMedia>
                  <EmptyTitle>
                    {activeTab === "settled"
                      ? t("debts.noSettledExpenses", "No settled expenses")
                      : t("debts.allClear", "All clear!")}
                  </EmptyTitle>
                  <EmptyDescription>
                    {t(
                      "debts.noExpensesInFilter",
                      "No expenses to show in this filter."
                    )}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            </div>
          ) : (
            filteredMonthGroups.map((group) => (
              <DebtMonthGroup
                key={group.key}
                monthKey={group.key}
                netAmount={group.netAmount}
                currency={summary.currency}
                settledCount={group.settled.length}
                showSettledToggle={activeTab !== "settled"}
                settledChildren={group.settled.map((expense) => (
                  <ExpenseBreakdownItemSelectable
                    key={expense.id}
                    id={expense.expense_id}
                    splitId={expense.id}
                    description={expense.description}
                    amount={expense.amount}
                    currency={expense.currency}
                    expenseDate={expense.expense_date}
                    groupName={expense.group_name}
                    category={expense.category}
                    myShare={expense.my_share}
                    direction={expense.direction}
                    paidByName={
                      expense.direction === "i_owe"
                        ? counterparty.data.full_name
                        : myName
                    }
                    status={expense.status}
                    isSettled={expense.is_settled}
                    isSelected={false}
                    onSelectChange={handleSelectChange}
                  />
                ))}
              >
                {/* Unsettled items */}
                {group.unsettled.map((expense) => (
                  <ExpenseBreakdownItemSelectable
                    key={expense.id}
                    id={expense.expense_id}
                    splitId={expense.id}
                    description={expense.description}
                    amount={expense.amount}
                    currency={expense.currency}
                    expenseDate={expense.expense_date}
                    groupName={expense.group_name}
                    category={expense.category}
                    myShare={expense.my_share}
                    direction={expense.direction}
                    paidByName={
                      expense.direction === "i_owe"
                        ? counterparty.data.full_name
                        : myName
                    }
                    status={expense.status}
                    isSettled={expense.is_settled}
                    isSelected={selectedSplitIds.has(expense.id)}
                    onSelectChange={handleSelectChange}
                    onInlineSettle={handleInlineSettle}
                    canSettle={canSettleSplit(expense.id)}
                  />
                ))}
              </DebtMonthGroup>
            ))
          )}
        </div>
      </div>

      {/* Floating Action Bar */}
      <AnimatePresence>
        {hasSelection && (
          <motion.div
            initial={prefersReducedMotion ? false : { y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { y: 80, opacity: 0 }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { type: "spring", damping: 25, stiffness: 300 }
            }
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="bg-foreground text-background shadow-2xl rounded-2xl px-4 py-3 flex items-center gap-3">
              <div className="flex flex-col mr-1">
                <span className="text-[10px] opacity-55 font-medium">
                  {t("debts.selectedCount", "{{count}} selected", {
                    count: selectedSplitIds.size,
                  })}
                </span>
                <span className="text-sm font-extrabold tabular-nums">
                  {formatCurrency(selectedAmount, summary.currency)}
                </span>
              </div>

              <div className="w-px h-7 bg-current opacity-15" />

              <Button
                size="sm"
                variant="secondary"
                onClick={handleSettle}
                disabled={isSettling}
                className="gap-1.5"
              >
                <CheckCircle2Icon className="h-4 w-4" />
                {isSettling
                  ? t("debts.settling", "Settling\u2026")
                  : t("debts.settle", "Settle")}
              </Button>

              {userIsAdmin && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                  disabled={isDeleting}
                  className="gap-1.5"
                >
                  <Trash2Icon className="h-4 w-4" />
                  {t("common.delete", "Delete")}
                </Button>
              )}

              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-background hover:bg-background/10"
                onClick={() => setSelectedSplitIds(new Set())}
                aria-label="Clear selection"
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
