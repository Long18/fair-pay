import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { XIcon } from "@/components/ui/icons";
import { useAdminTranslation } from "../i18n";

interface FilterChip {
  key: string;
  label: string;
  onRemove: () => void;
}

interface AdminFilterChipsProps {
  filters: FilterChip[];
  onClearAll?: () => void;
}

export function AdminFilterChips({ filters, onClearAll }: AdminFilterChipsProps) {
  const { tAdmin } = useAdminTranslation();

  if (filters.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 pb-3">
      {filters.map((f) => (
        <Badge key={f.key} variant="secondary" className="gap-1 pr-1 font-normal">
          {f.label}
          <button type="button"
            aria-label={tAdmin("common.removeFilter", { label: f.label, defaultValue: `Remove ${f.label}` })}
            onClick={f.onRemove}
            className="ml-0.5 rounded hover:bg-muted-foreground/20 p-0.5 transition-colors"
          >
            <XIcon className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      {filters.length > 1 && onClearAll && (
        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground" onClick={onClearAll}>
          {tAdmin("common.clearAll")}
        </Button>
      )}
    </div>
  );
}
