import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  PlayIcon,
  HistoryIcon,
  ClockIcon,
  Loader2Icon,
  XIcon,
  LockIcon,
} from "@/components/ui/icons";
import { useHaptics } from "@/hooks/use-haptics";
import { useApiExecution } from "../../api-docs/use-api-execution";
import type {
  ApiCatalogEntry,
  ApiRiskLevel,
  ApiExecutionResult,
  ApiExecutionHistoryEntry,
} from "../../api-docs/types";
import {
  buildInitialRpcArgs,
  buildInitialBody,
  exampleValue,
} from "../../api-docs/api-docs-helpers";
import { type TFn, httpStatusColor, CopyButton } from "./shared";

interface KVRow {
  id: string;
  key: string;
  value: string;
  required?: boolean;
  description?: string;
}

export function createRow(partial?: Partial<KVRow>): KVRow {
  return { id: crypto.randomUUID(), key: "", value: "", ...partial };
}

export function buildQueryRows(entry: ApiCatalogEntry): KVRow[] {
  if (entry.kind !== "http" || entry.params.length === 0) return [];
  return entry.params.map((p) =>
    createRow({
      key: p.name,
      value: String(exampleValue(p) ?? ""),
      required: p.required,
      description: p.description,
    })
  );
}

export function rowsToRecord(rows: KVRow[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const row of rows) {
    const key = row.key.trim();
    if (!key) continue;
    out[key] = row.value;
  }
  return out;
}

export function ResponseViewer({ result, t }: { result: ApiExecutionResult; t: TFn }) {
  const json = JSON.stringify(result.data, null, 2) ?? "";
  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/30 border-b">
        <div className="flex items-center gap-3">
          <span className={cn("text-xs font-mono font-bold", httpStatusColor(result.status))}>
            {result.status || "—"}
          </span>
          <span className="text-xs text-muted-foreground">
            <ClockIcon className="w-3 h-3 inline mr-1" />
            {t("adminApiDocs.execute.duration", { ms: result.duration_ms })}
          </span>
          <span
            className={cn(
              "text-xs font-medium",
              result.success
                ? "text-[var(--status-success-foreground)]"
                : "text-destructive"
            )}
          >
            {result.success ? t("adminApiDocs.execute.ok") : t("adminApiDocs.execute.error")}
          </span>
        </div>
        <CopyButton text={json} label={t("adminApiDocs.copyResponse")} />
      </div>
      {result.error && (
        <div className="px-3 py-2 bg-destructive/5 border-b text-xs text-destructive font-medium">
          {result.error}
        </div>
      )}
      {result.data !== undefined && (
        <pre className="p-3 text-xs font-mono overflow-x-auto max-h-72 bg-background/50">{json}</pre>
      )}
    </div>
  );
}

export function HistoryPanel({ history, t }: { history: ApiExecutionHistoryEntry[]; t: TFn }) {
  if (history.length === 0) {
    return <p className="text-xs text-muted-foreground py-2">{t("adminApiDocs.execute.noHistory")}</p>;
  }
  return (
    <div className="space-y-1.5">
      {history.map((h) => (
        <div
          key={h.id}
          className="flex items-center gap-2 text-xs px-2 py-1.5 rounded border bg-muted/20"
        >
          <span className={cn("font-mono font-bold shrink-0", httpStatusColor(h.result.status))}>
            {h.result.status || "ERR"}
          </span>
          <span className="font-mono truncate text-muted-foreground flex-1">{h.operation_id}</span>
          <span className="text-muted-foreground shrink-0">{h.result.duration_ms}ms</span>
        </div>
      ))}
    </div>
  );
}

const NEEDS_MUTATION: ApiRiskLevel[] = ["high", "critical"];

