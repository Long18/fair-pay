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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Settings, ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import { TabNavigation } from "@/components/dashboard/tab-navigation";
import { WelcomeHeader } from "@/components/dashboard/welcome-header";
import { StatisticsCard } from "@/components/dashboard/statistics-card";
import { RepaymentPlanCard } from "@/components/dashboard/repayment-plan-card";
import { OneOffPaymentCard } from "@/components/dashboard/one-off-payment-card";
import { PaymentMethodCard } from "@/components/dashboard/payment-method-card";
import { CreditorCard } from "@/components/dashboard/creditor-card";
import { CreditCard, RefreshCw, ArrowRightLeft, Building2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Dashboard = () => {
  const { t } = useTranslation();
  const { data: identity } = useGetIdentity<Profile>();
  const go = useGo();
  const globalBalance = useGlobalBalance();
  const recentActivity = useRecentActivity(10);
  const { topDebtors, topCreditors, stats } = useSampleLeaderboard();
  const { data: debts = [], isLoading: debtsLoading } = useAggregatedDebts();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedCreditor, setSelectedCreditor] = useState("All creditors");

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "repayment", label: "Setup Repayment" },
    { id: "history", label: "Transaction History" },
  ];

  // Calculate statistics
  const statistics = useMemo(() => {
    const totalDebt = Math.abs(globalBalance.total_i_owe);
    const totalPaid = globalBalance.total_owed_to_me;
    const totalAmount = totalDebt + totalPaid;
    const percentage = totalAmount > 0 ? Math.round((totalPaid / totalAmount) * 100) : 0;
    
    const totalTransactions = recentActivity.items.length;
    const remainingPayments = debts.filter(d => d.i_owe_them).length;

    return {
      percentage,
      instalmentsLeft: remainingPayments || 5,
      amountDue: totalDebt,
      totalPaid,
    };
  }, [globalBalance, recentActivity.items, debts]);

  // Calculate next payment date
  const nextPaymentDate = useMemo(() => {
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 25);
    return nextMonth.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
  }, []);

  // Get creditors list
  const creditors = useMemo(() => {
    const uniqueCreditors = new Set(debts.map(d => d.counterparty_name));
    return ["All creditors", ...Array.from(uniqueCreditors)];
  }, [debts]);

  // Calculate one-off payment discount
  const oneOffPayment = useMemo(() => {
    const totalAmount = Math.abs(globalBalance.total_i_owe);
    const discountPercentage = 5;
    const discountedAmount = totalAmount * (1 - discountPercentage / 100);
    return { discountPercentage, discountedAmount };
  }, [globalBalance.total_i_owe]);

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

  const firstName = identity.full_name?.split(" ")[0] || "there";

  return (
    <div className="min-h-screen bg-white">
      {/* Green diagonal background accent */}
      <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-br from-green-400 to-green-500 transform -skew-y-3 origin-top-left -z-10" />

      {/* Header */}
      <div className="relative bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <TabNavigation tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm text-gray-700 font-medium">{identity.full_name || identity.email}</span>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={identity.avatar_url || undefined} />
                    <AvatarFallback className="bg-gray-200 text-gray-700 text-xs">
                      {identity.full_name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-4 w-4 text-gray-600" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => go({ to: "/profile" })}>
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => go({ to: "/settings" })}>
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => go({ to: "/logout" })}>
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="ghost" size="icon" onClick={() => go({ to: "/settings" })}>
              <Settings className="h-5 w-5 text-gray-600" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative max-w-7xl mx-auto p-6 lg:p-8">
        <div className="space-y-8">
          {/* Welcome Header */}
          <WelcomeHeader
            userName={firstName}
            message="you are paying regularly!"
            creditors={creditors}
            selectedCreditor={selectedCreditor}
            onCreditorChange={setSelectedCreditor}
          />

          {/* Top Section - Statistics, Repayment Plan, One-Off Payment */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <StatisticsCard
              percentage={statistics.percentage}
              title="You have paid almost!"
              subtitle="Collection of the latest patterns"
              instalmentsLeft={statistics.instalmentsLeft}
              amountDue={statistics.amountDue}
            />

            <RepaymentPlanCard
              nextDate={nextPaymentDate}
              instalmentsLeft={statistics.instalmentsLeft}
              instalmentAmount={statistics.amountDue / statistics.instalmentsLeft}
              paymentType="Card"
            />

            <OneOffPaymentCard
              discountPercentage={oneOffPayment.discountPercentage}
              discountedAmount={oneOffPayment.discountedAmount}
            />
          </div>

          {/* Bottom Section - Payment Methods & Other Payments */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Payment Methods */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-sm font-medium text-gray-600">Payment Methods</h2>
              <div className="space-y-3">
                <PaymentMethodCard
                  icon={CreditCard}
                  title="Pay by card"
                  description="Visa, Master, Debit, Credit"
                />
                <PaymentMethodCard
                  icon={RefreshCw}
                  title="Setup Direct Debit"
                  description="We have introduce re-payemnt plan"
                />
                <PaymentMethodCard
                  icon={ArrowRightLeft}
                  title="Online Tansfer"
                  description="Easy transfer from your bank app"
                />
                <PaymentMethodCard
                  icon={Building2}
                  title="Deposite in a bank"
                  description="Cash can be deposited in bank"
                />
              </div>
            </div>

            {/* Other Payments */}
            <div className="lg:col-span-3 space-y-4">
              <h2 className="text-sm font-medium text-gray-600">Other Payment</h2>
              <div className="space-y-4">
                {debts.slice(0, 2).map((debt, index) => (
                  <CreditorCard
                    key={debt.counterparty_id}
                    name={debt.counterparty_name}
                    description="Collection of the latest mobile design patterns"
                    instalmentsLeft={5 + index * 10}
                    amountPaid={Math.abs(debt.amount) * 0.7}
                    amountDue={Math.abs(debt.amount) * 0.3}
                    hasIssue={index === 0}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
