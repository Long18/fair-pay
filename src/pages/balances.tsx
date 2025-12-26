import React from "react";
import { useGetIdentity } from "@refinedev/core";
import { useAggregatedDebts, type AggregatedDebt } from "@/hooks/use-aggregated-debts";
import { SimplifiedDebts } from "@/components/dashboard/simplified-debts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Profile } from "@/modules/profile/types";
import { formatNumber } from "@/lib/locale-utils";
import { RefreshCw, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
      <div className="container max-w-4xl py-8 px-4 lg:px-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                All Balances
              </h1>
              <p className="text-muted-foreground mt-1">
                Complete overview of your debts and credits
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Error State */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to load balances. Please try refreshing the page.
              </AlertDescription>
            </Alert>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Net Balance Card */}
            <Card className={`border-2 ${
              netBalance > 0
                ? 'border-green-500/30 bg-green-50 dark:bg-green-950/20'
                : netBalance < 0
                  ? 'border-red-500/30 bg-red-50 dark:bg-red-950/20'
                  : 'border-border bg-muted/20'
            }`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Net Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${
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
            <Card className="border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-950/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  You Owe
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                  {formatNumber(totalIOwe)} ₫
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  to {iOwe.length} {iOwe.length === 1 ? 'person' : 'people'}
                </p>
              </CardContent>
            </Card>

            {/* Owed to You Card */}
            <Card className="border-green-200 dark:border-green-900/30 bg-green-50 dark:bg-green-950/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Owed to You
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {formatNumber(totalOwedToMe)} ₫
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  from {owedToMe.length} {owedToMe.length === 1 ? 'person' : 'people'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* You Owe Section */}
          {iOwe.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-foreground mb-3">
                You Owe
              </h2>
              <SimplifiedDebts
                debts={iOwe}
                isLoading={isLoading}
              />
            </div>
          )}

          {/* Owed to You Section */}
          {owedToMe.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-foreground mb-3">
                Owed to You
              </h2>
              <SimplifiedDebts
                debts={owedToMe}
                isLoading={isLoading}
              />
            </div>
          )}

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
                  <RefreshCw className="h-12 w-12 mx-auto animate-spin text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Loading balances...
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
