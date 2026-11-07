import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Space below the docked notch before toolbar controls (menu-bar strip). */
export const DASHBOARD_NOTCH_MENU_BAR_PT = "pt-5 sm:pt-6";

interface DashboardNotchDockProps {
  children: ReactNode;
  className?: string;
}

/**
 * Centers the metrics island on the top edge of the dashboard card (MacBook notch / menu bar).
 */
export function DashboardNotchDock({ children, className }: DashboardNotchDockProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute left-1/2 top-0 z-20 flex max-w-[calc(100%-1.5rem)] -translate-x-1/2 -translate-y-1/2 justify-center",
        className,
      )}
    >
      <div className="pointer-events-auto drop-shadow-sm">{children}</div>
    </div>
  );
}
