import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { ArrowDownIcon, ArrowUpIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { formatCurrency, type SupportedCurrency } from "@/lib/format-utils";

const oweStatusIndicatorVariants = cva(
  "inline-flex items-center justify-center gap-1 font-medium whitespace-nowrap shrink-0",
  {
    variants: {
      direction: {
        owe: "text-red-600 dark:text-red-400",
        owed: "text-green-600 dark:text-green-400",
        neutral: "text-gray-600 dark:text-gray-400",
      },
      size: {
        sm: "text-xs [&>svg]:size-3",
        md: "text-sm [&>svg]:size-3.5",
        lg: "text-base [&>svg]:size-4",
      },
    },
    defaultVariants: {
      direction: "neutral",
      size: "md",
    },
  }
);

export interface OweStatusIndicatorProps
  extends React.ComponentProps<"span">,
    VariantProps<typeof oweStatusIndicatorVariants> {
  direction: "owe" | "owed" | "neutral";
  amount: number;
  currency?: SupportedCurrency;
}

const OweStatusIndicator = React.forwardRef<HTMLSpanElement, OweStatusIndicatorProps>(
  ({ className, direction, size, amount, currency = "VND", ...props }, ref) => {
    const getIcon = () => {
      switch (direction) {
        case "owe":
          return <ArrowDownIcon />;
        case "owed":
          return <ArrowUpIcon />;
        case "neutral":
          return null;
        default:
          return null;
      }
    };

    const formattedAmount = formatCurrency(Math.abs(amount), currency);

    return (
      <span
        ref={ref}
        className={cn(oweStatusIndicatorVariants({ direction, size }), className)}
        aria-label={
          direction === "owe"
            ? `You owe ${formattedAmount}`
            : direction === "owed"
              ? `Owed to you ${formattedAmount}`
              : `Neutral ${formattedAmount}`
        }
        {...props}
      >
        {getIcon()}
        <span>{formattedAmount}</span>
      </span>
    );
  }
);

OweStatusIndicator.displayName = "OweStatusIndicator";

export { OweStatusIndicator, oweStatusIndicatorVariants };
