/**
 * Shared context so ChatFAB and ChatPanel read from one useAiChat instance
 * without prop-drilling or duplicate worker spawns.
 */
import { createContext, useContext, useMemo, useRef, useState, useEffect, type ReactNode } from "react";
import { useAiChat } from "./hooks/use-ai-chat";

type AiChatCtx = ReturnType<typeof useAiChat> & {
  /** True for ~1.4 s after isLoading transitions false — drives FAB "done" flash. */
  fabDone: boolean;
};

const AiChatContext = createContext<AiChatCtx | null>(null);

export function AiChatProvider({ children }: { children: ReactNode }) {
  const chat = useAiChat();
  const [fabDone, setFabDone] = useState(false);
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

  const value = useMemo<AiChatCtx>(() => ({ ...chat, fabDone }), [chat, fabDone]);

  return <AiChatContext.Provider value={value}>{children}</AiChatContext.Provider>;
}

export function useAiChatContext(): AiChatCtx {
  const ctx = useContext(AiChatContext);
  if (!ctx) throw new Error("useAiChatContext must be used inside <AiChatProvider>");
  return ctx;
}
