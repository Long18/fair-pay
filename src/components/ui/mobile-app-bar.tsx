import * as React from "react";
import { useNavigate } from "react-router";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "@/components/ui/icons";

/**
 * Mobile App Bar Component
 *
 * Simplified mobile header for pages using bottom navigation.
 * Provides minimal chrome with optional back button and actions.
 *
 * Design principles:
 * - Maximum content space (compact 48px height)
 * - Clear navigation affordances
 * - Support for page-level actions
 * - Works seamlessly with bottom navigation
 *
 * @example
 * <MobileAppBar title="Expense Details" showBack />
 *
 * @example
 * <MobileAppBar
 *   title="Settings"
 *   action={<Button size="sm">Save</Button>}
 * />
 */

export interface MobileAppBarProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  // Page title
  title: React.ReactNode;
  // Show back button (navigates to -1 in history)
  showBack?: boolean;
  // Custom back button handler
  onBack?: () => void;
  // Action buttons (right side)
  action?: React.ReactNode;
  // Subtitle/description
  subtitle?: React.ReactNode;
}

export function MobileAppBar({
  title,
  showBack = false,
  onBack,
  action,
  subtitle,
  className,
  ...props
}: MobileAppBarProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <header
      className={cn(
        // Layout
        "sticky top-0 z-40",
        "flex items-center gap-3",
        // Only show on mobile
        "md:hidden",
        // Sizing
        "h-12 px-4",
        // Styling
        "bg-background/95 backdrop-blur-sm",
        "border-b border-border",
        className
      )}
      {...props}
    >
      {/* Back Button */}
      {showBack && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={handleBack}
          aria-label="Go back"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </Button>
      )}

      {/* Title Section */}
      <div className="flex-1 min-w-0">
        <h1 className="text-sm font-semibold leading-none truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {subtitle}
          </p>
        )}
      </div>

      {/* Actions */}
      {action && (
        <div className="flex items-center gap-2 shrink-0">
          {action}
        </div>
      )}
    </header>
  );
}

/**
 * Desktop App Bar Component
 *
 * Full-featured desktop header with more space for controls.
 * Provides generous layout for complex page actions.
 *
 * @example
 * <DesktopAppBar
 *   title="Dashboard"
 *   description="Manage your expenses and balances"
 *   action={<Button>Create Expense</Button>}
 * />
 */

export interface DesktopAppBarProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  breadcrumb?: React.ReactNode;
}

export function DesktopAppBar({
  title,
  description,
  action,
  breadcrumb,
  className,
  ...props
}: DesktopAppBarProps) {
  return (
    <header
      className={cn(
        // Only show on desktop
        "hidden md:block",
        // Spacing
        "mb-6",
        className
      )}
      {...props}
    >
      {/* Breadcrumb */}
      {breadcrumb && (
        <div className="mb-2">
          {breadcrumb}
        </div>
      )}

      {/* Title Row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">
              {description}
            </p>
          )}
        </div>

        {action && (
          <div className="flex items-center gap-2 shrink-0">
            {action}
          </div>
        )}
      </div>
    </header>
  );
}

/**
 * Responsive App Bar Component
 *
 * Automatically switches between mobile and desktop variants.
 * Single component for consistent page headers across breakpoints.
 *
 * @example
 * <ResponsiveAppBar
 *   title="Expense Details"
 *   description="View and edit expense information"
 *   showBack
 *   action={<Button>Save</Button>}
 * />
 */

export interface ResponsiveAppBarProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  subtitle?: React.ReactNode;
  showBack?: boolean;
  onBack?: () => void;
  action?: React.ReactNode;
  breadcrumb?: React.ReactNode;
  className?: string;
}

export function ResponsiveAppBar({
  title,
  description,
  subtitle,
  showBack,
  onBack,
  action,
  breadcrumb,
  className,
}: ResponsiveAppBarProps) {
  return (
    <>
      <MobileAppBar
        title={title}
        subtitle={subtitle || description}
        showBack={showBack}
        onBack={onBack}
        action={action}
        className={className}
      />
      <DesktopAppBar
        title={title}
        description={description}
        action={action}
        breadcrumb={breadcrumb}
        className={className}
      />
    </>
  );
}
