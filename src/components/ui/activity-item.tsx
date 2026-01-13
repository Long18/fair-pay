import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * ActivityItem Component
 *
 * Reusable primitive for activity feed items.
 * Provides consistent layout for icon + title + description + timestamp + action.
 *
 * @example
 * <ActivityItem
 *   icon={<DollarSignIcon className="size-5" />}
 *   title="Payment received"
 *   description="John paid you $25 for coffee"
 *   timestamp="2 hours ago"
 *   action={<Button variant="ghost" size="sm">View</Button>}
 * />
 */
interface ActivityItemProps extends Omit<React.ComponentProps<"div">, "title"> {
  /**
   * Icon displayed on the left (typically 16-24px size)
   */
  icon?: React.ReactNode;

  /**
   * Icon background color variant
   */
  iconVariant?: "default" | "success" | "warning" | "destructive" | "info";

  /**
   * Main title/heading
   */
  title: React.ReactNode;

  /**
   * Optional description/subtitle
   */
  description?: React.ReactNode;

  /**
   * Timestamp or date display
   */
  timestamp?: React.ReactNode;

  /**
   * Action button or link (displayed on the right)
   */
  action?: React.ReactNode;
}

/**
 * Get icon background color based on variant
 */
const getIconBgClass = (variant: ActivityItemProps["iconVariant"]) => {
  switch (variant) {
    case "success":
      return "bg-status-success-bg text-status-success-foreground";
    case "warning":
      return "bg-status-warning-bg text-status-warning-foreground";
    case "destructive":
      return "bg-destructive/10 text-destructive";
    case "info":
      return "bg-status-info-bg text-status-info-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export function ActivityItem({
  className,
  icon,
  iconVariant = "default",
  title,
  description,
  timestamp,
  action,
  ...props
}: ActivityItemProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-4 py-3",
        className
      )}
      {...props}
    >
      {/* Icon slot */}
      {icon && (
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg",
            getIconBgClass(iconVariant)
          )}
        >
          {icon}
        </div>
      )}

      {/* Content slot (title + description) */}
      <div className="flex-1 min-w-0">
        {/* Title */}
        <div className="typography-row-title truncate">
          {title}
        </div>

        {/* Description */}
        {description && (
          <div className="typography-metadata mt-0.5 line-clamp-2">
            {description}
          </div>
        )}

        {/* Timestamp (mobile only, below description) */}
        {timestamp && (
          <div className="typography-metadata mt-1 md:hidden">
            {timestamp}
          </div>
        )}
      </div>

      {/* Right column (timestamp + action on desktop) */}
      <div className="hidden md:flex md:flex-col md:items-end md:gap-1 md:shrink-0">
        {/* Timestamp (desktop) */}
        {timestamp && (
          <div className="typography-metadata whitespace-nowrap">
            {timestamp}
          </div>
        )}

        {/* Action */}
        {action && (
          <div className="flex items-center">
            {action}
          </div>
        )}
      </div>

      {/* Action (mobile only, stacked below) */}
      {action && (
        <div className="md:hidden shrink-0">
          {action}
        </div>
      )}
    </div>
  );
}
