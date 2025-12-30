import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SpendingInsight } from "@/hooks/use-spending-insights";
import {
  TrendingUpIcon,
  TrendingDownIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  InfoIcon,
  AlertTriangleIcon,
  InboxIcon,
  PieChartIcon,
  MinusIcon,
} from "@/components/ui/icons";

interface InsightsPanelProps {
  insights: SpendingInsight[];
  isLoading?: boolean;
  title?: string;
}

export function InsightsPanel({
  insights,
  isLoading = false,
  title = "Spending Insights",
}: InsightsPanelProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            Loading insights...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (insights.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            No insights available
          </div>
        </CardContent>
      </Card>
    );
  }

  const getIcon = (iconName?: string, type?: string) => {
    const iconProps = { className: "h-5 w-5", size: 20 };

    switch (iconName) {
      case "trending-up":
        return <TrendingUpIcon {...iconProps} />;
      case "trending-down":
        return <TrendingDownIcon {...iconProps} />;
      case "pie-chart":
        return <PieChartIcon {...iconProps} />;
      case "alert-circle":
        return <AlertCircleIcon {...iconProps} />;
      case "alert-triangle":
        return <AlertTriangleIcon {...iconProps} />;
      case "check-circle":
        return <CheckCircleIcon {...iconProps} />;
      case "inbox":
        return <InboxIcon {...iconProps} />;
      case "minus":
        return <MinusIcon {...iconProps} />;
      default:
        return type === "warning" ? (
          <AlertCircleIcon {...iconProps} />
        ) : type === "success" ? (
          <CheckCircleIcon {...iconProps} />
        ) : (
          <InfoIcon {...iconProps} />
        );
    }
  };

  const getColorClasses = (type: string) => {
    switch (type) {
      case "warning":
        return {
          bg: "bg-orange-50 dark:bg-orange-950/20",
          border: "border-orange-200 dark:border-orange-800",
          icon: "text-orange-600 dark:text-orange-400",
          text: "text-orange-900 dark:text-orange-100",
        };
      case "success":
        return {
          bg: "bg-green-50 dark:bg-green-950/20",
          border: "border-green-200 dark:border-green-800",
          icon: "text-green-600 dark:text-green-400",
          text: "text-green-900 dark:text-green-100",
        };
      case "trend":
        return {
          bg: "bg-blue-50 dark:bg-blue-950/20",
          border: "border-blue-200 dark:border-blue-800",
          icon: "text-blue-600 dark:text-blue-400",
          text: "text-blue-900 dark:text-blue-100",
        };
      default:
        return {
          bg: "bg-muted",
          border: "border-border",
          icon: "text-muted-foreground",
          text: "text-foreground",
        };
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {insights.map((insight) => {
            const colors = getColorClasses(insight.type);
            return (
              <div
                key={insight.id}
                className={`flex items-start gap-3 p-3 rounded-lg border ${colors.bg} ${colors.border}`}
              >
                <div className={`mt-0.5 ${colors.icon}`}>
                  {getIcon(insight.icon, insight.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className={`font-medium text-sm ${colors.text}`}>
                      {insight.title}
                    </h4>
                    {insight.value && (
                      <span className={`text-sm font-semibold whitespace-nowrap ${colors.icon}`}>
                        {insight.value}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {insight.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

