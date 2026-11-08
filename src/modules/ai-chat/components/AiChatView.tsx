import { memo, useCallback, useMemo, useState } from "react";
import { isWeakExpenseChatModel } from "@/lib/local-llm/types";
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
import { useAiChatDisplayLanguage } from "../hooks/use-ai-chat-display-language";
import { ChatEmptyState } from "./ChatEmptyState";
import { ChatInput } from "./ChatInput";
import { ChatInsightsPanel } from "./ChatInsightsPanel";
import { ChatSidebar } from "./ChatSidebar";
import { ChatThread } from "./ChatThread";
import { ModelSelectDialog } from "./ModelSelectDialog";

type ActiveTab = "chat" | "insights";

function firstNameFrom(fullName?: string | null): string | undefined {
  if (!fullName?.trim()) return undefined;
  return fullName.trim().split(/\s+/)[0];
}

/** Chat UI body (sidebar + thread) sized to fill a dialog or other fixed-height shell. */
export const AiChatView = memo(function AiChatView() {
  const displayLanguage = useAiChatDisplayLanguage();
  const { t } = useTranslation(undefined, { lng: displayLanguage });
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
    attachReceiptImage,
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

  const showWeakModelWarning = useMemo(
    () => isWeakExpenseChatModel(selectedModel),
    [selectedModel],
  );

  const pills = useMemo(
    () => [
      { key: "balances", label: t("aiChat.pills.balances"), prompt: t("aiChat.suggestions.whoOwes") },
      { key: "groups", label: t("aiChat.pills.groups"), prompt: t("aiChat.suggestions.myGroups") },
      { key: "friends", label: t("aiChat.pills.friends"), prompt: t("aiChat.suggestions.myFriends") },
      { key: "spending", label: t("aiChat.pills.spending"), prompt: t("aiChat.suggestions.topSpending") },
      {
        key: "expense",
        label: t("aiChat.pills.expense"),
        prompt: t("aiChat.suggestions.dinnerExpense"),
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
    language: displayLanguage,
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <div className="hidden h-full w-[260px] shrink-0 lg:block xl:w-[280px]">
          <ChatSidebar {...sidebarProps} />
        </div>

        {/* Main pane */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border/60 px-3 py-2 pr-12 sm:px-4 sm:py-2.5 sm:pr-14">
            <div className="flex min-w-0 items-center gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0 rounded-xl border-border/60 shadow-none lg:hidden"
                onClick={() => {
                  tap();
                  setMobileHistoryOpen(true);
                }}
                aria-label={t("aiChat.chatHistory")}
              >
                <MenuIcon size={17} />
              </Button>
              <div
                className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-card shadow-none sm:flex"
                aria-hidden
              >
                <FairPayIcon size={18} className="rounded-sm" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold leading-tight sm:text-[15px]">
                  {t("aiChat.title")}
                </p>
                <p className="hidden truncate text-[11px] text-muted-foreground sm:block">
                  {t("aiChat.subtitle")}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <div className="mr-0.5 inline-flex rounded-xl border border-border/60 bg-muted/40 p-0.5">
                {(["chat", "insights"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => {
                      tap();
                      setActiveTab(tab);
                    }}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-[10px] px-2.5 py-1 text-[11px] font-semibold transition-colors sm:px-3 sm:text-[12px]",
                      activeTab === tab
                        ? "bg-card text-foreground shadow-none"
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
                  <ChatEmptyState
                    firstName={firstNameFrom(identity?.full_name)}
                    language={displayLanguage}
                  />
                }
              />

              <div className="shrink-0 border-t border-border/60 bg-background px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-4">
                <div className="mx-auto w-full max-w-3xl min-w-0 space-y-3">
                  {isEmpty && (
                    <div
                      className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 animate-in fade-in-0 slide-in-from-bottom-1 duration-300"
                      role="group"
                      aria-label={t("aiChat.quickActionsLabel")}
                    >
                      {pills.map((pill) => (
                        <button
                          key={pill.key}
                          type="button"
                          onClick={() => handleSuggestion(pill.prompt)}
                          disabled={inputDisabled}
                          className={cn(
                            "min-w-0 rounded-xl border border-border/60 bg-card px-3 py-2.5 text-left text-xs font-medium text-foreground shadow-none",
                            "transition-colors hover:border-primary/30 hover:bg-muted/40",
                            "disabled:pointer-events-none disabled:opacity-40",
                            pill.key === "balances" || pill.key === "expense"
                              ? "font-semibold"
                              : "",
                          )}
                        >
                          {pill.label}
                        </button>
                      ))}
                    </div>
                  )}
                  {showWeakModelWarning && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-100">
                      <p className="font-medium">{t("aiChat.weakModelWarning.title")}</p>
                      <p className="mt-0.5 text-[11px] opacity-90">
                        {t("aiChat.weakModelWarning.body")}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2 h-7 text-xs"
                        onClick={() => {
                          tap();
                          setModelDialogOpen(true);
                        }}
                      >
                        {t("aiChat.weakModelWarning.action")}
                      </Button>
                    </div>
                  )}
                  <ChatInput
                    onSend={sendMessage}
                    onAttachImage={attachReceiptImage}
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
