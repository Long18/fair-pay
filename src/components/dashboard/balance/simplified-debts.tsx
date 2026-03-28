import React, { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { AnimatedList } from "@/components/ui/animated-list";
import { AnimatedRow } from "@/components/ui/animated-row";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatNumber } from "@/lib/locale-utils";
import { useGo } from "@refinedev/core";
import { AggregatedDebt } from "@/hooks/balance/use-aggregated-debts";
import { PaginationControls, PaginationMetadata } from "@/components/ui/pagination-controls";
import { ContributingExpensesList } from "@/components/dashboard/core/contributing-expenses-list";
import { useContributingExpenses } from "@/hooks/use-contributing-expenses";
import { cn } from "@/lib/utils";

import {
  ArrowRightIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from "@/components/ui/icons";
import { useHaptics } from "@/hooks/use-haptics";

interface SimplifiedDebtsProps {
  debts: AggregatedDebt[];
  isLoading?: boolean;
  pageSize?: number;
}

/**
 * SimplifiedDebts - Shows aggregated view of who owes whom
 * with inline expand for contributing expenses.
 */
export const SimplifiedDebts: React.FC<SimplifiedDebtsProps> = ({
  debts,
  isLoading = false,
  pageSize = 10,
}) => {
  const { t } = useTranslation();
  const go = useGo();
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const totalItems = debts.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedDebts = useMemo(
    () => debts.slice(startIndex, endIndex),
    [debts, startIndex, endIndex]
  );

  const paginationMetadata: PaginationMetadata = {
    totalItems,
    totalPages: totalPages || 1,
    currentPage,
    pageSize,
  };

  const handlePageChange = useCallback(
    (page: number) => {
      if (page >= 1 && page <= totalPages) {
        setCurrentPage(page);
        setExpandedId(null);
      }
    },
    [totalPages]
  );

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  if (isLoading) {
    return (
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold">
            {t("dashboard.whoOwesWhom")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex items-center gap-3">
                <div className="h-10 w-10 bg-muted rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (debts.length === 0) {
    return (
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg font-bold text-foreground">
            {t("dashboard.whoOwesWhom")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 sm:py-12 space-y-3">
            <div className="flex justify-center">
              <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-green-100 dark:bg-green-950/20 flex items-center justify-center">
                <CheckIcon className="h-8 w-8 sm:h-10 sm:w-10 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground">
              {t("dashboard.allSettledUpNoDebts")}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base sm:text-lg font-bold text-foreground">
          {t("dashboard.whoOwesWhom")}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        <AnimatedList items={paginatedDebts} className="space-y-1.5">
          {paginatedDebts.map((debt, index) => (
            <AnimatedRow key={debt.counterparty_id || debt.counterparty_email || debt.counterparty_name} index={index}>
              <DebtRow
                debt={debt}
                isExpanded={expandedId === (debt.counterparty_id || debt.counterparty_email || debt.counterparty_name)}
                onToggle={() => toggleExpand(debt.counterparty_id || debt.counterparty_email || debt.counterparty_name)}
              />
            </AnimatedRow>
          ))}
        </AnimatedList>
        {totalPages > 1 && (
          <div className="mt-4 pt-4 border-t">
            <PaginationControls
              metadata={paginationMetadata}
              onPageChange={handlePageChange}
              showFirstLast
              maxVisiblePages={5}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};


/* ─── Individual Debt Row with expand ─────────────────────────────────── */

interface DebtRowProps {
  debt: AggregatedDebt;
  isExpanded: boolean;
  onToggle: () => void;
}

const DebtRow: React.FC<DebtRowProps> = React.memo(
  ({ debt, isExpanded, onToggle }) => {
    const { t } = useTranslation();
    const go = useGo();
    const { tap } = useHaptics();
    const { expenses, isLoading } = useContributingExpenses(
      isExpanded ? (debt.counterparty_id || "") : ""
    );

    return (
      <div
        className={cn(
          "rounded-md border transition-colors",
          isExpanded
            ? "border-border bg-card shadow-sm"
            : "border-transparent hover:bg-muted/40"
        )}
      >
        {/* Clickable header row */}
        <div
          className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 cursor-pointer"
          onClick={() => { tap(); onToggle(); }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onToggle();
            }
          }}
          aria-expanded={isExpanded}
          aria-label={`${debt.i_owe_them ? t("dashboard.youOweUser") : t("dashboard.userOwesYou")} ${debt.counterparty_name}, ${formatNumber(debt.amount)} ₫`}
        >
          <Avatar className="h-9 w-9 sm:h-10 sm:w-10 shrink-0">
            <AvatarImage
              src={debt.counterparty_avatar_url || undefined}
              alt={debt.counterparty_name}
            />
            <AvatarFallback className="bg-avatar-fallback text-avatar-fallback-foreground text-xs sm:text-sm">
              {debt.counterparty_name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <p className="text-sm sm:text-base font-medium text-foreground truncate">
              {debt.i_owe_them ? (
                <>
                  {t("dashboard.youOweUser")}{" "}
                  <span className="font-bold">{debt.counterparty_name}</span>
                </>
              ) : (
                <>
                  <span className="font-bold">{debt.counterparty_name}</span>{" "}
                  {t("dashboard.userOwesYou")}
                </>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Badge
              variant="outline"
              className={cn(
                "font-semibold text-xs sm:text-sm px-2 sm:px-3 py-1 tabular-nums",
                debt.i_owe_them
                  ? "text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/30 bg-red-50 dark:bg-red-950/10"
                  : "text-green-600 dark:text-green-400 border-green-200 dark:border-green-800/30 bg-green-50 dark:bg-green-950/10"
              )}
            >
              {formatNumber(debt.amount)} ₫
            </Badge>

            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.15 }}
              className="text-muted-foreground"
            >
              <ChevronDownIcon className="h-4 w-4" />
            </motion.div>
          </div>
        </div>

        {/* Expandable contributing expenses */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="px-3 pb-3 space-y-3">
                <div className="border-t pt-3">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    {t(
                      "dashboard.contributingExpenses",
                      "Contributing Expenses"
                    )}
                  </h4>
                  <ContributingExpensesList
                    expenses={expenses}
                    counterpartyId={debt.counterparty_id || ""}
                    isLoading={isLoading}
                  />
                </div>

                {/* Single primary CTA - hidden for pending email participants */}
                {debt.counterparty_id && (
                <Button
                  variant="default"
                  size="sm"
                  className="w-full gap-2 h-9"
                  onClick={(e) => {
                    e.stopPropagation();
                    tap();
                    go({ to: `/debts/${debt.counterparty_id}` });
                  }}
                >
                  {t("dashboard.viewFullBreakdown", "View Details")}
                  <ChevronRightIcon className="h-3.5 w-3.5" />
                </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

DebtRow.displayName = "DebtRow";
