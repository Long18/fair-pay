import { useState } from "react";
import { useHaptics } from "@/hooks/use-haptics";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  CopyIcon,
  CheckIcon,
  LockIcon,
  ZapIcon,
  GlobeIcon,
  XIcon,
} from "@/components/ui/icons";
import type {
  ApiCatalogEntry,
  ApiRiskLevel,
  ApiAuthLevel,
  ApiCallability,
} from "../../api-docs/types";
import type { ApiDocsCategory } from "../../api-docs/api-docs-helpers";

export type TFn = (key: string, options?: Record<string, unknown>) => string;

export function riskColor(risk: ApiRiskLevel) {
  const map: Record<ApiRiskLevel, string> = {
    low: "bg-[var(--status-success-bg)] text-[var(--status-success-foreground)] border-[var(--status-success-bg)]",
    medium: "bg-[var(--status-warning-bg)] text-[var(--status-warning-foreground)] border-[var(--status-warning-bg)]",
    high: "bg-[var(--status-warning-bg)] text-[var(--status-warning-foreground)] border-[var(--status-warning-bg)]",
    critical: "bg-destructive/10 text-destructive border-destructive/20",
  };
  return map[risk];
}

export function authColor(auth: ApiAuthLevel) {
  const map: Record<ApiAuthLevel, string> = {
    public: "bg-[var(--status-info-bg)] text-[var(--status-info-foreground)] border-[var(--status-info-bg)]",
    authenticated: "bg-[var(--status-info-bg)] text-[var(--status-info-foreground)] border-[var(--status-info-bg)]",
    admin: "bg-[var(--status-warning-bg)] text-[var(--status-warning-foreground)] border-[var(--status-warning-bg)]",
    service_role: "bg-destructive/10 text-destructive border-destructive/20",
  };
  return map[auth];
}

export function methodColor(method: string) {
  const map: Record<string, string> = {
    GET: "bg-[var(--status-info-bg)] text-[var(--status-info-foreground)]",
    POST: "bg-[var(--status-success-bg)] text-[var(--status-success-foreground)]",
    PUT: "bg-[var(--status-warning-bg)] text-[var(--status-warning-foreground)]",
    PATCH: "bg-[var(--status-warning-bg)] text-[var(--status-warning-foreground)]",
    DELETE: "bg-destructive/10 text-destructive",
  };
  return map[method] ?? "bg-muted text-muted-foreground";
}

export function httpStatusColor(status: number) {
  if (status >= 200 && status < 300) return "text-[var(--status-success-foreground)]";
  if (status >= 400 && status < 500) return "text-[var(--status-warning-foreground)]";
  if (status >= 500) return "text-destructive";
  return "text-muted-foreground";
}

export function callabilityIcon(callability: ApiCallability) {
  if (callability === "disabled") return <XIcon className="w-3 h-3" />;
  if (callability === "direct_rpc") return <ZapIcon className="w-3 h-3" />;
  if (callability === "proxy_admin") return <LockIcon className="w-3 h-3" />;
  return <GlobeIcon className="w-3 h-3" />;
}

export function MethodBadge({ entry, large }: { entry: ApiCatalogEntry; large?: boolean }) {
  const sz = large ? "text-xs px-2 py-1" : "text-[10px] px-1.5 py-0.5";
  if (entry.kind === "rpc") {
    return (
      <span
        className={cn(
          "rounded font-mono font-bold uppercase bg-[var(--status-info-bg)] text-[var(--status-info-foreground)]",
          sz
        )}
      >
        RPC
      </span>
    );
  }
  return (
    <span className={cn("rounded font-mono font-bold uppercase", methodColor(entry.method ?? "GET"), sz)}>
      {entry.method ?? "GET"}
    </span>
  );
}

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const { tap } = useHaptics();
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6"
      aria-label={label}
      onClick={async () => {
        tap();
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? (
        <CheckIcon className="w-3 h-3 text-[var(--status-success-foreground)]" />
      ) : (
        <CopyIcon className="w-3 h-3" />
      )}
    </Button>
  );
}

export const CATEGORIES: ApiDocsCategory[] = [
  "all",
  "safe",
  "http",
  "edge",
  "admin",
  "agent",
  "mutation",
];

export function categoryLabel(t: TFn, c: ApiDocsCategory): string {
  switch (c) {
    case "all":
      return t("adminApiDocs.categoryAll");
    case "http":
      return t("adminApiDocs.categoryHttp");
    case "edge":
      return t("adminApiDocs.categoryEdge");
    case "safe":
      return t("adminApiDocs.categorySafe");
    case "mutation":
      return t("adminApiDocs.categoryMutation");
    case "admin":
      return t("adminApiDocs.categoryAdmin");
    case "agent":
      return t("adminApiDocs.categoryAgent");
    default: {
      const _exhaustive: never = c;
      return _exhaustive;
    }
  }
}
