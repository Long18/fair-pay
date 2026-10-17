import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FilterIcon, SearchIcon, XIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { useAdminTranslation } from "../i18n";

interface AdminPageToolbarProps {
  search: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;
  filterCount?: number;
  /** Legacy: toggles an inline filter region owned by the caller */
  onFilterToggle?: () => void;
  /** Filter form rendered inside a popover anchored to the Filter button */
  filterContent?: ReactNode;
  filterOpen?: boolean;
  onFilterOpenChange?: (open: boolean) => void;
  /** Inline stats / chips shown between search and actions (e.g. KPI chips) */
  meta?: ReactNode;
  actions?: ReactNode;
  /** Stick under the admin navbar while the page scrolls */
  sticky?: boolean;
  className?: string;
}

export function AdminPageToolbar({
  search,
  onSearchChange,
  searchPlaceholder,
  filterCount,
  onFilterToggle,
  filterContent,
  filterOpen,
  onFilterOpenChange,
  meta,
  actions,
  sticky = false,
  className,
}: AdminPageToolbarProps) {
  const { tAdmin } = useAdminTranslation();

  const filterButton = (
    <Button
      variant="outline"
      size="sm"
      onClick={filterContent ? undefined : onFilterToggle}
      className="h-10 shrink-0 cursor-pointer gap-2 sm:h-9"
    >
      <FilterIcon className="h-4 w-4" />
      <span className="hidden min-[420px]:inline">{tAdmin("common.filter")}</span>
      {!!filterCount && filterCount > 0 && (
        <Badge variant="secondary" className="h-5 px-1.5 text-xs">
          {filterCount}
        </Badge>
      )}
    </Button>
  );

  return (
    <div
      className={cn(
        "flex flex-col gap-2 sm:flex-row sm:items-center",
        sticky &&
          "sticky top-[calc(var(--admin-nav-h)+0.5rem)] z-20 -mx-1 rounded-lg bg-background/95 px-1 py-1 backdrop-blur supports-[backdrop-filter]:bg-background/80",
        className
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="relative w-full sm:max-w-xs">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder ?? tAdmin("toolbar.searchPlaceholder")}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-10 pl-9 sm:h-9"
          />
        </div>
        {search && (
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0 cursor-pointer sm:h-9 sm:w-9"
            onClick={() => onSearchChange("")}
            aria-label={tAdmin("common.clearFilters")}
          >
            <XIcon className="h-4 w-4" />
          </Button>
        )}
        {filterContent ? (
          <Popover open={filterOpen} onOpenChange={onFilterOpenChange}>
            <PopoverTrigger asChild>{filterButton}</PopoverTrigger>
            <PopoverContent
              align="start"
              className="w-[min(92vw,26rem)] p-3"
            >
              {filterContent}
            </PopoverContent>
          </Popover>
        ) : onFilterToggle ? (
          filterButton
        ) : null}
        {meta ? (
          <div className="hidden min-w-0 items-center gap-1.5 overflow-x-auto scrollbar-none lg:flex">
            {meta}
          </div>
        ) : null}
      </div>
      {actions && (
        <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto sm:justify-end [&_button]:cursor-pointer">
          {actions}
        </div>
      )}
    </div>
  );
}
