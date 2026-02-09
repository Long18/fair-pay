import { useMemo, useState } from "react";
import { useGo } from "@refinedev/core";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PaginationControls, PaginationMetadata } from "@/components/ui/pagination-controls";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { CheckIcon, ChevronDownIcon, ChevronRightIcon, ScaleIcon } from "@/components/ui/icons";
import { PaymentStateBadge } from "@/components/ui/payment-state-badge";
import { ContributingExpensesList } from "@/components/dashboard/contributing-expenses-list";
import { useContributingExpenses } from "@/hooks/use-contributing-expenses";
import { getPaymentStateColors } from "@/lib/status-colors";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/locale-utils";

interface SettledDebt {
  counterparty_id: string;
  counterparty_name: string;
  counterparty_avatar_url?: string | null;
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

// --- Expandable Row (Desktop) ---
function SettledRowExpandable({
  debt,
  index,
  currency,
  isExpanded,
  onToggleExpand,
}: {
  debt: SettledDebt;
  index: number;
  currency: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  const { t } = useTranslation();
  const go = useGo();
  const { expenses, isLoading } = useContributingExpenses(debt.counterparty_id);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    try { return format(new Date(dateString), "MMM d"); } catch { return ""; }
  };

  return (
    <>
      <TableRow
        className={cn(
          "cursor-pointer transition-colors hover:bg-muted/80",
          index % 2 === 0 && "bg-muted/50 dark:bg-muted/30",
        )}
        onClick={onToggleExpand}
      >
        <TableCell>
          <div className="relative">
            <Avatar className="h-8 w-8">
              <AvatarImage src={debt.counterparty_avatar_url || undefined} />
              <AvatarFallback className="text-xs">
                {debt.counterparty_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className={cn("absolute -bottom-1 -right-1 rounded-full p-0.5", getPaymentStateColors("paid").bg)}>
              <CheckIcon className={cn("h-3 w-3", getPaymentStateColors("paid").icon)} />
            </div>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex flex-col">
            <span className="typography-row-title">{debt.counterparty_name}</span>
            {debt.last_transaction_date && (
              <span className="typography-metadata">
                {t("dashboard.last", "Last")}: {formatDate(debt.last_transaction_date)}
              </span>
            )}
          </div>
        </TableCell>
        <TableCell>
          <PaymentStateBadge state="paid" size="md" />
        </TableCell>
        <TableCell className="text-right">
          <span className="typography-amount text-muted-foreground tabular-nums">
            {formatCurrency(Number(debt.total_amount || debt.amount), currency)}
          </span>
        </TableCell>
        <TableCell className="text-center">
          <Badge variant="outline" className="text-xs">
            {debt.transaction_count || 0}
          </Badge>
        </TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-2">
            <span className={cn("flex items-center gap-1 typography-amount tabular-nums", getPaymentStateColors("paid").text)}>
              <CheckIcon className="h-4 w-4" />
              {formatCurrency(0, currency)}
            </span>
            <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.15 }}>
              <ChevronDownIcon className="h-5 w-5 text-muted-foreground shrink-0" />
            </motion.div>
          </div>
        </TableCell>
      </TableRow>

      <AnimatePresence>
        {isExpanded && (
          <TableRow className={cn(index % 2 === 0 && "bg-muted/50 dark:bg-muted/30")}>
            <TableCell colSpan={6} className="p-0">
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="p-4 border-t bg-muted/10">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    {t("dashboard.contributingExpenses", "Contributing Expenses")}
                  </h4>
                  <ContributingExpensesList expenses={expenses} counterpartyId={debt.counterparty_id} isLoading={isLoading} />
                  <Button variant="default" size="sm" className="w-full mt-3 gap-2" onClick={(e) => { e.stopPropagation(); go({ to: `/profile/${debt.counterparty_id}` }); }}>
                    {t("dashboard.viewFullBreakdown", "View Details")}
                    <ChevronRightIcon className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            </TableCell>
          </TableRow>
        )}
      </AnimatePresence>
    </>
  );
}

