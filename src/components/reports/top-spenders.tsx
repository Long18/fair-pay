import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TopSpender } from "@/hooks/use-top-spenders";
import { formatNumber } from "@/lib/locale-utils";
import { TrophyIcon } from "@/components/ui/icons";

interface TopSpendersProps {
  data: TopSpender[];
  isLoading?: boolean;
  title?: string;
}

export function TopSpenders({
  data,
  isLoading = false,
  title = "Top Spenders",
}: TopSpendersProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const getMedalColor = (index: number) => {
    switch (index) {
      case 0:
        return "text-yellow-500";
      case 1:
        return "text-gray-400";
      case 2:
        return "text-amber-600";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrophyIcon className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.map((spender, index) => (
            <div
              key={spender.user_id}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className={`text-xl font-bold ${getMedalColor(index)} min-w-[24px] text-center`}>
                {index < 3 ? "🏆" : `#${index + 1}`}
              </div>

              <Avatar className="h-10 w-10">
                <AvatarImage src={spender.user_avatar || undefined} alt={spender.user_name} />
                <AvatarFallback>
                  {spender.user_name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{spender.user_name}</p>
                <p className="text-xs text-muted-foreground">
                  {spender.expense_count} expenses
                </p>
              </div>

              <div className="text-right">
                <p className="font-semibold text-sm">{formatNumber(spender.total_spent)} ₫</p>
                <p className="text-xs text-muted-foreground">{spender.percentage.toFixed(1)}%</p>
              </div>
            </div>
          ))}
        </div>

        {data.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No spending data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}

