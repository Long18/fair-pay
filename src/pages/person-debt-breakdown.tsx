import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import { useGetIdentity, useOne } from "@refinedev/core";
import { toast } from "sonner";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BulkDeleteDialog } from "@/components/bulk-operations/BulkDeleteDialog";
import { DebtBreakdownHeader } from "@/components/debts/debt-breakdown-header";
import { DebtFilterTabs } from "@/components/debts/debt-filter-tabs";
import { DebtMonthGroup } from "@/components/debts/debt-month-group";
import { ExpenseBreakdownItemSelectable } from "@/components/debts/expense-breakdown-item-selectable";
import { QuickSettlementDialog } from "@/components/payments/quick-settlement-dialog";
import { SettlementCelebration } from "@/components/share/SettlementCelebration";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  CheckCircle2Icon,
  ScaleIcon,
  Trash2Icon,
} from "@/components/ui/icons";
import { PageContainer } from "@/components/ui/page-container";
import { Button } from "@/components/ui/button";
import { FloatingBar } from "@/components/ui/floating-stack";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingBeam } from "@/components/ui/loading-beam";
import { useDebtSummary } from "@/hooks/balance/use-debt-summary";
import { useDeleteSplits } from "@/hooks/use-delete-splits";
import { useContributingExpenses } from "@/hooks/use-contributing-expenses";
import { useHaptics } from "@/hooks/use-haptics";
import { useSettleSplits } from "@/hooks/balance/use-settle-splits";
import { formatCurrency, formatNumber } from "@/lib/locale-utils";
import { PaymentMethod } from "@/lib/payment-methods";
import { useInstantCreate } from "@/hooks/use-instant-mutation";
import { journeyTracking } from "@/lib/journey-tracking";
import { isAdmin } from "@/lib/rbac";
import { Profile } from "@/modules/profile/types";
import { useTranslation } from "react-i18next";
import type { DebtFilterTab } from "@/components/debts/debt-filter-tabs";

