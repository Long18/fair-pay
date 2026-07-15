import type { ReactNode } from "react";
import { AdminMetricCard } from "./AdminMetricCard";

interface AdminStatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: { value: string; positive: boolean };
  className?: string;
}

/** @deprecated Prefer AdminMetricCard. Kept as a thin compatibility wrapper. */
export function AdminStatCard({ title, value, icon, trend, className }: AdminStatCardProps) {
  return (
    <AdminMetricCard
      label={title}
      value={value}
      trend={trend}
      variant="compact"
      className={className}
      icon={icon ? () => <>{icon}</> : undefined}
    />
  );
}
