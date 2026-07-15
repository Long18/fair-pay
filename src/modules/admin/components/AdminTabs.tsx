import type { ComponentType, ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface AdminTabItem {
  value: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  /** When false, tab is omitted from list (e.g. feature-flagged) */
  enabled?: boolean;
}

export interface AdminTabsProps {
  items: AdminTabItem[];
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
  className?: string;
  /** Show Select instead of TabsList below `md` */
  mobileAsSelect?: boolean;
  /**
   * Static Tailwind grid columns for TabsList on `sm+`.
   * Must be a full class string (Tailwind cannot see dynamic class names).
   * Examples: "sm:grid-cols-3", "sm:grid-cols-4", "sm:grid-cols-5", "sm:grid-cols-6"
   */
  listClassName?: string;
}

const STATIC_GRID_BY_COUNT: Record<number, string> = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-4",
  5: "sm:grid-cols-5",
  6: "sm:grid-cols-6",
};

export function AdminTabs({
  items,
  value,
  onValueChange,
  children,
  className,
  mobileAsSelect = true,
  listClassName,
}: AdminTabsProps) {
  const visible = items.filter((item) => item.enabled !== false);
  const gridClass =
    listClassName ??
    STATIC_GRID_BY_COUNT[Math.min(visible.length, 6)] ??
    "sm:grid-cols-3";

  return (
    <Tabs
      value={value}
      onValueChange={onValueChange}
      className={cn("space-y-4", className)}
    >
      {mobileAsSelect ? (
        <div className="md:hidden">
          <Select value={value} onValueChange={onValueChange}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {visible.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <TabsList
        className={cn(
          "grid w-full",
          gridClass,
          mobileAsSelect && "hidden md:grid"
        )}
      >
        {visible.map((item) => {
          const Icon = item.icon;
          return (
            <TabsTrigger key={item.value} value={item.value} className="gap-2">
              {Icon ? <Icon className="h-4 w-4" /> : null}
              {item.label}
            </TabsTrigger>
          );
        })}
      </TabsList>

      {children}
    </Tabs>
  );
}

export { TabsContent as AdminTabsContent };
