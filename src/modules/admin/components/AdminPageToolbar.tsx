import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilterIcon, SearchIcon, XIcon } from "@/components/ui/icons";
import { useAdminTranslation } from "../i18n";

interface AdminPageToolbarProps {
  search: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;
  filterCount?: number;
  onFilterToggle?: () => void;
  actions?: React.ReactNode;
}

export function AdminPageToolbar({
  search,
  onSearchChange,
  searchPlaceholder,
  filterCount,
  onFilterToggle,
  actions,
}: AdminPageToolbarProps) {
  const { tAdmin } = useAdminTranslation();

  return (
    <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
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
        {onFilterToggle && (
          <Button
            variant="outline"
            size="sm"
            onClick={onFilterToggle}
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
        )}
      </div>
      {actions && (
        <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto sm:justify-end [&_button]:cursor-pointer">
          {actions}
        </div>
      )}
    </div>
  );
}
