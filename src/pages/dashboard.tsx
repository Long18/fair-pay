import { useGlobalBalance } from "@/hooks/use-global-balance";
import { useRecentActivity } from "@/hooks/use-recent-activity";
import { BalanceSummaryCards } from "@/components/dashboard/balance-summary-cards";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { GroupBalanceCard } from "@/components/dashboard/group-balance-card";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Dashboard = () => {
  const globalBalance = useGlobalBalance();
  const recentActivity = useRecentActivity(10);

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
