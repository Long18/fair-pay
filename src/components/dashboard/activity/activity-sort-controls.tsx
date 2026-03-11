import * as React from "react";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowUpDownIcon } from "@/components/ui/icons";
import { useHaptics } from '@/hooks/use-haptics';
import { cn } from "@/lib/utils";

// =============================================
// Types
// =============================================

export type SortOption = "date-desc" | "date-asc" | "amount-desc" | "amount-asc";

export interface SortOptionConfig {
  value: SortOption;
  label: string;
}

// =============================================
// Component Props
// =============================================

export interface ActivitySortControlsProps {
  activeSort: SortOption;
  onSortChange: (sort: SortOption) => void;
  compact?: boolean;
  className?: string;
}

// =============================================
// Activity Sort Controls Component
// =============================================

export const ActivitySortControls: React.FC<ActivitySortControlsProps> = ({
  activeSort,
  onSortChange,
  compact = false,
  className,
}) => {
  const { t } = useTranslation();
  const { tap } = useHaptics();
  const sortOptions: SortOptionConfig[] = [
    { value: "date-desc", label: t("dashboard.activityFeed.sort.newest", "Date (Newest First)") },
    { value: "date-asc", label: t("dashboard.activityFeed.sort.oldest", "Date (Oldest First)") },
    { value: "amount-desc", label: t("dashboard.activityFeed.sort.highestAmount", "Amount (Highest First)") },
    { value: "amount-asc", label: t("dashboard.activityFeed.sort.lowestAmount", "Amount (Lowest First)") },
  ];

  return (
    <div className={cn("flex items-center gap-2", compact && "gap-1.5", className)}>
      <ArrowUpDownIcon className={cn("text-muted-foreground", compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
      <Select value={activeSort} onValueChange={(v) => { tap(); onSortChange(v as SortOption); }}>
        <SelectTrigger className={cn(compact ? "h-8 w-[164px] rounded-full text-xs sm:text-sm" : "w-[200px] rounded-lg")}>
          <SelectValue placeholder={t("dashboard.activityFeed.sort.placeholder", "Sort by...")} />
        </SelectTrigger>
        <SelectContent>
          {sortOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
