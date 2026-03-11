import * as React from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { XIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { useHaptics } from "@/hooks/use-haptics";

// =============================================
// Types
// =============================================

export type PaymentStateFilter = "all" | "paid" | "unpaid" | "partial";

export interface FilterCounts {
  all: number;
  paid: number;
  unpaid: number;
  partial: number;
}

// =============================================
// Component Props
// =============================================

export interface ActivityFilterControlsProps {
  activeFilter: PaymentStateFilter;
  onFilterChange: (filter: PaymentStateFilter) => void;
  counts: FilterCounts;
  compact?: boolean;
  className?: string;
}

// =============================================
// Activity Filter Controls Component
// =============================================

export const ActivityFilterControls: React.FC<ActivityFilterControlsProps> = ({
  activeFilter,
  onFilterChange,
  counts,
  compact = false,
  className,
}) => {
  const { t } = useTranslation();
  const { tap } = useHaptics();
  const filters: Array<{
    value: PaymentStateFilter;
    label: string;
    count: number;
  }> = [
    { value: "all", label: t("dashboard.activityFeed.filters.all", "All"), count: counts.all },
    { value: "paid", label: t("dashboard.activityFeed.filters.paid", "Paid"), count: counts.paid },
    { value: "unpaid", label: t("dashboard.activityFeed.filters.unpaid", "Unpaid"), count: counts.unpaid },
    { value: "partial", label: t("dashboard.activityFeed.filters.partial", "Partial"), count: counts.partial },
  ];

  const hasActiveFilters = activeFilter !== "all";

  return (
    <div className={cn("flex flex-wrap items-center gap-2", compact && "gap-1.5", className)}>
      {filters.map((filter) => (
        <button
          key={filter.value}
          onClick={() => { tap(); onFilterChange(filter.value); }}
          className={cn(
            "inline-flex items-center gap-2 rounded-full transition-all",
            compact ? "px-3 py-1.5 text-xs sm:text-sm" : "px-4 py-2 text-sm",
            "font-medium",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            activeFilter === filter.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
          aria-label={t("dashboard.activityFeed.filters.ariaLabel", {
            defaultValue: "Filter by {{label}}",
            label: filter.label,
          })}
          aria-pressed={activeFilter === filter.value}
        >
          <span>{filter.label}</span>
          <Badge
            variant={activeFilter === filter.value ? "secondary" : "outline"}
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-semibold",
              compact && "px-1.5 text-[10px]",
              activeFilter === filter.value
                ? "bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30"
                : "bg-background text-foreground"
            )}
          >
            {filter.count}
          </Badge>
        </button>
      ))}

      {/* Reset Button - shows when filter is active */}
      {hasActiveFilters && !compact && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { tap(); onFilterChange("all"); }}
          className="h-9 rounded-full px-3"
          aria-label={t("dashboard.activityFeed.filters.reset", "Reset filters")}
        >
          <XIcon className="h-4 w-4 mr-1" />
          <span className="text-sm">{t("dashboard.activityFeed.filters.resetButton", "Reset")}</span>
        </Button>
      )}
    </div>
  );
};
