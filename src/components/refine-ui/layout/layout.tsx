"use client";

import { NavBar } from "@/components/refine-ui/layout/navbar";
import { Footer } from "@/components/refine-ui/layout/footer";
import { ThemeProvider } from "@/components/refine-ui/theme/theme-provider";
import { cn } from "@/lib/utils";
import type { PropsWithChildren } from "react";

export function Layout({ children }: PropsWithChildren) {
  return (
    <ThemeProvider>
      <div className="flex flex-col min-h-screen">
        <NavBar />
        <main
          id="main-content"
          className={cn(
            "@container/main",
            "container",
            "mx-auto",
            "relative",
            "w-full",
            "flex",
            "flex-col",
            "flex-1",
            // Padding top to account for fixed navbar
            // Mobile: h-14 + spacing = pt-16
            // Desktop: h-16 + spacing = pt-20
            "px-2",
            "pt-16",
            "md:pt-20",
            "md:px-4",
            "lg:px-6",
            "lg:pt-24"
          )}
        >
          {children}
        </main>
        <Footer />
      </div>
    </ThemeProvider>
  );
}

Layout.displayName = "Layout";
