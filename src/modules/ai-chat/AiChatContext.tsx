/**
 * Shared context so ChatFAB and AiChatDialog read from one useAiChat instance
 * without prop-drilling or duplicate worker spawns.
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { useAiChat } from "./hooks/use-ai-chat";
import { journeyTracking } from "@/lib/journey-tracking";

type AiChatCtx = ReturnType<typeof useAiChat> & {
  /** True for ~1.4 s after isLoading transitions false — drives FAB "done" flash. */
  fabDone: boolean;
  isChatOpen: boolean;
  setChatOpen: (open: boolean) => void;
  openChat: () => void;
  closeChat: () => void;
};

const AiChatContext = createContext<AiChatCtx | null>(null);

export function AiChatProvider({ children }: { children: ReactNode }) {
  const chat = useAiChat();
  const [fabDone, setFabDone] = useState(false);
  const [isChatOpen, setChatOpen] = useState(false);
  const prevLoading = useRef(chat.isLoading);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Detect isLoading false→true→false cycle (a reply just finished).
    if (prevLoading.current && !chat.isLoading && chat.messages.length > 0) {
      setFabDone(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setFabDone(false), 1400);
    }
    prevLoading.current = chat.isLoading;
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [chat.isLoading, chat.messages.length]);

  const openChat = useCallback(() => {
    journeyTracking.trackEvent({
      event_name: "ai_chat_opened",
      event_category: "ai_chat",
      page_path: window.location.pathname,
      flow_name: "ai-chat",
      step_name: "open",
    });
    setChatOpen(true);
  }, []);
  const closeChat = useCallback(() => setChatOpen(false), []);

  const value = useMemo<AiChatCtx>(
    () => ({
      ...chat,
      fabDone,
      isChatOpen,
      setChatOpen,
      openChat,
      closeChat,
    }),
    [chat, fabDone, isChatOpen, openChat, closeChat],
  );

  return <AiChatContext.Provider value={value}>{children}</AiChatContext.Provider>;
}

export function useAiChatContext(): AiChatCtx {
  const ctx = useContext(AiChatContext);
  if (!ctx) throw new Error("useAiChatContext must be used inside <AiChatProvider>");
  return ctx;
}
