import { useGo } from "@refinedev/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Receipt, HandCoins } from "lucide-react";
import { ActivityItem } from "@/hooks/use-recent-activity";
import { formatDistanceToNow } from "date-fns";

interface ActivityFeedProps {
  items: ActivityItem[];
  isLoading: boolean;
}

export const ActivityFeed = ({ items, isLoading }: ActivityFeedProps) => {
  const go = useGo();

  const formatCurrency = (amount: number, currency: string) => {
    return `${amount.toLocaleString("vi-VN")} ${currency}`;
  };

  const handleActivityClick = (item: ActivityItem) => {
    if (item.type === "expense") {
      go({ to: `/expenses/show/${item.id}` });
    } else if (item.group_id) {
      go({ to: `/groups/show/${item.group_id}` });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            No activity yet. Create your first expense!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={`${item.type}-${item.id}`}
              onClick={() => handleActivityClick(item)}
              className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
            >
              <div className={`p-2 rounded-full ${
                item.type === "expense"
                  ? "bg-purple-100"
                  : "bg-green-100"
              }`}>
                {item.type === "expense" ? (
                  <Receipt className="h-4 w-4 text-purple-600" />
                ) : (
                  <HandCoins className="h-4 w-4 text-green-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {item.group_name && (
                        <Badge variant="secondary" className="text-xs">
                          {item.group_name}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(item.date), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`font-semibold ${
                      item.type === "expense"
                        ? "text-purple-600"
                        : "text-green-600"
                    }`}>
                      {formatCurrency(item.amount, item.currency)}
                    </p>
                    {item.is_mine && (
                      <span className="text-xs text-muted-foreground">by you</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
