import { useState, type ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityIcon, Rows3Icon } from "@/components/ui/icons";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { useAdminTranslation } from "../../i18n";

/** Fixed body height for every chart / list panel on the marketing tabs. */
export const PANEL_BODY_HEIGHT = "h-[230px]";

export function PanelCard({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
  ...rest
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  "data-slot"?: string;
  role?: string;
  "aria-label"?: string;
}) {
  return (
    <Card className={cn("min-w-0 gap-3 py-4", className)} {...rest}>
      <CardHeader className="flex items-start justify-between gap-2 px-4 pb-0">
        <div className="min-w-0">
          <CardTitle className="truncate text-sm">{title}</CardTitle>
          {description ? (
            <CardDescription className="truncate text-xs">{description}</CardDescription>
          ) : null}
        </div>
        {action ? <div className="flex shrink-0 items-center gap-1.5">{action}</div> : null}
      </CardHeader>
      <CardContent className={cn("flex-1 px-4", contentClassName)}>{children}</CardContent>
    </Card>
  );
}

export function PanelEmpty({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "flex h-full max-h-[200px] min-h-[120px] items-center justify-center text-center text-sm text-muted-foreground",
        className,
      )}
    >
      {children}
    </p>
  );
}

type ChartTableView = "chart" | "table";

/** One card that swaps between a chart and a table of the same data. */
export function ChartTableCard({
  title,
  description,
  chart,
  table,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  chart: ReactNode;
  table: ReactNode;
  className?: string;
}) {
  const { tAdmin } = useAdminTranslation();
  const [view, setView] = useState<ChartTableView>("chart");

  return (
    <PanelCard
      title={title}
      description={description}
      className={className}
      action={
        <ToggleGroup
          type="single"
          size="sm"
          variant="outline"
          value={view}
          onValueChange={(v) => v && setView(v as ChartTableView)}
          aria-label={tAdmin("layout.insights.marketing.viewMode")}
        >
          <ToggleGroupItem
            value="chart"
            className="h-7 px-2"
            aria-label={tAdmin("layout.insights.marketing.viewChart")}
            title={tAdmin("layout.insights.marketing.viewChart")}
          >
            <ActivityIcon className="h-3.5 w-3.5" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="table"
            className="h-7 px-2"
            aria-label={tAdmin("layout.insights.marketing.viewTable")}
            title={tAdmin("layout.insights.marketing.viewTable")}
          >
            <Rows3Icon className="h-3.5 w-3.5" />
          </ToggleGroupItem>
        </ToggleGroup>
      }
    >
      <div className={PANEL_BODY_HEIGHT}>{view === "chart" ? chart : table}</div>
    </PanelCard>
  );
}

/** Sticky-header table body for use inside a fixed-height ScrollArea. */
export const STICKY_TABLE_CLASS =
  "[&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10 [&_thead]:bg-card [&_thead_tr]:shadow-[inset_0_-1px_0_var(--border)]";
