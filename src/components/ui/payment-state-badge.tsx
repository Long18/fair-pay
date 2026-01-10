import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { CheckCircle2Icon, ClockIcon, TrendingUpIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

const paymentStateBadgeVariants = cva(
  "inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 gap-1 transition-colors",
  {
    variants: {
      state: {
        paid: "border-status-success-border bg-status-success-bg text-status-success-foreground",
        unpaid: "border-status-warning-border bg-status-warning-bg text-status-warning-foreground",
        partial: "border-status-info-border bg-status-info-bg text-status-info-foreground",
      },
      size: {
        sm: "text-xs px-1.5 py-0.5 [&>svg]:size-2.5",
        md: "text-xs px-2 py-0.5 [&>svg]:size-3",
        lg: "text-sm px-2.5 py-1 [&>svg]:size-3.5",
      },
    },
    defaultVariants: {
      state: "unpaid",
      size: "md",
    },
  }
);

export interface PaymentStateBadgeProps
  extends React.ComponentProps<"span">,
    VariantProps<typeof paymentStateBadgeVariants> {
  state: "paid" | "unpaid" | "partial";
  percentage?: number;
}

const PaymentStateBadge = React.forwardRef<HTMLSpanElement, PaymentStateBadgeProps>(
  ({ className, state, size, percentage, ...props }, ref) => {
    const getIcon = () => {
      switch (state) {
        case "paid":
          return <CheckCircle2Icon />;
        case "unpaid":
          return <ClockIcon />;
        case "partial":
          return <TrendingUpIcon />;
        default:
          return null;
      }
    };

    const getLabel = () => {
      switch (state) {
        case "paid":
          return "Paid";
        case "unpaid":
          return "Unpaid";
        case "partial":
          return percentage !== undefined ? `${percentage}% Paid` : "Partial";
        default:
          return "";
      }
    };

    return (
      <span
        ref={ref}
        className={cn(paymentStateBadgeVariants({ state, size }), className)}
        {...props}
      >
        {getIcon()}
        <span>{getLabel()}</span>
      </span>
    );
  }
);

PaymentStateBadge.displayName = "PaymentStateBadge";

export { PaymentStateBadge, paymentStateBadgeVariants };