// --- Expandable Card (Mobile) ---
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
  const { expenses, isLoading } = useContributingExpenses(debt.counterparty_id);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    try { return format(new Date(dateString), "MMM d"); } catch { return ""; }
  };

  return (
    <div className="border rounded-md overflow-hidden bg-card transition-shadow hover:shadow-sm">
      <div
        onClick={onToggleExpand}
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative shrink-0">
            <Avatar className="h-10 w-10 border-2 border-border">
              <AvatarImage src={debt.counterparty_avatar_url || undefined} />
              <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                {debt.counterparty_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className={cn("absolute -bottom-1 -right-1 rounded-full p-0.5", getPaymentStateColors("paid").bg)}>
              <CheckIcon className={cn("h-3 w-3", getPaymentStateColors("paid").icon)} />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="typography-row-title truncate">{debt.counterparty_name}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <PaymentStateBadge state="paid" size="sm" />
              <span className="typography-metadata">·</span>
              <span className="typography-metadata tabular-nums">
                {debt.transaction_count || 0} {t("dashboard.transactions", "Txns")}
              </span>
              {debt.last_transaction_date && (
                <>
                  <span className="typography-metadata">·</span>
                  <span className="typography-metadata">
                    {t("dashboard.last", "Last")}: {formatDate(debt.last_transaction_date)}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-3">
          <span className={cn("flex items-center gap-1 typography-amount tabular-nums", getPaymentStateColors("paid").text)}>
            <CheckIcon className="h-4 w-4" />
            {formatCurrency(0, currency)}
          </span>
          <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.15 }}>
            <ChevronDownIcon className="h-4 w-4 text-muted-foreground shrink-0" />
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="border-t bg-muted/10 overflow-hidden"
          >
            <div className="p-3 space-y-3">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t("dashboard.contributingExpenses", "Contributing Expenses")}
              </h4>
              <ContributingExpensesList expenses={expenses} counterpartyId={debt.counterparty_id} isLoading={isLoading} />
              <Button variant="default" size="sm" className="w-full gap-2" onClick={(e) => { e.stopPropagation(); go({ to: `/profile/${debt.counterparty_id}` }); }}>
                {t("dashboard.viewFullBreakdown", "View Details")}
                <ChevronRightIcon className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Main Component ---
export function SettledHistoryList({ debts, isLoading = false, pageSize = 10 }: SettledHistoryListProps) {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Filter: only settled debts (remaining = 0)
  const settledDebts = useMemo(() => {
    return debts.filter((d) => {
      const remaining = Number(d.remaining_amount ?? d.amount);
      return remaining === 0;
    });
  }, [debts]);

  // Pagination
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

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setExpandedRows(new Set());
    }
  };

  const toggleRow = (counterpartyId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(counterpartyId)) { next.delete(counterpartyId); } else { next.add(counterpartyId); }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
        ))}
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
            {t("history.noSettledDebtsDescription", "When you settle debts with friends, they will appear here.")}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {/* Mobile: Card Layout */}
      <div className="block md:hidden space-y-3">
        {paginatedDebts.map((debt) => (
          <SettledCardExpandable
            key={debt.counterparty_id}
            debt={debt}
            currency={debt.currency || "VND"}
            isExpanded={expandedRows.has(debt.counterparty_id)}
            onToggleExpand={() => toggleRow(debt.counterparty_id)}
          />
        ))}
      </div>

      {/* Desktop: Table Layout */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>{t("profile.person", "Person")}</TableHead>
              <TableHead>{t("profile.status", "Status")}</TableHead>
              <TableHead className="text-right">{t("dashboard.totalAmount", "Total")}</TableHead>
              <TableHead className="text-center">{t("dashboard.transactions", "Txns")}</TableHead>
              <TableHead className="text-right">{t("dashboard.remainingAmount", "Remaining")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedDebts.map((debt, index) => (
              <SettledRowExpandable
                key={debt.counterparty_id}
                debt={debt}
                index={index}
                currency={debt.currency || "VND"}
                isExpanded={expandedRows.has(debt.counterparty_id)}
                onToggleExpand={() => toggleRow(debt.counterparty_id)}
              />
            ))}
          </TableBody>
        </Table>
      </div>

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
