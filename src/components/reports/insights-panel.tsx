import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SpendingInsight } from "@/hooks/use-spending-insights";
import {
  TrendingUpIcon,
  TrendingDownIcon,
  AlertCircleIcon,
  CheckCircle2Icon,
  InfoIcon,
  AlertTriangleIcon,
  InboxIcon,
  PieChartIcon,
  MinusIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from "@/components/ui/icons";

const STORAGE_KEY = "insights-panel-expanded";

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
  // ── collapse state, persisted via localStorage ────────────────────────
  const [expanded, setExpanded] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === null ? true : stored === "true";
    } catch {
      return true;
    }
  });

  // Track whether we've ever toggled so we can skip the initial animation
  const hasToggled = useRef(false);
  // Track the previous expanded value to determine direction
  const prevExpanded = useRef(expanded);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(expanded));
    } catch {
      // localStorage unavailable — silently ignore
    }

    if (hasToggled.current) {
      prevExpanded.current = expanded;
    }
  }, [expanded]);

  const handleToggle = () => {
    hasToggled.current = true;
    setExpanded((prev) => !prev);
  };

  // ── early returns for loading / empty states ──────────────────────────
  if (isLoading) {
    return (
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
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
    return null;
  }

  // ── helpers ────────────────────────────────────────────────────────────
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
        return <CheckCircle2Icon {...iconProps} />;
      case "inbox":
        return <InboxIcon {...iconProps} />;
      case "minus":
        return <MinusIcon {...iconProps} />;
      default:
        return type === "warning" ? (
          <AlertCircleIcon {...iconProps} />
        ) : type === "success" ? (
          <CheckCircle2Icon {...iconProps} />
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

  // Determine the animation class to apply to the body container.
  // On initial mount we skip animation entirely; after the first user toggle
  // we apply expand or collapse based on direction.
  const bodyAnimationClass = hasToggled.current
    ? expanded
      ? "animate-expand"
      : "animate-collapse"
    : "";

  // ── render ─────────────────────────────────────────────────────────────
  return (
    <Card className="border-border shadow-sm">
      {/* Header row – title + chevron toggle */}
      <CardHeader
        className="pb-3 cursor-pointer select-none"
        onClick={handleToggle}
        role="button"
        aria-expanded={expanded}
        aria-label={expanded ? `Collapse ${title}` : `Expand ${title}`}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
          <span className="text-muted-foreground transition-transform duration-200" style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}>
            <ChevronRightIcon className="h-4 w-4" />
          </span>
        </div>
      </CardHeader>

      {/* Collapsible body – rendered conditionally with animation class */}
      {expanded && (
        <CardContent
          className={`px-3 sm:px-6 pb-4 overflow-hidden ${bodyAnimationClass}`}
        >
          <div className="space-y-2 sm:space-y-3">
            {insights.map((insight) => {
              const colors = getColorClasses(insight.type);
              return (
                <div
                  key={insight.id}
                  className={`flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border ${colors.bg} ${colors.border}`}
                >
                  <div className={`mt-0.5 flex-shrink-0 ${colors.icon}`}>
                    {getIcon(insight.icon, insight.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-2">
                      <h4 className={`font-medium text-xs sm:text-sm ${colors.text}`}>
                        {insight.title}
                      </h4>
                      {insight.value && (
                        <span className={`text-xs sm:text-sm font-semibold whitespace-nowrap ${colors.icon}`}>
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
      )}
    </Card>
  );
}
