"use client";

import { NavBar } from "@/components/refine-ui/layout/navbar";
import { Footer } from "@/components/refine-ui/layout/footer";
import { ThemeProvider } from "@/components/refine-ui/theme/theme-provider";
import ExternalAgentSubmissionInbox from "@/components/agent/ExternalAgentSubmissionInbox";
import { cn } from "@/lib/utils";
import { AiChatProvider } from "@/modules/ai-chat/AiChatContext";
import { ChatFAB } from "@/modules/ai-chat/components/ChatFAB";
import type { PropsWithChildren } from "react";
import { useLocation } from "react-router";

export function Layout({ children }: PropsWithChildren) {
  const location = useLocation();
  const isAiChat = location.pathname === "/ai-chat";

  return (
    <ThemeProvider>
      <AiChatProvider>
        <div className="flex flex-col min-h-screen">
          <NavBar />
          <div
            className={cn(
              "@container/main",
              "container",
              "mx-auto",
              "relative",
              "w-full",
              "flex",
              "flex-col",
              "flex-1",
              "pt-16",
              "md:pt-20",
              isAiChat ? "px-0" : "px-4 sm:px-6",
              "viewport-transition",
            )}
          >
            {children}
            <ExternalAgentSubmissionInbox />
          </div>
          {!isAiChat && <Footer />}
          <ChatFAB />
        </div>
      </AiChatProvider>
    </ThemeProvider>
  );
}

Layout.displayName = "Layout";
