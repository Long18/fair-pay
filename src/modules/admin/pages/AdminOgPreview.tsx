import { useState, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  SearchIcon,
  Loader2Icon,
  CheckCircle2Icon,
  XCircleIcon,
  AlertTriangleIcon,
  CopyIcon,
  ExternalLinkIcon,
  ImageIcon,
  RefreshCwIcon,
  TrashIcon,
  GlobeIcon,
  EyeIcon,
} from "@/components/ui/icons";

// ─── Types ──────────────────────────────────────────────────────────

interface OgMeta {
  title: string | null;
  description: string | null;
  image: string | null;
  imageWidth: string | null;
  imageHeight: string | null;
  url: string | null;
  siteName: string | null;
  type: string | null;
  twitterCard: string | null;
  twitterTitle: string | null;
  twitterDescription: string | null;
  twitterImage: string | null;
}

interface LogEntry {
  id: number;
  timestamp: Date;
  level: "info" | "success" | "warn" | "error";
  message: string;
}

type CheckStatus = "idle" | "loading" | "success" | "error";

// ─── Helpers ────────────────────────────────────────────────────────

let logIdCounter = 0;

function createLog(level: LogEntry["level"], message: string): LogEntry {
  return { id: ++logIdCounter, timestamp: new Date(), level, message };
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}


function parseOgMeta(html: string): OgMeta {
  const get = (property: string): string | null => {
    // Match both property="..." and name="..." patterns
    const patterns = [
      new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']*)["']`, "i"),
      new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${property}["']`, "i"),
      new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']*)["']`, "i"),
      new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${property}["']`, "i"),
    ];
    for (const re of patterns) {
      const match = html.match(re);
      if (match?.[1]) return match[1];
    }
    return null;
  };

  return {
    title: get("og:title"),
    description: get("og:description"),
    image: get("og:image"),
    imageWidth: get("og:image:width"),
    imageHeight: get("og:image:height"),
    url: get("og:url"),
    siteName: get("og:site_name"),
    type: get("og:type"),
    twitterCard: get("twitter:card"),
    twitterTitle: get("twitter:title"),
    twitterDescription: get("twitter:description"),
    twitterImage: get("twitter:image"),
  };
}

function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

// ─── Sub-components ─────────────────────────────────────────────────

function StatusBadge({ status }: { status: CheckStatus }) {
  switch (status) {
    case "loading":
      return (
        <Badge variant="outline" className="gap-1.5 text-blue-600 border-blue-200 bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:bg-blue-950">
          <Loader2Icon className="h-3 w-3 animate-spin" />
          Checking…
        </Badge>
      );
    case "success":
      return (
        <Badge variant="outline" className="gap-1.5 text-emerald-600 border-emerald-200 bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:bg-emerald-950">
          <CheckCircle2Icon className="h-3 w-3" />
          Valid
        </Badge>
      );
    case "error":
      return (
        <Badge variant="outline" className="gap-1.5 text-red-600 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-800 dark:bg-red-950">
          <XCircleIcon className="h-3 w-3" />
          Error
        </Badge>
      );
    default:
      return null;
  }
}

function MetaRow({ label, value, warn }: { label: string; value: string | null; warn?: boolean }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-border/40 last:border-0">
      <span className="text-xs font-mono text-muted-foreground w-36 shrink-0 pt-0.5">{label}</span>
      {value ? (
        <span className={cn("text-sm break-all", warn && "text-amber-600 dark:text-amber-400")}>
          {value}
        </span>
      ) : (
        <span className="text-sm text-muted-foreground/50 italic flex items-center gap-1">
          <AlertTriangleIcon className="h-3 w-3 text-amber-500" />
          Missing
        </span>
      )}
    </div>
  );
}

function OgImagePreview({ src, alt }: { src: string; alt: string }) {
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
          <span className="text-sm">Failed to load OG image</span>
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

function LogLevelIcon({ level }: { level: LogEntry["level"] }) {
  switch (level) {
    case "success":
      return <CheckCircle2Icon className="h-3.5 w-3.5 text-emerald-500 shrink-0" />;
    case "warn":
      return <AlertTriangleIcon className="h-3.5 w-3.5 text-amber-500 shrink-0" />;
    case "error":
      return <XCircleIcon className="h-3.5 w-3.5 text-red-500 shrink-0" />;
    default:
      return <GlobeIcon className="h-3.5 w-3.5 text-blue-500 shrink-0" />;
  }
}


// ─── Social Preview Cards ───────────────────────────────────────────

function FacebookPreview({ meta }: { meta: OgMeta }) {
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
          {meta.title || "No title"}
        </p>
        {meta.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{meta.description}</p>
        )}
      </div>
    </div>
  );
}

