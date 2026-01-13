import { useState, useMemo } from "react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PaginationControls, PaginationMetadata } from "@/components/ui/pagination-controls";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import { CheckIcon, ScaleIcon, PlusCircleIcon } from "@/components/ui/icons";
import { PaymentStateBadge } from "@/components/ui/payment-state-badge";
import { getOweStatusColors, getPaymentStateColors } from "@/lib/status-colors";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/locale-utils";
import { BalanceTableRowExpandable, BalanceTableRowExpandableMobile } from "./balance-table-row-expandable";

interface Balance {
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
            <ScaleIcon className="h-8 w-8" />
          </EmptyMedia>
          <EmptyTitle>
            {t('dashboard.allSettledUpNoDebts', 'All settled up!')}
          </EmptyTitle>
          <EmptyDescription>
            {disabled
              ? t('dashboard.loginToSeeBalances', 'Log in to view your balances and track expenses')
              : t('dashboard.noOutstandingBalances', 'You have no outstanding balances. Everyone is settled up!')}
          </EmptyDescription>
        </EmptyHeader>
        {!disabled && (
          <EmptyContent>
            <Button
              onClick={() => go({ to: "/expenses/create" })}
              className="gap-2"
            >
              <PlusCircleIcon className="h-4 w-4" />
              {t('dashboard.addExpense', 'Add Expense')}
            </Button>
          </EmptyContent>
        )}
      </Empty>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {/* Mobile: Card Layout */}
      <div className="block md:hidden space-y-3">
        {paginatedBalances.map((balance) => {
          // Use expandable component when showExpenseBreakdown is true and not in history mode
          if (showExpenseBreakdown && !showHistory) {
            return (
              <BalanceTableRowExpandableMobile
                key={balance.counterparty_id}
                balance={balance}
                disabled={disabled}
                currency={balance.currency || "VND"}
                isExpanded={expandedRows.has(balance.counterparty_id)}
                onToggleExpand={() => toggleRow(balance.counterparty_id)}
              />
            );
          }

          // Default static card
          const fullySettled = isFullySettled(balance);
          return (
            <Card
              key={balance.counterparty_id}
              className={cn(
                "hover:shadow-md transition-shadow cursor-pointer",
                disabled && "opacity-50 cursor-not-allowed",
                fullySettled && `opacity-60 ${getPaymentStateColors('paid').bg}`
              )}
              onClick={() => !disabled && go({ to: `/profile/${balance.counterparty_id}` })}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="relative shrink-0">
                      <Avatar className="h-10 w-10 border-2 border-border">
                        <AvatarImage src={balance.counterparty_avatar_url || undefined} />
                        <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                          {balance.counterparty_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      {fullySettled && (
                        <div className={cn("absolute -bottom-1 -right-1 rounded-full p-0.5", getPaymentStateColors('paid').bg)}>
                          <CheckIcon className={cn("h-3 w-3", getPaymentStateColors('paid').icon)} />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={cn("typography-row-title truncate", fullySettled && "line-through text-muted-foreground")}>
                        {balance.counterparty_name}
                      </p>
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
          );
        })}
      </div>

      {/* Desktop: Table Layout */}
      <div className="hidden md:block">
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
                    key={balance.counterparty_id}
                    balance={balance}
                    index={index}
                    disabled={disabled}
                    currency={balance.currency || "VND"}
                    isExpanded={expandedRows.has(balance.counterparty_id)}
                    onToggleExpand={() => toggleRow(balance.counterparty_id)}
                  />
                );
              }

              // Default static row
              const fullySettled = isFullySettled(balance);
              return (
                <TableRow
                  key={balance.counterparty_id}
                  className={cn(
                    "cursor-pointer transition-colors",
                    index % 2 === 0 && "bg-muted/50 dark:bg-muted/30",
                    disabled && "opacity-50 cursor-not-allowed",
                    fullySettled && `opacity-60 ${getPaymentStateColors('paid').bg}`
                  )}
                  onClick={() => !disabled && go({ to: `/profile/${balance.counterparty_id}` })}
                >
                  <TableCell>
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={balance.counterparty_avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {balance.counterparty_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      {fullySettled && (
                        <div className={cn("absolute -bottom-1 -right-1 rounded-full p-0.5", getPaymentStateColors('paid').bg)}>
                          <CheckIcon className={cn("h-3 w-3", getPaymentStateColors('paid').icon)} />
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className={cn("typography-row-title", fullySettled && "line-through text-muted-foreground")}>
                        {balance.counterparty_name}
                      </span>
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
                </TableRow>
              );
            })}
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
