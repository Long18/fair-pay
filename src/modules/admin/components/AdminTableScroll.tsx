import { forwardRef, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AdminTableScrollProps {
  children: ReactNode;
  className?: string;
  /**
   * Vertical space (CSS length) reserved for chrome above/below the table:
   * navbar, page header, toolbar and pagination. The table body scrolls inside
   * the remaining viewport height so pagination stays visible.
   */
  offset?: string;
  style?: CSSProperties;
}

/**
 * Bounded scroll region for admin tables with a sticky header.
 * Pass `containerClassName="overflow-visible"` to the inner `<Table>` so this
 * element owns both scroll axes (otherwise the sticky header has no effect).
 */
export const AdminTableScroll = forwardRef<HTMLDivElement, AdminTableScrollProps>(
  function AdminTableScroll({ children, className, offset, style }, ref) {
    return (
      <div
        ref={ref}
        data-slot="admin-table-scroll"
        style={{
          ...(offset ? { ["--admin-table-offset" as string]: offset } : null),
          ...style,
        }}
        className={cn(
          "relative min-h-[12rem] overflow-auto rounded-md border",
          "max-h-[calc(100dvh-var(--admin-table-offset,15rem))]",
          "[&_thead]:sticky [&_thead]:top-0 [&_thead]:z-20 [&_thead]:bg-background",
          "[&_thead_tr]:shadow-[inset_0_-1px_0_var(--border)]",
          className
        )}
      >
        {children}
      </div>
    );
  }
);
