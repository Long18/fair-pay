import { useState, useCallback, useRef, useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  SearchIcon,
  Loader2Icon,
  CopyIcon,
  ExternalLinkIcon,
  ImageIcon,
  RefreshCwIcon,
  TrashIcon,
  EyeIcon,
  ChevronDownIcon,
  CodeIcon,
} from "@/components/ui/icons";
import { useAdminTranslation } from "../i18n";
import { AdminPageHeader } from "../components/AdminPageHeader";
import {
  createLog,
  isValidUrl,
  parseOgMeta,
  type CheckStatus,
  type LogEntry,
  type OgMeta,
} from "./admin-og-preview/helpers";
import {
  ConsoleLines,
  FacebookPreview,
  MetaTagList,
  OgImagePreview,
  StatusBadge,
  TwitterPreview,
} from "./admin-og-preview/parts";

type ResultTab = "social" | "checks";

const QUICK_LINKS = [
  { label: "Share Expense", path: "/share/expenses/" },
  { label: "Share Debt", path: "/share/debts/" },
  { label: "Share Group", path: "/share/groups/" },
  { label: "Share Friend", path: "/share/friends/" },
  { label: "Share Profile", path: "/share/profiles/" },
  { label: "Share Invite", path: "/share/invite?code=DEMO" },
  { label: "OG Expense", path: "/api/og/expense?id=" },
  { label: "OG Debt", path: "/api/og/debt?counterparty_id=" },
];

