import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface AdminPageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** "page" = h1 for top-level admin routes; "section" = h2 when embedded under a parent shell */
  density?: "page" | "section";
  className?: string;
}

export function AdminPageHeader({
  title,
  description,
  actions,
  density = "page",
  className,
}: AdminPageHeaderProps) {
  const TitleTag = density === "page" ? "h1" : "h2";

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="min-w-0 flex-1">
        <TitleTag
          className={cn(
            "truncate font-semibold tracking-tight",
            density === "page"
              ? "typography-page-title text-xl"
              : "text-base"
          )}
        >
          {title}
        </TitleTag>
        {description ? (
          <p className="line-clamp-1 text-xs text-muted-foreground sm:text-sm">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
