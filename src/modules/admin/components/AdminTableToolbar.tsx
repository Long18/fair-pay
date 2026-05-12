import { cn } from "@/lib/utils";

interface AdminTableToolbarProps {
  children: React.ReactNode;
  className?: string;
}

export function AdminTableToolbar({ children, className }: AdminTableToolbarProps) {
  return (
    <div className={cn(
      "flex flex-wrap items-center gap-2",
      "border-b bg-muted/30 px-4 py-3",
      className
    )}>
      {children}
    </div>
  );
}
