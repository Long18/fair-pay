import type { KeyboardEvent, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Loader2Icon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

interface AdminMobileCardsProps<T> {
  items: T[];
  getKey: (item: T) => string;
  renderItem: (item: T, index: number) => ReactNode;
  isLoading?: boolean;
  loadingLabel?: string;
  emptyState?: ReactNode;
  className?: string;
}

export function AdminMobileCards<T>({
  items,
  getKey,
  renderItem,
  isLoading,
  loadingLabel = "Loading...",
  emptyState,
  className,
}: AdminMobileCardsProps<T>) {
  if (isLoading) {
    return (
      <div className="flex min-h-48 items-center justify-center rounded-lg border bg-card">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2Icon className="h-4 w-4 animate-spin" />
          {loadingLabel}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return emptyState ? <>{emptyState}</> : null;
  }

  return (
    <div className={cn("grid gap-3", className)}>
      {items.map((item, index) => (
        <div key={getKey(item)}>{renderItem(item, index)}</div>
      ))}
    </div>
  );
}

interface AdminMobileCardProps {
  title: ReactNode;
  description?: ReactNode;
  leading?: ReactNode;
  badges?: ReactNode;
  meta?: Array<{ label: ReactNode; value: ReactNode }>;
  actions?: ReactNode;
  children?: ReactNode;
  onClick?: () => void;
  className?: string;
  ariaLabel?: string;
}

export function AdminMobileCard({
  title,
  description,
  leading,
  badges,
  meta,
  actions,
  children,
  onClick,
  className,
  ariaLabel,
}: AdminMobileCardProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!onClick) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={ariaLabel}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={cn(
        "rounded-lg border bg-card p-4 shadow-sm transition-colors",
        onClick && "cursor-pointer hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {leading && <div className="shrink-0">{leading}</div>}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-foreground">{title}</div>
              {description && (
                <div className="mt-0.5 truncate text-xs text-muted-foreground">{description}</div>
              )}
            </div>
            {badges && <div className="flex shrink-0 flex-wrap justify-end gap-1.5">{badges}</div>}
          </div>
        </div>
        {actions && (
          <div
            className="shrink-0"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            {actions}
          </div>
        )}
      </div>

      {meta && meta.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          {meta.map((item, index) => (
            <div key={index} className="min-w-0">
              <div className="text-[11px] font-medium uppercase tracking-normal text-muted-foreground">
                {item.label}
              </div>
              <div className="mt-1 min-w-0 truncate text-sm text-foreground">{item.value}</div>
            </div>
          ))}
        </div>
      )}

      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

interface AdminMobilePaginationProps {
  summary: ReactNode;
  previousLabel: ReactNode;
  nextLabel: ReactNode;
  canPrevious: boolean;
  canNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  children?: ReactNode;
}

export function AdminMobilePagination({
  summary,
  previousLabel,
  nextLabel,
  canPrevious,
  canNext,
  onPrevious,
  onNext,
  children,
}: AdminMobilePaginationProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-muted-foreground">{summary}</div>
      {children}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
        <Button variant="outline" size="sm" onClick={onPrevious} disabled={!canPrevious}>
          {previousLabel}
        </Button>
        <Button variant="outline" size="sm" onClick={onNext} disabled={!canNext}>
          {nextLabel}
        </Button>
      </div>
    </div>
  );
}

