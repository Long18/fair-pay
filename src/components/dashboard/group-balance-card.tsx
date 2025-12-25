import { useGo } from "@refinedev/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, TrendingDown } from "lucide-react";
import { GroupBalance } from "@/hooks/use-global-balance";
import { formatCurrency as formatCurrencyUtil } from "@/lib/locale-utils";

interface GroupBalanceCardProps {
  group: GroupBalance;
  currency?: string;
}

export const GroupBalanceCard = ({ group, currency = "VND" }: GroupBalanceCardProps) => {
  const go = useGo();

  const formatCurrency = (amount: number) => {
    return formatCurrencyUtil(amount, currency);
  };

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return "text-green-600";
    if (balance < 0) return "text-red-600";
    return "text-muted-foreground";
  };

  const getBalanceText = (balance: number) => {
    if (balance > 0) return `You are owed ${formatCurrency(balance)}`;
    if (balance < 0) return `You owe ${formatCurrency(balance)}`;
    return "All settled";
  };

  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => go({ to: `/groups/show/${group.group_id}` })}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{group.group_name}</CardTitle>
            <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
              <Users className="h-3 w-3" />
              <span>{group.member_count} members</span>
            </div>
          </div>
          {group.my_balance !== 0 && (
            <Badge
              variant={group.my_balance > 0 ? "default" : "destructive"}
              className="ml-2"
            >
              {group.my_balance > 0 ? "+" : ""}{formatCurrency(group.my_balance)}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className={`text-sm font-medium ${getBalanceColor(group.my_balance)}`}>
          {getBalanceText(group.my_balance)}
        </p>

        {/* Total Group Debt */}
        {group.total_group_debt > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground border-t pt-3">
            <TrendingDown className="h-4 w-4" />
            <span>Total group debt: {formatCurrency(group.total_group_debt)}</span>
          </div>
        )}

        {/* Top Debtors */}
        {group.top_debtors && group.top_debtors.length > 0 && (
          <div className="border-t pt-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">Top Debtors:</p>
            <div className="space-y-2">
              {group.top_debtors.slice(0, 3).map((debtor, index) => (
                <div key={debtor.user_id} className="flex items-center gap-2 text-sm">
                  <span className="text-xs text-muted-foreground w-4">{index + 1}.</span>
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={debtor.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {debtor.user_name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 truncate">{debtor.user_name}</span>
                  <span className="text-xs text-red-600 font-medium">
                    {formatCurrency(Math.abs(debtor.balance))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
