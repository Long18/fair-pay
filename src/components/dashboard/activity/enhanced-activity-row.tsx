import * as React from "react";
import { useGo } from "@refinedev/core";
import { formatDistanceToNow, format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PaymentStateBadge } from "@/components/ui/payment-state-badge";
import { OweStatusIndicator } from "@/components/ui/owe-status-indicator";
import { ChevronDownIcon, ChevronRightIcon, MoreVerticalIcon, EyeIcon, CheckCircle2Icon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  showActions?: boolean;
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
      showActions = false,
      className,
    },
    ref
  ) => {
    const go = useGo();

    const handleRowClick = (e: React.MouseEvent) => {
      // Don't navigate if clicking the expand button or dropdown
      if (
        (e.target as HTMLElement).closest("[data-expand-control]") ||
        (e.target as HTMLElement).closest("[data-action-menu]")
      ) {
        return;
      }
      go({ to: `/expenses/show/${activity.id}` });
    };

    const handleExpandClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleExpand();
    };

    const handleQuickView = (e: React.MouseEvent) => {
      e.stopPropagation();
      go({ to: `/expenses/show/${activity.id}` });
    };

    const handleBulkSettlement = (e: React.MouseEvent) => {
      e.stopPropagation();
      go({ to: `/expenses/show/${activity.id}?action=settle` });
    };

    const hasPaymentEvents = activity.paymentEvents.length > 0;
    const showBulkSettlement = activity.paymentState !== "paid";
    const isSettled = activity.paymentState === "paid";

    // Extract unique participant avatars from payment events for settled items
    const settledParticipants = React.useMemo(() => {
      if (!isSettled || activity.paymentEvents.length === 0) return [];
      const seen = new Set<string>();
      const participants: Array<{ id: string; name: string; avatar?: string }> = [];
      for (const event of activity.paymentEvents) {
        if (!seen.has(event.from_user_id)) {
          seen.add(event.from_user_id);
          participants.push({ id: event.from_user_id, name: event.from_user_name, avatar: event.from_user_avatar });
        }
        if (!seen.has(event.to_user_id)) {
          seen.add(event.to_user_id);
          participants.push({ id: event.to_user_id, name: event.to_user_name, avatar: event.to_user_avatar });
        }
      }
      return participants.slice(0, 3);
    }, [isSettled, activity.paymentEvents]);

    // Get latest settlement date
    const settledDate = React.useMemo(() => {
      if (!isSettled || activity.paymentEvents.length === 0) return null;
      const sorted = [...activity.paymentEvents].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      return sorted[0]?.created_at || null;
    }, [isSettled, activity.paymentEvents]);

    return (
      <div ref={ref} className={cn("space-y-0", className)}>
        {/* Parent Row */}
        <div
          onClick={handleRowClick}
          className={cn(
            "flex items-center gap-3 p-4 border rounded-lg",
            "hover:bg-muted/50 cursor-pointer transition-colors",
            "group",
            isSettled && "bg-status-success-bg/20 border-status-success-border/50"
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
            <p className={cn(
              "font-semibold text-base truncate",
              isSettled && "line-through text-muted-foreground"
            )}>
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

            {/* Settled info: participant avatars + settled date */}
            {isSettled && (settledParticipants.length > 0 || settledDate) && (
              <div className="flex items-center gap-2 mt-1.5">
                {settledParticipants.length > 0 && (
                  <div className="flex -space-x-1.5" aria-label="Settled participants">
                    {settledParticipants.map((p) => (
                      <Avatar key={p.id} className="h-5 w-5 border border-status-success-border">
                        <AvatarImage src={p.avatar || undefined} alt={p.name} />
                        <AvatarFallback className="text-[7px] font-bold bg-status-success-bg text-status-success-foreground">
                          {p.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                )}
                {settledDate && (
                  <span className="text-[11px] font-medium text-status-success-foreground">
                    Settled {format(new Date(settledDate), "dd/MM/yyyy")}
                  </span>
                )}
              </div>
            )}
            
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

          {/* Right Section: Amount + Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="text-right">
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

            {/* Action Dropdown */}
            {showActions && (
              <div data-action-menu>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                      aria-label="Transaction actions"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVerticalIcon className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleQuickView}>
                      <EyeIcon className="mr-2 h-4 w-4" />
                      Quick View
                    </DropdownMenuItem>
                    {showBulkSettlement && (
                      <DropdownMenuItem onClick={handleBulkSettlement}>
                        <CheckCircle2Icon className="mr-2 h-4 w-4" />
                        Bulk Settlement
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
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
      case "settle_all_with_person":
      case "settle_all_user_splits":
      case "settle_all_group":
      case "settle_batch":
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
