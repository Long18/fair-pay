import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// PageContainer Variants
// Provides consistent page layout patterns with responsive padding and max-width.
const pageContainerVariants = cva(
  "mx-auto w-full", // Base classes
  {
    variants: {
      variant: {
        default: "max-w-7xl", // Standard pages (1280px)
        narrow: "max-w-4xl", // Reading-focused pages (896px)
        full: "max-w-none", // Data-heavy tables, full width
      },
      padding: {
        default: "px-4 sm:px-6 lg:px-8", // Standard horizontal padding
        none: "px-0", // No horizontal padding
      },
      spacing: {
        default: "py-4 md:py-6 lg:py-8", // Standard vertical spacing
        compact: "py-3 md:py-4 lg:py-5", // Tighter spacing
        spacious: "py-6 md:py-8 lg:py-10", // More spacing
        none: "py-0", // No vertical spacing
      },
    },
    defaultVariants: {
      variant: "default",
      padding: "default",
      spacing: "default",
    },
  }
);

// PageContainer Component Props
export interface PageContainerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof pageContainerVariants> {
  // Whether to show background color (bg-background)
  withBackground?: boolean;

  // Whether to set minimum height to screen height
  fullHeight?: boolean;
}

// Root container for page content with responsive padding and max-width
export function PageContainer({
  className,
  variant,
  padding,
  spacing,
  withBackground = false,
  fullHeight = false,
  children,
  ...props
}: PageContainerProps) {
  return (
    <div
      className={cn(
        withBackground && "bg-background",
        fullHeight && "min-h-screen",
        pageContainerVariants({ variant, padding, spacing }),
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
