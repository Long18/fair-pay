import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useHaptics } from "@/hooks/use-haptics";
import { ArrowDownIcon, ArrowUpIcon, ScaleIcon, ChevronDownIcon, ChevronUpIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { formatCurrency, type SupportedCurrency } from "@/lib/format-utils";

// =============================================
// Component Props
// =============================================

export interface ActivitySummaryProps {
  totalOwed: number; // Amount current user owes
  totalToReceive: number; // Amount owed to current user
  netBalance: number; // Net balance (positive = owed to you, negative = you owe)
  currency: SupportedCurrency;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
}

// =============================================
// Activity Summary Component
// =============================================

export const ActivitySummary: React.FC<ActivitySummaryProps> = ({
  totalOwed,
  totalToReceive,
  netBalance,
  currency,
  isCollapsed = false,
  onToggleCollapse,
  className,
}) => {
  const { tap } = useHaptics();
  const metrics = [
    {
      label: "You Owe",
      value: totalOwed,
      icon: ArrowDownIcon,
      colorClass: "text-semantic-negative",
      bgClass: "bg-semantic-negative/10",
    },
    {
      label: "Owed to You",
      value: totalToReceive,
      icon: ArrowUpIcon,
      colorClass: "text-semantic-positive",
      bgClass: "bg-semantic-positive/10",
    },
    {
      label: "Net Balance",
      value: Math.abs(netBalance),
      icon: ScaleIcon,
      colorClass: netBalance > 0 ? "text-semantic-positive" : netBalance < 0 ? "text-semantic-negative" : "text-semantic-neutral",
      bgClass: netBalance > 0 ? "bg-semantic-positive/10" : netBalance < 0 ? "bg-semantic-negative/10" : "bg-muted",
      prefix: netBalance > 0 ? "+" : netBalance < 0 ? "-" : "",
    },
  ];

  return (
    <Card className={cn("rounded-lg", className)}>
      <CardContent className="p-4 md:p-6">
        {/* Mobile: Collapsible Header */}
        {onToggleCollapse && (
          <button
            onClick={() => { tap(); onToggleCollapse?.(); }}
            className="flex items-center justify-between w-full mb-4 md:hidden focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-md p-2 -m-2"
            aria-label={isCollapsed ? "Expand summary" : "Collapse summary"}
            aria-expanded={!isCollapsed}
          >
            <h3 className="text-base font-semibold">Summary</h3>
            {isCollapsed ? (
              <ChevronDownIcon className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronUpIcon className="h-5 w-5 text-muted-foreground" />
            )}
          </button>
        )}

        {/* Desktop: Always show title */}
        {!onToggleCollapse && (
          <h3 className="text-base font-semibold mb-4 hidden md:block">Summary</h3>
        )}

        {/* Metrics Grid */}
        {(!isCollapsed || !onToggleCollapse) && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {metrics.map((metric, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card"
              >
                {/* Icon */}
                <div className={cn("p-2 rounded-full", metric.bgClass)}>
                  <metric.icon className={cn("h-5 w-5", metric.colorClass)} />
                </div>

                {/* Label and Value */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-1">
                    {metric.label}
                  </p>
                  <p className={cn("text-lg font-bold truncate", metric.colorClass)}>
                    {metric.prefix}
                    {formatCurrency(metric.value, currency)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