export function TryPanel({ entry, t }: { entry: ApiCatalogEntry; t: TFn }) {
  const { execute, cancel, clearResult, result, isLoading, history } = useApiExecution();
  const [mutationMode, setMutationMode] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [rpcArgsText, setRpcArgsText] = useState(() => buildInitialRpcArgs(entry));
  const [rpcError, setRpcError] = useState<string | null>(null);
  const [httpError, setHttpError] = useState<string | null>(null);
  const [queryRows, setQueryRows] = useState(() => buildQueryRows(entry));
  const [bodyText, setBodyText] = useState(() => buildInitialBody(entry));
  const { tap, warning } = useHaptics();

  const isMutating = NEEDS_MUTATION.includes(entry.risk);

  const fillExample = () => {
    tap();
    setRpcArgsText(buildInitialRpcArgs(entry));
    setQueryRows(buildQueryRows(entry));
    setBodyText(buildInitialBody(entry));
    setRpcError(null);
    setHttpError(null);
  };

  const doExecute = useCallback(() => {
    if (entry.kind === "rpc") {
      let args: Record<string, unknown>;
      try {
        args = JSON.parse(rpcArgsText) as Record<string, unknown>;
      } catch {
        setRpcError(t("adminApiDocs.execute.invalidJsonArgs"));
        return;
      }
      const missing: string[] = [];
      for (const p of entry.params) {
        if (!p.required) continue;
        const v = args[p.name];
        if (v == null || (typeof v === "string" && v.trim() === "")) missing.push(p.name);
      }
      if (missing.length > 0) {
        setRpcError(t("adminApiDocs.execute.missingRequiredRpc", { fields: missing.join(", ") }));
        return;
      }
      setRpcError(null);
      execute(entry, { rpc_args: args });
      return;
    }

    const query = rowsToRecord(queryRows);
    const missingHttp: string[] = [];
    for (const p of entry.params) {
      if (!p.required) continue;
      if (!query[p.name]?.trim()) missingHttp.push(p.name);
    }
    if (missingHttp.length > 0) {
      setHttpError(
        t("adminApiDocs.execute.missingRequiredQuery", { fields: missingHttp.join(", ") })
      );
      return;
    }
    let body: unknown;
    if (entry.method !== "GET" && bodyText.trim() !== "{}") {
      try {
        body = JSON.parse(bodyText);
      } catch {
        setHttpError(t("adminApiDocs.execute.invalidJsonBody"));
        return;
      }
    }
    setHttpError(null);
    execute(entry, {
      target: entry.path ?? "",
      query: Object.keys(query).length ? query : undefined,
      body,
    });
  }, [entry, rpcArgsText, queryRows, bodyText, t, execute]);

  const handleRun = () => {
    tap();
    if (isMutating && !mutationMode) return;
    if (isMutating) {
      setConfirmPhrase("");
      setConfirmOpen(true);
      return;
    }
    doExecute();
  };

  if (entry.callability === "disabled") {
    return (
      <div className="rounded-lg border bg-muted/30 p-6 text-center">
        <XIcon className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm font-medium">{t("adminApiDocs.entry.disabled")}</p>
        <p className="text-xs text-muted-foreground mt-1">{t("adminApiDocs.entry.disabledHint")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isMutating && (
        <div
          className={cn(
            "rounded-lg border px-3 py-2.5 flex items-center gap-2 text-xs",
            mutationMode
              ? "border-destructive/30 bg-destructive/5"
              : "border-[var(--status-warning-bg)] bg-[var(--status-warning-bg)]"
          )}
        >
          <LockIcon className="w-3.5 h-3.5 shrink-0" />
          <span className="flex-1 text-muted-foreground">
            {mutationMode
              ? t("adminApiDocs.execute.mutationEnabled")
              : t("adminApiDocs.execute.mutationDisabled")}
          </span>
          <Button
            variant={mutationMode ? "destructive" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => {
              tap();
              setMutationMode((v) => !v);
            }}
          >
            {mutationMode
              ? t("adminApiDocs.execute.disableMutationMode")
              : t("adminApiDocs.execute.enableMutationMode")}
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{t("adminApiDocs.stepParams")}</p>
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={fillExample}>
          {t("adminApiDocs.execute.fillExample")}
        </Button>
      </div>

      {entry.kind === "rpc" ? (
        <div className="space-y-2">
          <textarea
            id="admin-rpc-args"
            name="rpc-args"
            aria-label={t("adminApiDocs.execute.rpcArgs")}
            value={rpcArgsText}
            onChange={(e) => {
              setRpcArgsText(e.target.value);
              setRpcError(null);
            }}
            className="w-full h-36 rounded-lg border bg-background font-mono text-xs p-3 resize-y focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            placeholder={t("adminApiDocs.execute.rpcArgsPlaceholder")}
            autoComplete="off"
          />
          {rpcError && <p className="text-xs text-destructive">{rpcError}</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {queryRows.map((row) => (
            <div key={row.id} className="flex gap-2 items-start">
              <Input
                className="h-8 text-xs font-mono flex-1"
                value={row.key}
                onChange={(e) =>
                  setQueryRows((rows) =>
                    rows.map((r) => (r.id === row.id ? { ...r, key: e.target.value } : r))
                  )
                }
                placeholder={t("adminApiDocs.execute.keyPlaceholder")}
                autoComplete="off"
              />
              <Input
                className="h-8 text-xs font-mono flex-1"
                value={row.value}
                onChange={(e) =>
                  setQueryRows((rows) =>
                    rows.map((r) => (r.id === row.id ? { ...r, value: e.target.value } : r))
                  )
                }
                placeholder={t("adminApiDocs.execute.valuePlaceholder")}
                autoComplete="off"
              />
            </div>
          ))}
          {entry.method !== "GET" && (
            <textarea
              id="admin-request-body"
              name="request-body"
              aria-label={t("adminApiDocs.execute.body")}
              value={bodyText}
              onChange={(e) => {
                setBodyText(e.target.value);
                setHttpError(null);
              }}
              className="w-full h-24 rounded-lg border bg-background font-mono text-xs p-3 resize-y focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              placeholder={t("adminApiDocs.execute.bodyPlaceholder")}
              autoComplete="off"
            />
          )}
          {httpError && <p className="text-xs text-destructive">{httpError}</p>}
        </div>
      )}

      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">{t("adminApiDocs.stepRun")}</p>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleRun}
            disabled={isLoading || (isMutating && !mutationMode)}
            className="min-w-[100px]"
          >
            {isLoading ? (
              <>
                <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
                {t("adminApiDocs.execute.running")}
              </>
            ) : (
              <>
                <PlayIcon className="w-4 h-4 mr-2" />
                {t("adminApiDocs.execute.run")}
              </>
            )}
          </Button>
          {isLoading && (
            <Button variant="outline" size="sm" onClick={() => { tap(); cancel(); }}>
              {t("adminApiDocs.execute.cancel")}
            </Button>
          )}
          {result && !isLoading && (
            <Button variant="ghost" size="sm" onClick={() => { tap(); clearResult(); }}>
              {t("adminApiDocs.execute.clearResponse")}
            </Button>
          )}
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">{t("adminApiDocs.stepResult")}</p>
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}
        {result && !isLoading && <ResponseViewer result={result} t={t} />}
        {!result && !isLoading && (
          <p className="text-xs text-muted-foreground">{t("adminApiDocs.execute.noHistory")}</p>
        )}
      </div>

      {history.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <HistoryIcon className="w-3.5 h-3.5 text-muted-foreground" />
            <h4 className="text-xs font-medium text-muted-foreground">
              {t("adminApiDocs.execute.history")}
            </h4>
          </div>
          <HistoryPanel history={history} t={t} />
        </div>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("adminApiDocs.execute.confirmMutation")}</DialogTitle>
            <DialogDescription>
              {t("adminApiDocs.execute.confirmMutationDesc", { risk: entry.risk })}
            </DialogDescription>
          </DialogHeader>
          <Input
            name="confirm-execute"
            value={confirmPhrase}
            onChange={(e) => setConfirmPhrase(e.target.value)}
            placeholder={t("adminApiDocs.execute.confirmPlaceholder")}
            className="font-mono"
            autoFocus
            autoComplete="off"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { tap(); setConfirmOpen(false); }}>
              {t("adminApiDocs.execute.cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={confirmPhrase !== t("adminApiDocs.execute.confirmPhrase")}
              onClick={() => {
                warning();
                setConfirmOpen(false);
                doExecute();
              }}
            >
              {t("adminApiDocs.execute.confirmExecute")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
