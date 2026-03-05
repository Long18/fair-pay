import { memo, useState, useCallback, useRef } from 'react';
import { useHaptics } from '@/hooks/use-haptics';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { SendIcon, Loader2Icon } from '@/components/ui/icons';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  disabled?: boolean;
}

export const ChatInput = memo(function ChatInput({ onSend, isLoading, disabled }: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { tap } = useHaptics();

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || isLoading) return;
    tap();
    onSend(trimmed);
    setValue('');
    textareaRef.current?.focus();
  }, [value, isLoading, onSend, tap]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  return (
    <div className="flex items-end gap-2 p-3 border-t bg-background">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask FairPay Assistant…"
        disabled={disabled || isLoading}
        className="min-h-[40px] max-h-[120px] resize-none text-sm"
        rows={1}
        aria-label="Chat message input"
        autoComplete="off"
        spellCheck
      />
      <Button
        size="icon"
        onClick={handleSubmit}
        disabled={!value.trim() || isLoading || disabled}
        className="shrink-0 h-11 w-11"
        aria-label="Send message"
      >
        {isLoading ? <Loader2Icon size={16} className="animate-spin" /> : <SendIcon size={16} />}
      </Button>
    </div>
  );
});
