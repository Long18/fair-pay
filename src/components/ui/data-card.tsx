import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import {
  Card,
  CardHeader as BaseCardHeader,
  CardTitle as BaseCardTitle,
  CardDescription,
  CardContent as BaseCardContent,
  CardFooter as BaseCardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * DataCard Variants
 *
 * Provides elevation and padding variants for data display cards.
 * Use DataCard for self-contained data entities (balance summary, statistics, etc.)
 */
const dataCardVariants = cva(
  "", // Base classes handled by Card component
  {
    variants: {
      variant: {
        default: "shadow-sm hover:shadow-md",
        elevated: "shadow-md hover:shadow-lg",
        flat: "shadow-none",
      },
      padding: {
        compact: "gap-3", // Tighter layout
        comfortable: "gap-6", // Default spacing
        spacious: "gap-8", // More whitespace
      },
    },
    defaultVariants: {
      variant: "default",
      padding: "comfortable",
    },
  }
);

/**
 * DataCard Root Component
 *
 * Wrapper around shadcn/ui Card with CVA variants for consistent data display.
 *
 * @example
 * <DataCard variant="elevated" padding="compact">
 *   <DataCard.Header title="Balance" badge={<Badge>Pending</Badge>} />
 *   <DataCard.Content>
 *     <span className="typography-amount-large">$1,234.56</span>
 *   </DataCard.Content>
 *   <DataCard.Footer>
 *     <Button>Settle</Button>
 *   </DataCard.Footer>
 * </DataCard>
 */
interface DataCardProps
  extends React.ComponentProps<typeof Card>,
    VariantProps<typeof dataCardVariants> {}

function DataCard({
  className,
  variant,
  padding,
  ...props
}: DataCardProps) {
  return (
    <Card
      className={cn(dataCardVariants({ variant, padding }), className)}
      {...props}
    />
  );
}

/**
 * DataCard.Header
 *
 * Header section with title and optional badge/action slot.
 *
 * @example
 * <DataCard.Header
 *   title="Balance Summary"
 *   description="Your current balance"
 *   badge={<Badge variant="success">Settled</Badge>}
 * />
 */
interface DataCardHeaderProps extends Omit<React.ComponentProps<"div">, "title"> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  badge?: React.ReactNode;
}

function DataCardHeader({
  className,
  title,
  description,
  badge,
  children,
  ...props
}: DataCardHeaderProps) {
  return (
    <BaseCardHeader className={className} {...props}>
      {title && <BaseCardTitle>{title}</BaseCardTitle>}
      {description && <CardDescription>{description}</CardDescription>}
      {badge && (
        <div className="col-start-2 row-span-2 row-start-1 self-start justify-self-end">
          {badge}
        </div>
      )}
      {children}
    </BaseCardHeader>
  );
}

/**
 * DataCard.Content
 *
 * Main content area of the card.
 * Inherits padding from CardContent (px-6).
 *
 * @example
 * <DataCard.Content>
 *   <BalanceChart data={data} />
 * </DataCard.Content>
 */
interface DataCardContentProps extends React.ComponentProps<"div"> {
  noPadding?: boolean; // Remove horizontal padding if needed
}

function DataCardContent({
  className,
  noPadding,
  ...props
}: DataCardContentProps) {
  if (noPadding) {
    return <div className={cn("px-0", className)} {...props} />;
  }

  return <BaseCardContent className={className} {...props} />;
}

/**
 * DataCard.Footer
 *
 * Footer section for actions (buttons, links).
 * Typically used for CTAs like "View Details", "Settle", etc.
 *
 * @example
 * <DataCard.Footer>
 *   <Button variant="outline" size="sm">Cancel</Button>
 *   <Button size="sm">Settle Balance</Button>
 * </DataCard.Footer>
 */
interface DataCardFooterProps extends React.ComponentProps<"div"> {
  align?: "start" | "center" | "end" | "between";
}

function DataCardFooter({
  className,
  align = "end",
  ...props
}: DataCardFooterProps) {
  const alignClass = {
    start: "justify-start",
    center: "justify-center",
    end: "justify-end",
    between: "justify-between",
  }[align];

  return (
    <BaseCardFooter className={cn("gap-2", alignClass, className)} {...props} />
  );
}

// Compound component pattern
DataCard.Header = DataCardHeader;
DataCard.Content = DataCardContent;
DataCard.Footer = DataCardFooter;

export { DataCard, dataCardVariants };
export type {
  DataCardProps,
  DataCardHeaderProps,
  DataCardContentProps,
  DataCardFooterProps,
};
