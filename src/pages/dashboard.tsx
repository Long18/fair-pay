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
import { Profile } from "@/modules/profile/types";
import { formatNumber } from "@/lib/locale-utils";

export const Dashboard = () => {
  const { data: identity } = useGetIdentity<Profile>();
  const go = useGo();
  const globalBalance = useGlobalBalance();
  const recentActivity = useRecentActivity(10);
  const { topDebtors, topCreditors, stats } = useSampleLeaderboard();

  if (!identity) {
    return (
      <div className="min-h-screen bg-[#FCFCFC]">
        <div className="container max-w-7xl py-8 px-4 lg:px-8">
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-[#1F1F1F]">
                Welcome to FairPay
              </h1>
              <p className="text-xl text-[#828282] max-w-2xl mx-auto">
                Track shared expenses with friends and groups. Split bills fairly and settle up easily.
              </p>
              <div className="flex gap-4 justify-center pt-4">
                <Button
                  size="lg"
                  onClick={() => go({ to: "/login" })}
                  className="bg-[#FFA14E] hover:bg-[#FF8C2E] text-white"
                >
                  Login
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => go({ to: "/register" })}
                  className="border-[#FFA14E] text-[#FFA14E] hover:bg-[#FFF5ED]"
                >
                  Create Account
                </Button>
              </div>
            </div>

            <PublicStatsComponent stats={stats} />

            <div className="space-y-4">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-[#1F1F1F]">
                  Community Leaderboard
                </h2>
                <p className="text-[#828282] mt-2">
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

            <div className="text-center py-8 space-y-4">
              <h3 className="text-xl font-bold text-[#1F1F1F]">
                Ready to get started?
              </h3>
              <p className="text-[#828282]">
                Join thousands of users managing their shared expenses effortlessly
              </p>
              <div className="flex gap-4 justify-center">
                <Button
                  size="lg"
                  onClick={() => go({ to: "/register" })}
                  className="bg-[#FFA14E] hover:bg-[#FF8C2E] text-white"
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

  const firstName = identity.full_name?.split(" ")[0] || "there";
  const totalEarned = Math.abs(globalBalance.total_owed_to_me);
  const formattedEarnings = formatNumber(totalEarned);

  return (
    <div className="min-h-screen bg-[#FCFCFC]">
      <div className="container max-w-7xl py-8 px-4 lg:px-8">
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-[#FFA14E]">👋</span>
              <h1 className="text-lg font-bold text-[#FFA14E]">
                Hey {firstName}!
              </h1>
            </div>
            <h2 className="text-2xl font-bold text-[#1F1F1F]">
              You earned VND {formattedEarnings} this month.
            </h2>
          </div>

          <QuickActions />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <WeeklyEarningsChart />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SuccessRateChart />
                <PaymentIssuesChart />
              </div>
            </div>

            <div className="space-y-6">
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
      </div>
    </div>
  );
};
