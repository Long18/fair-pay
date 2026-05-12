import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AdminSectionProps {
  children: ReactNode;
  className?: string;
}

interface AdminSectionHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function AdminSection({ children, className }: AdminSectionProps) {
  return (
    <section className={cn("space-y-4", className)}>
      {children}
    </section>
  );
}

export function AdminSectionHeader({
  title,
  description,
  actions,
  className,
}: AdminSectionHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="space-y-0.5">
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}
