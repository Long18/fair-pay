import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SpendingComparison } from "@/hooks/use-spending-comparison";
import { formatNumber } from "@/lib/locale-utils";
import { TrendingUpIcon, TrendingDownIcon, MinusIcon } from "@/components/ui/icons";

interface ComparisonChartProps {
  data: SpendingComparison | null;
  title?: string;
  isLoading?: boolean;
}

export function ComparisonChart({
  data,
  title = "Period Comparison",
  isLoading = false,
}: ComparisonChartProps) {
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

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No comparison data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const getTrendIcon = () => {
    switch (data.trend) {
      case "increasing":
        return <TrendingUpIcon className="h-8 w-8 text-orange-500" />;
      case "decreasing":
        return <TrendingDownIcon className="h-8 w-8 text-green-500" />;
      default:
        return <MinusIcon className="h-8 w-8 text-muted-foreground" />;
    }
  };

  const getTrendColor = () => {
    switch (data.trend) {
      case "increasing":
        return "text-orange-500";
      case "decreasing":
        return "text-green-500";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="flex items-center justify-center gap-8">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Previous Period</p>
              <p className="text-2xl font-bold">{formatNumber(data.previous_total)} ₫</p>
            </div>

            <div className="flex flex-col items-center">
              {getTrendIcon()}
              <p className={`text-lg font-semibold mt-2 ${getTrendColor()}`}>
                {data.percentage_change > 0 ? "+" : ""}
                {data.percentage_change.toFixed(1)}%
              </p>
            </div>

            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Current Period</p>
              <p className="text-2xl font-bold">{formatNumber(data.current_total)} ₫</p>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Difference</span>
              <span className={`text-lg font-semibold ${getTrendColor()}`}>
                {data.difference > 0 ? "+" : ""}
                {formatNumber(data.difference)} ₫
              </span>
            </div>
          </div>

          <div className="bg-muted rounded-lg p-4">
            <p className="text-sm text-center">
              {data.trend === "increasing" && (
                <>
                  Your spending has <span className="font-semibold text-orange-500">increased</span>{" "}
                  by {Math.abs(data.percentage_change).toFixed(1)}% compared to the previous period.
                </>
              )}
              {data.trend === "decreasing" && (
                <>
                  Great job! Your spending has{" "}
                  <span className="font-semibold text-green-500">decreased</span> by{" "}
                  {Math.abs(data.percentage_change).toFixed(1)}% compared to the previous period.
                </>
              )}
              {data.trend === "stable" && (
                <>
                  Your spending is <span className="font-semibold">stable</span> compared to the
                  previous period.
                </>
              )}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