function TwitterPreview({ meta }: { meta: OgMeta }) {
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
        <p className="text-sm font-semibold text-foreground line-clamp-1">{title || "No title"}</p>
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

// ─── Main Component ─────────────────────────────────────────────────

export function AdminOgPreview() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<CheckStatus>("idle");
  const [meta, setMeta] = useState<OgMeta | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [copied, setCopied] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addLog = useCallback((level: LogEntry["level"], message: string) => {
    setLogs((prev) => [...prev, createLog(level, message)]);
    // Auto-scroll handled by useEffect below
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const handleCheck = useCallback(async () => {
    const trimmed = url.trim();
    if (!trimmed) return;

    if (!isValidUrl(trimmed)) {
      addLog("error", `Invalid URL: "${trimmed}". Must start with http:// or https://`);
      return;
    }

    setStatus("loading");
    setMeta(null);
    clearLogs();

    addLog("info", `Fetching: ${trimmed}`);

    try {
      // Fetch the HTML of the share page
      const response = await fetch(trimmed, {
        redirect: "follow",
        headers: { "User-Agent": "FairPay-OG-Checker/1.0" },
      });

      addLog("info", `HTTP ${response.status} ${response.statusText}`);

      if (!response.ok) {
        addLog("error", `Request failed with status ${response.status}`);
        setStatus("error");
        return;
      }

      const contentType = response.headers.get("content-type") || "";
      addLog("info", `Content-Type: ${contentType}`);

      const html = await response.text();
      addLog("info", `Response size: ${(html.length / 1024).toFixed(1)} KB`);

      // Parse OG meta tags
      const parsed = parseOgMeta(html);
      setMeta(parsed);

      // Validate and log results
      let hasWarnings = false;

      if (parsed.title) {
        addLog("success", `og:title = "${parsed.title}"`);
      } else {
        addLog("warn", "Missing og:title");
        hasWarnings = true;
      }

      if (parsed.description) {
        addLog("success", `og:description = "${parsed.description}"`);
      } else {
        addLog("warn", "Missing og:description");
        hasWarnings = true;
      }

      if (parsed.image) {
        addLog("success", `og:image = ${parsed.image}`);

        // Try to load the image to verify it works
        addLog("info", "Verifying OG image loads…");
        try {
          const imgResponse = await fetch(parsed.image, { method: "HEAD" });
          if (imgResponse.ok) {
            const imgContentType = imgResponse.headers.get("content-type") || "unknown";
            addLog("success", `OG image OK (${imgContentType})`);
          } else {
            addLog("error", `OG image returned HTTP ${imgResponse.status}`);
            hasWarnings = true;
          }
        } catch {
          addLog("warn", "Could not verify OG image (CORS or network issue)");
        }
      } else {
        addLog("error", "Missing og:image — social previews will have no image");
        hasWarnings = true;
      }

      if (parsed.imageWidth && parsed.imageHeight) {
        const w = parseInt(parsed.imageWidth);
        const h = parseInt(parsed.imageHeight);
        if (w === 1200 && h === 630) {
          addLog("success", `Image dimensions: ${w}×${h} (recommended)`);
        } else {
          addLog("warn", `Image dimensions: ${w}×${h} (recommended: 1200×630)`);
          hasWarnings = true;
        }
      }

      if (parsed.twitterCard) {
        addLog("success", `twitter:card = "${parsed.twitterCard}"`);
      } else {
        addLog("warn", "Missing twitter:card");
        hasWarnings = true;
      }

      if (parsed.siteName) {
        addLog("info", `og:site_name = "${parsed.siteName}"`);
      }

      if (parsed.url) {
        addLog("info", `og:url = ${parsed.url}`);
      }

      // Summary
      if (hasWarnings) {
        addLog("warn", "Check completed with warnings — review items above");
      } else {
        addLog("success", "All OG meta tags look good ✓");
      }

      setStatus("success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      addLog("error", `Fetch failed: ${message}`);

      if (message.includes("CORS") || message.includes("Failed to fetch")) {
        addLog("info", "Tip: CORS errors are common for external URLs. Try with a FairPay share link.");
      }

      setStatus("error");
    }
  }, [url, addLog, clearLogs]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleCheck();
      }
    },
    [handleCheck]
  );

  const handleCopyMeta = useCallback(async () => {
    if (!meta) return;
    const text = Object.entries(meta)
      .filter(([, v]) => v !== null)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [meta]);

  // Auto-scroll logs
  const scrollToBottom = useCallback(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Scroll when logs change
  const prevLogCount = useRef(0);
  if (logs.length !== prevLogCount.current) {
    prevLogCount.current = logs.length;
    requestAnimationFrame(scrollToBottom);
  }

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">OG Preview Checker</h1>
        <p className="text-sm text-muted-foreground">
          Paste a share link to inspect Open Graph meta tags and preview how it appears on social platforms.
        </p>
      </div>

      {/* ── URL Input ───────────────────────────────────────────── */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                type="url"
                placeholder="https://long-pay.vercel.app/api/share/expense?id=..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-10 h-11 font-mono text-sm"
                aria-label="URL to check"
              />
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleCheck}
                    disabled={status === "loading" || !url.trim()}
                    className="h-11 px-5 gap-2"
                  >
                    {status === "loading" ? (
                      <Loader2Icon className="h-4 w-4 animate-spin" />
                    ) : (
                      <EyeIcon className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline">Check</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Check OG meta tags (Enter)</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Quick links */}
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="text-xs text-muted-foreground pt-0.5">Quick test:</span>
            {[
              { label: "Share Expense", path: "/api/share/expense?id=" },
              { label: "Share Debt", path: "/api/share/debt?counterparty_id=" },
              { label: "OG Expense", path: "/api/og/expense?id=" },
              { label: "OG Debt", path: "/api/og/debt?counterparty_id=" },
            ].map((item) => (
              <button
                key={item.path}
                type="button"
                className="text-xs text-primary hover:underline underline-offset-2"
                onClick={() => {
                  const base = window.location.origin;
                  setUrl(`${base}${item.path}`);
                  inputRef.current?.focus();
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Results ─────────────────────────────────────────────── */}
      {meta && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: OG Image + Meta Tags */}
          <div className="space-y-4">
            {/* OG Image */}
            {meta.image && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" />
                      OG Image
                    </CardTitle>
                    <div className="flex items-center gap-1">
                      {meta.imageWidth && meta.imageHeight && (
                        <Badge variant="secondary" className="text-xs font-mono">
                          {meta.imageWidth}×{meta.imageHeight}
                        </Badge>
                      )}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => window.open(meta.image!, "_blank")}
                            >
                              <ExternalLinkIcon className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Open image in new tab</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <OgImagePreview src={meta.image} alt={meta.title || "OG Image"} />
                </CardContent>
              </Card>
            )}

            {/* Meta Tags */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Meta Tags</CardTitle>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={status} />
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={handleCopyMeta}
                          >
                            <CopyIcon className={cn("h-3.5 w-3.5", copied && "text-emerald-500")} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{copied ? "Copied!" : "Copy meta tags"}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
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
              </CardContent>
            </Card>
          </div>

          {/* Right: Social Previews */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Facebook / Open Graph</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <FacebookPreview meta={meta} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Twitter / X</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <TwitterPreview meta={meta} />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── Terminal / Log Panel ─────────────────────────────────── */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2 font-mono">
              <span className="text-emerald-500">❯</span>
              Console
              {logs.length > 0 && (
                <Badge variant="secondary" className="text-xs font-mono ml-1">
                  {logs.length}
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-1">
              {status !== "idle" && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={handleCheck}
                        disabled={status === "loading"}
                      >
                        <RefreshCwIcon className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Re-check</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {logs.length > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={clearLogs}
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Clear logs</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-64 w-full">
            <div className="bg-zinc-950 dark:bg-zinc-950/80 text-zinc-100 font-mono text-xs leading-relaxed p-4 min-h-full">
              {logs.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-zinc-500">
                  <span>Paste a URL above and click Check to start…</span>
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-2 py-0.5 hover:bg-zinc-900/50 px-1 -mx-1 rounded">
                    <span className="text-zinc-600 shrink-0 select-none">{formatTime(log.timestamp)}</span>
                    <LogLevelIcon level={log.level} />
                    <span
                      className={cn(
                        "break-all",
                        log.level === "success" && "text-emerald-400",
                        log.level === "warn" && "text-amber-400",
                        log.level === "error" && "text-red-400",
                        log.level === "info" && "text-zinc-300"
                      )}
                    >
                      {log.message}
                    </span>
                  </div>
                ))
              )}
              <div ref={logEndRef} />
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
