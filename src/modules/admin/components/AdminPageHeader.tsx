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
        "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
        className
      )}
    >
      <div className="min-w-0 flex-1 space-y-1">
        <TitleTag
          className={cn(
            density === "page"
              ? "typography-page-title text-2xl font-semibold tracking-tight"
              : "text-base font-semibold tracking-tight"
          )}
        >
          {title}
        </TitleTag>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
