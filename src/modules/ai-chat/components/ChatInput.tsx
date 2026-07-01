import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { useHaptics } from '@/hooks/use-haptics';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowUpIcon, Loader2Icon, ZapIcon } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import { getWebLlmModelEntry, type LocalLlmStatus, type WebLlmModelId } from '@/lib/local-llm/types';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  disabled?: boolean;
  selectedModel: WebLlmModelId;
  localLlmStatus: LocalLlmStatus;
  onOpenModelDialog: () => void;
}

export const ChatInput = memo(function ChatInput({
  onSend,
  isLoading,
  disabled,
  selectedModel,
  localLlmStatus,
  onOpenModelDialog,
}: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { tap } = useHaptics();

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [value]);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || isLoading || disabled) return;
    tap();
    onSend(trimmed);
    setValue('');
    // Reset height after clearing
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    textareaRef.current?.focus();
  }, [value, isLoading, disabled, onSend, tap]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const modelEntry = getWebLlmModelEntry(selectedModel);
  const modelLabel = modelEntry?.label ?? selectedModel;

  const statusColor =
    localLlmStatus.state === 'ready'
      ? 'bg-emerald-500'
      : localLlmStatus.state === 'loading'
        ? 'bg-amber-500 animate-pulse'
        : localLlmStatus.state === 'error' || localLlmStatus.state === 'unsupported'
          ? 'bg-destructive'
          : 'bg-muted-foreground/40';

  const canSend = !!value.trim() && !isLoading && !disabled;

  return (
    /* Outer container — single rounded card, ChatGPT/Claude style */
    <div className={cn(
      "rounded-2xl border bg-background shadow-sm transition-colors",
      "focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/30",
    )}>
      {/* Textarea — no border, sits inside the card */}
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask FairPay Assistant…"
        disabled={disabled || isLoading}
        className={cn(
          "resize-none border-0 bg-transparent text-sm shadow-none",
          "focus-visible:ring-0 focus-visible:ring-offset-0",
          "min-h-[44px] px-4 pt-3 pb-1",
        )}
        style={{ maxHeight: '120px', overflowY: 'auto' }}
        aria-label="Chat message input"
        autoComplete="off"
        spellCheck
      />

      {/* Bottom toolbar — model pill left, send button right */}
      <div className="flex items-center justify-between px-3 pb-2.5 pt-1">
        {/* Model selector pill */}
        <button
          type="button"
          onClick={onOpenModelDialog}
          disabled={localLlmStatus.state === 'unsupported'}
          aria-label="Select AI model"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1",
            "text-[11px] font-medium text-muted-foreground",
            "transition-colors hover:bg-muted hover:text-foreground",
            "disabled:pointer-events-none disabled:opacity-40",
          )}
        >
          {localLlmStatus.state === 'loading' ? (
            <Loader2Icon size={10} className="animate-spin shrink-0" />
          ) : (
            <>
              <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", statusColor)} aria-hidden />
              <ZapIcon size={10} className="shrink-0" />
            </>
          )}
          <span className="max-w-[140px] truncate">{modelLabel}</span>
        </button>

        {/* Send button — filled circle, arrow-up icon like ChatGPT */}
        <Button
          size="icon"
          onClick={handleSubmit}
          disabled={!canSend}
          className={cn(
            "h-8 w-8 shrink-0 rounded-full transition-all",
            canSend ? "opacity-100" : "opacity-40",
          )}
          aria-label="Send message"
        >
          {isLoading
            ? <Loader2Icon size={15} className="animate-spin" />
            : <ArrowUpIcon size={15} />}
        </Button>
      </div>
    </div>
  );
});
