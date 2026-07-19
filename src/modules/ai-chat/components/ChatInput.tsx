import { memo, useState, useCallback, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useHaptics } from "@/hooks/use-haptics";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowUpIcon,
  Loader2Icon,
  MicIcon,
  PaperclipIcon,
  ZapIcon,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import {
  getWebLlmModelEntry,
  type LocalLlmStatus,
  type WebLlmModelId,
} from "@/lib/local-llm/types";

interface ChatInputProps {
  onSend: (message: string) => void;
  /** Attach an image for receipt draft / OCR stub → expense preview flow. */
  onAttachImage?: (file: File) => void;
  isLoading: boolean;
  disabled?: boolean;
  selectedModel: WebLlmModelId;
  localLlmStatus: LocalLlmStatus;
  onOpenModelDialog: () => void;
  /** Compact mode for floating panel (optional). */
  compact?: boolean;
}

const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/heic,.jpg,.jpeg,.png,.webp,.gif";

export const ChatInput = memo(function ChatInput({
  onSend,
  onAttachImage,
  isLoading,
  disabled,
  selectedModel,
  localLlmStatus,
  onOpenModelDialog,
  compact = false,
}: ChatInputProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { tap } = useHaptics();

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [value]);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || isLoading || disabled) return;
    tap();
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    textareaRef.current?.focus();
  }, [value, isLoading, disabled, onSend, tap]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  const handleAttachClick = useCallback(() => {
    if (disabled || isLoading || !onAttachImage) return;
    tap();
    fileInputRef.current?.click();
  }, [disabled, isLoading, onAttachImage, tap]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file || !onAttachImage) return;
      if (!file.type.startsWith("image/") && !/\.(jpe?g|png|webp|gif|heic)$/i.test(file.name)) {
        return;
      }
      onAttachImage(file);
    },
    [onAttachImage],
  );

  const modelEntry = getWebLlmModelEntry(selectedModel);
  const modelLabel = modelEntry?.label ?? selectedModel;

  const statusColor =
    localLlmStatus.state === "ready"
      ? "bg-emerald-500"
      : localLlmStatus.state === "loading"
        ? "bg-amber-500 animate-pulse"
        : localLlmStatus.state === "error" || localLlmStatus.state === "unsupported"
          ? "bg-destructive"
          : "bg-muted-foreground/40";

  const canSend = !!value.trim() && !isLoading && !disabled;
  const canAttach = Boolean(onAttachImage) && !isLoading && !disabled;

  return (
    <div
      className={cn(
        "rounded-2xl border bg-background shadow-sm transition-all",
        "focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/15",
        !compact && "rounded-3xl shadow-md",
      )}
    >
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t("aiChat.inputPlaceholder")}
        disabled={disabled || isLoading}
        className={cn(
          "resize-none border-0 bg-transparent text-sm shadow-none",
          "focus-visible:ring-0 focus-visible:ring-offset-0",
          compact ? "min-h-[44px] px-4 pt-3 pb-1" : "min-h-[56px] px-5 pt-4 pb-2 text-[15px]",
        )}
        style={{ maxHeight: compact ? "120px" : "160px", overflowY: "auto" }}
        aria-label={t("aiChat.inputAria")}
        autoComplete="off"
        spellCheck
      />

      <div
        className={cn(
          "flex items-center justify-between gap-2",
          compact ? "px-3 pb-2.5 pt-1" : "px-3 pb-3 pt-1",
        )}
      >
        <div className="flex min-w-0 items-center gap-1">
          <input
            ref={fileInputRef}
            type="file"
            accept={IMAGE_ACCEPT}
            className="sr-only"
            aria-hidden
            tabIndex={-1}
            onChange={handleFileChange}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={!canAttach}
            onClick={handleAttachClick}
            title={t("aiChat.attachImage", "Attach receipt image")}
            aria-label={t("aiChat.attachImage", "Attach receipt image")}
            className={cn(
              "h-8 w-8 shrink-0 rounded-full text-muted-foreground",
              !canAttach && "opacity-50",
            )}
          >
            <PaperclipIcon size={16} />
          </Button>

          <button
            type="button"
            onClick={onOpenModelDialog}
            disabled={localLlmStatus.state === "unsupported"}
            aria-label={t("aiChat.selectModelAria")}
            className={cn(
              "inline-flex max-w-[160px] items-center gap-1.5 rounded-full border px-2.5 py-1",
              "text-[11px] font-medium text-muted-foreground",
              "transition-colors hover:bg-muted hover:text-foreground",
              "disabled:pointer-events-none disabled:opacity-40",
            )}
          >
            {localLlmStatus.state === "loading" ? (
              <Loader2Icon size={10} className="animate-spin shrink-0" />
            ) : (
              <>
                <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", statusColor)} aria-hidden />
                <ZapIcon size={10} className="shrink-0" />
              </>
            )}
            <span className="truncate">{modelLabel}</span>
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled
            title={t("aiChat.comingSoon")}
            aria-label={t("aiChat.micComingSoon")}
            className="h-8 w-8 rounded-full text-muted-foreground opacity-50"
          >
            <MicIcon size={16} />
          </Button>

          <Button
            size="icon"
            onClick={handleSubmit}
            disabled={!canSend}
            className={cn(
              "h-9 w-9 shrink-0 rounded-full transition-all",
              canSend
                ? "scale-100 bg-primary text-primary-foreground shadow-sm"
                : "scale-95 opacity-40",
            )}
            aria-label={t("aiChat.sendAria")}
          >
            {isLoading ? (
              <Loader2Icon size={16} className="animate-spin" />
            ) : (
              <ArrowUpIcon size={16} />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
});
