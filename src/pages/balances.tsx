import React, { useMemo } from "react";
import { useGetIdentity } from "@refinedev/core";
import { useAggregatedDebts, type AggregatedDebt } from "@/hooks/use-aggregated-debts";
import { SimplifiedDebts } from "@/components/dashboard/simplified-debts";
import { BalanceChart } from "@/components/dashboard/balance-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Profile } from "@/modules/profile/types";
import { formatNumber } from "@/lib/locale-utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { RefreshCwIcon, AlertCircleIcon } from "@/components/ui/icons";
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
export const BalancesPage = () => {
  const { data: identity } = useGetIdentity<Profile>();
  const { data: debts = [], isLoading, error } = useAggregatedDebts();
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const iOwe = debts.filter((d: AggregatedDebt) => d.i_owe_them);
  const owedToMe = debts.filter((d: AggregatedDebt) => !d.i_owe_them);

  const totalIOwe = iOwe.reduce((sum: number, d: AggregatedDebt) => sum + d.amount, 0);
  const totalOwedToMe = owedToMe.reduce((sum: number, d: AggregatedDebt) => sum + d.amount, 0);
  const netBalance = totalOwedToMe - totalIOwe;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl py-4 md:py-8 px-4 lg:px-8">
        <div className="space-y-4 md:space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground">
                All Balances
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Complete overview of your debts and credits
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              className="gap-2 w-full sm:w-auto"
            >
              <RefreshCwIcon className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
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

          {/* Balance Chart */}
          {debts.length > 0 && !isLoading && !error && (
            <div className="w-full">
              <BalanceChart currentBalance={netBalance} />
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
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
                <div className="space-y-3">
                  <div className="text-6xl">✅</div>
                  <h3 className="text-xl font-bold text-foreground">
                    All Settled Up!
                  </h3>
                  <p className="text-muted-foreground">
                    You have no outstanding debts or credits
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Loading State */}
          {isLoading && (
            <Card className="border-border">
              <CardContent className="py-16 text-center">
                <div className="space-y-3">
                  <RefreshCwIcon className="h-12 w-12 mx-auto animate-spin text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Loading balances...
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tabbed Debts View */}
          {debts.length > 0 && !isLoading && !error && (
            <Tabs defaultValue="you-owe" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="you-owe" className="text-xs md:text-sm">
                  You Owe {iOwe.length > 0 && `(${iOwe.length})`}
                </TabsTrigger>
                <TabsTrigger value="owed-to-you" className="text-xs md:text-sm">
                  Owed to You {owedToMe.length > 0 && `(${owedToMe.length})`}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="you-owe" className="space-y-4">
                {iOwe.length > 0 ? (
                  <SimplifiedDebts
                    debts={iOwe}
                    isLoading={isLoading}
                  />
                ) : (
                  <Card className="border-border">
                    <CardContent className="py-12 text-center">
                      <div className="space-y-2">
                        <div className="text-4xl">✅</div>
                        <p className="text-muted-foreground">
                          You don't owe anyone
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="owed-to-you" className="space-y-4">
                {owedToMe.length > 0 ? (
                  <SimplifiedDebts
                    debts={owedToMe}
                    isLoading={isLoading}
                  />
                ) : (
                  <Card className="border-border">
                    <CardContent className="py-12 text-center">
                      <div className="space-y-2">
                        <div className="text-4xl">✅</div>
                        <p className="text-muted-foreground">
                          No one owes you
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
};
