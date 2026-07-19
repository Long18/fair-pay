import { cn } from "@/lib/utils";
import type { ApiCatalogEntry } from "../../api-docs/types";
import { displayName, friendlySummary } from "../../api-docs/api-docs-helpers";
import { useHaptics } from "@/hooks/use-haptics";
import {
  type TFn,
  MethodBadge,
  riskColor,
  authColor,
} from "./shared";

export function CatalogList({
  entries,
  selectedId,
  onSelect,
  t,
}: {
  entries: ApiCatalogEntry[];
  selectedId: string | null;
  onSelect: (e: ApiCatalogEntry) => void;
  t: TFn;
}) {
  const { tap } = useHaptics();

  if (entries.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-muted-foreground">{t("adminApiDocs.empty.noResults")}</p>
        <p className="text-xs text-muted-foreground mt-1">{t("adminApiDocs.empty.noResultsDesc")}</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/40">
      {entries.map((entry) => {
        const selected = selectedId === entry.id;
        const runnable = entry.callability !== "disabled";
        return (
          <button
            key={entry.id}
            type="button"
            onClick={() => {
              tap();
              onSelect(entry);
            }}
            className={cn(
              "w-full text-left px-3 py-3 flex flex-col gap-1.5 transition-colors",
              "hover:bg-accent/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
              selected && "bg-primary/8 border-l-2 border-l-primary"
            )}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <MethodBadge entry={entry} />
              <span className="text-xs font-mono font-medium truncate">{displayName(entry)}</span>
            </div>
            <p className="text-[11px] text-muted-foreground line-clamp-2 leading-snug">
              {friendlySummary(entry)}
            </p>
            <div className="flex flex-wrap gap-1">
              <span className={cn("rounded border text-[10px] px-1.5 py-0.5", riskColor(entry.risk))}>
                {t(`adminApiDocs.badges.${entry.risk}`)}
              </span>
              <span className={cn("rounded border text-[10px] px-1.5 py-0.5", authColor(entry.auth_level))}>
                {t(`adminApiDocs.badges.${entry.auth_level}`)}
              </span>
              <span
                className={cn(
                  "rounded text-[10px] px-1.5 py-0.5",
                  runnable
                    ? "bg-[var(--status-success-bg)] text-[var(--status-success-foreground)]"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {runnable ? t("adminApiDocs.runnable") : t("adminApiDocs.notRunnable")}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
