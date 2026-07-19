import { useMemo } from "react";
import { useAdminTranslation } from "../../i18n";

export function DiffView({ oldData, newData }: { oldData: Record<string, unknown> | null; newData: Record<string, unknown> | null }) {
  const { tAdmin } = useAdminTranslation();
  const changes = useMemo(() => {
    if (!oldData && !newData) return [];

    const allKeys = new Set([
      ...Object.keys(oldData ?? {}),
      ...Object.keys(newData ?? {}),
    ]);

    const result: Array<{
      key: string;
      oldVal: unknown;
      newVal: unknown;
      type: "added" | "removed" | "changed" | "unchanged";
    }> = [];

    for (const key of allKeys) {
      const oldVal = oldData?.[key];
      const newVal = newData?.[key];
      const oldStr = JSON.stringify(oldVal);
      const newStr = JSON.stringify(newVal);

      if (oldVal === undefined) {
        result.push({ key, oldVal, newVal, type: "added" });
      } else if (newVal === undefined) {
        result.push({ key, oldVal, newVal, type: "removed" });
      } else if (oldStr !== newStr) {
        result.push({ key, oldVal, newVal, type: "changed" });
      } else {
        result.push({ key, oldVal, newVal, type: "unchanged" });
      }
    }

    // Sort: changed first, then added, removed, unchanged
    const order = { changed: 0, added: 1, removed: 2, unchanged: 3 };
    result.sort((a, b) => order[a.type] - order[b.type]);
    return result;
  }, [oldData, newData]);

  if (changes.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">{tAdmin("auditLogs.noDetailData")}</p>;
  }

  const formatVal = (v: unknown) => {
    if (v === undefined || v === null) return "—";
    if (typeof v === "object") return JSON.stringify(v, null, 2);
    return String(v);
  };

  return (
    <div className="space-y-1">
      {changes.map(({ key, oldVal, newVal, type }) => (
        <div
          key={key}
          className={`flex items-start gap-2 rounded-md px-2 py-1 text-xs font-mono ${
            type === "added"
              ? "bg-[var(--status-success-bg)]"
              : type === "removed"
                ? "bg-[var(--status-error-bg)]"
                : type === "changed"
                  ? "bg-[var(--status-warning-bg)]"
                  : "bg-transparent"
          }`}
        >
          <span className="w-1.5 shrink-0 mt-0.5">
            {type === "added" && <span className="text-[var(--status-success-foreground)]">+</span>}
            {type === "removed" && <span className="text-[var(--status-error-foreground)]">−</span>}
            {type === "changed" && <span className="text-[var(--status-warning-foreground)]">~</span>}
          </span>
          <span className="text-muted-foreground min-w-[100px] shrink-0">{key}:</span>
          <div className="flex-1 min-w-0">
            {type === "changed" ? (
              <div className="space-y-0.5">
                <div className="text-[var(--status-error-foreground)] line-through break-all">{formatVal(oldVal)}</div>
                <div className="text-[var(--status-success-foreground)] break-all">{formatVal(newVal)}</div>
              </div>
            ) : type === "removed" ? (
              <span className="text-[var(--status-error-foreground)] break-all">{formatVal(oldVal)}</span>
            ) : type === "added" ? (
              <span className="text-[var(--status-success-foreground)] break-all">{formatVal(newVal)}</span>
            ) : (
              <span className="text-muted-foreground break-all">{formatVal(newVal)}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

