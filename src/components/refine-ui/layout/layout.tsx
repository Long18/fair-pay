"use client";

import { NavBar } from "@/components/refine-ui/layout/navbar";
import { Footer } from "@/components/refine-ui/layout/footer";
import { ThemeProvider } from "@/components/refine-ui/theme/theme-provider";
import ExternalAgentSubmissionInbox from "@/components/agent/ExternalAgentSubmissionInbox";
import { AiChatProvider } from "@/modules/ai-chat/AiChatContext";
import { AiChatDialog } from "@/modules/ai-chat/components/AiChatDialog";
import { ChatFAB } from "@/modules/ai-chat/components/ChatFAB";
import { ClientBottomNav } from "@/components/refine-ui/layout/client-bottom-nav";
import {
  NotificationInAppPreviewHost,
  NotificationPreviewBurstSubscription,
} from "@/modules/notifications";
import type { PropsWithChildren } from "react";
import {
  FirstPaintBrandCurtain,
  MotionPageShell,
  MotionRouteCoordinator,
  MotionRouteLoadingProvider,
} from "@/lib/motion";
import { RightFabLaneProvider } from "@/components/ui/floating-stack";

export function Layout({ children }: PropsWithChildren) {
  return (
    <ThemeProvider>
      <AiChatProvider>
        <RightFabLaneProvider>
        <div className="flex min-h-screen max-w-[100vw] min-w-0 flex-col overflow-x-hidden">
          <MotionRouteLoadingProvider>
          <FirstPaintBrandCurtain />
          <NavBar />
          <MotionRouteCoordinator>
          <div
            className={
              "fp-motion-main @container/main container mx-auto relative w-full flex flex-col flex-1 pt-16 md:pt-20 px-4 sm:px-6 pb-[calc(env(safe-area-inset-bottom)+5rem)] md:pb-0 viewport-transition"
            }
          >
            <MotionPageShell className="w-full">
              {children}
            </MotionPageShell>
            <ExternalAgentSubmissionInbox />
          </div>
          </MotionRouteCoordinator>
          </MotionRouteLoadingProvider>
          <Footer />
          <ClientBottomNav />
          <ChatFAB />
          <AiChatDialog />
          <NotificationPreviewBurstSubscription />
          <NotificationInAppPreviewHost />
        </div>
        </RightFabLaneProvider>
      </AiChatProvider>
    </ThemeProvider>
  );
}

Layout.displayName = "Layout";
