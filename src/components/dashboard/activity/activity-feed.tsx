import { useGo } from "@refinedev/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActivityItem } from "@/hooks/use-recent-activity";
import { formatDistanceToNow } from "date-fns";
import { formatNumber } from "@/lib/locale-utils";

import { ReceiptIcon, HandCoinsIcon, ActivityIcon } from "@/components/ui/icons";
interface ActivityFeedProps {
  items: ActivityItem[];
  isLoading: boolean;
}

export const ActivityFeed = ({ items, isLoading }: ActivityFeedProps) => {
  const go = useGo();

  const formatCurrency = (amount: number, currency: string) => {
    return `${formatNumber(amount)} ${currency}`;
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
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <ActivityIcon className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <ActivityIcon className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <ActivityIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-foreground font-medium">No activity yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Create your first expense to get started
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <ActivityIcon className="h-5 w-5" />
          Recent Activity
          <span className="text-sm font-normal text-muted-foreground">({items.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={`${item.type}-${item.id}`}
              onClick={() => handleActivityClick(item)}
              className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
            >
              <div className={`p-2 rounded-full ${
                item.type === "expense"
                  ? "bg-destructive/10"
                  : "bg-green-100"
              }`}>
                {item.type === "expense" ? (
                  <ReceiptIcon className="h-4 w-4 text-destructive" />
                ) : (
                  <HandCoinsIcon className="h-4 w-4 text-green-600" />
                )}
              </div>
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
                    ? "text-destructive"
                    : "text-green-600"
                }`}>
                  {formatCurrency(item.amount, item.currency)}
                </p>
                {item.is_mine && (
                  <span className="text-xs text-muted-foreground">by you</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
