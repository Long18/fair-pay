import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { XIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

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
  className?: string;
}

// =============================================
// Activity Filter Controls Component
// =============================================

export const ActivityFilterControls: React.FC<ActivityFilterControlsProps> = ({
  activeFilter,
  onFilterChange,
  counts,
  className,
}) => {
  const filters: Array<{
    value: PaymentStateFilter;
    label: string;
    count: number;
  }> = [
    { value: "all", label: "All", count: counts.all },
    { value: "paid", label: "Paid", count: counts.paid },
    { value: "unpaid", label: "Unpaid", count: counts.unpaid },
    { value: "partial", label: "Partial", count: counts.partial },
  ];

  const hasActiveFilters = activeFilter !== "all";

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {filters.map((filter) => (
        <button
          key={filter.value}
          onClick={() => onFilterChange(filter.value)}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded-full",
            "text-sm font-medium transition-all",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            activeFilter === filter.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
          aria-label={`Filter by ${filter.label}`}
          aria-pressed={activeFilter === filter.value}
        >
          <span>{filter.label}</span>
          <Badge
            variant={activeFilter === filter.value ? "secondary" : "outline"}
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-semibold",
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
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onFilterChange("all")}
          className="h-9 rounded-full px-3"
          aria-label="Reset filters"
        >
          <XIcon className="h-4 w-4 mr-1" />
          <span className="text-sm">Reset</span>
        </Button>
      )}
    </div>
  );
};
