import { useMemo, useState } from "react";
import { useGo } from "@refinedev/core";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { AnimatedList } from "@/components/ui/animated-list";
import { AnimatedRow } from "@/components/ui/animated-row";
import { useStaggerAnimation } from "@/hooks/ui/use-stagger-animation";
import { LoadingBeam } from "@/components/ui/loading-beam";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PaginationControls, PaginationMetadata } from "@/components/ui/pagination-controls";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ScaleIcon,
} from "@/components/ui/icons";
import { useHaptics } from "@/hooks/use-haptics";
import { useContributingExpenses } from "@/hooks/use-contributing-expenses";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/locale-utils";

interface SettledDebt {
  counterparty_id: string | null;
  counterparty_name: string;
  counterparty_avatar_url?: string | null;
  counterparty_email?: string;
  amount: string | number;
  currency?: string;
  i_owe_them: boolean;
  total_amount?: number;
  settled_amount?: number;
  remaining_amount?: number;
  transaction_count?: number;
  last_transaction_date?: string;
}

interface SettledHistoryListProps {
  debts: SettledDebt[];
  isLoading?: boolean;
  pageSize?: number;
}

type SettledPreviewExpense = {
  expense_id: string;
  description: string;
  amount: number;
  currency: string;
  expense_date: string;
  group_name?: string | null;
  my_share: number;
  is_settled: boolean;
};

function formatHistoryDate(dateString?: string) {
  if (!dateString) return "";

  try {
    return format(new Date(dateString), "MMM d");
  } catch {
    return "";
  }
}

function SettledStatusBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-status-success-bg/60 px-2.5 py-1 text-[11px] font-semibold text-status-success-foreground border border-status-success-border/60">
      <span className="h-1.5 w-1.5 rounded-full bg-status-success-foreground" />
      {label}
    </span>
  );
}

