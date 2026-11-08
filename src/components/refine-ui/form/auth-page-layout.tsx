"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AuthPageLayoutProps = {
  children: ReactNode;
  className?: string;
};

/** Centered single-column shell for standalone auth screens (login, register, reset). */
export function AuthPageLayout({ children, className }: AuthPageLayoutProps) {
  return (
    <div
      className={cn(
        "flex min-h-svh items-center justify-center bg-background p-4",
        className,
      )}
    >
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}

AuthPageLayout.displayName = "AuthPageLayout";
