import { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Loader2Icon,
  CheckCircle2Icon,
  XCircleIcon,
  AlertTriangleIcon,
  GlobeIcon,
} from "@/components/ui/icons";
import { useAdminTranslation } from "../../i18n";
import { formatTime, type CheckStatus, type LogEntry, type OgMeta } from "./helpers";

// ─── Sub-components ─────────────────────────────────────────────────

export function StatusBadge({ status }: { status: CheckStatus }) {
  switch (status) {
    case "loading":
      return (
        <Badge variant="outline" className="gap-1.5 bg-[var(--status-info-bg)] text-[var(--status-info-foreground)] border-[var(--status-info-bg)]">
          <Loader2Icon className="h-3 w-3 animate-spin" />
          Checking…
        </Badge>
      );
    case "success":
      return (
        <Badge variant="outline" className="gap-1.5 bg-[var(--status-success-bg)] text-[var(--status-success-foreground)] border-[var(--status-success-bg)]">
          <CheckCircle2Icon className="h-3 w-3" />
          Valid
        </Badge>
      );
    case "error":
      return (
        <Badge variant="outline" className="gap-1.5 bg-[var(--status-error-bg)] text-[var(--status-error-foreground)] border-[var(--status-error-bg)]">
          <XCircleIcon className="h-3 w-3" />
          Error
        </Badge>
      );
    default:
      return null;
  }
}

export function MetaRow({ label, value, warn }: { label: string; value: string | null; warn?: boolean }) {
  return (
    <div className="flex items-start gap-3 py-1.5 border-b border-border/40 last:border-0">
      <span className="text-xs font-mono text-muted-foreground w-32 shrink-0 pt-0.5">{label}</span>
      {value ? (
        <span className={cn("text-sm break-all", warn && "text-[var(--status-warning-foreground)]")}>
          {value}
        </span>
      ) : (
        <span className="text-sm text-muted-foreground/50 italic flex items-center gap-1">
          <AlertTriangleIcon className="h-3 w-3 text-[var(--status-warning-foreground)]" />
          Missing
        </span>
      )}
    </div>
  );
}

export function OgImagePreview({ src, alt }: { src: string; alt: string }) {
  const { tAdmin } = useAdminTranslation();
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className="relative w-full aspect-[1200/630] rounded-lg overflow-hidden border border-border bg-muted/30">
      {!loaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
      {error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <XCircleIcon className="h-8 w-8" />
          <span className="text-sm">{tAdmin("ogPreview.failedImage")}</span>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-300",
            loaded ? "opacity-100" : "opacity-0"
          )}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
        />
      )}
    </div>
  );
}

export function LogLevelIcon({ level }: { level: LogEntry["level"] }) {
  switch (level) {
    case "success":
      return <CheckCircle2Icon className="h-3.5 w-3.5 text-[var(--status-success-foreground)] shrink-0" />;
    case "warn":
      return <AlertTriangleIcon className="h-3.5 w-3.5 text-[var(--status-warning-foreground)] shrink-0" />;
    case "error":
      return <XCircleIcon className="h-3.5 w-3.5 text-[var(--status-error-foreground)] shrink-0" />;
    default:
      return <GlobeIcon className="h-3.5 w-3.5 text-[var(--status-info-foreground)] shrink-0" />;
  }
}


// ─── Social Preview Cards ───────────────────────────────────────────

export function FacebookPreview({ meta }: { meta: OgMeta }) {
  const { tAdmin } = useAdminTranslation();
  return (
    <div className="rounded-lg border border-border overflow-hidden bg-card max-w-md">
      {meta.image && (
        <div className="aspect-[1200/630] bg-muted">
          <img
            src={meta.image}
            alt="OG Preview"
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        </div>
      )}
      <div className="px-3 py-2.5 space-y-0.5 border-t border-border/40">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wide truncate">
          {meta.siteName || new URL(meta.url || "https://example.com").hostname}
        </p>
        <p className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">
          {meta.title || tAdmin("ogPreview.noTitle")}
        </p>
        {meta.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{meta.description}</p>
        )}
      </div>
    </div>
  );
}

export function TwitterPreview({ meta }: { meta: OgMeta }) {
  const { tAdmin } = useAdminTranslation();
  const title = meta.twitterTitle || meta.title;
  const description = meta.twitterDescription || meta.description;
  const image = meta.twitterImage || meta.image;

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card max-w-md">
      {image && (
        <div className="aspect-[2/1] bg-muted">
          <img
            src={image}
            alt="Twitter Preview"
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        </div>
      )}
      <div className="px-3 py-2.5 space-y-0.5">
        <p className="text-sm font-semibold text-foreground line-clamp-1">{title || tAdmin("ogPreview.noTitle")}</p>
        {description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>
        )}
        <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
          <GlobeIcon className="h-3 w-3" />
          {meta.url ? new URL(meta.url).hostname : "example.com"}
        </p>
      </div>
    </div>
  );
}

export function MetaTagList({ meta }: { meta: OgMeta }) {
  return (
    <div className="divide-y divide-border/40">
      <MetaRow label="og:title" value={meta.title} />
      <MetaRow label="og:description" value={meta.description} />
      <MetaRow label="og:image" value={meta.image} />
      <MetaRow label="og:image:width" value={meta.imageWidth} />
      <MetaRow label="og:image:height" value={meta.imageHeight} />
      <MetaRow label="og:url" value={meta.url} />
      <MetaRow label="og:site_name" value={meta.siteName} />
      <MetaRow label="og:type" value={meta.type} />
      <MetaRow label="twitter:card" value={meta.twitterCard} />
      <MetaRow label="twitter:title" value={meta.twitterTitle} />
      <MetaRow label="twitter:description" value={meta.twitterDescription} />
      <MetaRow label="twitter:image" value={meta.twitterImage} />
    </div>
  );
}

export function ConsoleLines({ logs, emptyLabel }: { logs: LogEntry[]; emptyLabel: string }) {
  if (logs.length === 0) {
    return (
      <div className="flex h-full min-h-40 items-center justify-center text-zinc-500">
        <span>{emptyLabel}</span>
      </div>
    );
  }

  return (
    <>
      {logs.map((log) => (
        <div key={log.id} className="flex items-start gap-2 py-0.5 hover:bg-zinc-900/50 px-1 -mx-1 rounded">
          <span className="text-zinc-600 shrink-0 select-none">{formatTime(log.timestamp)}</span>
          <LogLevelIcon level={log.level} />
          <span
            className={cn(
              "break-all",
              log.level === "success" && "text-[var(--status-success-foreground)]",
              log.level === "warn" && "text-[var(--status-warning-foreground)]",
              log.level === "error" && "text-[var(--status-error-foreground)]",
              log.level === "info" && "text-zinc-300"
            )}
          >
            {log.message}
          </span>
        </div>
      ))}
    </>
  );
}
