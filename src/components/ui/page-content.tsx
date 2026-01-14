import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// PageContent Variants - consistent spacing for page content sections
const pageContentVariants = cva(
  "", // Base classes
  {
    variants: {
      spacing: {
        default: "space-y-4 md:space-y-6", // Standard spacing between sections
        compact: "space-y-3 md:space-y-4", // Tighter spacing
        spacious: "space-y-6 md:space-y-8", // More spacing
        none: "space-y-0", // No spacing (manage manually)
      },
    },
    defaultVariants: {
      spacing: "default",
    },
  }
);

// PageContent Component Props
export interface PageContentProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof pageContentVariants> {}

// Wrapper for main page content with consistent vertical spacing
export function PageContent({
  className,
  spacing,
  children,
  ...props
}: PageContentProps) {
  return (
    <div
      className={cn(pageContentVariants({ spacing }), className)}
      {...props}
    >
      {children}
    </div>
  );
}
