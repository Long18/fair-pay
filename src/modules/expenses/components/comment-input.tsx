import { useState, useRef, useCallback, useMemo, memo } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SendIcon, AtSignIcon } from "@/components/ui/icons";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { CommentUser } from "../types/comments";

interface CommentInputProps {
  currentUser: CommentUser | null;
  participants: CommentUser[];
  onSubmit: (content: string, mentionedUserIds: string[]) => Promise<unknown>;
  isSubmitting: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  compact?: boolean;
}

export const CommentInput = memo(({
  currentUser,
  participants,
  onSubmit,
  isSubmitting,
  placeholder,
  autoFocus = false,
  compact = false,
}: CommentInputProps) => {
  const { t } = useTranslation();
  const [content, setContent] = useState("");
  const [mentionedIds, setMentionedIds] = useState<Set<string>>(new Set());
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(async () => {
    const trimmed = content.trim();
    if (!trimmed || isSubmitting) return;
    await onSubmit(trimmed, Array.from(mentionedIds));
    setContent("");
    setMentionedIds(new Set());
  }, [content, mentionedIds, isSubmitting, onSubmit]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const insertMention = useCallback((user: CommentUser) => {
    const mention = `@${user.full_name} `;
    const textarea = textareaRef.current;
    if (textarea) {
      const pos = textarea.selectionStart;
      const before = content.substring(0, pos).replace(/@\w*$/, "");
      const after = content.substring(pos);
      setContent(before + mention + after);
    } else {
      setContent((prev) => prev + mention);
    }
    setMentionedIds((prev) => new Set(prev).add(user.id));
    setMentionOpen(false);
    setMentionFilter("");
    textareaRef.current?.focus();
  }, [content]);

  const filteredParticipants = useMemo(() => {
    if (!mentionFilter) return participants.filter((p) => p.id !== currentUser?.id);
    const lower = mentionFilter.toLowerCase();
    return participants.filter(
      (p) => p.id !== currentUser?.id && p.full_name.toLowerCase().includes(lower)
    );
  }, [participants, currentUser?.id, mentionFilter]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = val.substring(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    if (mentionMatch) {
      setMentionOpen(true);
      setMentionFilter(mentionMatch[1]);
    } else {
      setMentionOpen(false);
      setMentionFilter("");
    }
  }, []);

  const initials = currentUser?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

  return (
    <div className={cn("flex gap-2", compact ? "items-center" : "items-start")}>
      {!compact && (
        <Avatar className="h-8 w-8 shrink-0 mt-1">
          <AvatarImage src={currentUser?.avatar_url || undefined} alt={currentUser?.full_name} />
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
      )}
      <div className="flex-1 relative">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || t("expenses.comments.placeholder", "Write a comment...")}
            autoFocus={autoFocus}
            rows={compact ? 1 : 2}
            className={cn(
              "w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm",
              "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              compact ? "pr-16" : "pr-20"
            )}
            aria-label={t("expenses.comments.inputLabel", "Comment input")}
          />
          <div className="absolute right-1.5 bottom-1.5 flex items-center gap-1">
            <Popover open={mentionOpen} onOpenChange={setMentionOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setMentionOpen(true)}
                  aria-label={t("expenses.comments.mention", "Mention someone")}
                >
                  <AtSignIcon className="h-3.5 w-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent side="top" align="end" className="w-52 p-1">
                {filteredParticipants.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-2 text-center">
                    {t("expenses.comments.noParticipants", "No participants found")}
                  </p>
                ) : (
                  filteredParticipants.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-accent transition-colors cursor-pointer"
                      onClick={() => insertMention(p)}
                    >
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={p.avatar_url || undefined} />
                        <AvatarFallback className="text-[10px]">
                          {p.full_name?.[0]?.toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate">{p.full_name}</span>
                    </button>
                  ))
                )}
              </PopoverContent>
            </Popover>
            <Button
              type="button"
              size="icon"
              className="h-7 w-7"
              disabled={!content.trim() || isSubmitting}
              onClick={handleSubmit}
              aria-label={t("expenses.comments.send", "Send comment")}
            >
              <SendIcon className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});

CommentInput.displayName = "CommentInput";
