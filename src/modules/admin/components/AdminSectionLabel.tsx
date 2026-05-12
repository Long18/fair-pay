import { cn } from "@/lib/utils";

interface AdminSectionLabelProps {
  children: React.ReactNode;
  className?: string;
}

export function AdminSectionLabel({ children, className }: AdminSectionLabelProps) {
  return (
    <p className={cn("text-xs font-semibold uppercase tracking-widest text-muted-foreground", className)}>
      {children}
    </p>
  );
}