function getMonthKey(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export const PersonDebtBreakdown = () => {
  const { userId } = useParams<{ userId: string }>();
  const { t } = useTranslation();
  const { tap, success, warning } = useHaptics();

  const [userIsAdmin, setUserIsAdmin] = useState(false);
  const [selectedSplitIds, setSelectedSplitIds] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<DebtFilterTab>("unsettled");
  const [celebrationOpen, setCelebrationOpen] = useState(false);
  const [celebrationAmount, setCelebrationAmount] = useState(0);
  const [quickSettleDialogOpen, setQuickSettleDialogOpen] = useState(false);
  const [quickSettleAmount, setQuickSettleAmount] = useState(0);

  useEffect(() => {
    isAdmin().then(setUserIsAdmin);
  }, []);

  useEffect(() => {
    if (!userId) return;
    journeyTracking.trackEvent({
      event_name: "debt_detail_opened",
      event_category: "debt",
      page_path: window.location.pathname,
      flow_name: "debt-settle",
      step_name: "detail",
      properties: { counterparty_user_id: userId },
    });
  }, [userId]);

  const { data: identity } = useGetIdentity<Profile>();
  const myName = identity?.full_name || t("debts.you", "You");

  const { query: counterpartyQuery } = useOne<Profile>({
    resource: "profiles",
    id: userId!,
  });
  const counterparty = counterpartyQuery.data;
  const isLoadingProfile = counterpartyQuery.isLoading;

  const {
    expenses,
    isLoading: isLoadingExpenses,
    refetch,
  } = useContributingExpenses(userId!);

  const { summary, isLoading: isLoadingSummary } = useDebtSummary(
    userId!,
    counterparty?.data?.full_name || "",
    counterparty?.data?.avatar_url
  );

  const { settle, isSettling } = useSettleSplits();
  const { deleteSplits, isDeleting } = useDeleteSplits();
  const createPaymentMutation = useInstantCreate();
  const prefersReducedMotion = useReducedMotion();

  const selectableExpenses = useMemo(() => {
    return expenses.filter(
      (expense) =>
        !expense.is_settled &&
        expense.my_share > 0 &&
        (userIsAdmin || expense.direction === "they_owe")
    );
  }, [expenses, userIsAdmin]);

  const tabCounts = useMemo(() => {
    const settledCount = expenses.filter((expense) => expense.is_settled).length;

    return {
      all: expenses.length,
      unsettled: expenses.length - settledCount,
      settled: settledCount,
    };
  }, [expenses]);

  const monthGroups = useMemo(() => {
    const grouped = new Map<
      string,
      {
        unsettled: typeof expenses;
        settled: typeof expenses;
        openNetAmount: number;
        settledNetAmount: number;
        settledTotal: number;
      }
    >();

    for (const expense of expenses) {
      const key = getMonthKey(expense.expense_date);
      const signedAmount =
        expense.direction === "they_owe" ? expense.my_share : -expense.my_share;

      if (!grouped.has(key)) {
        grouped.set(key, {
          unsettled: [],
          settled: [],
          openNetAmount: 0,
          settledNetAmount: 0,
          settledTotal: 0,
        });
      }

      const group = grouped.get(key)!;

      if (expense.is_settled) {
        group.settled.push(expense);
        group.settledTotal += expense.my_share;
        group.settledNetAmount += signedAmount;
      } else {
        group.unsettled.push(expense);
        group.openNetAmount += signedAmount;
      }
    }

    return [...grouped.entries()]
      .sort(([leftKey], [rightKey]) => rightKey.localeCompare(leftKey))
      .map(([key, value]) => ({
        key,
        unsettled: value.unsettled,
        settled: value.settled,
        openNetAmount: value.openNetAmount,
        settledNetAmount: value.settledNetAmount,
        allNetAmount: value.openNetAmount + value.settledNetAmount,
        settledTotal: value.settledTotal,
      }));
  }, [expenses]);

  const filteredMonthGroups = useMemo(() => {
    if (activeTab === "all") {
      return monthGroups.map((group) => ({
        ...group,
        displayNetAmount: group.allNetAmount,
      }));
    }

    if (activeTab === "unsettled") {
      return monthGroups.reduce<((typeof monthGroups)[number] & { displayNetAmount: number })[]>((acc, group) => {
        if (group.unsettled.length > 0) {
          acc.push({
            ...group,
            displayNetAmount: group.openNetAmount,
          });
        }
        return acc;
      }, []);
    }

    return monthGroups.reduce<((typeof monthGroups)[number] & { displayNetAmount: number })[]>((acc, group) => {
      if (group.settled.length > 0) {
        acc.push({
          ...group,
          unsettled: [] as typeof group.unsettled,
          displayNetAmount: group.settledNetAmount,
        });
      }
      return acc;
    }, []);
  }, [monthGroups, activeTab]);

  const selectedAmount = useMemo(() => {
    return expenses
      .filter((expense) => selectedSplitIds.has(expense.id))
      .reduce((sum, expense) => sum + expense.my_share, 0);
  }, [expenses, selectedSplitIds]);

  const selectedNetEffect = useMemo(() => {
    return expenses
      .filter((expense) => selectedSplitIds.has(expense.id))
      .reduce((sum, expense) => {
        return sum + (expense.direction === "they_owe" ? expense.my_share : -expense.my_share);
      }, 0);
  }, [expenses, selectedSplitIds]);

  const handleSelectChange = useCallback((splitId: string, checked: boolean) => {
    setSelectedSplitIds((previous) => {
      const next = new Set(previous);

      if (checked) {
        next.add(splitId);
      } else {
        next.delete(splitId);
      }

      return next;
    });
  }, []);

  const handleSettle = useCallback(async () => {
    journeyTracking.trackEvent({
      event_name: "debt_settle_button_clicked",
      event_category: "debt",
      page_path: window.location.pathname,
      flow_name: "debt-settle",
      step_name: "settle-selected",
      properties: {
        counterparty_user_id: userId,
        selected_count: selectedSplitIds.size,
      },
    });
    const amount = selectedAmount;
    const result = await settle(Array.from(selectedSplitIds), refetch);

    if (result.success) {
      success();
      setCelebrationAmount(amount);
      setCelebrationOpen(true);
      setSelectedSplitIds(new Set());
    }
  }, [selectedSplitIds, selectedAmount, settle, refetch, success, userId]);

  const handleSettleAll = useCallback(async () => {
    const allSettleable = selectableExpenses.map((expense) => expense.id);

    if (allSettleable.length === 0) {
      return;
    }

    journeyTracking.trackEvent({
      event_name: "debt_settle_button_clicked",
      event_category: "debt",
      page_path: window.location.pathname,
      flow_name: "debt-settle",
      step_name: "settle-all",
      properties: {
        counterparty_user_id: userId,
        selected_count: allSettleable.length,
      },
    });

    const amount = summary?.total_they_owe ?? 0;
    const result = await settle(allSettleable, refetch);

    if (result.success) {
      success();
      if (amount > 0) {
        setCelebrationAmount(amount);
        setCelebrationOpen(true);
      }
      setSelectedSplitIds(new Set());
    }
  }, [selectableExpenses, settle, refetch, success, userId, summary?.total_they_owe]);

  const handleRecordPayment = useCallback(() => {
    if (!userId || !summary || summary.total_i_owe <= 0) return;
    setQuickSettleAmount(summary.total_i_owe);
    setQuickSettleDialogOpen(true);
  }, [userId, summary]);

  const handleConfirmQuickSettlement = useCallback(
    async (data: {
      amount: number;
      paymentMethod: PaymentMethod;
      paymentDate: string;
      notes: string;
    }) => {
      if (!userId || !identity?.id || !counterparty?.data) return;

      const owedBeforePayment = quickSettleAmount;

      try {
        await createPaymentMutation.mutateAsync({
          resource: "payments",
          values: {
            from_user_id: identity.id,
            to_user_id: userId,
            amount: data.amount,
            payment_date: data.paymentDate,
            payment_method: data.paymentMethod,
            notes: data.notes || null,
            group_id: null,
            created_by: identity.id,
          },
        });

        success();
        toast.success(
          t("payments.quickSettle.recordedSuccess", "Payment of {{amount}} {{currency}} to {{name}} recorded!", {
            amount: formatNumber(data.amount),
            currency: summary?.currency ?? "₫",
            name: counterparty.data.full_name,
          }),
        );
        setQuickSettleDialogOpen(false);
        refetch();

        if (data.amount < owedBeforePayment) {
          const remaining = owedBeforePayment - data.amount;
          setTimeout(() => {
            toast.info(
              t("payments.quickSettle.remainingBalance", "Remaining balance: {{amount}} {{currency}}", {
                amount: formatNumber(remaining),
                currency: summary?.currency ?? "₫",
              }),
              {
                action: {
                  label: t("payments.quickSettle.payMore", "Pay more"),
                  onClick: () => {
                    setQuickSettleAmount(remaining);
                    setQuickSettleDialogOpen(true);
                  },
                },
              },
            );
          }, 1500);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : t("common.unknownError", "Unknown error");
        toast.error(
          t("payments.quickSettle.recordFailed", "Failed to record payment: {{message}}", { message }),
        );
        throw err;
      }
    },
    [
      userId,
      identity?.id,
      counterparty?.data,
      quickSettleAmount,
      createPaymentMutation,
      success,
      t,
      summary?.currency,
      refetch,
    ],
  );

  const handleDelete = useCallback(async () => {
    const result = await deleteSplits(Array.from(selectedSplitIds));

    if (result.success) {
      setSelectedSplitIds(new Set());
      setDeleteDialogOpen(false);
      refetch();
    }
  }, [selectedSplitIds, deleteSplits, refetch]);

  const participants = useMemo(() => {
    if (!counterparty?.data || !identity) {
      return undefined;
    }

    return [
      {
        name: counterparty.data.full_name,
        avatarUrl: counterparty.data.avatar_url,
      },
      {
        name: identity.full_name || t("debts.you", "You"),
        avatarUrl: identity.avatar_url,
      },
    ];
  }, [counterparty?.data, identity, t]);

  const hasSelection = selectedSplitIds.size > 0;
  const isLoading = isLoadingProfile || isLoadingExpenses || isLoadingSummary;
  const shareVersionSource = useMemo(() => {
    const candidates = expenses.reduce<string[]>((acc, expense) => {
      if (expense.settled_at) acc.push(expense.settled_at);
      if (expense.expense_date) acc.push(expense.expense_date);
      return acc;
    }, []);

    return candidates.sort().pop() ?? null;
  }, [expenses]);

  if (isLoading) {
    return (
      <PageContainer padding="none" variant="narrow">
        <LoadingBeam text={t("debts.loading", "Đang tải chi tiết…")} />
      </PageContainer>
    );
  }

  if (!counterparty?.data || !summary) {
    return (
      <PageContainer padding="none" variant="narrow">
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
      </PageContainer>
    );
  }

  return (
    <PageContainer padding="none" variant="narrow" spacing="compact" className="pb-28">
      <div className="space-y-0">
        <DebtBreakdownHeader
          counterpartyName={counterparty.data.full_name}
          counterpartyAvatarUrl={counterparty.data.avatar_url}
          netAmount={summary.net_amount}
          iOweThem={summary.i_owe_them}
          currency={summary.currency}
          totalIOwe={summary.total_i_owe}
          totalTheyOwe={summary.total_they_owe}
          counterpartyId={userId!}
          onPaymentComplete={refetch}
          onSettleAll={handleSettleAll}
          isSettlingAll={isSettling}
          onRecordPayment={handleRecordPayment}
          shareVersionSource={shareVersionSource}
        />

        <div className="sticky top-16 z-30 bg-background/95 py-4 backdrop-blur-sm md:top-20">
          <DebtFilterTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            counts={tabCounts}
          />
        </div>

        {filteredMonthGroups.length === 0 ? (
          <div className="py-16">
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
          <div className="space-y-8 pt-2">
            {filteredMonthGroups.map((group) => (
              <DebtMonthGroup
                key={group.key}
                monthKey={group.key}
                netAmount={group.displayNetAmount}
                currency={summary.currency}
                settledCount={group.settled.length}
                settledTotal={group.settledTotal}
                participants={participants}
                defaultSettledExpanded={activeTab === "settled"}
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
                    settledAt={expense.settled_at}
                    isSelected={false}
                    onSelectChange={handleSelectChange}
                  />
                ))}
              >
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
                  />
                ))}
              </DebtMonthGroup>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {hasSelection && (
          <FloatingBar className="justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[10px] font-medium uppercase tracking-[0.18em] opacity-55">
                {t("debts.selectedCount", "{{count}} selected", {
                  count: selectedSplitIds.size,
                })}
              </span>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-sm font-extrabold tabular-nums">
                  {formatCurrency(selectedAmount, summary.currency)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {selectedNetEffect >= 0 ? "+" : "−"}
                  {formatCurrency(Math.abs(selectedNetEffect), summary.currency)}
                </span>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  tap();
                  setSelectedSplitIds(new Set());
                }}
              >
                {t("common.cancel", "Cancel")}
              </Button>

              {userIsAdmin && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    warning();
                    setDeleteDialogOpen(true);
                  }}
                  disabled={isDeleting}
                >
                  <Trash2Icon className="h-4 w-4" />
                  {t("common.delete", "Delete")}
                </Button>
              )}

              <Button
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={handleSettle}
                disabled={isSettling}
              >
                <CheckCircle2Icon className="h-4 w-4" />
                {isSettling
                  ? t("debts.settling", "Settling…")
                  : t("debts.settle", "Settle")}
              </Button>
            </div>
          </FloatingBar>
        )}
      </AnimatePresence>

      <BulkDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        selectedCount={selectedSplitIds.size}
        isLoading={isDeleting}
      />

      <SettlementCelebration
        open={celebrationOpen}
        onClose={() => setCelebrationOpen(false)}
        debtorName={counterparty?.data?.full_name ?? ""}
        amount={celebrationAmount}
        currency={summary?.currency}
      />

      {counterparty?.data && summary.total_i_owe > 0 && (
        <QuickSettlementDialog
          open={quickSettleDialogOpen}
          onOpenChange={setQuickSettleDialogOpen}
          recipientName={counterparty.data.full_name}
          recipientId={userId}
          amount={quickSettleAmount}
          currency={summary.currency}
          onConfirm={handleConfirmQuickSettlement}
        />
      )}
    </PageContainer>
  );
};