function HistoryArchivePreview({
  expenses,
  isLoading,
  emptyLabel,
  archiveNote,
  onViewDetails,
}: {
  expenses: SettledPreviewExpense[];
  isLoading: boolean;
  emptyLabel: string;
  archiveNote: string;
  onViewDetails?: () => void;
}) {
  const { t } = useTranslation();
  const go = useGo();
  const { tap } = useHaptics();

  const settledExpenses = useMemo(
    () => expenses.filter((expense) => expense.is_settled).slice(0, 3),
    [expenses]
  );

  if (isLoading) {
    return (
      <div className="space-y-2 rounded-2xl border border-border/80 bg-background/80 p-4">
        {[1, 2, 3].map((row) => (
          <div
            key={row}
            className="grid gap-3 rounded-xl bg-muted/35 px-3 py-3 md:grid-cols-[minmax(0,1fr)_auto]"
          >
            <div className="space-y-2">
              <div className="h-4 w-32 rounded bg-muted" />
              <div className="h-3 w-24 rounded bg-muted" />
            </div>
            <div className="space-y-2 md:w-24">
              <div className="h-4 w-20 rounded bg-muted" />
              <div className="h-3 w-12 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (settledExpenses.length === 0) {
    return (
      <div className="space-y-3 rounded-2xl border border-dashed border-border bg-background/70 p-4">
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        {onViewDetails && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-full justify-between rounded-xl border border-border bg-background px-3 text-sm font-medium md:w-auto"
            onClick={onViewDetails}
          >
            <span>{t("dashboard.viewDetails", "View details")}</span>
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border/80 bg-background/85 p-4">
      <div className="space-y-2">
        {settledExpenses.map((expense) => (
          <button
            key={`${expense.expense_id}-${expense.expense_date}`}
            type="button"
            className="grid w-full gap-3 rounded-xl bg-muted/25 px-3 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:grid-cols-[minmax(0,1fr)_auto]"
            onClick={() => {
              tap();
              go({ to: `/expenses/show/${expense.expense_id}` });
            }}
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{expense.description}</p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <span>{formatHistoryDate(expense.expense_date)}</span>
                {expense.group_name && (
                  <>
                    <span className="text-muted-foreground/40">•</span>
                    <span className="truncate">{expense.group_name}</span>
                  </>
                )}
                <span className="text-muted-foreground/40">•</span>
                <span className="tabular-nums">
                  {t("expense.total", "Total")}: {formatCurrency(expense.amount, expense.currency)}
                </span>
              </div>
            </div>

            <div className="text-left md:text-right">
              <span className="block text-sm font-semibold tabular-nums text-foreground">
                {formatCurrency(expense.my_share, expense.currency)}
              </span>
              <span className="mt-1 inline-flex text-[11px] font-semibold text-status-success-foreground">
                {t("expenses.paid", "Paid")}
              </span>
            </div>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">{archiveNote}</span>
        {onViewDetails && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 justify-between rounded-xl border border-border bg-background px-3 text-sm font-medium"
            onClick={onViewDetails}
          >
            <span>{t("dashboard.viewDetails", "View details")}</span>
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

function SettledRowExpandable({
  debt,
  index,
  currency,
  isExpanded,
  onToggleExpand,
  rowVariants,
}: {
  debt: SettledDebt;
  index: number;
  currency: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  rowVariants?: import("framer-motion").Variants;
}) {
  const { t } = useTranslation();
  const go = useGo();
  const { tap } = useHaptics();
  const rowKey = debt.counterparty_id || debt.counterparty_email || debt.counterparty_name;
  const { expenses, isLoading } = useContributingExpenses(isExpanded ? (debt.counterparty_id || "") : "");
  const totalSettled = Number(debt.total_amount || debt.amount || 0);
  const transactionCount = debt.transaction_count || 0;
  const lastClosed = formatHistoryDate(debt.last_transaction_date);

  return (
    <>
      <motion.tr
        data-slot="table-row"
        variants={rowVariants}
        custom={index}
        className={cn(
          "hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors",
          "cursor-pointer hover:bg-muted/40",
          index % 2 === 0 && "bg-muted/10"
        )}
        onClick={() => {
          tap();
          onToggleExpand();
        }}
      >
        <TableCell className="py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative">
              <Avatar className="h-10 w-10 rounded-xl border border-border/70">
                <AvatarImage src={debt.counterparty_avatar_url || undefined} />
                <AvatarFallback className="rounded-xl bg-primary/10 text-xs font-semibold text-primary">
                  {debt.counterparty_name
                    .split(" ")
                    .map((name) => name[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 rounded-full bg-status-success-bg p-1 border border-status-success-border">
                <CheckIcon className="h-3 w-3 text-status-success-foreground" />
              </div>
            </div>

            <div className="min-w-0">
              <p className="typography-row-title truncate">{debt.counterparty_name}</p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                {lastClosed && (
                  <>
                    <span>{t("history.closedOn", { defaultValue: "Closed {{date}}", date: lastClosed })}</span>
                    <span className="text-muted-foreground/40">•</span>
                  </>
                )}
                <span>
                  {t("history.transactionCount", {
                    defaultValue: "{{count}} transactions",
                    count: transactionCount,
                  })}
                </span>
              </div>
            </div>
          </div>
        </TableCell>

        <TableCell className="py-4">
          <SettledStatusBadge label={t("history.fullySettled", "Fully settled")} />
        </TableCell>

        <TableCell className="py-4 text-right">
          <div className="text-right">
            <span className="block typography-amount-prominent tabular-nums">
              {formatCurrency(totalSettled, currency)}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {t("history.totalSettled", "Total settled")}
            </span>
          </div>
        </TableCell>

        <TableCell className="py-4 text-center">
          <span className="inline-flex min-w-10 items-center justify-center rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground tabular-nums">
            {transactionCount}
          </span>
        </TableCell>

        <TableCell className="py-4 text-right">
          <div className="flex items-center justify-end gap-2">
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-status-success-foreground tabular-nums">
              <CheckIcon className="h-4 w-4" />
              {formatCurrency(0, currency)}
            </span>
            <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.15 }}>
              <ChevronDownIcon className="h-5 w-5 text-muted-foreground shrink-0" />
            </motion.div>
          </div>
        </TableCell>
      </motion.tr>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <TableRow className={cn(index % 2 === 0 && "bg-muted/10")}>
            <TableCell colSpan={5} className="p-0">
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="border-t bg-muted/15 px-5 py-4">
                  <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {t("history.recentSettledItems", "Recent settled items")}
                  </div>
                  <HistoryArchivePreview
                    expenses={expenses}
                    isLoading={isLoading}
                    emptyLabel={t("history.noSettledItems", "No settled items found for this archive yet.")}
                    archiveNote={t("history.archivePreviewNote", {
                      defaultValue: "Open details to browse the full archive with {{name}}.",
                      name: debt.counterparty_name,
                    })}
                    onViewDetails={
                      debt.counterparty_id
                        ? () => {
                            tap();
                            go({ to: `/profile/${debt.counterparty_id}` });
                          }
                        : undefined
                    }
                  />
                </div>
              </motion.div>
            </TableCell>
          </TableRow>
        )}
      </AnimatePresence>
    </>
  );
}

function SettledCardExpandable({
  debt,
  currency,
  isExpanded,
  onToggleExpand,
}: {
  debt: SettledDebt;
  currency: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  const { t } = useTranslation();
  const go = useGo();
  const { tap } = useHaptics();
  const { expenses, isLoading } = useContributingExpenses(isExpanded ? (debt.counterparty_id || "") : "");
  const totalSettled = Number(debt.total_amount || debt.amount || 0);
  const transactionCount = debt.transaction_count || 0;
  const lastClosed = formatHistoryDate(debt.last_transaction_date);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
      <div
        onClick={() => {
          tap();
          onToggleExpand();
        }}
        className="cursor-pointer px-4 py-4 transition-colors hover:bg-muted/20"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="relative shrink-0">
              <Avatar className="h-11 w-11 rounded-xl border border-border/70">
                <AvatarImage src={debt.counterparty_avatar_url || undefined} />
                <AvatarFallback className="rounded-xl bg-primary/10 text-xs font-semibold text-primary">
                  {debt.counterparty_name
                    .split(" ")
                    .map((name) => name[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 rounded-full bg-status-success-bg p-1 border border-status-success-border">
                <CheckIcon className="h-3 w-3 text-status-success-foreground" />
              </div>
            </div>

            <div className="min-w-0">
              <p className="typography-row-title truncate">{debt.counterparty_name}</p>
              <div className="mt-2">
                <SettledStatusBadge label={t("history.fullySettled", "Fully settled")} />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <span>
                  {t("history.transactionCount", {
                    defaultValue: "{{count}} transactions",
                    count: transactionCount,
                  })}
                </span>
                {lastClosed && (
                  <>
                    <span className="text-muted-foreground/40">•</span>
                    <span>{t("history.closedShort", { defaultValue: "Closed {{date}}", date: lastClosed })}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="ml-3 flex shrink-0 items-center gap-2">
            <div className="text-right">
              <span className="block typography-amount-prominent tabular-nums">
                {formatCurrency(totalSettled, currency)}
              </span>
              <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-status-success-foreground">
                <CheckIcon className="h-3.5 w-3.5" />
                {formatCurrency(0, currency)}
              </span>
            </div>
            <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.15 }}>
              <ChevronDownIcon className="h-4 w-4 text-muted-foreground shrink-0" />
            </motion.div>
          </div>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden border-t bg-muted/15"
          >
            <div className="space-y-3 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {t("history.recentSettledItems", "Recent settled items")}
              </div>
              <HistoryArchivePreview
                expenses={expenses}
                isLoading={isLoading}
                emptyLabel={t("history.noSettledItems", "No settled items found for this archive yet.")}
                archiveNote={t("history.archivePreviewShort", {
                  defaultValue: "More archived items live in full details.",
                })}
                onViewDetails={
                  debt.counterparty_id
                    ? () => {
                        tap();
                        go({ to: `/profile/${debt.counterparty_id}` });
                      }
                    : undefined
                }
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function SettledHistoryList({
  debts,
  isLoading = false,
  pageSize = 10,
}: SettledHistoryListProps) {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const settledDebts = useMemo(() => {
    return debts.filter((debt) => Number(debt.remaining_amount ?? debt.amount) === 0);
  }, [debts]);

  const totalItems = settledDebts.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedDebts = useMemo(
    () => settledDebts.slice(startIndex, endIndex),
    [settledDebts, startIndex, endIndex]
  );

  const metadata: PaginationMetadata = {
    totalItems,
    totalPages: totalPages || 1,
    currentPage,
    pageSize,
  };

  const { containerVariants, rowVariants, animationKey } = useStaggerAnimation(paginatedDebts);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setExpandedRows(new Set());
    }
  };

  const toggleRow = (rowId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);

      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }

      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <LoadingBeam text={t("history.loading", "Loading history...")} />
      </div>
    );
  }

  if (settledDebts.length === 0) {
    return (
      <Empty className="py-12">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ScaleIcon className="h-8 w-8" />
          </EmptyMedia>
          <EmptyTitle>
            {t("history.noSettledDebts", "No settled transactions yet")}
          </EmptyTitle>
          <EmptyDescription>
            {t(
              "history.noSettledDebtsDescription",
              "When you settle debts with friends, they will appear here."
            )}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="space-y-4 p-6">
      <AnimatedList items={paginatedDebts} className="block space-y-3 md:hidden">
        {paginatedDebts.map((debt, index) => {
          const rowId = debt.counterparty_id || debt.counterparty_email || debt.counterparty_name;

          return (
            <AnimatedRow key={rowId} index={index}>
              <SettledCardExpandable
                debt={debt}
                currency={debt.currency || "VND"}
                isExpanded={expandedRows.has(rowId)}
                onToggleExpand={() => toggleRow(rowId)}
              />
            </AnimatedRow>
          );
        })}
      </AnimatedList>

      <motion.div
        className="hidden md:block overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        key={`settled-desktop-${animationKey}`}
      >
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>{t("profile.person", "Person")}</TableHead>
              <TableHead>{t("profile.status", "Status")}</TableHead>
              <TableHead className="text-right">{t("history.totalSettled", "Total settled")}</TableHead>
              <TableHead className="text-center">{t("dashboard.transactions", "Transactions")}</TableHead>
              <TableHead className="text-right">{t("dashboard.remainingAmount", "Remaining")}</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {paginatedDebts.map((debt, index) => {
              const rowId = debt.counterparty_id || debt.counterparty_email || debt.counterparty_name;

              return (
                <SettledRowExpandable
                  key={rowId}
                  debt={debt}
                  index={index}
                  currency={debt.currency || "VND"}
                  isExpanded={expandedRows.has(rowId)}
                  onToggleExpand={() => toggleRow(rowId)}
                  rowVariants={rowVariants}
                />
              );
            })}
          </TableBody>
        </Table>
      </motion.div>

      {totalPages > 1 && (
        <PaginationControls
          metadata={metadata}
          onPageChange={handlePageChange}
          showFirstLast={true}
          maxVisiblePages={5}
        />
      )}
    </div>
  );
}
