import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Responsive Visibility Components
 *
 * Utilities for controlling component visibility across breakpoints.
 * Follows mobile-first responsive design principles.
 *
 * Breakpoints (Tailwind defaults):
 * - sm: 640px
 * - md: 768px (primary mobile/desktop threshold)
 * - lg: 1024px
 * - xl: 1280px
 * - 2xl: 1536px
 */

// ============================================================================
// Mobile Only
// ============================================================================

/**
 * MobileOnly Component
 *
 * Shows content only on mobile devices (< 768px).
 * Hidden on tablet and desktop.
 *
 * @example
 * <MobileOnly>
 *   <BottomNavigation>...</BottomNavigation>
 * </MobileOnly>
 */
export interface MobileOnlyProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  // Render as span instead of div
  asSpan?: boolean;
}

export function MobileOnly({
  children,
  asSpan = false,
  className,
  ...props
}: MobileOnlyProps) {
  const Component = asSpan ? "span" : "div";

  return (
    <Component
      className={cn("md:hidden", className)}
      {...props}
    >
      {children}
    </Component>
  );
}

// ============================================================================
// Desktop Only
// ============================================================================

/**
 * DesktopOnly Component
 *
 * Shows content only on desktop devices (≥ 768px).
 * Hidden on mobile.
 *
 * @example
 * <DesktopOnly>
 *   <Sidebar />
 * </DesktopOnly>
 */
export interface DesktopOnlyProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  asSpan?: boolean;
}

export function DesktopOnly({
  children,
  asSpan = false,
  className,
  ...props
}: DesktopOnlyProps) {
  const Component = asSpan ? "span" : "div";

  return (
    <Component
      className={cn("hidden md:block", className)}
      {...props}
    >
      {children}
    </Component>
  );
}

// ============================================================================
// Tablet and Up
// ============================================================================

/**
 * TabletUp Component
 *
 * Shows content on tablet and desktop (≥ 640px).
 * Hidden on small mobile.
 *
 * @example
 * <TabletUp>
 *   <DetailedChart />
 * </TabletUp>
 */
export interface TabletUpProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  asSpan?: boolean;
}

export function TabletUp({
  children,
  asSpan = false,
  className,
  ...props
}: TabletUpProps) {
  const Component = asSpan ? "span" : "div";

  return (
    <Component
      className={cn("hidden sm:block", className)}
      {...props}
    >
      {children}
    </Component>
  );
}

// ============================================================================
// Tablet Only
// ============================================================================

/**
 * TabletOnly Component
 *
 * Shows content only on tablets (640px - 1024px).
 * Hidden on mobile and desktop.
 *
 * @example
 * <TabletOnly>
 *   <CompactNavigation />
 * </TabletOnly>
 */
export interface TabletOnlyProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  asSpan?: boolean;
}

export function TabletOnly({
  children,
  asSpan = false,
  className,
  ...props
}: TabletOnlyProps) {
  const Component = asSpan ? "span" : "div";

  return (
    <Component
      className={cn("hidden sm:block lg:hidden", className)}
      {...props}
    >
      {children}
    </Component>
  );
}

// ============================================================================
// Large Desktop Only
// ============================================================================

/**
 * LargeDesktopOnly Component
 *
 * Shows content only on large desktops (≥ 1024px).
 * Hidden on mobile, tablet, and small desktop.
 *
 * @example
 * <LargeDesktopOnly>
 *   <AdvancedFilters />
 * </LargeDesktopOnly>
 */
export interface LargeDesktopOnlyProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  asSpan?: boolean;
}

export function LargeDesktopOnly({
  children,
  asSpan = false,
  className,
  ...props
}: LargeDesktopOnlyProps) {
  const Component = asSpan ? "span" : "div";

  return (
    <Component
      className={cn("hidden lg:block", className)}
      {...props}
    >
      {children}
    </Component>
  );
}

// ============================================================================
// Responsive Text
// ============================================================================

/**
 * ResponsiveText Component
 *
 * Shows different text content based on screen size.
 * Useful for responsive labels and messaging.
 *
 * @example
 * <ResponsiveText
 *   mobile="Save"
 *   desktop="Save Changes"
 * />
 *
 * @example
 * <Button>
 *   <ResponsiveText
 *     mobile={<SaveIcon />}
 *     desktop="Save"
 *   />
 * </Button>
 */
export interface ResponsiveTextProps {
  mobile: React.ReactNode;
  tablet?: React.ReactNode;
  desktop: React.ReactNode;
}

export function ResponsiveText({
  mobile,
  tablet,
  desktop,
}: ResponsiveTextProps) {
  return (
    <>
      <MobileOnly asSpan>{mobile}</MobileOnly>
      {tablet && <TabletOnly asSpan>{tablet}</TabletOnly>}
      <DesktopOnly asSpan>{desktop}</DesktopOnly>
    </>
  );
}

// ============================================================================
// Hide At Breakpoint
// ============================================================================

/**
 * HideAt Component
 *
 * Hides content at specific breakpoint and above.
 * More flexible than the specific components above.
 *
 * @example
 * <HideAt breakpoint="lg">
 *   <MobileMenu />
 * </HideAt>
 */
export interface HideAtProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  breakpoint: "sm" | "md" | "lg" | "xl" | "2xl";
  asSpan?: boolean;
}

export function HideAt({
  children,
  breakpoint,
  asSpan = false,
  className,
  ...props
}: HideAtProps) {
  const Component = asSpan ? "span" : "div";

  const hideClass = {
    sm: "sm:hidden",
    md: "md:hidden",
    lg: "lg:hidden",
    xl: "xl:hidden",
    "2xl": "2xl:hidden",
  }[breakpoint];

  return (
    <Component
      className={cn(hideClass, className)}
      {...props}
    >
      {children}
    </Component>
  );
}

// ============================================================================
// Show At Breakpoint
// ============================================================================

/**
 * ShowAt Component
 *
 * Shows content only at specific breakpoint and above.
 * More flexible than the specific components above.
 *
 * @example
 * <ShowAt breakpoint="lg">
 *   <AdvancedFilters />
 * </ShowAt>
 */
export interface ShowAtProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  breakpoint: "sm" | "md" | "lg" | "xl" | "2xl";
  asSpan?: boolean;
}

export function ShowAt({
  children,
  breakpoint,
  asSpan = false,
  className,
  ...props
}: ShowAtProps) {
  const Component = asSpan ? "span" : "div";

  const showClass = {
    sm: "hidden sm:block",
    md: "hidden md:block",
    lg: "hidden lg:block",
    xl: "hidden xl:block",
    "2xl": "hidden 2xl:block",
  }[breakpoint];

  return (
    <Component
      className={cn(showClass, className)}
      {...props}
    >
      {children}
    </Component>
  );
}
