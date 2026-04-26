import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useGo } from "@refinedev/core";
import { useTranslation } from "react-i18next";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AnimatedList } from "@/components/ui/animated-list";
import { AnimatedRow } from "@/components/ui/animated-row";
import { useStaggerAnimation } from "@/hooks/ui/use-stagger-animation";
import { Badge } from "@/components/ui/badge";
import { UserAvatar, UserGroupStack } from "@/components/user-display";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PaginationControls, PaginationMetadata } from "@/components/ui/pagination-controls";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { CheckIcon, CheckCircle2Icon } from "@/components/ui/icons";
import { useHaptics } from "@/hooks/use-haptics";
import { PaymentStateBadge } from "@/components/ui/payment-state-badge";
import { getOweStatusColors, getPaymentStateColors } from "@/lib/status-colors";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/locale-utils";
import { BalanceTableRowExpandable, BalanceTableRowExpandableMobile } from "./balance-table-row-expandable";

interface Balance {
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
  display_amount?: string;
}

interface BalanceTableProps {
  balances: Balance[];
  pageSize?: number;
  disabled?: boolean;
  showHistory?: boolean;
  showExpenseBreakdown?: boolean;
}

export function BalanceTable({ balances, pageSize = 10, disabled = false, showHistory = false, showExpenseBreakdown = false }: BalanceTableProps) {
  const go = useGo();
  const { t } = useTranslation();
  const { tap } = useHaptics();
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy');
    } catch {
      return '';
    }
  };

  const isFullySettled = (balance: Balance) => {
    if (!showHistory) return false;
    const remaining = Number(balance.remaining_amount || balance.amount);
    return remaining === 0;
  };

  // Calculate pagination
  const totalItems = balances.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedBalances = useMemo(() => {
    return balances.slice(startIndex, endIndex);
  }, [balances, startIndex, endIndex]);

  const { containerVariants, rowVariants, animationKey } = useStaggerAnimation(paginatedBalances);

  const metadata: PaginationMetadata = {
    totalItems,
    totalPages: totalPages || 1,
    currentPage,
    pageSize,
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      // Reset expansion state when changing pages
      setExpandedRows(new Set());
    }
  };

  const toggleRow = (counterpartyId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(counterpartyId)) {
        next.delete(counterpartyId);
      } else {
        next.add(counterpartyId);
      }
      return next;
    });
  };

  if (balances.length === 0) {
    return (
      <Empty className="py-12">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CheckCircle2Icon className="h-5 w-5 text-green-500" />
          </EmptyMedia>
          <EmptyTitle>
            {disabled
              ? t('dashboard.loginToSeeBalances', 'Log in to view your balances')
              : t('dashboard.debtFreeTitle', "You're debt-free")}
          </EmptyTitle>
          <EmptyDescription>
            {disabled
              ? t('dashboard.loginToSeeBalancesDesc', 'Log in to view your balances and track expenses')
              : t('dashboard.debtFreeDescription', "No one owes you and you don't owe anyone.")}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {/* Mobile: Card Layout */}
      <div className="block md:hidden">
        <AnimatedList items={paginatedBalances} className="space-y-3">
          {paginatedBalances.map((balance, index) => {
            // Use expandable component when showExpenseBreakdown is true and not in history mode
            if (showExpenseBreakdown && !showHistory) {
              return (
                <AnimatedRow key={balance.counterparty_id || balance.counterparty_email || balance.counterparty_name} index={index}>
                  <BalanceTableRowExpandableMobile
                    balance={balance}
                    disabled={disabled}
                    currency={balance.currency || "VND"}
                    isExpanded={expandedRows.has(balance.counterparty_id || balance.counterparty_email || balance.counterparty_name)}
                    onToggleExpand={() => toggleRow(balance.counterparty_id || balance.counterparty_email || balance.counterparty_name)}
                  />
                </AnimatedRow>
              );
            }

            // Default static card
            const fullySettled = isFullySettled(balance);
            return (
              <AnimatedRow key={balance.counterparty_id || balance.counterparty_email || balance.counterparty_name} index={index}>
                <Card
                  className={cn(
                    "hover:shadow-md transition-shadow cursor-pointer",
                    disabled && "opacity-50 cursor-not-allowed",
                    fullySettled && `opacity-60 ${getPaymentStateColors('paid').bg}`
                  )}
                  onClick={() => { if (!disabled && balance.counterparty_id) { tap(); go({ to: `/profile/${balance.counterparty_id}` }); } }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="relative shrink-0">
                          <UserAvatar
                            user={{
                              full_name: balance.counterparty_name,
                              avatar_url: balance.counterparty_avatar_url ?? null,
                            }}
                            size="lg"
                            className="border-2 border-border"
                          />
                          {fullySettled && (
                            <div className={cn("absolute -bottom-1 -right-1 rounded-full p-0.5", getPaymentStateColors('paid').bg)}>
                              <CheckIcon className={cn("h-3 w-3", getPaymentStateColors('paid').icon)} />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <p className={cn("typography-row-title truncate", fullySettled && "line-through text-muted-foreground")}>
                              {balance.counterparty_name}
                            </p>
                            {balance.counterparty_id && (
                              <UserGroupStack userId={balance.counterparty_id} size="xs" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {fullySettled ? (
                              <PaymentStateBadge state="paid" size="sm" />
                            ) : (
                              <Badge variant={balance.i_owe_them ? "default" : "secondary"} className="text-xs">
                                {balance.i_owe_them ? t('dashboard.youOwe') : t('dashboard.userOwesYou')}
                              </Badge>
                            )}
                            {showHistory && balance.last_transaction_date && (
                              <span className="typography-metadata">
                                {t('dashboard.lastTransaction', 'Last: ')}
                                {formatDate(balance.last_transaction_date)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {fullySettled ? (
                          <span className={cn("flex items-center gap-1 typography-amount", getPaymentStateColors('paid').text)}>
                            <CheckIcon className="h-4 w-4" />
                            {formatCurrency(0, balance.currency || "VND")}
                          </span>
                        ) : (
                          <span className={cn(
                            "typography-amount-prominent",
                            balance.i_owe_them ? getOweStatusColors('owe').text : getOweStatusColors('owed').text
                          )}>
                            {balance.i_owe_them ? '-' : '+'}
                            {formatCurrency(Number(balance.remaining_amount !== undefined ? balance.remaining_amount : balance.amount), balance.currency || "VND")}
                          </span>
                        )}
                        {showHistory && (
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {balance.transaction_count || 0} {t('dashboard.transactions', 'Txns')}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </AnimatedRow>
            );
          })}
        </AnimatedList>
      </div>

      {/* Desktop: Table Layout */}
      <motion.div
        className="hidden md:block"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        key={`desktop-${animationKey}`}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>{t('profile.person', 'Person')}</TableHead>
              <TableHead>{t('profile.status', 'Status')}</TableHead>
              {showHistory && (
                <>
                  <TableHead className="text-right">{t('dashboard.totalAmount', 'Total')}</TableHead>
                  <TableHead className="text-right">{t('dashboard.settledAmount', 'Settled')}</TableHead>
                  <TableHead className="text-center">{t('dashboard.transactions', 'Txns')}</TableHead>
                </>
              )}
              <TableHead className="text-right">
                {showHistory ? t('dashboard.remainingAmount', 'Remaining') : t('profile.amount', 'Amount')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedBalances.map((balance, index) => {
              // Use expandable component when showExpenseBreakdown is true and not in history mode
              if (showExpenseBreakdown && !showHistory) {
                return (
                  <BalanceTableRowExpandable
                    key={balance.counterparty_id || balance.counterparty_email || balance.counterparty_name}
                    balance={balance}
                    index={index}
                    disabled={disabled}
                    currency={balance.currency || "VND"}
                    isExpanded={expandedRows.has(balance.counterparty_id || balance.counterparty_email || balance.counterparty_name)}
                    onToggleExpand={() => toggleRow(balance.counterparty_id || balance.counterparty_email || balance.counterparty_name)}
                  />
                );
              }

              // Default static row
              const fullySettled = isFullySettled(balance);
              return (
                <motion.tr
                  key={balance.counterparty_id || balance.counterparty_email || balance.counterparty_name}
                  variants={rowVariants}
                  custom={index}
                  data-slot="table-row"
                  className={cn(
                    "hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors cursor-pointer",
                    index % 2 === 0 && "bg-muted/50 dark:bg-muted/30",
                    disabled && "opacity-50 cursor-not-allowed",
                    fullySettled && `opacity-60 ${getPaymentStateColors('paid').bg}`
                  )}
                  onClick={() => { if (!disabled && balance.counterparty_id) { tap(); go({ to: `/profile/${balance.counterparty_id}` }); } }}
                >
                  <TableCell>
                    <div className="relative">
                      <UserAvatar
                        user={{
                          full_name: balance.counterparty_name,
                          avatar_url: balance.counterparty_avatar_url ?? null,
                        }}
                        size="md"
                      />
                      {fullySettled && (
                        <div className={cn("absolute -bottom-1 -right-1 rounded-full p-0.5", getPaymentStateColors('paid').bg)}>
                          <CheckIcon className={cn("h-3 w-3", getPaymentStateColors('paid').icon)} />
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={cn("typography-row-title", fullySettled && "line-through text-muted-foreground")}>
                          {balance.counterparty_name}
                        </span>
                        {balance.counterparty_id && (
                          <UserGroupStack userId={balance.counterparty_id} size="xs" />
                        )}
                      </div>
                      {showHistory && balance.last_transaction_date && (
                        <span className="typography-metadata">
                          {t('dashboard.lastTransaction', 'Last: ')}
                          {formatDate(balance.last_transaction_date)}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {fullySettled ? (
                      <PaymentStateBadge state="paid" size="md" />
                    ) : (
                      <Badge variant={balance.i_owe_them ? "default" : "secondary"}>
                        {balance.i_owe_them ? t('dashboard.youOwe') : t('dashboard.userOwesYou')}
                      </Badge>
                    )}
                  </TableCell>
                  {showHistory && (
                    <>
                      <TableCell className="text-right">
                        <span className="typography-amount text-muted-foreground">
                          {formatCurrency(Number(balance.total_amount || balance.amount), balance.currency || "VND")}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="typography-amount text-muted-foreground">
                          {formatCurrency(Number(balance.settled_amount || 0), balance.currency || "VND")}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-xs">
                          {balance.transaction_count || 0}
                        </Badge>
                      </TableCell>
                    </>
                  )}
                  <TableCell className="text-right">
                    {fullySettled ? (
                      <span className={cn("flex items-center justify-end gap-1 typography-amount", getPaymentStateColors('paid').text)}>
                        <CheckIcon className="h-4 w-4" />
                        {formatCurrency(0, balance.currency || "VND")}
                      </span>
                    ) : (
                      <span className="typography-amount-prominent">
                        {formatCurrency(Number(balance.remaining_amount !== undefined ? balance.remaining_amount : balance.amount), balance.currency || "VND")}
                      </span>
                    )}
                  </TableCell>
                </motion.tr>
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
