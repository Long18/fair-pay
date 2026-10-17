import type { ReactNode } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/ui/use-mobile";
import { cn } from "@/lib/utils";

export type AdminDetailSize = "md" | "lg" | "xl";

export interface AdminDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  /** Small controls rendered on the right of the header (left of the close button) */
  headerActions?: ReactNode;
  /** Sticky footer (primary / destructive actions) */
  footer?: ReactNode;
  children: ReactNode;
  size?: AdminDetailSize;
  className?: string;
  bodyClassName?: string;
}

const SIZE_CLASS: Record<AdminDetailSize, string> = {
  md: "sm:max-w-md",
  lg: "sm:max-w-xl",
  xl: "sm:max-w-2xl lg:max-w-3xl",
};

/**
 * Side panel for record details. Keeps the list visible behind it so admins
 * can close and open the next row without losing scroll position.
 * Bottom sheet on mobile, right sheet otherwise.
 */
export function AdminDetailSheet({
  open,
  onOpenChange,
  title,
  description,
  headerActions,
  footer,
  children,
  size = "lg",
  className,
  bodyClassName,
}: AdminDetailSheetProps) {
  const isMobile = useIsMobile();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={cn(
          "gap-0 overflow-hidden p-0",
          isMobile ? "max-h-[92dvh] rounded-t-2xl" : cn("w-full", SIZE_CLASS[size]),
          className
        )}
      >
        <AdminDetailLayout
          title={title}
          description={description}
          headerActions={headerActions}
          footer={footer}
          bodyClassName={bodyClassName}
          titleSlot="sheet"
        >
          {children}
        </AdminDetailLayout>
      </SheetContent>
    </Sheet>
  );
}

interface AdminDetailLayoutProps {
  title: ReactNode;
  description?: ReactNode;
  headerActions?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
  /** "sheet" uses Radix title/description for a11y; "pane" uses plain headings */
  titleSlot: "sheet" | "pane";
  /** Rendered after headerActions (pane mode close button) */
  trailing?: ReactNode;
}

export function AdminDetailLayout({
  title,
  description,
  headerActions,
  footer,
  children,
  bodyClassName,
  titleSlot,
  trailing,
}: AdminDetailLayoutProps) {
  const header =
    titleSlot === "sheet" ? (
      <SheetHeader className="shrink-0 gap-0.5 border-b px-4 py-3 pr-12">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <SheetTitle className="min-w-0 truncate text-base">{title}</SheetTitle>
          {headerActions ? (
            <div className="flex shrink-0 items-center gap-1">{headerActions}</div>
          ) : null}
        </div>
        {description ? (
          <SheetDescription className="line-clamp-2 text-xs">{description}</SheetDescription>
        ) : (
          <SheetDescription className="sr-only">{title}</SheetDescription>
        )}
      </SheetHeader>
    ) : (
      <div className="flex shrink-0 items-start justify-between gap-2 border-b px-4 py-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold">{title}</h2>
          {description ? (
            <p className="line-clamp-2 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {headerActions}
          {trailing}
        </div>
      </div>
    );

  return (
    <div className="flex h-full min-h-0 flex-col">
      {header}
      <div className={cn("min-h-0 flex-1 overflow-y-auto px-4 py-4", bodyClassName)}>
        {children}
      </div>
      {footer ? (
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t bg-background px-4 py-3">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
