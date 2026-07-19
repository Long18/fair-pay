import { useMemo, useState } from "react";
import { useGo } from "@refinedev/core";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PaginationControls, type PaginationMetadata } from "@/components/ui/pagination-controls";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { CheckCircle2Icon, WalletIcon } from "@/components/ui/icons";
import { AnimatedList } from "@/components/ui/animated-list";
import { AnimatedRow } from "@/components/ui/animated-row";
import { BalanceRowSkeleton } from "@/components/skeletons/BalanceRowSkeleton";
import { useHaptics } from "@/hooks/use-haptics";
import { useStaggerAnimation } from "@/hooks/ui/use-stagger-animation";
import { matchesSearchFields } from "@/lib/search-utils";
import {
  BalanceTableRowExpandable,
  BalanceTableRowExpandableMobile,
} from "./balance-table-row-expandable";
import {
  BalanceTableToolbar,
  type BalanceFilter,
} from "./balance-table-toolbar";
import {
  BalanceStaticDesktopRow,
  BalanceStaticMobileRow,
} from "./balance-static-rows";

import type { Balance } from "./balance-types";

export type { Balance } from "./balance-types";

interface BalanceTableProps {
  balances: Balance[];
  pageSize?: number;
  disabled?: boolean;
  showHistory?: boolean;
  showExpenseBreakdown?: boolean;
  isLoading?: boolean;
}

function getBalanceRowId(balance: Balance) {
  return balance.counterparty_id || balance.counterparty_email || balance.counterparty_name;
}

function formatBalanceDate(dateString?: string) {
  if (!dateString) return "";
  try {
    return format(new Date(dateString), "dd/MM/yyyy");
  } catch {
    return "";
  }
}

function getDisplayAmount(balance: Balance) {
  return Number(
    balance.remaining_amount !== undefined ? balance.remaining_amount : balance.amount
  );
}

