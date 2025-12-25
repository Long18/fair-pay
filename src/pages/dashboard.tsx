import { useGetIdentity, useGo } from "@refinedev/core";
import { useGlobalBalance } from "@/hooks/use-global-balance";
import { useRecentActivity } from "@/hooks/use-recent-activity";
import { useSampleLeaderboard } from "@/hooks/use-sample-leaderboard";
import { GroupBalanceCard } from "@/components/dashboard/group-balance-card";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { WeeklyEarningsChart } from "@/components/dashboard/weekly-earnings-chart";
import { SuccessRateChart } from "@/components/dashboard/success-rate-chart";
import { PaymentIssuesChart } from "@/components/dashboard/payment-issues-chart";
import { PublicLeaderboard } from "@/components/dashboard/public-leaderboard";
import { PublicStatsComponent } from "@/components/dashboard/public-stats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FloatingActionButton } from "@/components/ui/floating-action-button";
import { SimplifiedDebts } from "@/components/dashboard/simplified-debts";
import { useAggregatedDebts } from "@/hooks/use-aggregated-debts";
import { Profile } from "@/modules/profile/types";
import { formatNumber } from "@/lib/locale-utils";

export const Dashboard = () => {
  const { data: identity } = useGetIdentity<Profile>();
  const go = useGo();
  const globalBalance = useGlobalBalance();
  const recentActivity = useRecentActivity(10);
  const { topDebtors, topCreditors, stats } = useSampleLeaderboard();
  const { data: debts = [], isLoading: debtsLoading } = useAggregatedDebts();

  // Check if any data is refetching
  const isRefetching = globalBalance.isRefetching || recentActivity.isRefetching;

  if (!identity) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-purple-50">
        <div className="container max-w-7xl py-16 px-4 lg:px-8">
          <div className="space-y-12">
            <div className="text-center space-y-6">
              <h1 className="text-5xl lg:text-6xl font-bold tracking-tight bg-gradient-to-r from-teal-600 to-purple-600 bg-clip-text text-transparent">
                Welcome to FairPay
              </h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Track shared expenses with friends and groups. Split bills fairly and settle up easily.
              </p>
              <div className="flex gap-4 justify-center pt-6">
                <Button
                  size="lg"
                  onClick={() => go({ to: "/login" })}
                  className="bg-teal-600 hover:bg-teal-700 text-white px-8"
                >
                  Login
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => go({ to: "/register" })}
                  className="border-teal-600 text-teal-600 hover:bg-teal-50 px-8"
                >
                  Create Account
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
                <h2 className="text-3xl font-bold text-gray-900">
                  Community Leaderboard
                </h2>
                <p className="text-gray-600 mt-2">
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
              <h3 className="text-2xl font-bold text-gray-900">
                Ready to get started?
              </h3>
              <p className="text-gray-600">
                Join thousands of users managing their shared expenses effortlessly
              </p>
              <div className="flex gap-4 justify-center">
                <Button
                  size="lg"
                  onClick={() => go({ to: "/register" })}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-8"
                >
                  Sign Up Now
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

  // Show refetching indicator
  const showRefetchingIndicator = isRefetching && !globalBalance.isLoading;

  const firstName = identity.full_name?.split(" ")[0] || "there";
  const totalOwedToMe = globalBalance.total_owed_to_me;
  const totalIOwe = globalBalance.total_i_owe;
  const netBalance = globalBalance.net_balance;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container max-w-7xl py-8 px-4 lg:px-8">
        <div className="space-y-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">👋</span>
              <h1 className="text-2xl font-bold text-gray-900">
                Hey {firstName}!
              </h1>
            </div>
            <p className="text-gray-600">
              Here's your financial overview
            </p>
          </div>

          {/* Primary Balance Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-gray-100 bg-white hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  You Owe
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">
                  {formatNumber(totalIOwe)} ₫
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Total debt to others
                </p>
              </CardContent>
            </Card>

            <Card className="border-gray-100 bg-white hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  You Are Owed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-teal-600">
                  {formatNumber(totalOwedToMe)} ₫
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Total credit from others
                </p>
              </CardContent>
            </Card>

            <Card className="border-gray-100 bg-white hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Net Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${
                  netBalance > 0 ? 'text-teal-600' : netBalance < 0 ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {netBalance > 0 ? '+' : ''}{formatNumber(netBalance)} ₫
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {netBalance > 0 ? 'You are owed overall' : netBalance < 0 ? 'You owe overall' : 'All settled up'}
                </p>
              </CardContent>
            </Card>
          </div>

          <QuickActions />

          {/* Simplified Debts View */}
          <SimplifiedDebts
            debts={debts}
            isLoading={debtsLoading}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-[#F2F2F2]">
              <CardHeader>
                <CardTitle className="text-base font-bold text-[#333]">
                  Your Groups
                </CardTitle>
              </CardHeader>
              <CardContent>
                {globalBalance.group_balances.length === 0 ? (
                  <p className="text-center text-[#828282] py-8 text-sm">
                    You're not part of any groups yet. Create one to get started!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {globalBalance.group_balances.map((group) => (
                      <GroupBalanceCard
                        key={group.group_id}
                        group={group}
                        currency="VND"
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-[#F2F2F2]">
              <CardHeader>
                <CardTitle className="text-base font-bold text-[#333]">
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentActivity.items.length === 0 ? (
                  <p className="text-center text-[#828282] py-8 text-sm">
                    No recent activity
                  </p>
                ) : (
                  <div className="space-y-3">
                    {recentActivity.items.slice(0, 5).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-[#F9F9F9] transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#333] truncate">
                            {item.description}
                          </p>
                          <p className="text-xs text-[#828282] mt-1">
                            {new Date(item.date).toLocaleDateString()}
                          </p>
                        </div>
                        {item.amount && (
                          <span className={`text-sm font-semibold ${
                            item.type === "payment"
                              ? "text-[#6FCF97]"
                              : "text-[#FFA14E]"
                          }`}>
                            {item.amount > 0 ? "+" : ""}
                            {formatNumber(item.amount)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Floating Action Button for quick expense creation */}
      <FloatingActionButton href="/expenses/create" />
    </div>
  );
};
