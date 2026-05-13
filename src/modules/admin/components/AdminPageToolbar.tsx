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
    <div className="flex items-center gap-2 py-3">
      <div className="relative flex-1 max-w-xs">
        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={searchPlaceholder ?? tAdmin("toolbar.searchPlaceholder")}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-9"
        />
      </div>
      {search && (
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => onSearchChange("")}>
          <XIcon className="h-4 w-4" />
        </Button>
      )}
      {onFilterToggle && (
        <Button variant="outline" size="sm" onClick={onFilterToggle} className="gap-2">
          <FilterIcon className="h-4 w-4" />
          {tAdmin("common.filter")}
          {!!filterCount && filterCount > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
              {filterCount}
            </Badge>
          )}
        </Button>
      )}
      {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
    </div>
  );
}
