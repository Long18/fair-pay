import { useGetIdentity, useGo } from "@refinedev/core";
import { useTranslation } from "react-i18next";
import { useGlobalBalance } from "@/hooks/use-global-balance";
import { useRecentActivity } from "@/hooks/use-recent-activity";
import { useSampleLeaderboard } from "@/hooks/use-sample-leaderboard";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { PublicLeaderboard } from "@/components/dashboard/public-leaderboard";
import { PublicStatsComponent } from "@/components/dashboard/public-stats";
import { Button } from "@/components/ui/button";
import { useAggregatedDebts } from "@/hooks/use-aggregated-debts";
import { Profile } from "@/modules/profile/types";
import { AccountingNotes } from "@/components/dashboard/accounting-notes";
import { PaymentCounter } from "@/components/dashboard/payment-counter";
import { BalanceChart } from "@/components/dashboard/balance-chart";
import { DocumentsTable } from "@/components/dashboard/documents-table";
import { PaymentsTable } from "@/components/dashboard/payments-table";
import { AccountingRecordsTable } from "@/components/dashboard/accounting-records-table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell } from "lucide-react";
import { useMemo } from "react";

export const Dashboard = () => {
  const { t } = useTranslation();
  const { data: identity } = useGetIdentity<Profile>();
  const go = useGo();
  const globalBalance = useGlobalBalance();
  const recentActivity = useRecentActivity(10);
  const { topDebtors, topCreditors, stats } = useSampleLeaderboard();
  const { data: debts = [], isLoading: debtsLoading } = useAggregatedDebts();

  // Transform data for new components
  const accountingNotes = useMemo(() => {
    return recentActivity.items.slice(0, 3).map((item, index) => {
      const date = new Date(item.date);
      return {
        date: date.getDate().toString().padStart(2, '0') + '.' + (date.getMonth() + 1).toString().padStart(2, '0'),
        year: date.getFullYear().toString(),
        message: item.description,
        type: item.type === "payment" ? "success" : "info" as "success" | "warning" | "info",
      };
    });
  }, [recentActivity.items]);

  const balanceChartData = useMemo(() => {
    const today = new Date();
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = (date.getMonth() + 1).toString().padStart(2, '0') + '.' + date.getDate().toString().padStart(2, '0');

      // Simulate balance progression (in real app, this would come from historical data)
      const baseBalance = globalBalance.net_balance;
      const variance = Math.random() * 100000 - 50000;
      data.push({
        date: dateStr,
        balance: baseBalance + variance,
      });
    }
    return data;
  }, [globalBalance.net_balance]);

  const debtDocuments = useMemo(() => {
    return debts.slice(0, 7).map((debt, index) => ({
      id: debt.counterparty_id,
      type: debt.i_owe_them ? "Lawsuit" : "Invoice",
      number: `P/${Math.floor(Math.random() * 999) + 1}/${Math.floor(Math.random() * 99) + 1}/${index + 1}`,
      issueDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      currentValue: Math.abs(debt.amount),
      status: index === 1 ? "active" : index < 4 ? "pending" : "settled" as "active" | "pending" | "settled",
    }));
  }, [debts]);

  const payments = useMemo(() => {
    return recentActivity.items.filter(item => item.type === "payment").slice(0, 7).map((item, index) => ({
      id: item.id,
      date: new Date(item.date).toISOString().split('T')[0],
      title: item.description,
      sum: Math.abs(item.amount || 0),
      highlighted: index === 0 || index === 4,
    }));
  }, [recentActivity.items]);

  const accountingRecords = useMemo(() => {
    return recentActivity.items.slice(0, 9).map((item, index) => {
      const date = new Date(item.date).toISOString().split('T')[0];
      return {
        id: item.id,
        operationDate: date,
        accountingDate: date,
        interestDate: date,
        protocolDate: date,
        documentNumber: `FV/${Math.floor(Math.random() * 9999) + 1}/${Math.floor(Math.random() * 999) + 1}/${Math.floor(Math.random() * 99) + 1}`,
        operation: item.type === "payment" ? "RSW" : item.type === "expense" ? "KRSW" : "NOU",
        register: item.type === "payment" ? "Capital" : "Interests",
        dt: Math.abs(item.amount || 0) * (Math.random() > 0.5 ? 1 : 0.5),
        ct: Math.abs(item.amount || 0) * (Math.random() > 0.5 ? 0 : 0.5),
        currency: "VND",
      };
    });
  }, [recentActivity.items]);

  if (!identity) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-background to-purple-50 dark:from-gray-900 dark:via-background dark:to-gray-800">
        <div className="container max-w-7xl py-16 px-4 lg:px-8">
          <div className="space-y-12">
            <div className="text-center space-y-6">
              <h1 className="text-5xl lg:text-6xl font-bold tracking-tight bg-gradient-to-r from-teal-600 to-purple-600 dark:from-teal-400 dark:to-purple-400 bg-clip-text text-transparent">
                {t('dashboard.welcome')}
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                {t('dashboard.subtitle')}
              </p>
              <div className="flex gap-4 justify-center pt-6">
                <Button
                  size="lg"
                  onClick={() => go({ to: "/login" })}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-8"
                >
                  {t('auth.login')}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => go({ to: "/register" })}
                  className="border-primary text-primary hover:bg-primary/10 px-8"
                >
                  {t('auth.createAccount')}
                </Button>
              </div>
            </div>

            <PublicStatsComponent stats={stats || {
              total_users: 0,
              total_groups: 0,
              total_transactions: 0,
              total_amount_tracked: 0,
              generated_at: new Date().toISOString(),
            }} />

            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-foreground">
                  Community Leaderboard
                </h2>
                <p className="text-muted-foreground mt-2">
                  See how our community manages their shared expenses
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PublicLeaderboard
                  users={topCreditors}
                  title="Top Creditors"
                  type="creditors"
                />
                <PublicLeaderboard
                  users={topDebtors}
                  title="Top Debtors"
                  type="debtors"
                />
              </div>
            </div>

            <div className="text-center py-12 space-y-6">
              <h3 className="text-2xl font-bold text-foreground">
                {t('dashboard.welcome')}
              </h3>
              <p className="text-muted-foreground">
                {t('dashboard.subtitle')}
              </p>
              <div className="flex gap-4 justify-center">
                <Button
                  size="lg"
                  onClick={() => go({ to: "/register" })}
                  className="bg-secondary hover:bg-secondary/90 text-secondary-foreground px-8"
                >
                  {t('auth.register')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (globalBalance.isLoading) {
    return <DashboardSkeleton />;
  }

  const netBalance = globalBalance.net_balance;

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-pink-50 to-orange-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={identity.avatar_url || undefined} />
                <AvatarFallback className="bg-gray-200 text-gray-700">
                  {identity.full_name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="text-xs text-gray-500">Client</div>
                <div className="text-sm font-semibold text-gray-900">{identity.full_name || identity.email}</div>
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Case no.</div>
              <div className="text-sm font-semibold text-gray-900">400123321091</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Procedure</div>
              <div className="text-sm font-semibold text-gray-900">Court proceedings</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Status</div>
              <div className="text-sm font-semibold text-gray-900">Lawsuit</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5 text-gray-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">John Doe</span>
              <Avatar className="h-8 w-8">
                <AvatarImage src={identity.avatar_url || undefined} />
                <AvatarFallback className="bg-gray-200 text-gray-700 text-xs">
                  {identity.full_name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto p-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Left Column */}
          <div className="col-span-12 lg:col-span-3 space-y-6">
            <AccountingNotes notes={accountingNotes} />
            <PaymentCounter count={payments.length} />
          </div>

          {/* Middle Column */}
          <div className="col-span-12 lg:col-span-6 space-y-6">
            <DocumentsTable documents={debtDocuments} currency="VND" />
            <AccountingRecordsTable records={accountingRecords} />
          </div>

          {/* Right Column */}
          <div className="col-span-12 lg:col-span-3 space-y-6">
            <BalanceChart
              data={balanceChartData}
              currentBalance={netBalance}
              currency="VND"
            />
            <PaymentsTable
              payments={payments}
              currency="VND"
              subtitle="P/205/61"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
