import React, { useMemo, useState } from "react";
import { useGetIdentity, useGo } from "@refinedev/core";
import { useAggregatedDebts, type AggregatedDebt } from "@/hooks/use-aggregated-debts";
import { SimplifiedDebts } from "@/components/dashboard/simplified-debts";
import { BalanceChart } from "@/components/dashboard/balance-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Profile } from "@/modules/profile/types";
import { formatNumber } from "@/lib/locale-utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabaseClient } from "@/utility/supabaseClient";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { RefreshCwIcon, AlertCircleIcon, ArrowUpIcon, ArrowDownIcon, ChevronsUpDownIcon, CheckCircle2Icon, PlusIcon } from "@/components/ui/icons";
/**
 * Balances Page - Shows detailed view of all debts and credits
 *
 * Database Integration:
 * - Uses get_user_debts_aggregated() function from database
 * - Real-time aggregation of expenses and payments
 * - Optimized server-side calculation
 *
 * @see supabase/migrations/001_initial_schema.sql - get_user_debts_aggregated function
 */
type SortField = 'amount' | 'name';
type SortDirection = 'asc' | 'desc';

export const BalancesPage = () => {
  const { data: identity } = useGetIdentity<Profile>();
  const { data: debts = [], isLoading, error, refetch } = useAggregatedDebts();
  const go = useGo();
  const { t } = useTranslation();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sortField, setSortField] = useState<SortField>('amount');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [settleAllDialogOpen, setSettleAllDialogOpen] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const [activeTab, setActiveTab] = useState<'you-owe' | 'owed-to-you'>('you-owe');

  // Sort debts
  const sortedDebts = useMemo(() => {
    const sorted = [...debts];
    sorted.sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;

      if (sortField === 'amount') {
        aValue = a.amount;
        bValue = b.amount;
      } else {
        aValue = a.counterparty_name.toLowerCase();
        bValue = b.counterparty_name.toLowerCase();
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortDirection === 'asc'
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });
    return sorted;
  }, [debts, sortField, sortDirection]);

  const iOwe = sortedDebts.filter((d: AggregatedDebt) => d.i_owe_them);
  const owedToMe = sortedDebts.filter((d: AggregatedDebt) => !d.i_owe_them);

  const totalIOwe = iOwe.reduce((sum: number, d: AggregatedDebt) => sum + d.amount, 0);
  const totalOwedToMe = owedToMe.reduce((sum: number, d: AggregatedDebt) => sum + d.amount, 0);
  const netBalance = totalOwedToMe - totalIOwe;

  const handleSortChange = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleSettleAll = async () => {
    if (!identity?.id || iOwe.length === 0) return;

    setIsSettling(true);
    try {
      // Settle all debts with each counterparty
      const settlePromises = iOwe.map((debt) =>
        supabaseClient.rpc('settle_all_debts_with_person', {
          p_counterparty_id: debt.counterparty_id,
        })
      );

      await Promise.all(settlePromises);
      toast.success(t('balances.settleAllSuccess', 'All debts settled successfully'));
      setSettleAllDialogOpen(false);
      refetch();
    } catch (err) {
      console.error('Failed to settle all debts:', err);
      toast.error(t('balances.settleAllError', 'Failed to settle all debts'));
    } finally {
      setIsSettling(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast.success(t('balances.refreshSuccess', 'Balances refreshed successfully'));
    } catch (err) {
      console.error('Failed to refresh balances:', err);
      toast.error(t('balances.refreshError', 'Failed to refresh balances'));
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-7xl mx-auto py-4 md:py-6 lg:py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-4 md:space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground" id="balances-page-title">
                {t('balances.title', 'All Balances')}
              </h1>
              <p className="text-sm text-muted-foreground mt-1" id="balances-page-description">
                {t('balances.description', 'Complete overview of your debts and credits')}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              className="gap-2 w-full sm:w-auto"
              aria-label={t('balances.refresh', 'Refresh balances')}
              aria-describedby="balances-page-description"
            >
              <RefreshCwIcon className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
              {t('balances.refresh', 'Refresh')}
            </Button>
          </div>

          {/* Error State */}
          {error && (
            <Alert variant="destructive">
              <AlertCircleIcon className="h-4 w-4" />
              <AlertDescription>
                Failed to load balances. Please try refreshing the page.
              </AlertDescription>
            </Alert>
          )}

          {/* Balance Chart - Always show, even when no debts */}
          {!isLoading && !error && (
            <div className="w-full">
              <BalanceChart currentBalance={netBalance} />
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4" role="region" aria-label={t('balances.summaryCards', 'Balance summary')}>
            {/* Net Balance Card */}
            <Card className={`border-2 ${
              netBalance > 0
                ? 'border-green-500/30 dark:border-green-700/30 bg-green-50 dark:bg-green-950/20'
                : netBalance < 0
                  ? 'border-red-500/30 dark:border-red-700/30 bg-red-50 dark:bg-red-950/20'
                  : 'border-border bg-muted/20'
            }`}>
              <CardHeader className="pb-2 md:pb-3">
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                  Net Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-xl md:text-3xl font-bold ${
                  netBalance > 0
                    ? 'text-green-600 dark:text-green-400'
                    : netBalance < 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-foreground'
                }`}>
                  {netBalance >= 0 ? '+' : ''}{formatNumber(netBalance)} ₫
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {netBalance > 0
                    ? 'You are owed overall'
                    : netBalance < 0
                      ? 'You owe overall'
                      : 'All settled up'}
                </p>
              </CardContent>
            </Card>

            {/* You Owe Card */}
            <Card className="border-red-200 dark:border-red-800/30 bg-red-50 dark:bg-red-950/10">
              <CardHeader className="pb-2 md:pb-3">
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                  You Owe
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl md:text-3xl font-bold text-red-600 dark:text-red-400">
                  {formatNumber(totalIOwe)} ₫
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  to {iOwe.length} {iOwe.length === 1 ? 'person' : 'people'}
                </p>
              </CardContent>
            </Card>

            {/* Owed to You Card */}
            <Card className="border-green-200 dark:border-green-800/30 bg-green-50 dark:bg-green-950/10">
              <CardHeader className="pb-2 md:pb-3">
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                  Owed to You
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl md:text-3xl font-bold text-green-600 dark:text-green-400">
                  {formatNumber(totalOwedToMe)} ₫
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  from {owedToMe.length} {owedToMe.length === 1 ? 'person' : 'people'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Empty State */}
          {debts.length === 0 && !isLoading && !error && (
            <Card className="border-border">
              <CardContent className="py-16 text-center">
                <div className="space-y-4 max-w-md mx-auto">
                  <div className="flex justify-center">
                    <div className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-950/20 flex items-center justify-center">
                      <CheckCircle2Icon className="h-10 w-10 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-foreground">
                      {t('balances.allSettledUp', 'All Settled Up!')}
                    </h3>
                    <p className="text-muted-foreground">
                      {t('balances.noOutstandingDebts', 'You have no outstanding debts or credits')}
                    </p>
                  </div>
                  {identity && (
                    <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                      <Button
                        onClick={() => go({ to: '/expenses/create' })}
                        className="gap-2"
                        aria-label={t('balances.addExpense', 'Add Expense')}
                      >
                        <PlusIcon className="h-4 w-4" />
                        {t('balances.addExpense', 'Add Expense')}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Loading State with Skeletons */}
          {isLoading && (
            <>
              {/* Summary Cards Skeleton */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="border-border animate-pulse">
                    <CardHeader className="pb-2 md:pb-3">
                      <div className="h-4 bg-muted rounded w-24" />
                    </CardHeader>
                    <CardContent>
                      <div className="h-8 bg-muted rounded w-32 mb-2" />
                      <div className="h-3 bg-muted rounded w-20" />
                    </CardContent>
                  </Card>
                ))}
              </div>
              {/* Chart Skeleton */}
              <Card className="border-border animate-pulse">
                <CardHeader className="pb-3">
                  <div className="h-5 bg-muted rounded w-32" />
                </CardHeader>
                <CardContent>
                  <div className="h-[200px] bg-muted rounded" />
                </CardContent>
              </Card>
              {/* Debts List Skeleton */}
              <Card className="border-border animate-pulse">
                <CardHeader>
                  <div className="h-5 bg-muted rounded w-40" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-3">
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
            </>
          )}

          {/* Tabbed Debts View */}
          {!isLoading && !error && (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'you-owe' | 'owed-to-you')} className="space-y-4">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <TabsList className="grid w-full sm:w-auto grid-cols-2">
                    <TabsTrigger value="you-owe" className="text-xs sm:text-sm">
                      {t('balances.youOwe', 'You Owe')} {iOwe.length > 0 && `(${iOwe.length})`}
                    </TabsTrigger>
                    <TabsTrigger value="owed-to-you" className="text-xs sm:text-sm">
                      {t('balances.owedToYou', 'Owed to You')} {owedToMe.length > 0 && `(${owedToMe.length})`}
                    </TabsTrigger>
                  </TabsList>
                  <div className="flex items-center justify-end">
                    <Select
                      value={`${sortField}-${sortDirection}`}
                      onValueChange={(value) => {
                        const [field, direction] = value.split('-') as [SortField, SortDirection];
                        setSortField(field);
                        setSortDirection(direction);
                      }}
                    >
                      <SelectTrigger className="w-full sm:w-[160px] h-9 text-xs sm:text-sm" aria-label={t('balances.sortBy', 'Sort by')}>
                        <SelectValue />
                      </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="amount-desc">
                        <div className="flex items-center gap-2">
                          {t('balances.amount', 'Amount')}
                          <ArrowDownIcon className="h-3 w-3" />
                        </div>
                      </SelectItem>
                      <SelectItem value="amount-asc">
                        <div className="flex items-center gap-2">
                          {t('balances.amount', 'Amount')}
                          <ArrowUpIcon className="h-3 w-3" />
                        </div>
                      </SelectItem>
                      <SelectItem value="name-asc">
                        <div className="flex items-center gap-2">
                          {t('balances.name', 'Name')}
                          <ArrowUpIcon className="h-3 w-3" />
                        </div>
                      </SelectItem>
                      <SelectItem value="name-desc">
                        <div className="flex items-center gap-2">
                          {t('balances.name', 'Name')}
                          <ArrowDownIcon className="h-3 w-3" />
                        </div>
                      </SelectItem>
                    </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <TabsContent value="you-owe" className="space-y-4 mt-4">
                {iOwe.length > 0 ? (
                  <>
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSettleAllDialogOpen(true)}
                        className="gap-2 w-full sm:w-auto"
                        aria-label={t('balances.settleAll', 'Settle All')}
                      >
                        <CheckCircle2Icon className="h-4 w-4" />
                        {t('balances.settleAll', 'Settle All')}
                      </Button>
                    </div>
                    <SimplifiedDebts
                      debts={iOwe}
                      isLoading={isLoading}
                    />
                  </>
                ) : (
                  <Card className="border-border">
                    <CardContent className="py-12 text-center">
                      <div className="space-y-3">
                        <div className="flex justify-center">
                          <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-950/20 flex items-center justify-center">
                            <CheckCircle2Icon className="h-8 w-8 text-green-600 dark:text-green-400" />
                          </div>
                        </div>
                        <p className="text-muted-foreground">
                          {t('balances.youDontOweAnyone', "You don't owe anyone")}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="owed-to-you" className="space-y-4 mt-4">
                {owedToMe.length > 0 ? (
                  <SimplifiedDebts
                    debts={owedToMe}
                    isLoading={isLoading}
                  />
                ) : (
                  <Card className="border-border">
                    <CardContent className="py-12 text-center">
                      <div className="space-y-3">
                        <div className="flex justify-center">
                          <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-950/20 flex items-center justify-center">
                            <CheckCircle2Icon className="h-8 w-8 text-green-600 dark:text-green-400" />
                          </div>
                        </div>
                        <p className="text-muted-foreground">
                          {t('balances.noOneOwesYou', 'No one owes you')}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          )}

          {/* Settle All Dialog */}
          <AlertDialog open={settleAllDialogOpen} onOpenChange={setSettleAllDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {t('balances.settleAllTitle', 'Settle All Debts?')}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {t('balances.settleAllDescription', {
                    count: iOwe.length,
                    amount: formatNumber(totalIOwe),
                    defaultValue: `Are you sure you want to settle all ${iOwe.length} debts totaling ₫${formatNumber(totalIOwe)}? This action cannot be undone.`
                  })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isSettling}>
                  {t('common.cancel', 'Cancel')}
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleSettleAll}
                  disabled={isSettling}
                  className="bg-primary text-primary-foreground"
                >
                  {isSettling ? (
                    <>
                      <RefreshCwIcon className="h-4 w-4 mr-2 animate-spin" />
                      {t('balances.settling', 'Settling...')}
                    </>
                  ) : (
                    t('balances.confirmSettle', 'Settle All')
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
};
