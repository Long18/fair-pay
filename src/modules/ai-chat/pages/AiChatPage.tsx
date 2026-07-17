import { memo, useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useGetIdentity } from "@refinedev/core";
import { loadModel } from "@/lib/local-llm/client";
import type { WebLlmModelId } from "@/lib/local-llm/types";
import { Button } from "@/components/ui/button";
import {
  FairPayIcon,
  MenuIcon,
  MessageSquareIcon,
  SparklesIcon,
  Trash2Icon,
} from "@/components/ui/icons";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useHaptics } from "@/hooks/use-haptics";
import type { Profile } from "@/modules/profile/types";
import { useAiChatContext } from "../AiChatContext";
import { ChatEmptyState } from "../components/ChatEmptyState";
import { ChatInput } from "../components/ChatInput";
import { ChatInsightsPanel } from "../components/ChatInsightsPanel";
import { ChatSidebar } from "../components/ChatSidebar";
import { ChatThread } from "../components/ChatThread";
import { ModelSelectDialog } from "../components/ModelSelectDialog";

type ActiveTab = "chat" | "insights";

function firstNameFrom(fullName?: string | null): string | undefined {
  if (!fullName?.trim()) return undefined;
  return fullName.trim().split(/\s+/)[0];
}

export const AiChatPage = memo(function AiChatPage() {
  const { t } = useTranslation();
  const { data: identity } = useGetIdentity<Profile>();
  const { tap } = useHaptics();
  const {
    messages,
    isLoading,
    conversationId,
    conversations,
    pendingPreview,
    localLlmStatus,
    selectedModel,
    selectLocalModel,
    sendMessage,
    clearChat,
    newChat,
    selectConversation,
    deleteConversation,
  } = useAiChatContext();

  const [modelDialogOpen, setModelDialogOpen] = useState(false);
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("chat");

  const inputDisabled =
    isLoading || Boolean(pendingPreview) || localLlmStatus.state === "unsupported";

  const isEmpty = messages.length === 0 && !pendingPreview;

  const pills = useMemo(
    () => [
      { key: "balances", label: t("aiChat.pills.balances"), prompt: t("aiChat.suggestions.whoOwes") },
      {
        key: "expense",
        label: t("aiChat.pills.expense"),
        prompt: t("aiChat.suggestions.dinnerExpense"),
      },
      {
        key: "groups",
        label: t("aiChat.pills.groups"),
        prompt: t("aiChat.suggestions.groupsAttention"),
      },
      {
        key: "settle",
        label: t("aiChat.pills.settle"),
        prompt: t("aiChat.suggestions.recentActivity"),
      },
    ],
    [t],
  );

  const handleSelectAndLoad = useCallback(
    async (model: WebLlmModelId) => {
      tap();
      selectLocalModel(model);
      await loadModel(model);
    },
    [selectLocalModel, tap],
  );

  const handleSuggestion = useCallback(
    (prompt: string) => {
      tap();
      setActiveTab("chat");
      setMobileHistoryOpen(false);
      void sendMessage(prompt);
    },
    [sendMessage, tap],
  );

  const handleSelectConversation = useCallback(
    (id: string) => {
      selectConversation(id);
      setActiveTab("chat");
      setMobileHistoryOpen(false);
    },
    [selectConversation],
  );

  const handleNewChat = useCallback(() => {
    tap();
    newChat();
    setActiveTab("chat");
    setMobileHistoryOpen(false);
  }, [newChat, tap]);

  const sidebarProps = {
    conversations,
    activeId: conversationId,
    onSelect: handleSelectConversation,
    onDelete: deleteConversation,
    onNewChat: handleNewChat,
  };

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] md:min-h-[calc(100dvh-5rem)] flex-col bg-background">
      <div className="flex min-h-0 flex-1 overflow-hidden border-t">
        {/* Desktop sidebar */}
        <div className="hidden w-[280px] shrink-0 lg:block xl:w-[300px]">
          <ChatSidebar {...sidebarProps} />
        </div>

        {/* Main pane */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2.5 sm:px-4">
            <div className="flex min-w-0 items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 rounded-xl lg:hidden"
                onClick={() => {
                  tap();
                  setMobileHistoryOpen(true);
                }}
                aria-label={t("aiChat.chatHistory")}
              >
                <MenuIcon size={18} />
              </Button>
              <FairPayIcon size={18} className="hidden rounded-sm sm:block shrink-0" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold leading-tight">
                  {t("aiChat.title")}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {t("aiChat.subtitle")}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <div className="mr-1 inline-flex rounded-full bg-muted p-[3px]">
                {(["chat", "insights"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => {
                      tap();
                      setActiveTab(tab);
                    }}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold transition-all",
                      activeTab === tab
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    aria-current={activeTab === tab ? "page" : undefined}
                  >
                    {tab === "chat" ? (
                      <MessageSquareIcon size={12} />
                    ) : (
                      <SparklesIcon size={12} />
                    )}
                    <span className="hidden sm:inline">
                      {tab === "chat" ? t("aiChat.tabs.chat") : t("aiChat.tabs.insights")}
                    </span>
                  </button>
                ))}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  tap();
                  clearChat();
                }}
                disabled={messages.length === 0 && !pendingPreview}
                aria-label={t("aiChat.clearChat")}
                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive"
              >
                <Trash2Icon size={14} />
              </Button>
            </div>
          </header>

          {activeTab === "chat" ? (
            <>
              <ChatThread
                emptyState={
                  <ChatEmptyState firstName={firstNameFrom(identity?.full_name)} />
                }
              />

              <div className="shrink-0 border-t bg-background/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-sm sm:px-4">
                <div className="mx-auto max-w-3xl space-y-3">
                  {isEmpty && (
                    <div className="flex flex-wrap justify-center gap-2 animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
                      {pills.map((pill) => (
                        <button
                          key={pill.key}
                          type="button"
                          onClick={() => handleSuggestion(pill.prompt)}
                          disabled={inputDisabled}
                          className={cn(
                            "rounded-full border bg-background px-3.5 py-1.5 text-xs font-medium text-foreground",
                            "transition-colors hover:border-primary/40 hover:bg-primary/5",
                            "disabled:pointer-events-none disabled:opacity-40",
                          )}
                        >
                          {pill.label}
                        </button>
                      ))}
                    </div>
                  )}
                  <ChatInput
                    onSend={sendMessage}
                    isLoading={isLoading}
                    disabled={inputDisabled}
                    selectedModel={selectedModel}
                    localLlmStatus={localLlmStatus}
                    onOpenModelDialog={() => {
                      tap();
                      setModelDialogOpen(true);
                    }}
                  />
                  {pendingPreview && (
                    <p className="text-center text-xs text-muted-foreground">
                      {t("aiChat.pendingPreview")}
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="min-h-0 flex-1 overflow-hidden">
              <ChatInsightsPanel
                onAskPrompt={(prompt) => {
                  setActiveTab("chat");
                  setTimeout(() => handleSuggestion(prompt), 120);
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Mobile history drawer */}
      <Sheet open={mobileHistoryOpen} onOpenChange={setMobileHistoryOpen}>
        <SheetContent side="left" className="w-[min(100%,320px)] p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>{t("aiChat.chatHistory")}</SheetTitle>
          </SheetHeader>
          <ChatSidebar {...sidebarProps} />
        </SheetContent>
      </Sheet>

      <ModelSelectDialog
        open={modelDialogOpen}
        onOpenChange={setModelDialogOpen}
        selectedModel={selectedModel}
        localLlmStatus={localLlmStatus}
        onSelectAndLoad={handleSelectAndLoad}
      />
    </div>
  );
});

export default AiChatPage;
