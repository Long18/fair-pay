import { memo, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MessageSquareIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { useHaptics } from "@/hooks/use-haptics";
import type { Conversation } from "../utils/chat-storage";
import {
  filterConversations,
  groupConversations,
  type ConversationGroupKey,
} from "../utils/group-conversations";

interface ChatSidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNewChat: () => void;
  /** Match AiChatView chrome + orchestrator (vi/en) when app locale differs. */
  language?: string;
  className?: string;
}

const GROUP_I18N: Record<ConversationGroupKey, string> = {
  today: "aiChat.sidebar.today",
  yesterday: "aiChat.sidebar.yesterday",
  previous7Days: "aiChat.sidebar.previous7Days",
  older: "aiChat.sidebar.older",
};

function formatSidebarDate(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(date);
}

export const ChatSidebar = memo(function ChatSidebar({
  conversations,
  activeId,
  onSelect,
  onDelete,
  onNewChat,
  language,
  className,
}: ChatSidebarProps) {
  const { t, i18n } = useTranslation(undefined, language ? { lng: language } : undefined);
  const { tap } = useHaptics();
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const filtered = filterConversations(conversations, query);
    return groupConversations(filtered);
  }, [conversations, query]);

  const isSearchEmpty = groups.length === 0;
  const showSearchEmpty = query.trim().length > 0 && isSearchEmpty;

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 w-full flex-col border-r border-border/60 bg-muted/25",
        className,
      )}
    >
      <div className="shrink-0 space-y-2.5 border-b border-border/60 p-3">
        <Button
          type="button"
          variant="outline"
          className="h-9 w-full justify-start gap-2 rounded-xl border-border/60 shadow-none"
          onClick={() => {
            tap();
            onNewChat();
          }}
        >
          <PlusIcon size={15} />
          {t("aiChat.newChat")}
        </Button>
        <div className="relative">
          <SearchIcon
            size={14}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("aiChat.sidebar.searchPlaceholder")}
            className="h-9 rounded-xl border-border/60 bg-card pl-8 text-sm shadow-none"
            aria-label={t("aiChat.sidebar.searchPlaceholder")}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {showSearchEmpty ? (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">
            {t("aiChat.sidebar.noSearchResults")}
          </p>
        ) : isSearchEmpty ? (
          <div className="mx-1 flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/60 bg-card/40 px-3 py-8 text-center">
            <MessageSquareIcon size={20} className="text-muted-foreground/70" />
            <p className="text-sm font-medium text-foreground">{t("aiChat.noPreviousChats")}</p>
            <p className="max-w-[200px] text-[11px] leading-snug text-muted-foreground">
              {t("aiChat.sidebar.emptyHint")}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <div key={group.key} className="space-y-1">
                <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t(GROUP_I18N[group.key])}
                </p>
                <ul className="space-y-0.5">
                  {group.conversations.map((conv) => {
                    const active = conv.id === activeId;
                    return (
                      <li key={conv.id}>
                        <div
                          className={cn(
                            "group flex items-center gap-1 rounded-xl border transition-colors",
                            active
                              ? "border-border/60 bg-card text-foreground shadow-none"
                              : "border-transparent text-muted-foreground hover:border-border/40 hover:bg-muted/50 hover:text-foreground",
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              tap();
                              onSelect(conv.id);
                            }}
                            className="min-w-0 flex-1 px-2.5 py-2 text-left"
                          >
                            <span className="flex items-center gap-1.5 truncate text-sm font-medium">
                              {active ? (
                                <PencilIcon size={12} className="shrink-0 text-primary" />
                              ) : null}
                              <span className="truncate">{conv.title || t("aiChat.title")}</span>
                            </span>
                            <span className="block truncate pl-0 text-[10px] text-muted-foreground">
                              {formatSidebarDate(conv.createdAt, i18n.language)}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              tap();
                              onDelete(conv.id);
                            }}
                            aria-label={t("aiChat.deleteChat")}
                            className="mr-1 rounded-lg p-1.5 opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100"
                          >
                            <Trash2Icon size={13} />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
});
