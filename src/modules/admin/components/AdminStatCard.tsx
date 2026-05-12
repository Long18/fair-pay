import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingDownIcon, TrendingUpIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

interface AdminStatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { value: string; positive: boolean };
  className?: string;
}

export function AdminStatCard({ title, value, icon, trend, className }: AdminStatCardProps) {
  return (
    <Card className={cn("bg-gradient-to-t from-primary/5 to-card shadow-xs", className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-medium tabular-nums leading-none">{value}</p>
            {trend && (
              <Badge
                variant={trend.positive ? "default" : "destructive"}
                className="mt-1.5 gap-1 text-xs"
              >
                {trend.positive
                  ? <TrendingUpIcon className="size-3" />
                  : <TrendingDownIcon className="size-3" />}
                {trend.value}
              </Badge>
            )}
          </div>
          <div className="rounded-lg border bg-muted flex items-center justify-center size-9 shrink-0">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
