import * as React from "react";
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
  className?: string;
}

// =============================================
// Activity Sort Controls Component
// =============================================

export const ActivitySortControls: React.FC<ActivitySortControlsProps> = ({
  activeSort,
  onSortChange,
  className,
}) => {
  const { tap } = useHaptics();
  const sortOptions: SortOptionConfig[] = [
    { value: "date-desc", label: "Date (Newest First)" },
    { value: "date-asc", label: "Date (Oldest First)" },
    { value: "amount-desc", label: "Amount (Highest First)" },
    { value: "amount-asc", label: "Amount (Lowest First)" },
  ];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <ArrowUpDownIcon className="h-4 w-4 text-muted-foreground" />
      <Select value={activeSort} onValueChange={(v) => { tap(); onSortChange(v as SortOption); }}>
        <SelectTrigger className="w-[200px] rounded-lg">
          <SelectValue placeholder="Sort by..." />
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
