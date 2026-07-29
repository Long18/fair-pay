import { memo, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MessageSquareIcon,
  PencilIcon,
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
  className,
}: ChatSidebarProps) {
  const { t, i18n } = useTranslation();
  const { tap } = useHaptics();
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const filtered = filterConversations(conversations, query);
    return groupConversations(filtered);
  }, [conversations, query]);

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 w-full flex-col border-r bg-muted/20",
        className,
      )}
    >
      <div className="shrink-0 space-y-3 border-b p-3">
        <Button
          type="button"
          className="w-full justify-start gap-2 rounded-xl"
          onClick={() => {
            tap();
            onNewChat();
          }}
        >
          <PencilIcon size={15} />
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
            className="h-9 rounded-xl pl-8 text-sm"
            aria-label={t("aiChat.sidebar.searchPlaceholder")}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {groups.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-3 py-10 text-center text-muted-foreground">
            <MessageSquareIcon size={22} className="opacity-50" />
            <p className="text-xs">{t("aiChat.noPreviousChats")}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <div key={group.key} className="space-y-1">
                <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t(GROUP_I18N[group.key])}
                </p>
                <ul className="space-y-0.5">
                  {group.conversations.map((conv) => {
                    const active = conv.id === activeId;
                    return (
                      <li key={conv.id}>
                        <div
                          className={cn(
                            "group flex items-center gap-1 rounded-xl transition-colors",
                            active
                              ? "bg-primary/10 text-foreground"
                              : "hover:bg-muted/80 text-muted-foreground hover:text-foreground",
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
                            <span className="block truncate text-sm font-medium">
                              {conv.title || t("aiChat.title")}
                            </span>
                            <span className="block truncate text-[10px] text-muted-foreground">
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
