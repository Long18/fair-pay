import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircleIcon,
  CheckIcon,
  ChevronDownIcon,
  DownloadIcon,
  LayersIcon,
  Loader2Icon,
  MonitorIcon,
  RefreshCwIcon,
  StarIcon,
  Trash2Icon,
} from "@/components/ui/icons";
import {
  checkAllModelsCached,
  deleteModelCache,
} from "@/lib/local-llm/client";
import {
  WEB_LLM_FAMILY_ORDER,
  WEB_LLM_MODEL_LIST,
  type LocalLlmStatus,
  type WebLlmModelEntry,
  type WebLlmModelFamily,
  type WebLlmModelId,
} from "@/lib/local-llm/types";
import { FAMILY_ICONS } from "@/assets/webllm-icons";
import { cn } from "@/lib/utils";

type FamilyFilter = WebLlmModelFamily | "All" | "Lightweight";

interface ModelSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedModel: WebLlmModelId;
  localLlmStatus: LocalLlmStatus;
  onSelectAndLoad: (model: WebLlmModelId) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatVram(mb: number): string {
  if (mb >= 1000) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb} MB`;
}

/** Derive a base model key from label (strips quantization hint like "(f32)"). */
function baseModelKey(entry: WebLlmModelEntry): string {
  return `${entry.family}::${entry.label.replace(/\s*\(.*?\)\s*$/, "").trim()}`;
}

/** Group flat model list into base models, each with quantization variants. */
function groupIntoBaseModels(models: readonly WebLlmModelEntry[]) {
  const map = new Map<string, { label: string; family: WebLlmModelFamily; recommended: boolean; variants: WebLlmModelEntry[] }>();
  for (const m of models) {
    const key = baseModelKey(m);
    const existing = map.get(key);
    if (existing) {
      existing.variants.push(m);
      if (m.recommended) existing.recommended = true;
    } else {
      map.set(key, {
        label: m.label.replace(/\s*\(.*?\)\s*$/, "").trim(),
        family: m.family,
        recommended: !!m.recommended,
        variants: [m],
      });
    }
  }
  return [...map.values()];
}

// ─── Component ────────────────────────────────────────────────────────────────

export const ModelSelectDialog = memo(function ModelSelectDialog({
  open,
  onOpenChange,
  selectedModel,
  localLlmStatus,
  onSelectAndLoad,
}: ModelSelectDialogProps) {
  const { t } = useTranslation();

  const [search, setSearch] = useState("");
  const [activeFamily, setActiveFamily] = useState<FamilyFilter>("Lightweight");
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [cachedModels, setCachedModels] = useState<Set<string>>(new Set());
  const [checkingCache, setCheckingCache] = useState(false);
  const [deletingModels, setDeletingModels] = useState<Set<string>>(new Set());
  const searchRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const loadedModelId =
    localLlmStatus.state === "ready" || localLlmStatus.state === "loading"
      ? localLlmStatus.model
      : null;

  useEffect(() => {
    if (!open) return;
    setSearch("");

    // Auto-expand and scroll to the active model: loaded takes priority over selected
    const targetId = loadedModelId ?? selectedModel;
    const targetEntry = WEB_LLM_MODEL_LIST.find((m) => m.id === targetId);
    if (targetEntry) {
      setActiveFamily(targetEntry.lowResource ? "Lightweight" : targetEntry.family);
      setExpandedKey(baseModelKey(targetEntry));
    } else {
      setActiveFamily("Lightweight");
      setExpandedKey(null);
    }

    setCheckingCache(true);
    void checkAllModelsCached()
      .then(setCachedModels)
      .finally(() => setCheckingCache(false));
  }, [open, loadedModelId, selectedModel]);

  // Scroll the expanded card into view and focus it after the DOM settles
  useEffect(() => {
    if (!expandedKey || !open) return;
    const timeout = setTimeout(() => {
      const el = scrollContainerRef.current?.querySelector<HTMLElement>(
        `[data-model-key="${CSS.escape(expandedKey)}"]`,
      );
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
        el.focus({ preventScroll: true });
      }
    }, 80);
    return () => clearTimeout(timeout);
  }, [expandedKey, open]);

  const loadedEntry = useMemo(
    () => WEB_LLM_MODEL_LIST.find((m) => m.id === loadedModelId),
    [loadedModelId],
  );

  // Filter by search + active family / Lightweight pill
  const filteredModels = useMemo(() => {
    const query = search.toLowerCase().trim();
    return WEB_LLM_MODEL_LIST.filter((m) => {
      if (activeFamily === "Lightweight") {
        if (!m.lowResource) return false;
      } else if (activeFamily !== "All" && m.family !== activeFamily) {
        return false;
      }
      if (
        query &&
        !m.label.toLowerCase().includes(query) &&
        !m.id.toLowerCase().includes(query) &&
        !m.family.toLowerCase().includes(query)
      ) {
        return false;
      }
      return true;
    });
  }, [search, activeFamily]);

  const baseModels = useMemo(() => groupIntoBaseModels(filteredModels), [filteredModels]);

  const handleDeleteCache = useCallback(async (modelId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingModels((prev) => new Set(prev).add(modelId));
    try {
      await deleteModelCache(modelId);
      setCachedModels((prev) => {
        const next = new Set(prev);
        next.delete(modelId);
        return next;
      });
    } finally {
      setDeletingModels((prev) => {
        const next = new Set(prev);
        next.delete(modelId);
        return next;
      });
    }
  }, []);

  const handleSelectModel = useCallback((modelId: WebLlmModelId) => {
    onSelectAndLoad(modelId);
    onOpenChange(false);
  }, [onSelectAndLoad, onOpenChange]);

  const toggleExpand = useCallback((key: string) => {
    setExpandedKey((prev) => (prev === key ? null : key));
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-w-lg flex-col gap-0 overflow-hidden p-0 sm:max-w-[620px]"
        style={{ maxHeight: "min(92dvh, 740px)" }}
      >
        {/* ── Header ── */}
        <DialogHeader className="shrink-0 px-5 pt-4 pb-3">
          <DialogTitle className="text-lg font-bold">
            {t("aiChat.modelPicker.title")}
          </DialogTitle>
        </DialogHeader>

        {/* ── Green selected model banner ── */}
        {loadedEntry && (
          <div className="mx-5 mb-3 flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-white shadow-sm">
            <CheckIcon size={14} className="shrink-0" />
            <span className="text-sm font-semibold truncate">
              {loadedEntry.label}
            </span>
          </div>
        )}

        {/* ── Search ── */}
        <div className="px-5 pb-3">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("aiChat.modelPicker.searchPlaceholder")}
              className={cn(
                "w-full rounded-lg border border-input bg-muted/40 pl-9 pr-3 py-2.5 text-sm",
                "placeholder:text-muted-foreground",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-colors",
              )}
            />
          </div>
        </div>

        {/* ── Family filter pills ── */}
        <div className="shrink-0 px-5 pb-3">
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setActiveFamily("Lightweight")}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                activeFamily === "Lightweight"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {t("aiChat.modelPicker.lightweight")}
            </button>
            <button
              type="button"
              onClick={() => setActiveFamily("All")}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                activeFamily === "All"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {t("aiChat.modelPicker.allModels")}
            </button>
            {WEB_LLM_FAMILY_ORDER.map((family) => (
              <button
                key={family}
                type="button"
                onClick={() => setActiveFamily(family)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  activeFamily === family
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <img
                  src={FAMILY_ICONS[family]}
                  alt=""
                  width={14}
                  height={14}
                  className={cn(
                    "shrink-0 rounded-sm object-contain",
                    activeFamily === family ? "brightness-0 invert" : "opacity-70",
                  )}
                />
                {family}
              </button>
            ))}
          </div>
        </div>

        {/* ── Model grid (2-column, collapsible cards) ── */}
        <div ref={scrollContainerRef} className="min-h-0 flex-1 overflow-y-auto px-5 pb-3">
          {baseModels.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t("aiChat.modelPicker.noResults")}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {baseModels.map((baseModel) => {
              const key = `${baseModel.family}::${baseModel.label}`;
              const isExpanded = expandedKey === key;
              const hasMultipleVariants = baseModel.variants.length > 1;
              const primaryVariant = baseModel.variants[0];

              return (
                <div
                  key={key}
                  data-model-key={key}
                  tabIndex={-1}
                  className={cn(
                    "rounded-xl border transition-all outline-none",
                    isExpanded
                      ? "bg-primary/5 border-primary/30 ring-1 ring-primary/20 col-span-1 sm:col-span-2"
                      : "bg-background hover:border-muted-foreground/30",
                  )}
                >
                  {/* Card header — tap to expand or select if single variant */}
                  <button
                    type="button"
                    onClick={() => {
                      if (hasMultipleVariants) {
                        toggleExpand(key);
                      } else {
                        handleSelectModel(primaryVariant.id);
                      }
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
                  >
                    <img
                      src={FAMILY_ICONS[baseModel.family]}
                      alt=""
                      width={18}
                      height={18}
                      className="shrink-0 rounded-sm object-contain"
                    />
                    <span className="flex-1 min-w-0 truncate text-sm font-medium">
                      {baseModel.label}
                    </span>
                    {baseModel.recommended && (
                      <StarIcon size={13} className="shrink-0 text-amber-400" />
                    )}
                    {hasMultipleVariants && (
                      <ChevronDownIcon
                        size={14}
                        className={cn(
                          "shrink-0 text-muted-foreground transition-transform",
                          isExpanded && "rotate-180",
                        )}
                      />
                    )}
                  </button>

                  {/* Expanded variant list */}
                  {isExpanded && (
                    <div className="border-t px-3 py-2 space-y-1.5">
                      {baseModel.variants.map((variant) => {
                        const isCached = cachedModels.has(variant.id);
                        const isLoaded = loadedModelId === variant.id;
                        const isDeleting = deletingModels.has(variant.id);
                        const ctxK = Math.round(variant.contextLength / 1024);

                        return (
                          <div
                            key={variant.id}
                            className={cn(
                              "flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs transition-colors",
                              isLoaded
                                ? "bg-emerald-50 dark:bg-emerald-950/30"
                                : "hover:bg-accent",
                            )}
                          >
                            {/* Quantization + metadata */}
                            <span className="font-mono font-medium text-muted-foreground shrink-0">
                              {variant.quantization}
                            </span>
                            <span className="inline-flex items-center gap-1 text-muted-foreground">
                              <MonitorIcon size={10} />
                              {formatVram(variant.vramMB)}
                            </span>
                            {variant.lowResource && (
                              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                {t("aiChat.modelPicker.lowVram")}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 text-muted-foreground">
                              <LayersIcon size={10} />
                              {ctxK}k ctx
                            </span>

                            <span className="flex-1" />

                            {/* Cache / status indicators */}
                            {checkingCache ? (
                              <span className="h-4 w-10 animate-pulse rounded bg-muted" />
                            ) : isCached ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                                <DownloadIcon size={10} />
                                {t("aiChat.modelPicker.onDevice")}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">
                                {t("aiChat.modelPicker.approxVram", {
                                  size: formatVram(variant.vramMB),
                                })}
                              </span>
                            )}

                            {/* Action buttons */}
                            {isLoaded ? (
                              <CheckCircleIcon size={14} className="text-emerald-500" />
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSelectModel(variant.id)}
                                className="inline-flex h-7 items-center gap-1 rounded-md border bg-background px-2 text-xs font-medium hover:bg-accent transition-colors"
                              >
                                {isCached ? (
                                  <>
                                    <RefreshCwIcon size={10} />
                                    Load
                                  </>
                                ) : (
                                  <>
                                    <DownloadIcon size={10} />
                                    Download
                                  </>
                                )}
                              </button>
                            )}

                            {/* Delete cache */}
                            {isCached && !isLoaded && (
                              <button
                                type="button"
                                onClick={(e) => void handleDeleteCache(variant.id, e)}
                                disabled={isDeleting}
                                aria-label={t("aiChat.modelPicker.deleteCache")}
                                className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                              >
                                {isDeleting ? (
                                  <Loader2Icon size={11} className="animate-spin" />
                                ) : (
                                  <Trash2Icon size={11} />
                                )}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Footer ── */}
        <DialogFooter className="shrink-0 border-t px-5 py-3">
          <div className="flex w-full items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {checkingCache
                ? t("aiChat.modelPicker.checkingCache")
                : cachedModels.size > 0
                  ? t("aiChat.modelPicker.modelsDownloaded", { count: cachedModels.size })
                  : t("aiChat.modelPicker.noModelsDownloaded")}
            </span>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                {t("common.cancel")}
              </Button>
              {loadedModelId && localLlmStatus.state === "ready" && (
                <Button type="button" size="sm" disabled>
                  {t("aiChat.modelPicker.alreadyLoaded")}
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

export default ModelSelectDialog;
