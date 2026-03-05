import * as React from "react";
import { Link, useLocation } from "react-router";
import { cn } from "@/lib/utils";
import { useHaptics } from "@/hooks/use-haptics";

/**
 * Bottom Navigation Component
 *
 * Mobile-first bottom navigation bar for easy thumb access.
 * Only visible on mobile devices (< 768px).
 *
 * Follows iOS and Material Design guidelines:
 * - Maximum 5 items
 * - 44px minimum touch targets
 * - Active state indication
 * - Icon + label layout
 *
 * @example
 * <BottomNavigation>
 *   <BottomNavigationItem
 *     to="/dashboard"
 *     icon={<HomeIcon />}
 *     label="Home"
 *   />
 *   <BottomNavigationItem
 *     to="/balances"
 *     icon={<WalletIcon />}
 *     label="Balances"
 *   />
 * </BottomNavigation>
 */

interface BottomNavigationProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

export function BottomNavigation({
  className,
  children,
  ...props
}: BottomNavigationProps) {
  return (
    <nav
      className={cn(
        // Layout
        "fixed bottom-0 left-0 right-0 z-50",
        // Only show on mobile
        "md:hidden",
        // Styling
        "bg-background border-t border-border",
        // Safe area for notched devices
        "pb-safe",
        className
      )}
      role="navigation"
      aria-label="Primary navigation"
      {...props}
    >
      <div className="flex items-center justify-around h-16">
        {children}
      </div>
    </nav>
  );
}

interface BottomNavigationItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  badge?: number | string;
  onClick?: () => void;
}

export function BottomNavigationItem({
  to,
  icon,
  label,
  badge,
  onClick,
}: BottomNavigationItemProps) {
  const location = useLocation();
  const isActive = location.pathname === to || location.pathname.startsWith(`${to}/`);
  const { tap } = useHaptics();

  return (
    <Link
      to={to}
      onClick={() => { tap(); onClick?.(); }}
      className={cn(
        // Layout
        "flex flex-col items-center justify-center gap-0.5",
        // Touch target (44px minimum)
        "min-w-[64px] h-16 px-3",
        // Typography
        "text-xs font-medium",
        // States
        "transition-colors duration-200",
        isActive
          ? "text-primary"
          : "text-muted-foreground hover:text-foreground active:text-primary",
        // Focus
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      )}
      aria-label={label}
      aria-current={isActive ? "page" : undefined}
    >
      {/* Icon */}
      <div className="relative">
        <div
          className={cn(
            "flex items-center justify-center",
            "size-6 transition-transform duration-200",
            isActive && "scale-110"
          )}
        >
          {icon}
        </div>

        {/* Badge */}
        {badge !== undefined && (
          <span
            className={cn(
              "absolute -top-1 -right-1",
              "flex items-center justify-center",
              "min-w-[16px] h-4 px-1",
              "text-[10px] font-bold leading-none",
              "bg-destructive text-destructive-foreground",
              "rounded-full"
            )}
            aria-label={`${badge} notifications`}
          >
            {typeof badge === 'number' && badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>

      {/* Label */}
      <span className="truncate max-w-full">{label}</span>
    </Link>
  );
}

// BottomNavigationSpacer Component
//
// Adds bottom padding to page content to prevent it from being hidden
// behind the bottom navigation bar.
//
// Example:
// <PageContainer>
//   <PageContent>
//     {content}
//   </PageContent>
//   <BottomNavigationSpacer />
// </PageContainer>
export function BottomNavigationSpacer() {
  return <div className="h-16 md:hidden" aria-hidden="true" />;
}
