import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Shared padding + border for audit detail blocks */
export const auditDetailCardClass = "rounded-xl border bg-card shadow-sm overflow-hidden";

export function AuditDetailSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn(auditDetailCardClass, className)}>
      <header className="border-b bg-muted/40 px-4 py-3">
        <h3 className="text-sm font-semibold leading-none tracking-tight">{title}</h3>
        {description ? (
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{description}</p>
        ) : null}
      </header>
      <div className="px-4 py-4">{children}</div>
    </section>
  );
}

export function AuditLabelValueRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[8.5rem_minmax(0,1fr)] gap-1 sm:gap-4 sm:items-start">
      <span className="text-xs font-medium text-muted-foreground sm:pt-2">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function AuditEntityList({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-col gap-2", className)}>{children}</div>;
}

/** Row-style link affordance (chevron + border on hover) */
export const auditEntityLinkRowClass =
  "group flex w-full min-w-0 items-center gap-3 rounded-lg border border-border/80 bg-background px-3 py-2.5 text-left transition-colors hover:border-primary/40 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Compact chip for inline field values */
export const auditEntityLinkChipClass =
  "group inline-flex max-w-[16rem] min-w-0 items-center gap-2 rounded-full border border-border bg-muted/30 px-2.5 py-1 text-left transition-colors hover:border-primary/45 hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