function IconAction({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function MetaPanel({
  meta,
  status,
  copied,
  onCopyMeta,
}: {
  meta: OgMeta | null;
  status: CheckStatus;
  copied: boolean;
  onCopyMeta: () => void;
}) {
  const { tAdmin } = useAdminTranslation();

  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card">
      <div className="flex h-11 shrink-0 items-center justify-between gap-2 border-b px-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <CodeIcon className="h-4 w-4 text-muted-foreground" />
          {tAdmin("ogPreview.metaTags")}
        </h3>
        <div className="flex items-center gap-1">
          <StatusBadge status={status} />
          {meta?.imageWidth && meta.imageHeight ? (
            <Badge variant="secondary" className="font-mono text-xs">
              {meta.imageWidth}×{meta.imageHeight}
            </Badge>
          ) : null}
          {meta?.image ? (
            <IconAction label={tAdmin("ogPreview.openImage")} onClick={() => window.open(meta.image!, "_blank")}>
              <ExternalLinkIcon className="h-3.5 w-3.5" />
            </IconAction>
          ) : null}
          {meta ? (
            <IconAction
              label={copied ? tAdmin("ogPreview.copied") : tAdmin("ogPreview.copyMeta")}
              onClick={onCopyMeta}
            >
              <CopyIcon className={cn("h-3.5 w-3.5", copied && "text-[var(--status-success-foreground)]")} />
            </IconAction>
          ) : null}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">
        {meta ? (
          <div className="space-y-3">
            {meta.image ? (
              <div className="mx-auto max-w-md">
                <OgImagePreview src={meta.image} alt={meta.title || "OG Image"} />
              </div>
            ) : null}
            <MetaTagList meta={meta} />
          </div>
        ) : (
          <div className="flex h-full min-h-40 flex-col items-center justify-center gap-2 text-center">
            <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
            <p className="text-sm font-medium">{tAdmin("layout.devtoolTools.og.emptyTitle")}</p>
            <p className="max-w-xs text-xs text-muted-foreground">{tAdmin("ogPreview.pasteUrlPrompt")}</p>
          </div>
        )}
      </div>
    </section>
  );
}

export function AdminOgPreview({ embedded = false }: { embedded?: boolean }) {
  const { tAdmin } = useAdminTranslation();
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<CheckStatus>("idle");
  const [meta, setMeta] = useState<OgMeta | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [copied, setCopied] = useState(false);
  const [resultTab, setResultTab] = useState<ResultTab>("checks");
  const logScrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addLog = useCallback((level: LogEntry["level"], message: string) => {
    setLogs((prev) => [...prev, createLog(level, message)]);
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const finish = useCallback((next: "success" | "error") => {
    setStatus(next);
    setResultTab(next === "success" ? "social" : "checks");
  }, []);

  const handleCheck = useCallback(async () => {
    const trimmed = url.trim();
    if (!trimmed) return;

    if (!isValidUrl(trimmed)) {
      addLog("error", `Invalid URL: "${trimmed}". Must start with http:// or https://`);
      setResultTab("checks");
      return;
    }

    setStatus("loading");
    setMeta(null);
    clearLogs();
    setResultTab("checks");

    addLog("info", `Fetching: ${trimmed}`);
    // Must match api/_lib/bots.ts BOT_PATTERNS (facebookexternalhit)
    const crawlerUserAgent = "facebookexternalhit/1.1";

    try {
      // Do not follow redirects — share pages may 301/302, and we want THIS response's OG.
      const response = await fetch(trimmed, {
        redirect: "manual",
        headers: { "User-Agent": crawlerUserAgent },
      });

      addLog("info", `User-Agent: ${crawlerUserAgent}`);
      addLog("info", `HTTP ${response.status} ${response.statusText}`);

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        addLog(
          "warn",
          location
            ? `HTTP redirect offered → ${location} (not followed; parsing this response body if any)`
            : "HTTP redirect offered without Location (not followed)",
        );
      }

      // opaque-redirect responses may have no body; still attempt to read
      if (response.status === 0) {
        addLog("error", "Opaque redirect response — cannot read body. Try a FairPay /share/ URL.");
        finish("error");
        return;
      }

      if (!response.ok && !(response.status >= 300 && response.status < 400)) {
        addLog("error", `Request failed with status ${response.status}`);
        finish("error");
        return;
      }

      const contentType = response.headers.get("content-type") || "";
      addLog("info", `Content-Type: ${contentType}`);

      const html = await response.text();
      addLog("info", `Response size: ${(html.length / 1024).toFixed(1)} KB`);

      if (/http-equiv=["']?refresh/i.test(html)) {
        addLog(
          "warn",
          "HTML contains meta-refresh redirect — parsing THIS page’s OG (not following refresh target). Bots on /share/* should not receive meta-refresh after the share OG fix.",
        );
      }

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

      finish("success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      addLog("error", `Fetch failed: ${message}`);

      if (message.includes("CORS") || message.includes("Failed to fetch")) {
        addLog("info", "Tip: CORS errors are common for external URLs. Try with a FairPay share link.");
      }

      finish("error");
    }
  }, [url, addLog, clearLogs, finish]);

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

  const prevLogCount = useRef(0);
  useEffect(() => {
    if (logs.length !== prevLogCount.current) {
      prevLogCount.current = logs.length;
      requestAnimationFrame(() => {
        const el = logScrollRef.current;
        el?.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      });
    }
  }, [logs.length]);

  return (
    <TooltipProvider>
      <div className="space-y-3">
        {!embedded ? (
          <AdminPageHeader title={tAdmin("ogPreview.title")} description={tAdmin("ogPreview.subtitle")} />
        ) : null}

        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              type="url"
              placeholder="https://long-pay.vercel.app/api/share/expense?id=..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-9 pl-9 font-mono text-sm"
              aria-label="URL to check"
            />
          </div>
          <Button
            onClick={handleCheck}
            disabled={status === "loading" || !url.trim()}
            className="h-9 gap-2 px-4"
            aria-label={tAdmin("ogPreview.check")}
          >
            {status === "loading" ? (
              <Loader2Icon className="h-4 w-4 animate-spin" />
            ) : (
              <EyeIcon className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">{tAdmin("ogPreview.check")}</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-9 gap-1.5 px-3">
                <span className="hidden md:inline">{tAdmin("layout.devtoolTools.og.quickTest")}</span>
                <span className="md:hidden" aria-hidden="true">/share</span>
                <ChevronDownIcon className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {QUICK_LINKS.map((item) => (
                <DropdownMenuItem
                  key={item.path}
                  onSelect={() => {
                    setUrl(`${window.location.origin}${item.path}`);
                    requestAnimationFrame(() => inputRef.current?.focus());
                  }}
                  className="flex-col items-start gap-0"
                >
                  <span className="text-sm">{item.label}</span>
                  <span className="font-mono text-[11px] text-muted-foreground">{item.path}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="grid gap-3 lg:h-[calc(100dvh-var(--admin-nav-h)-12rem)] lg:min-h-[28rem] lg:grid-cols-2">
          <MetaPanel meta={meta} status={status} copied={copied} onCopyMeta={handleCopyMeta} />

          <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card">
            <Tabs
              value={resultTab}
              onValueChange={(value) => setResultTab(value as ResultTab)}
              className="min-h-0 flex-1 gap-0"
            >
              <div className="flex h-11 shrink-0 items-center justify-between gap-2 border-b px-3">
                <TabsList className="h-8">
                  <TabsTrigger value="social" className="px-2.5 text-xs" disabled={!meta}>
                    {tAdmin("layout.devtoolTools.og.tabSocial")}
                  </TabsTrigger>
                  <TabsTrigger value="checks" className="px-2.5 font-mono text-xs">
                    <span className="text-zinc-400" aria-hidden="true">❯</span>
                    {tAdmin("ogPreview.console")}
                    {logs.length > 0 ? (
                      <Badge variant="secondary" className="h-4 px-1 font-mono text-[10px]">
                        {logs.length}
                      </Badge>
                    ) : null}
                  </TabsTrigger>
                </TabsList>
                <div className="flex items-center gap-1">
                  {status !== "idle" ? (
                    <IconAction
                      label={tAdmin("ogPreview.recheck")}
                      onClick={handleCheck}
                      disabled={status === "loading"}
                    >
                      <RefreshCwIcon className="h-3.5 w-3.5" />
                    </IconAction>
                  ) : null}
                  {logs.length > 0 ? (
                    <IconAction label={tAdmin("ogPreview.clearLogs")} onClick={clearLogs}>
                      <TrashIcon className="h-3.5 w-3.5" />
                    </IconAction>
                  ) : null}
                </div>
              </div>
              <TabsContent value="social" className="min-h-0 overflow-y-auto overscroll-contain p-3">
                {meta ? (
                  <div className="grid gap-4 2xl:grid-cols-2">
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground">Facebook / Open Graph</p>
                      <FacebookPreview meta={meta} />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground">Twitter / X</p>
                      <TwitterPreview meta={meta} />
                    </div>
                  </div>
                ) : null}
              </TabsContent>
              <TabsContent value="checks" className="flex min-h-0 flex-col">
                <div
                  ref={logScrollRef}
                  className="h-64 min-h-0 flex-1 overflow-y-auto overscroll-contain bg-zinc-950 p-3 font-mono text-xs leading-relaxed text-zinc-100 lg:h-auto dark:bg-zinc-950/80"
                >
                  <ConsoleLines logs={logs} emptyLabel={tAdmin("ogPreview.pasteUrlPrompt")} />
                </div>
              </TabsContent>
            </Tabs>
          </section>
        </div>
      </div>
    </TooltipProvider>
  );
}
