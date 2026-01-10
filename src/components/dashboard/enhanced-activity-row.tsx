import * as React from "react";
import { useGo } from "@refinedev/core";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

import { PaymentStateBadge } from "@/components/ui/payment-state-badge";
import { OweStatusIndicator } from "@/components/ui/owe-status-indicator";
import { ChevronDownIcon, ChevronRightIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import type { SupportedCurrency } from "@/lib/format-utils";
import type { PaymentEvent, EnhancedActivityItem } from "@/types/activity";

// Re-export types from centralized location
export type { PaymentEvent, EnhancedActivityItem } from "@/types/activity";

// =============================================
// Component Props
// =============================================

export interface EnhancedActivityRowProps {
  activity: EnhancedActivityItem;
  currentUserId: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  showDuplicateContext?: boolean;
  className?: string;
}

// =============================================
// Enhanced Activity Row Component
// =============================================

export const EnhancedActivityRow = React.forwardRef<
  HTMLDivElement,
  EnhancedActivityRowProps
>(
  (
    {
      activity,
      currentUserId,
      isExpanded,
      onToggleExpand,
      showDuplicateContext = false,
      className,
    },
    ref
  ) => {
    const go = useGo();

    const handleRowClick = (e: React.MouseEvent) => {
      // Don't navigate if clicking the expand button
      if ((e.target as HTMLElement).closest("[data-expand-control]")) {
        return;
      }
      go({ to: `/expenses/show/${activity.id}` });
    };

    const handleExpandClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleExpand();
    };

    const hasPaymentEvents = activity.paymentEvents.length > 0;

    return (
      <div ref={ref} className={cn("space-y-0", className)}>
        {/* Parent Row */}
        <div
          onClick={handleRowClick}
          className={cn(
            "flex items-center gap-3 p-4 border rounded-lg",
            "hover:bg-muted/50 cursor-pointer transition-colors",
            "group"
          )}
        >
          {/* Left Section: Payment State Badge + Expand Control */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <PaymentStateBadge
              state={activity.paymentState}
              percentage={activity.partialPercentage}
              size="md"
            />
            
            {hasPaymentEvents && (
              <button
                data-expand-control
                onClick={handleExpandClick}
                className={cn(
                  "p-1 rounded hover:bg-muted transition-colors",
                  "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                )}
                aria-label={isExpanded ? "Collapse payment events" : "Expand payment events"}
                aria-expanded={isExpanded}
              >
                {isExpanded ? (
                  <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRightIcon className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            )}
          </div>

          {/* Center Section: Expense Details */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-base truncate">
              {activity.description}
            </p>
            
            {/* Context Line */}
            <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-muted-foreground">
              <span>
                {formatDistanceToNow(new Date(activity.date), { addSuffix: true })}
              </span>
              
              {activity.groupName && (
                <>
                  <span>•</span>
                  <span className="truncate">{activity.groupName}</span>
                </>
              )}
              
              <span>•</span>
              <span>
                {activity.participantCount} {activity.participantCount === 1 ? "person" : "people"}
              </span>
              
              {/* Duplicate disambiguation context */}
              {showDuplicateContext && activity.contextLine && (
                <>
                  <span>•</span>
                  <span className="text-xs">{activity.contextLine}</span>
                </>
              )}
            </div>
            
            {/* Owe/Owed Indicator */}
            {activity.oweStatus.direction !== "neutral" && (
              <div className="mt-2">
                <OweStatusIndicator
                  direction={activity.oweStatus.direction}
                  amount={activity.oweStatus.amount}
                  currency={activity.currency}
                  size="sm"
                />
              </div>
            )}
          </div>

          {/* Right Section: Amount */}
          <div className="text-right flex-shrink-0">
            <p className={cn(
              "font-bold text-lg",
              activity.oweStatus.direction === "owe" && "text-semantic-negative",
              activity.oweStatus.direction === "owed" && "text-semantic-positive",
              activity.oweStatus.direction === "neutral" && "text-foreground"
            )}>
              {new Intl.NumberFormat("en-US", {
                style: "decimal",
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              }).format(activity.amount)}{" "}
              {activity.currency}
            </p>
          </div>
        </div>

        {/* Child Rows: Payment Events (Collapsed by Default) */}
        <AnimatePresence initial={false}>
          {isExpanded && hasPaymentEvents && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="ml-12 mr-4 space-y-2 pt-2 pb-2">
                {activity.paymentEvents.map((event: PaymentEvent) => (
                  <PaymentEventRow
                    key={event.id}
                    event={event}
                    currentUserId={currentUserId}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

EnhancedActivityRow.displayName = "EnhancedActivityRow";

// =============================================
// Payment Event Row Component (Child)
// =============================================

interface PaymentEventRowProps {
  event: PaymentEvent;
  currentUserId: string;
}

const PaymentEventRow: React.FC<PaymentEventRowProps> = ({ event, currentUserId }) => {
  const getMethodLabel = (method: string) => {
    switch (method) {
      case "momo":
        return "MoMo";
      case "banking":
        return "Banking";
      case "manual":
      default:
        return "Manual";
    }
  };

  const getEventTypeLabel = (eventType: string) => {
    switch (eventType) {
      case "settle_all":
        return "Bulk Settlement";
      case "momo_payment":
        return "MoMo Payment";
      case "banking_payment":
        return "Banking Payment";
      case "manual_settle":
      default:
        return "Settlement";
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-md",
        "bg-muted/30 border border-muted",
        "text-sm"
      )}
    >
      {/* Event Icon/Type */}
      <div className="flex-shrink-0">
        <span className="text-xs font-medium text-muted-foreground">
          {getEventTypeLabel(event.event_type)}
        </span>
      </div>

      {/* Payment Flow: From → To */}
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <span className={cn(
            "font-medium",
            event.from_user_id === currentUserId && "text-semantic-negative"
          )}>
            {event.from_user_id === currentUserId ? "You" : event.from_user_name}
          </span>
          {" → "}
          <span className={cn(
            "font-medium",
            event.to_user_id === currentUserId && "text-semantic-positive"
          )}>
            {event.to_user_id === currentUserId ? "You" : event.to_user_name}
          </span>
        </p>
        
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
          {" • "}
          {getMethodLabel(event.method)}
        </p>
      </div>

      {/* Amount */}
      <div className="text-right flex-shrink-0">
        <p className="font-semibold text-sm">
          {new Intl.NumberFormat("en-US", {
            style: "decimal",
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          }).format(event.amount)}{" "}
          {event.currency}
        </p>
      </div>
    </div>
  );
};
