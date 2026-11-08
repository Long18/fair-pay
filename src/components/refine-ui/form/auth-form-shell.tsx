"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { useRefineOptions } from "@refinedev/core";

type AuthFormShellProps = {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** When false, skip the product mark (e.g. success-only states with their own icon). */
  showLogo?: boolean;
  className?: string;
};

export function AuthFormShell({
  title,
  description,
  children,
  footer,
  showLogo = true,
  className,
}: AuthFormShellProps) {
  const { title: refineTitle } = useRefineOptions();

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-6 sm:p-8",
        className,
      )}
    >
      <header className={cn("mb-6 space-y-2 text-center")}>
        {showLogo && refineTitle.icon ? (
          <div
            className={cn(
              "mb-4 flex justify-center text-primary",
              "[&>svg]:h-12 [&>svg]:w-12",
            )}
            aria-hidden
          >
            {refineTitle.icon}
          </div>
        ) : null}
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {description ? (
          <p className="text-pretty text-sm text-muted-foreground">{description}</p>
        ) : null}
      </header>

      <div className="space-y-5">{children}</div>

      {footer ? (
        <footer className="mt-6 border-t border-border pt-6 text-center">{footer}</footer>
      ) : null}
    </div>
  );
}

AuthFormShell.displayName = "AuthFormShell";
