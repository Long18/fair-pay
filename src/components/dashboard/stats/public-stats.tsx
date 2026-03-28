import { Card, CardContent } from "@/components/ui/card";
import { PublicStats } from "@/hooks/analytics/use-sample-leaderboard";
import { AnimatedNumber } from "@/components/ui/animated-number";

interface PublicStatsProps {
  stats: PublicStats;
}

export const PublicStatsComponent = ({ stats }: PublicStatsProps) => {
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("vi-VN").format(num);
  };

  const formatAmount = (num: number) => {
    return `₫${new Intl.NumberFormat("vi-VN").format(num)}`;
  };

  const statCards = [
    {
      label: "Active Users",
      rawValue: stats.total_users,
      formatter: formatNumber,
      icon: "👥",
      color: "text-accent",
    },
    {
      label: "Groups",
      rawValue: stats.total_groups,
      formatter: formatNumber,
      icon: "👨‍👩‍👧‍👦",
      color: "text-chart-positive",
    },
    {
      label: "Transactions",
      rawValue: stats.total_transactions,
      formatter: formatNumber,
      icon: "💸",
      color: "text-primary",
    },
    {
      label: "Amount Tracked",
      rawValue: stats.total_amount_tracked,
      formatter: formatAmount,
      icon: "💰",
      color: "text-chart-1",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat, index) => (
        <Card key={index} className="border-border hover:shadow-md transition-shadow card-hover-glow">
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center space-y-2">
              <span className="text-3xl">{stat.icon}</span>
              <p className={`text-2xl font-bold ${stat.color}`}>
                <AnimatedNumber value={stat.rawValue} formatter={stat.formatter} />
              </p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
