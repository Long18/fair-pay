import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
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
  DownloadIcon,
  LayersIcon,
  Loader2Icon,
  MonitorIcon,
  StarIcon,
  Trash2Icon,
  ZapIcon,
} from "@/components/ui/icons";
import {
  checkAllModelsCached,
  deleteModelCache,
} from "@/lib/local-llm/client";
import {
  WEB_LLM_FAMILY_ORDER,
  WEB_LLM_MODEL_LIST,
  type LocalLlmStatus,
  type WebLlmModelId,
} from "@/lib/local-llm/types";
import { cn } from "@/lib/utils";

interface ModelSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedModel: WebLlmModelId;
  localLlmStatus: LocalLlmStatus;
  onSelectAndLoad: (model: WebLlmModelId) => void;
}

function formatVram(mb: number): string {
  if (mb >= 1000) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb} MB`;
}

/** A compact icon+text chip used for model metadata fields. */
function MetaChip({
  icon,
  label,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] leading-none",
        className,
      )}
    >
      {icon}
      {label}
    </span>
  );
}

export const ModelSelectDialog = memo(function ModelSelectDialog({
  open,
  onOpenChange,
  selectedModel,
  localLlmStatus,
  onSelectAndLoad,
}: ModelSelectDialogProps) {
  const { t } = useTranslation();

  const [pendingModel, setPendingModel] = useState<WebLlmModelId>(selectedModel);
  const [search, setSearch] = useState("");
  const [cachedModels, setCachedModels] = useState<Set<string>>(new Set());
  const [checkingCache, setCheckingCache] = useState(false);
  const [deletingModels, setDeletingModels] = useState<Set<string>>(new Set());
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setPendingModel(selectedModel);
    setSearch("");
    setCheckingCache(true);
    void checkAllModelsCached()
      .then(setCachedModels)
      .finally(() => setCheckingCache(false));
  }, [open, selectedModel]);

  const loadedModelId =
    localLlmStatus.state === "ready" || localLlmStatus.state === "loading"
      ? localLlmStatus.model
      : null;

  const ctaLabel = useMemo(() => {
    if (pendingModel === loadedModelId && localLlmStatus.state === "ready")
      return t("aiChat.modelPicker.alreadyLoaded");
    if (cachedModels.has(pendingModel))
      return t("aiChat.modelPicker.loadCached");
    return t("aiChat.modelPicker.downloadAndLoad");
  }, [pendingModel, loadedModelId, localLlmStatus.state, cachedModels, t]);

  const ctaDisabled =
    pendingModel === loadedModelId && localLlmStatus.state === "ready";

  const query = search.toLowerCase().trim();
  const groupedModels = useMemo(() => {
    return WEB_LLM_FAMILY_ORDER.map((family) => ({
      family,
      models: WEB_LLM_MODEL_LIST.filter(
        (m) =>
          m.family === family &&
          (query === "" ||
            m.label.toLowerCase().includes(query) ||
            m.family.toLowerCase().includes(query) ||
            m.id.toLowerCase().includes(query)),
      ),
    })).filter((g) => g.models.length > 0);
  }, [query]);

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

  const handleConfirm = useCallback(() => {
    onSelectAndLoad(pendingModel);
    onOpenChange(false);
  }, [pendingModel, onSelectAndLoad, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-w-lg flex-col gap-0 overflow-hidden p-0 sm:max-w-[560px]"
        style={{ maxHeight: "min(90dvh, 680px)" }}
      >
        {/* ── Header ── */}
        <DialogHeader className="shrink-0 border-b px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="flex items-center gap-2 text-base">
              <ZapIcon size={16} className="shrink-0 text-primary" />
              {t("aiChat.modelPicker.title")}
            </DialogTitle>

            {loadedModelId && (
              <Badge
                variant="outline"
                className={cn(
                  "shrink-0 gap-1 text-xs font-normal",
                  localLlmStatus.state === "ready"
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
                    : "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400",
                )}
              >
                {localLlmStatus.state === "loading" ? (
                  <Loader2Icon size={10} className="animate-spin" />
                ) : (
                  <CheckCircleIcon size={10} />
                )}
                {WEB_LLM_MODEL_LIST.find((m) => m.id === loadedModelId)?.label ?? loadedModelId}
              </Badge>
            )}
          </div>

          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("aiChat.modelPicker.searchPlaceholder")}
            className={cn(
              "mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
              "placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-colors",
            )}
          />
        </DialogHeader>

        {/*
         * Plain overflow div — reliable inside a flex column with a fixed max-height.
         * Radix ScrollArea doesn't always shrink correctly in this layout context.
         */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="px-2 py-2">
            {groupedModels.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {t("aiChat.modelPicker.noResults")}
              </p>
            )}

            {groupedModels.map(({ family, models }) => (
              <div key={family} className="mb-3 last:mb-1">
                {/* Family heading */}
                <div className="mb-1 flex items-center gap-1.5 px-2">
                  <LayersIcon size={10} className="shrink-0 text-muted-foreground/50" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {family}
                  </span>
                </div>

                <div className="space-y-0.5">
                  {models.map((model) => {
                    const isSelected = pendingModel === model.id;
                    const isLoaded = loadedModelId === model.id;
                    const isCached = cachedModels.has(model.id);
                    const isDeleting = deletingModels.has(model.id);
                    const ctxK = Math.round(model.contextLength / 1024);

                    return (
                      <button
                        key={model.id}
                        type="button"
                        onClick={() => setPendingModel(model.id)}
                        className={cn(
                          "group flex w-full items-start gap-2.5 rounded-lg px-2 py-2.5 text-left transition-colors",
                          "hover:bg-accent hover:text-accent-foreground",
                          isSelected && "bg-primary/5 ring-1 ring-inset ring-primary/25",
                        )}
                      >
                        {/* Radio indicator */}
                        <span
                          className={cn(
                            "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                            isSelected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-muted-foreground/30",
                          )}
                        >
                          {isSelected && <CheckIcon size={9} />}
                        </span>

                        {/* Main content */}
                        <span className="min-w-0 flex-1">
                          {/* Model name row */}
                          <span className="flex flex-wrap items-center gap-1.5">
                            <span className="text-sm font-medium leading-tight">
                              {model.label}
                            </span>
                            {model.recommended && (
                              <StarIcon
                                size={12}
                                className="shrink-0 text-amber-400"
                                aria-label={t("aiChat.modelPicker.recommended")}
                              />
                            )}
                            {isLoaded && (
                              <CheckCircleIcon
                                size={12}
                                className="shrink-0 text-emerald-500"
                                aria-label="Currently loaded"
                              />
                            )}
                          </span>

                          {/* Metadata chips — webllm.ai style: icon + value */}
                          <span className="mt-1 flex flex-wrap items-center gap-1">
                            {/* VRAM */}
                            <MetaChip
                              icon={<MonitorIcon size={9} />}
                              label={formatVram(model.vramMB)}
                              className="bg-muted/60 text-muted-foreground"
                            />

                            {/* Context window */}
                            <MetaChip
                              icon={<LayersIcon size={9} />}
                              label={`${ctxK}k ctx`}
                              className="bg-muted/60 text-muted-foreground"
                            />

                            {/* Quantization */}
                            <MetaChip
                              icon={<ZapIcon size={9} />}
                              label={model.quantization}
                              className="bg-muted/60 text-muted-foreground"
                            />

                            {/* Low VRAM badge */}
                            {model.lowResource && (
                              <MetaChip
                                icon={<CheckIcon size={9} />}
                                label={t("aiChat.modelPicker.lowVram")}
                                className="bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
                              />
                            )}

                            {/* Downloaded indicator */}
                            {checkingCache ? (
                              <span className="h-4 w-14 animate-pulse rounded bg-muted" />
                            ) : isCached ? (
                              <MetaChip
                                icon={<DownloadIcon size={9} />}
                                label={t("aiChat.modelPicker.cached")}
                                className="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                              />
                            ) : null}
                          </span>
                        </span>

                        {/* Delete cache button — reveals on hover */}
                        {isCached && (
                          <button
                            type="button"
                            onClick={(e) => void handleDeleteCache(model.id, e)}
                            disabled={isDeleting}
                            aria-label={t("aiChat.modelPicker.deleteCache")}
                            className={cn(
                              "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground transition-all",
                              "opacity-0 group-hover:opacity-100",
                              "hover:bg-destructive/10 hover:text-destructive",
                              "focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                              isDeleting && "opacity-100",
                            )}
                          >
                            {isDeleting ? (
                              <Loader2Icon size={12} className="animate-spin" />
                            ) : (
                              <Trash2Icon size={12} />
                            )}
                          </button>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Footer — always anchored at bottom ── */}
        <DialogFooter className="shrink-0 border-t px-4 py-3">
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
              <Button type="button" size="sm" onClick={handleConfirm} disabled={ctaDisabled}>
                {ctaLabel}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

export default ModelSelectDialog;
