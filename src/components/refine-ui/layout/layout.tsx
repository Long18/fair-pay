"use client";

import { NavBar } from "@/components/refine-ui/layout/navbar";
import { Footer } from "@/components/refine-ui/layout/footer";
import { ThemeProvider } from "@/components/refine-ui/theme/theme-provider";
import ExternalAgentSubmissionInbox from "@/components/agent/ExternalAgentSubmissionInbox";
import { cn } from "@/lib/utils";
import type { PropsWithChildren } from "react";

export function Layout({ children }: PropsWithChildren) {
  return (
    <ThemeProvider>
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
            // Padding top for fixed navbar (h-14 mobile / h-16 desktop) + small gap
            "pt-16",
            "md:pt-20",
            // Global horizontal gutters (PageContainer pages should use padding="none")
            "px-4",
            "sm:px-6",
            "viewport-transition"
          )}
        >
          {children}
          <ExternalAgentSubmissionInbox />
        </div>
        <Footer />
      </div>
    </ThemeProvider>
  );
}

Layout.displayName = "Layout";
