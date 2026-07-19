import * as React from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { XIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { useHaptics } from "@/hooks/use-haptics";

export type PaymentStateFilter = "all" | "paid" | "unpaid" | "partial";

export interface FilterCounts {
  all: number;
  paid: number;
  unpaid: number;
  partial: number;
}

export interface ActivityFilterControlsProps {
  activeFilter: PaymentStateFilter;
  onFilterChange: (filter: PaymentStateFilter) => void;
  counts: FilterCounts;
  compact?: boolean;
  className?: string;
}

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
      <ToggleGroup
        type="single"
        value={activeFilter}
        onValueChange={(value) => {
          if (!value) return;
          tap();
          onFilterChange(value as PaymentStateFilter);
        }}
        variant="outline"
        size={compact ? "sm" : "default"}
        className="flex-wrap gap-0 rounded-full border border-border bg-muted/40 p-0.5 shadow-none"
        aria-label={t("dashboard.activityFeed.filters.groupLabel", "Filter activity by payment state")}
      >
        {filters.map((filter) => (
          <ToggleGroupItem
            key={filter.value}
            value={filter.value}
            aria-label={t("dashboard.activityFeed.filters.ariaLabel", {
              defaultValue: "Filter by {{label}}",
              label: filter.label,
            })}
            className={cn(
              "gap-1.5 rounded-full border-0 px-3 shadow-none first:rounded-full last:rounded-full",
              "data-[variant=outline]:border-0 data-[variant=outline]:first:border-0",
              "data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:hover:bg-primary/90 data-[state=on]:hover:text-primary-foreground",
              "data-[state=off]:text-muted-foreground data-[state=off]:hover:bg-background/80 data-[state=off]:hover:text-foreground",
              compact && "h-7 px-2.5 text-xs"
            )}
          >
            <span>{filter.label}</span>
            <Badge
              variant={activeFilter === filter.value ? "secondary" : "outline"}
              className={cn(
                "rounded-full px-1.5 py-0 text-[10px] font-semibold tabular-nums",
                compact && "px-1 text-[10px]",
                activeFilter === filter.value
                  ? "border-primary-foreground/30 bg-primary-foreground/20 text-primary-foreground"
                  : "border-border/60 bg-background text-muted-foreground"
              )}
            >
              {filter.count}
            </Badge>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {hasActiveFilters && !compact && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            tap();
            onFilterChange("all");
          }}
          className="h-9 rounded-full px-3"
          aria-label={t("dashboard.activityFeed.filters.reset", "Reset filters")}
        >
          <XIcon className="mr-1 h-4 w-4" />
          <span className="text-sm">{t("dashboard.activityFeed.filters.resetButton", "Reset")}</span>
        </Button>
      )}
    </div>
  );
};
