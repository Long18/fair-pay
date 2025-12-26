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
      <div className="min-h-screen bg-white">
        {/* Green diagonal background accent */}
        <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-br from-green-400 to-green-500 transform -skew-y-3 origin-top-left -z-10" />

        {/* Header */}
        <div className="relative bg-white border-b border-gray-200 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-8">
              <h1 className="text-2xl font-bold text-gray-900">FairPay</h1>
            </div>
            <div className="flex items-center gap-4">
              <Button
                onClick={() => go({ to: "/login" })}
                variant="ghost"
                className="text-gray-700 hover:text-gray-900"
              >
                {t('auth.login')}
              </Button>
              <Button
                onClick={() => go({ to: "/register" })}
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                {t('auth.register')}
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="relative max-w-7xl mx-auto p-6 lg:p-8">
          <div className="space-y-12">
            {/* Welcome Section */}
            <div className="text-center space-y-6 pt-12">
              <h2 className="text-5xl font-bold text-gray-900">
                Welcome to FairPay
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Track shared expenses with friends and groups. Split bills fairly and settle up easily.
              </p>
              <div className="flex gap-4 justify-center pt-6">
                <Button
                  size="lg"
                  onClick={() => go({ to: "/register" })}
                  className="bg-green-500 hover:bg-green-600 text-white px-8 py-6 text-lg"
                >
                  Get Started Free
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => go({ to: "/login" })}
                  className="border-2 border-green-500 text-green-600 hover:bg-green-50 px-8 py-6 text-lg"
                >
                  Sign In
                </Button>
              </div>
            </div>

            {/* Stats Section */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl border-2 border-gray-200 p-6 text-center hover:shadow-lg transition-shadow">
                <div className="text-4xl mb-3">👥</div>
                <div className="text-3xl font-bold text-green-600">{stats?.total_users || 0}</div>
                <div className="text-sm text-gray-600 mt-2">Active Users</div>
              </div>
              <div className="bg-white rounded-xl border-2 border-gray-200 p-6 text-center hover:shadow-lg transition-shadow">
                <div className="text-4xl mb-3">👨‍👩‍👧‍👦</div>
                <div className="text-3xl font-bold text-green-600">{stats?.total_groups || 0}</div>
                <div className="text-sm text-gray-600 mt-2">Groups</div>
              </div>
              <div className="bg-white rounded-xl border-2 border-gray-200 p-6 text-center hover:shadow-lg transition-shadow">
                <div className="text-4xl mb-3">💸</div>
                <div className="text-3xl font-bold text-green-600">{stats?.total_transactions || 0}</div>
                <div className="text-sm text-gray-600 mt-2">Transactions</div>
              </div>
              <div className="bg-white rounded-xl border-2 border-gray-200 p-6 text-center hover:shadow-lg transition-shadow">
                <div className="text-4xl mb-3">💰</div>
                <div className="text-3xl font-bold text-green-600">
                  ₫{new Intl.NumberFormat('vi-VN').format(stats?.total_amount_tracked || 0)}
                </div>
                <div className="text-sm text-gray-600 mt-2">Amount Tracked</div>
              </div>
            </div>

            {/* Community Leaderboard */}
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-3xl font-bold text-gray-900">Community Leaderboard</h3>
                <p className="text-gray-600 mt-2">See how our community manages their shared expenses</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Creditors */}
                <div className="bg-white rounded-xl border-2 border-gray-200 p-6 hover:shadow-lg transition-shadow">
                  <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="text-2xl">📈</span>
                    Top Creditors
                  </h4>
                  <div className="space-y-3">
                    {topCreditors.slice(0, 5).map((user: any, index: number) => (
                      <div key={user.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-green-50 transition-colors">
                        <div className="text-lg font-bold text-gray-400">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                        </div>
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.avatar_url} />
                          <AvatarFallback className="bg-green-100 text-green-700">
                            {user.name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{user.name}</p>
                          <p className="text-xs text-gray-600">Is owed</p>
                        </div>
                        <div className="text-sm font-bold text-green-600">
                          ₫{new Intl.NumberFormat('vi-VN').format(user.balance || 0)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Debtors */}
                <div className="bg-white rounded-xl border-2 border-gray-200 p-6 hover:shadow-lg transition-shadow">
                  <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="text-2xl">📉</span>
                    Top Debtors
                  </h4>
                  <div className="space-y-3">
                    {topDebtors.slice(0, 5).map((user: any, index: number) => (
                      <div key={user.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-red-50 transition-colors">
                        <div className="text-lg font-bold text-gray-400">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                        </div>
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.avatar_url} />
                          <AvatarFallback className="bg-red-100 text-red-700">
                            {user.name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{user.name}</p>
                          <p className="text-xs text-gray-600">Owes</p>
                        </div>
                        <div className="text-sm font-bold text-red-600">
                          ₫{new Intl.NumberFormat('vi-VN').format(user.balance || 0)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Section */}
            <div className="text-center py-12 space-y-6 bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-12">
              <h3 className="text-3xl font-bold text-gray-900">Ready to get started?</h3>
              <p className="text-lg text-gray-600 max-w-xl mx-auto">
                Join thousands of users managing their shared expenses effortlessly
              </p>
              <Button
                size="lg"
                onClick={() => go({ to: "/register" })}
                className="bg-green-500 hover:bg-green-600 text-white px-12 py-6 text-lg"
              >
                Create Free Account
              </Button>
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
