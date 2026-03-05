import React from "react";
import { cn } from "@/lib/utils";
import { useHaptics } from "@/hooks/use-haptics";
import { EXPENSE_CATEGORIES, getCategoryMeta } from "../lib/categories";

interface CategoryGridProps {
  value?: string;
  onChange: (value: string) => void;
  className?: string;
}

export const CategoryGrid: React.FC<CategoryGridProps> = ({
  value,
  onChange,
  className,
}) => {
  const { tap } = useHaptics();
  return (
    <div className={cn("grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5", className)}>
      {EXPENSE_CATEGORIES.map((category) => {
        const meta = getCategoryMeta(category);
        const Icon = meta.icon;
        const isSelected = value === category;

        return (
          <button
            key={category}
            type="button"
            onClick={() => { tap(); onChange(category); }}
            className={cn(
              "flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all",
              "hover:bg-accent hover:border-accent-foreground/20",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
              isSelected
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background",
              "min-h-[80px]"
            )}
          >
            <div
              className={cn(
                "rounded-md p-2 mb-2 transition-colors",
                isSelected ? "bg-primary/20" : meta.bgColor
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5",
                  isSelected ? "text-primary" : meta.color
                )}
              />
            </div>
            <span className="text-xs font-medium text-center line-clamp-2">
              {meta.name}
            </span>
          </button>
        );
      })}
    </div>
  );
};
