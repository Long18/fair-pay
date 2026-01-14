import * as React from "react";
import { cn } from "@/lib/utils";

// PageHeader Component Props
export interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  // Page title (required)
  title: React.ReactNode;

  // Optional subtitle/description below title
  description?: React.ReactNode;

  // Optional action button(s) on the right
  action?: React.ReactNode;

  // Custom title ID for accessibility (ARIA labelledby)
  titleId?: string;

  // Custom description ID for accessibility (ARIA describedby)
  descriptionId?: string;
}

// Consistent page header with title, description, and optional action buttons
export function PageHeader({
  className,
  title,
  description,
  action,
  titleId,
  descriptionId,
  ...props
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4",
        className
      )}
      {...props}
    >
      {/* Title and Description */}
      <div className="flex-1 min-w-0">
        <h1
          id={titleId}
          className="typography-page-title"
        >
          {title}
        </h1>
        {description && (
          <p
            id={descriptionId}
            className="text-sm text-muted-foreground mt-1"
          >
            {description}
          </p>
        )}
      </div>

      {/* Action Slot */}
      {action && (
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {action}
        </div>
      )}
    </div>
  );
}
