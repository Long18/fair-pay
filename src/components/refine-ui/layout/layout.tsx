"use client";

import { NavBar } from "@/components/refine-ui/layout/navbar";
import { Footer } from "@/components/refine-ui/layout/footer";
import { ThemeProvider } from "@/components/refine-ui/theme/theme-provider";
import ExternalAgentSubmissionInbox from "@/components/agent/ExternalAgentSubmissionInbox";
import { AiChatProvider } from "@/modules/ai-chat/AiChatContext";
import { AiChatDialog } from "@/modules/ai-chat/components/AiChatDialog";
import { ChatFAB } from "@/modules/ai-chat/components/ChatFAB";
import type { PropsWithChildren } from "react";

export function Layout({ children }: PropsWithChildren) {
  return (
    <ThemeProvider>
      <AiChatProvider>
        <div className="flex flex-col min-h-screen">
          <NavBar />
          <div
            className={
              "@container/main container mx-auto relative w-full flex flex-col flex-1 pt-16 md:pt-20 px-4 sm:px-6 viewport-transition"
            }
          >
            {children}
            <ExternalAgentSubmissionInbox />
          </div>
          <Footer />
          <ChatFAB />
          <AiChatDialog />
        </div>
      </AiChatProvider>
    </ThemeProvider>
  );
}

Layout.displayName = "Layout";