export function BalanceTable({
  balances,
  pageSize = 10,
  disabled = false,
  showHistory = false,
  showExpenseBreakdown = false,
  isLoading = false,
}: BalanceTableProps) {
  const go = useGo();
  const { t } = useTranslation();
  const { tap } = useHaptics();
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<BalanceFilter>("all");

  const filteredBalances = useMemo(() => {
    let next = balances;

    if (activeFilter === "owe") {
      next = next.filter((balance) => balance.i_owe_them);
    } else if (activeFilter === "owed") {
      next = next.filter((balance) => !balance.i_owe_them);
    }

    const query = searchQuery.trim();
    if (query) {
      next = next.filter((balance) =>
        matchesSearchFields(query, balance.counterparty_name, balance.counterparty_email)
      );
    }

    return next;
  }, [balances, activeFilter, searchQuery]);

  const totalItems = filteredBalances.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedBalances = filteredBalances.slice(startIndex, startIndex + pageSize);

  const { containerVariants, rowVariants } = useStaggerAnimation(
    paginatedBalances,
    {
      staggerDelay: 0.05,
      rowDuration: 0.3,
      yOffset: 12,
      maxStaggerCount: 15,
    }
  );

  const filterCounts = useMemo(
    () => ({
      all: balances.length,
      owe: balances.filter((balance) => balance.i_owe_them).length,
      owed: balances.filter((balance) => !balance.i_owe_them).length,
    }),
    [balances]
  );

  const metadata: PaginationMetadata = {
    totalItems,
    totalPages,
    currentPage: safePage,
    pageSize,
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleFilterChange = (value: BalanceFilter) => {
    setActiveFilter(value);
    setCurrentPage(1);
    setExpandedRows(new Set());
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setExpandedRows(new Set());
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

  const openProfile = (balance: Balance) => {
    if (disabled || !balance.counterparty_id) return;
    tap();
    go({ to: `/profile/${balance.counterparty_id}` });
  };

  if (isLoading && balances.length === 0) {
    return (
      <BalanceRowSkeleton
        count={Math.min(pageSize, 5)}
        showHistory={showHistory}
      />
    );
  }

  if (balances.length === 0) {
    return (
      <Empty className="border-0 py-12">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CheckCircle2Icon className="size-5 text-status-success-foreground" />
          </EmptyMedia>
          <EmptyTitle>
            {disabled
              ? t("dashboard.loginToSeeBalances", "Log in to view your balances")
              : t("dashboard.debtFreeTitle", "You're debt-free")}
          </EmptyTitle>
          <EmptyDescription>
            {disabled
              ? t(
                  "dashboard.loginToSeeBalancesDesc",
                  "Log in to view your balances and track expenses"
                )
              : t(
                  "dashboard.debtFreeDescription",
                  "No one owes you and you don't owe anyone."
                )}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const canExpand = showExpenseBreakdown && !showHistory;
  // Remount on filter/page only — not every search keystroke (avoids list flash + expand reset thrash).
  const listRevealKey = `${activeFilter}:${safePage}`;

  return (
    <div className="flex flex-col">
      <BalanceTableToolbar
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        activeFilter={activeFilter}
        onFilterChange={handleFilterChange}
        filterCounts={filterCounts}
      />

      {filteredBalances.length === 0 ? (
        <Empty className="border-0 py-14">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <WalletIcon />
            </EmptyMedia>
            <EmptyTitle>
              {t("dashboard.balancesFilteredEmptyTitle", "No people match")}
            </EmptyTitle>
            <EmptyDescription>
              {t(
                "dashboard.balancesFilteredEmptyDescription",
                "Try a different name or filter"
              )}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={listRevealKey}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            className="flex flex-col"
          >
            <AnimatedList
              items={paginatedBalances}
              className="divide-y divide-border md:hidden"
            >
              {paginatedBalances.map((balance, index) => {
                const rowId = getBalanceRowId(balance);

                if (canExpand) {
                  return (
                    <AnimatedRow key={rowId} index={index}>
                      <BalanceTableRowExpandableMobile
                        balance={balance}
                        disabled={disabled}
                        currency={balance.currency || "VND"}
                        isExpanded={expandedRows.has(rowId)}
                        onToggleExpand={() => toggleRow(rowId)}
                      />
                    </AnimatedRow>
                  );
                }

                return (
                  <AnimatedRow key={rowId} index={index}>
                    <BalanceStaticMobileRow
                      balance={balance}
                      disabled={disabled}
                      showHistory={showHistory}
                      fullySettled={showHistory && getDisplayAmount(balance) === 0}
                      lastDateLabel={formatBalanceDate(balance.last_transaction_date)}
                      onOpenProfile={() => openProfile(balance)}
                    />
                  </AnimatedRow>
                );
              })}
            </AnimatedList>

            <motion.div
              className="hidden md:block"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]" />
                    <TableHead>{t("profile.person", "Person")}</TableHead>
                    <TableHead>{t("profile.status", "Status")}</TableHead>
                    {showHistory ? (
                      <>
                        <TableHead className="text-right">
                          {t("dashboard.totalAmount", "Total")}
                        </TableHead>
                        <TableHead className="text-right">
                          {t("dashboard.settledAmount", "Settled")}
                        </TableHead>
                        <TableHead className="text-center">
                          {t("dashboard.transactions", "Txns")}
                        </TableHead>
                      </>
                    ) : null}
                    <TableHead className="text-right">
                      {showHistory
                        ? t("dashboard.remainingAmount", "Remaining")
                        : t("profile.amount", "Amount")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedBalances.map((balance, index) => {
                    const rowId = getBalanceRowId(balance);

                    if (canExpand) {
                      return (
                        <BalanceTableRowExpandable
                          key={rowId}
                          balance={balance}
                          index={index}
                          disabled={disabled}
                          currency={balance.currency || "VND"}
                          isExpanded={expandedRows.has(rowId)}
                          onToggleExpand={() => toggleRow(rowId)}
                          rowVariants={rowVariants}
                        />
                      );
                    }

                    return (
                      <BalanceStaticDesktopRow
                        key={rowId}
                        balance={balance}
                        index={index}
                        disabled={disabled}
                        showHistory={showHistory}
                        fullySettled={showHistory && getDisplayAmount(balance) === 0}
                        lastDateLabel={formatBalanceDate(balance.last_transaction_date)}
                        onOpenProfile={() => openProfile(balance)}
                        rowVariants={rowVariants}
                      />
                    );
                  })}
                </TableBody>
              </Table>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      )}

      {totalPages > 1 && filteredBalances.length > 0 ? (
        <div className="border-t border-border px-4 py-4">
          <PaginationControls
            metadata={metadata}
            onPageChange={handlePageChange}
            showFirstLast
            maxVisiblePages={5}
          />
        </div>
      ) : null}
    </div>
  );
}
