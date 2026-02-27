import { Card, CardContent } from "@/components/ui/card";
import { PublicStats } from "@/hooks/use-sample-leaderboard";

interface PublicStatsProps {
  stats: PublicStats;
}

export const PublicStatsComponent = ({ stats }: PublicStatsProps) => {
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("vi-VN").format(num);
  };

  const statCards = [
    {
      label: "Active Users",
      value: formatNumber(stats.total_users),
      icon: "👥",
      color: "text-accent",
    },
    {
      label: "Groups",
      value: formatNumber(stats.total_groups),
      icon: "👨‍👩‍👧‍👦",
      color: "text-chart-positive",
    },
    {
      label: "Transactions",
      value: formatNumber(stats.total_transactions),
      icon: "💸",
      color: "text-primary",
    },
    {
      label: "Amount Tracked",
      value: `₫${formatNumber(stats.total_amount_tracked)}`,
      icon: "💰",
      color: "text-chart-1",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat, index) => (
        <Card key={index} className="border-border hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center space-y-2">
              <span className="text-3xl">{stat.icon}</span>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
