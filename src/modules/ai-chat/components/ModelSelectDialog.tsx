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
  StarIcon,
  Trash2Icon,
  ZapIcon,
} from "@/components/ui/icons";
import { ScrollArea } from "@/components/ui/scroll-area";
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

  // Reset pending selection and re-check cache each time dialog opens.
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

  // Derive the CTA button label based on pending model state.
  const ctaLabel = useMemo(() => {
    if (pendingModel === loadedModelId && localLlmStatus.state === "ready") {
      return t("aiChat.modelPicker.alreadyLoaded");
    }
    if (cachedModels.has(pendingModel)) {
      return t("aiChat.modelPicker.loadCached");
    }
    return t("aiChat.modelPicker.downloadAndLoad");
  }, [pendingModel, loadedModelId, localLlmStatus.state, cachedModels, t]);

  const ctaDisabled =
    pendingModel === loadedModelId && localLlmStatus.state === "ready";

  const cachedCount = cachedModels.size;

  // Filter by search across label, family, id.
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

  const handleDeleteCache = useCallback(
    async (modelId: string, e: React.MouseEvent) => {
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
    },
    [],
  );

  const handleConfirm = useCallback(() => {
    onSelectAndLoad(pendingModel);
    onOpenChange(false);
  }, [pendingModel, onSelectAndLoad, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/*
       * overflow-hidden is required to override the base DialogContent's overflow-y-auto.
       * Without it the entire dialog scrolls, making the footer float over the list.
       * The inner ScrollArea handles scrolling for the model list only.
       */}
      <DialogContent className="flex max-h-[90dvh] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:max-w-[560px]">
        <DialogHeader className="shrink-0 border-b px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="flex items-center gap-2 text-base">
              <ZapIcon size={16} className="shrink-0 text-primary" />
              {t("aiChat.modelPicker.title")}
            </DialogTitle>
            {/* Currently loaded model badge */}
            {loadedModelId && (
              <Badge
                variant="outline"
                className={cn(
                  "shrink-0 text-xs font-normal",
                  localLlmStatus.state === "ready"
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
                    : "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400",
                )}
              >
                {localLlmStatus.state === "loading" ? (
                  <Loader2Icon size={10} className="mr-1 animate-spin" />
                ) : (
                  <CheckCircleIcon size={10} className="mr-1" />
                )}
                {WEB_LLM_MODEL_LIST.find((m) => m.id === loadedModelId)?.label ??
                  loadedModelId}
              </Badge>
            )}
          </div>

          {/* Search input */}
          <div className="relative mt-2">
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("aiChat.modelPicker.searchPlaceholder")}
              className={cn(
                "w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
                "placeholder:text-muted-foreground",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
                "transition-colors",
              )}
            />
          </div>
        </DialogHeader>

        {/* Model list — this is the only scrollable region */}
        <ScrollArea className="min-h-0 flex-1">
          <div className="px-2 py-2">
            {groupedModels.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {t("aiChat.modelPicker.noResults")}
              </p>
            )}

            {groupedModels.map(({ family, models }) => (
              <div key={family} className="mb-3">
                {/* Family header with icon */}
                <div className="mb-1 flex items-center gap-1.5 px-2">
                  <LayersIcon size={11} className="shrink-0 text-muted-foreground/60" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {family}
                  </span>
                </div>

                <div className="space-y-0.5">
                  {models.map((model) => {
                    const isSelected = pendingModel === model.id;
                    const isLoaded = loadedModelId === model.id;
                    const isCached = cachedModels.has(model.id);
                    const isDeleting = deletingModels.has(model.id);

                    return (
                      <button
                        key={model.id}
                        type="button"
                        onClick={() => setPendingModel(model.id)}
                        className={cn(
                          "group flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition-colors",
                          "hover:bg-accent hover:text-accent-foreground",
                          isSelected && "bg-primary/5 ring-1 ring-inset ring-primary/20",
                          isLoaded && isSelected && "ring-emerald-500/30",
                        )}
                      >
                        {/* Selection radio */}
                        <span
                          className={cn(
                            "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                            isSelected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-muted-foreground/30",
                          )}
                        >
                          {isSelected && <CheckIcon size={10} />}
                        </span>

                        {/* Label + meta */}
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5 text-sm font-medium">
                            <span className="truncate">{model.label}</span>
                            {model.recommended && (
                              <StarIcon
                                size={11}
                                className="shrink-0 text-amber-500"
                                aria-label={t("aiChat.modelPicker.recommended")}
                              />
                            )}
                            {isLoaded && (
                              <CheckCircleIcon
                                size={11}
                                className="shrink-0 text-emerald-500"
                                aria-label="Currently loaded"
                              />
                            )}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <span>
                              {t("aiChat.modelPicker.contextLength", {
                                k: Math.round(model.contextLength / 1024),
                              })}
                            </span>
                            <span>·</span>
                            <span>{model.quantization}</span>
                          </span>
                        </span>

                        {/* Right side: VRAM + cache + delete */}
                        <span className="flex shrink-0 items-center gap-1">
                          {/* VRAM badge with icon */}
                          <span className="flex items-center gap-0.5">
                            {model.lowResource && (
                              <Badge
                                variant="secondary"
                                className="h-4 px-1 py-0 text-[9px] leading-none"
                              >
                                {t("aiChat.modelPicker.lowVram")}
                              </Badge>
                            )}
                            <Badge
                              variant="outline"
                              className="h-4 px-1 py-0 text-[9px] leading-none text-muted-foreground"
                            >
                              {formatVram(model.vramMB)}
                            </Badge>
                          </span>

                          {/* Cache state indicator */}
                          {checkingCache ? (
                            <span className="h-4 w-4 animate-pulse rounded bg-muted" />
                          ) : isCached ? (
                            <DownloadIcon
                              size={12}
                              className="shrink-0 text-emerald-500"
                              aria-label={t("aiChat.modelPicker.cached")}
                            />
                          ) : null}

                          {/* Delete cache button — visible on hover when cached */}
                          {isCached && (
                            <button
                              type="button"
                              onClick={(e) => void handleDeleteCache(model.id, e)}
                              disabled={isDeleting}
                              aria-label={t("aiChat.modelPicker.deleteCache")}
                              className={cn(
                                "flex h-5 w-5 items-center justify-center rounded text-muted-foreground",
                                "opacity-0 transition-opacity group-hover:opacity-100",
                                "hover:bg-destructive/10 hover:text-destructive",
                                "focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                                isDeleting && "opacity-100",
                              )}
                            >
                              {isDeleting ? (
                                <Loader2Icon size={11} className="animate-spin" />
                              ) : (
                                <Trash2Icon size={11} />
                              )}
                            </button>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Footer — shrink-0 ensures it never scrolls with the list */}
        <DialogFooter className="shrink-0 border-t px-4 py-3">
          <div className="flex w-full items-center justify-between gap-2">
            {/* Downloaded count */}
            <span className="text-xs text-muted-foreground">
              {checkingCache
                ? t("aiChat.modelPicker.checkingCache")
                : cachedCount > 0
                  ? t("aiChat.modelPicker.modelsDownloaded", { count: cachedCount })
                  : t("aiChat.modelPicker.noModelsDownloaded")}
            </span>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirm}
                disabled={ctaDisabled}
              >
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
