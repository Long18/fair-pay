import { memo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { MessageSquareIcon, Trash2Icon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import type { Conversation } from "../utils/chat-storage";

interface ChatHistoryDialogProps {
  open: boolean;
  onClose: () => void;
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

/** Format a timestamp as a relative label: "Today", "Yesterday", or locale date. */
function relativeDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / 86_400_000);
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export const ChatHistoryDialog = memo(function ChatHistoryDialog({
  open,
  onClose,
  conversations,
  activeId,
  onSelect,
  onDelete,
}: ChatHistoryDialogProps) {
  const { t } = useTranslation();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="absolute inset-0 z-10 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="absolute inset-x-0 top-0 z-20 flex max-h-[75%] flex-col rounded-b-xl border-b bg-background shadow-lg">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
          <span className="text-sm font-semibold">{t("aiChat.chatHistory")}</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close history"
          >
            ✕
          </button>
        </div>

        {/* List */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
              <MessageSquareIcon size={32} className="opacity-30" />
              <p>{t("aiChat.noPreviousChats")}</p>
            </div>
          ) : (
            <ul className="py-2">
              {conversations.map((conv) => {
                const isActive = conv.id === activeId;
                const isDeleting = deletingId === conv.id;
                const preview = conv.messages.find((m) => m.role === "assistant")?.content ?? "";
                const previewText = preview.replace(/<think>[\s\S]*?<\/think>/g, "").replace(/\{"type":"final","content":"([\s\S]*?)"\}/, "$1").trim();

                return (
                  <li key={conv.id}>
                    <div
                      className={cn(
                        "group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/60 cursor-pointer",
                        isActive && "bg-muted",
                      )}
                      onClick={() => { onSelect(conv.id); onClose(); }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") { onSelect(conv.id); onClose(); }
                      }}
                    >
                      {/* Icon */}
                      <MessageSquareIcon
                        size={16}
                        className={cn("mt-0.5 shrink-0", isActive ? "text-primary" : "text-muted-foreground/50")}
                      />

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <p className={cn("truncate text-[13px] font-medium leading-tight", isActive && "text-primary")}>
                          {conv.title || t("aiChat.newChat")}
                        </p>
                        {previewText && (
                          <p className="mt-0.5 truncate text-[11px] text-muted-foreground/70">
                            {previewText.slice(0, 80)}
                          </p>
                        )}
                        <p className="mt-0.5 text-[11px] text-muted-foreground/50 tabular-nums">
                          {relativeDate(conv.updatedAt)}
                          {" · "}
                          {conv.messages.filter(m => m.role !== "system").length} msgs
                        </p>
                      </div>

                      {/* Delete button */}
                      <Collapsible open={isDeleting}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingId(isDeleting ? null : conv.id);
                          }}
                          aria-label={t("aiChat.deleteChat")}
                          className="shrink-0 rounded p-1 text-muted-foreground/40 opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                        >
                          <Trash2Icon size={14} />
                        </button>
                        <CollapsibleContent>
                          <div className="mt-1 flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-xs"
                              onClick={() => setDeletingId(null)}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              className="h-6 px-2 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(conv.id);
                                setDeletingId(null);
                              }}
                            >
                              {t("aiChat.deleteChat")}
                            </Button>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  );
});

export default ChatHistoryDialog;
