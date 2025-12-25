import { useGetIdentity, useGo } from "@refinedev/core";
import { useGlobalBalance } from "@/hooks/use-global-balance";
import { useRecentActivity } from "@/hooks/use-recent-activity";
import { BalanceSummaryCards } from "@/components/dashboard/balance-summary-cards";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { GroupBalanceCard } from "@/components/dashboard/group-balance-card";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Profile } from "@/modules/profile/types";

export const Dashboard = () => {
  const { data: identity } = useGetIdentity<Profile>();
  const go = useGo();
  const globalBalance = useGlobalBalance();
  const recentActivity = useRecentActivity(10);

  // Show placeholder for unauthenticated users
  if (!identity) {
    return (
      <div className="container max-w-4xl py-16">
        <div className="text-center space-y-6">
          <h1 className="text-4xl font-bold tracking-tight">Welcome to FairPay</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Track shared expenses with friends and groups. Split bills fairly and settle up easily.
          </p>
          <div className="flex gap-4 justify-center pt-8">
            <Button size="lg" onClick={() => go({ to: "/login" })}>
              Login
            </Button>
            <Button size="lg" variant="outline" onClick={() => go({ to: "/register" })}>
              Create Account
            </Button>
          </div>
          <Card className="mt-12 text-left">
            <CardHeader>
              <CardTitle>Key Features</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-2xl">💰</span>
                <div>
                  <p className="font-medium">Track Balances</p>
                  <p className="text-sm text-muted-foreground">
                    See who owes what at a glance with real-time balance updates
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">👥</span>
                <div>
                  <p className="font-medium">Group Expenses</p>
                  <p className="text-sm text-muted-foreground">
                    Split bills with roommates, friends, or travel groups
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">📊</span>
                <div>
                  <p className="font-medium">Leaderboard Dashboard</p>
                  <p className="text-sm text-muted-foreground">
                    View top debtors and total group debts in each group
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">🔔</span>
                <div>
                  <p className="font-medium">Real-time Notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Get notified when expenses are added or payments are made
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (globalBalance.isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="container max-w-7xl py-8">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Overview of your balances and recent activity
          </p>
        </div>

        {/* Quick Actions */}
        <QuickActions />

        {/* Balance Summary Cards */}
        <BalanceSummaryCards
          totalOwedToMe={globalBalance.total_owed_to_me}
          totalIOwe={globalBalance.total_i_owe}
          netBalance={globalBalance.net_balance}
          currency="VND"
        />

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Activity Feed */}
          <div className="space-y-6">
            <ActivityFeed
              items={recentActivity.items}
              isLoading={recentActivity.isLoading}
            />
          </div>

          {/* Right Column: Group Balances */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Your Groups</CardTitle>
              </CardHeader>
              <CardContent>
                {globalBalance.group_balances.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
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
          </div>
        </div>
      </div>
    </div>
  );
};
