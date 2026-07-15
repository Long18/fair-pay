import type { ComponentType, ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingDownIcon, TrendingUpIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { themeIntentTones, type ThemeIntent } from "@/lib/theme-intents";

export type AdminMetricVariant = "muted" | "accent" | "compact" | "plain";

export interface AdminMetricCardProps {
  label: string;
  value: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  loading?: boolean;
  trend?: { value: string; positive: boolean };
  description?: string;
  /** Accent left border + tinted icon surface (marketing funnel) */
  intent?: ThemeIntent;
  variant?: AdminMetricVariant;
  className?: string;
}

export function AdminMetricCard({
  label,
  value,
  icon: Icon,
  loading = false,
  trend,
  description,
  intent,
  variant = "muted",
  className,
}: AdminMetricCardProps) {
  const tones = intent ? themeIntentTones[intent] : null;
  const resolvedVariant =
    variant === "muted" && intent ? "accent" : variant;

  if (resolvedVariant === "plain") {
    return (
      <Card className={cn(className)}>
        <CardContent className="p-4 space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          {loading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <p className="text-2xl font-semibold tabular-nums tracking-tight">
              {value}
            </p>
          )}
          {description ? (
            <p className="text-xs text-muted-foreground">{description}</p>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  if (resolvedVariant === "compact") {
    return (
      <Card className={cn(className)}>
        <CardContent className="flex items-start justify-between gap-3 p-3">
          <div className="min-w-0 space-y-0.5">
            <p className="text-xs text-muted-foreground">{label}</p>
            {loading ? (
              <Skeleton className="h-6 w-16" />
            ) : (
              <p className="text-lg font-bold tabular-nums leading-none">
                {value}
              </p>
            )}
            {trend ? (
              <Badge
                variant={trend.positive ? "default" : "destructive"}
                className="mt-1 gap-1 text-[10px]"
              >
                {trend.positive ? (
                  <TrendingUpIcon className="size-3" aria-hidden />
                ) : (
                  <TrendingDownIcon className="size-3" aria-hidden />
                )}
                {trend.value}
              </Badge>
            ) : null}
          </div>
          {Icon ? (
            <div
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-lg border",
                tones?.surface ?? "bg-muted"
              )}
              aria-hidden
            >
              <Icon className={cn("size-4", tones?.icon ?? "text-muted-foreground")} />
            </div>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  if (resolvedVariant === "accent") {
    const leftBorder =
      tones?.border.replace(/^border-/, "border-l-") ?? "border-l-primary";
    return (
      <Card
        className={cn(
          "overflow-hidden border border-l-4 shadow-xs",
          leftBorder,
          className
        )}
      >
        <CardContent className="flex items-center gap-3 p-4">
          {Icon ? (
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                tones?.surface ?? "bg-muted"
              )}
              aria-hidden
            >
              <Icon className={cn("h-5 w-5", tones?.icon ?? "text-foreground")} />
            </div>
          ) : null}
          <div className="min-w-0 space-y-0.5">
            <p className="text-xs text-muted-foreground">{label}</p>
            {loading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <p className="text-2xl font-bold tabular-nums leading-none">
                {value}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // muted (default) — SimpleStatCard-compatible
  return (
    <Card className={cn(className)}>
      <CardContent className="flex items-center gap-3 p-4">
        {Icon ? (
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted"
            aria-hidden
          >
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
        ) : null}
        <div className="min-w-0 space-y-0.5">
          <p className="text-xs text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="h-7 w-16" />
          ) : (
            <p className="text-2xl font-semibold tabular-nums leading-none">
              {value}
            </p>
          )}
          {description ? (
            <p className="text-xs text-muted-foreground">{description}</p>
          ) : null}
          {trend ? (
            <Badge
              variant={trend.positive ? "default" : "destructive"}
              className="mt-1 gap-1 text-xs"
            >
              {trend.positive ? (
                <TrendingUpIcon className="size-3" aria-hidden />
              ) : (
                <TrendingDownIcon className="size-3" aria-hidden />
              )}
              {trend.value}
            </Badge>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function AdminMetricGrid({
  children,
  className,
  columns = 3,
}: {
  children: ReactNode;
  className?: string;
  columns?: 2 | 3 | 4;
}) {
  return (
    <div
      className={cn(
        "grid gap-4",
        columns === 2 && "grid-cols-1 sm:grid-cols-2",
        columns === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        columns === 4 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
        className
      )}
    >
      {children}
    </div>
  );
}
