import { useGo } from "@refinedev/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { GroupBalance } from "@/hooks/use-global-balance";

interface GroupBalanceCardProps {
  group: GroupBalance;
  currency?: string;
}

export const GroupBalanceCard = ({ group, currency = "VND" }: GroupBalanceCardProps) => {
  const go = useGo();

  const formatCurrency = (amount: number) => {
    return `${Math.abs(amount).toLocaleString("vi-VN")} ${currency}`;
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
      <CardContent>
        <p className={`text-sm font-medium ${getBalanceColor(group.my_balance)}`}>
          {getBalanceText(group.my_balance)}
        </p>
      </CardContent>
    </Card>
  );
};

