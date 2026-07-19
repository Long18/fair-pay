import * as React from "react";
import { useGo } from "@refinedev/core";
import { formatDistanceToNow, format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { UserAvatar, getInitials } from "@/components/user-display";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { OweStatusIndicator } from "@/components/ui/owe-status-indicator";
import { PaymentStateBadge } from "@/components/ui/payment-state-badge";
import {
  ArrowRightIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronRightIcon,
  EyeIcon,
  MoreVerticalIcon,
} from "@/components/ui/icons";
import { useHaptics } from "@/hooks/use-haptics";
import { formatCurrency } from "@/lib/locale-utils";
import { onButtonKeyDown } from "@/lib/a11y-keyboard";
import { cn } from "@/lib/utils";
import type { PaymentEvent, EnhancedActivityItem } from "@/types/activity";

export type { PaymentEvent, EnhancedActivityItem } from "@/types/activity";

export interface EnhancedActivityRowProps {
  activity: EnhancedActivityItem;
  currentUserId: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  showDuplicateContext?: boolean;
  showActions?: boolean;
  variant?: "default" | "dashboard";
  className?: string;
}

function getMethodLabel(method: string, t: TFunction) {
  switch (method) {
    case "momo":
      return "MoMo";
    case "banking":
      return t("dashboard.activityFeed.methods.banking", "Banking");
    case "manual":
    default:
      return t("dashboard.activityFeed.methods.manual", "Manual");
  }
}

function getEventTypeLabel(eventType: string, t: TFunction) {
  switch (eventType) {
    case "settle_all":
    case "settle_all_with_person":
    case "settle_all_user_splits":
    case "settle_all_group":
    case "settle_batch":
      return t("dashboard.activityFeed.eventTypes.bulkSettlement", "Bulk Settlement");
    case "momo_payment":
      return t("dashboard.activityFeed.eventTypes.momoPayment", "MoMo Payment");
    case "banking_payment":
      return t("dashboard.activityFeed.eventTypes.bankingPayment", "Banking Payment");
    case "manual_settle":
    default:
      return t("dashboard.activityFeed.eventTypes.settlement", "Settlement");
  }
}

function getDashboardNarrative(
  activity: EnhancedActivityItem,
  currentUserId: string,
  t: TFunction
) {
  if (activity.type === "payment") {
    const payment = activity.originalPayment;
    const isViewerSender = payment?.from_user === currentUserId;
    const actor = isViewerSender
      ? t("common.you", "You")
      : payment?.from_profile?.full_name || t("common.someone", "Someone");
    const counterpartName = isViewerSender
      ? payment?.to_profile?.full_name
      : payment?.from_profile?.full_name;

    return {
      actor,
      action: isViewerSender
        ? t("dashboard.activityFeed.paid", "paid")
        : t("dashboard.activityFeed.sentYou", "sent you"),
      description: isViewerSender
        ? counterpartName || activity.description
        : payment?.note || t("dashboard.activityFeed.aPayment", "a payment"),
    };
  }

  const latestPaymentEvent = activity.paymentEvents[0];

  if (latestPaymentEvent) {
    const actor =
      latestPaymentEvent.from_user_id === currentUserId
        ? t("common.you", "You")
        : latestPaymentEvent.from_user_name;

    return {
      actor,
      action: t("dashboard.activityFeed.paidFor", "paid for"),
      description: activity.description,
    };
  }

  const payerName =
    activity.originalExpense?.paid_by_user_id === currentUserId
      ? t("common.you", "You")
      : activity.originalExpense?.profiles?.full_name || t("common.someone", "Someone");

  return {
    actor: payerName,
    action: t("dashboard.activityFeed.paidFor", "paid for"),
    description: activity.description,
  };
}

const decimalAmountFormatter = new Intl.NumberFormat("en-US", {
  style: "decimal",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function getDefaultDisplayAmount(activity: EnhancedActivityItem) {
  return {
    totalLabel: `${decimalAmountFormatter.format(activity.totalAmount)} ${activity.currency}`,
    userLabel: `${decimalAmountFormatter.format(activity.userAmount)} ${activity.currency}`,
    className:
      activity.oweStatus.direction === "owe"
        ? "text-semantic-negative"
        : activity.oweStatus.direction === "owed"
          ? "text-semantic-positive"
          : "text-foreground",
  };
}

function getDashboardDisplayAmount(activity: EnhancedActivityItem, currentUserId: string) {
  if (activity.type === "payment") {
    const isViewerSender = activity.originalPayment?.from_user === currentUserId;

    return {
      prefix: isViewerSender ? "-" : "+",
      label: formatCurrency(activity.userAmount, activity.currency),
      className: isViewerSender ? "text-semantic-negative" : "text-semantic-positive",
    };
  }

  const latestPaymentEvent = activity.paymentEvents[0];

  if (latestPaymentEvent) {
    if (latestPaymentEvent.to_user_id === currentUserId) {
      return {
        prefix: "+",
        label: formatCurrency(latestPaymentEvent.amount, latestPaymentEvent.currency),
        className: "text-semantic-positive",
      };
    }

    if (latestPaymentEvent.from_user_id === currentUserId) {
      return {
        prefix: "-",
        label: formatCurrency(latestPaymentEvent.amount, latestPaymentEvent.currency),
        className: "text-semantic-negative",
      };
    }

    return {
      prefix: "",
      label: formatCurrency(latestPaymentEvent.amount, latestPaymentEvent.currency),
      className: "text-foreground",
    };
  }

  if (activity.oweStatus.direction === "neutral") {
    return {
      prefix: "",
      label: formatCurrency(activity.amount, activity.currency),
      className: "text-foreground",
    };
  }

  return {
    prefix: activity.oweStatus.direction === "owed" ? "+" : "-",
    label: formatCurrency(activity.oweStatus.amount, activity.currency),
    className:
      activity.oweStatus.direction === "owed"
        ? "text-semantic-positive"
        : "text-semantic-negative",
  };
}

function ActivityDetailLink({
  activity,
  className,
}: {
  activity: EnhancedActivityItem;
  className?: string;
}) {
  const go = useGo();
  const { tap } = useHaptics();
  const { t } = useTranslation();

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("h-8 justify-between rounded-lg px-3 text-sm font-medium", className)}
      onClick={(event) => {
        event.stopPropagation();
        tap();
        go({
          to:
            activity.type === "payment"
              ? `/payments/show/${activity.id}`
              : `/expenses/show/${activity.id}`,
        });
      }}
    >
      <span>
        {activity.type === "payment"
          ? t("dashboard.openPaymentDetail", "Open payment detail")
          : t("dashboard.openExpenseDetail", "Open expense detail")}
      </span>
      <ArrowRightIcon className="h-4 w-4" />
    </Button>
  );
}

function PayingParticipantsChips({
  participants,
}: {
  participants: EnhancedActivityItem["payingParticipants"];
}) {
  if (participants.length === 0) {
    return null;
  }

  const visibleParticipants = participants.slice(0, 3);
  const remainingCount = participants.length - visibleParticipants.length;

  return (
    <span className="inline-flex items-center">
      <span className="flex -space-x-1.5">
        {visibleParticipants.map((participant) => (
          <UserAvatar
            key={participant.id}
            user={{
              full_name: participant.name,
              avatar_url: participant.avatar || null,
            }}
            size="xs"
            className="border border-background shadow-xs"
          />
        ))}
      </span>

      {remainingCount > 0 && (
        <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-border bg-background px-1.5 text-[10px] font-semibold text-muted-foreground shadow-xs">
          +{remainingCount}
        </span>
      )}
    </span>
  );
}

const DefaultPaymentEventRow: React.FC<{
  event: PaymentEvent;
  currentUserId: string;
}> = ({ event, currentUserId }) => (
  <DefaultPaymentEventRowInner event={event} currentUserId={currentUserId} />
);

const DefaultPaymentEventRowInner: React.FC<{
  event: PaymentEvent;
  currentUserId: string;
}> = ({ event, currentUserId }) => {
  const { t } = useTranslation();

  return (
  <div
    className={cn(
      "flex items-center gap-3 rounded-md border border-muted bg-muted/30 p-3 text-sm"
    )}
  >
    <div className="flex-shrink-0">
      <span className="text-xs font-medium text-muted-foreground">
        {getEventTypeLabel(event.event_type, t)}
      </span>
    </div>

    <div className="min-w-0 flex-1">
      <p className="text-sm">
        <span
          className={cn(
            "font-medium",
            event.from_user_id === currentUserId && "text-semantic-negative"
          )}
        >
          {event.from_user_id === currentUserId ? t("common.you", "You") : event.from_user_name}
        </span>
        {" → "}
        <span
          className={cn(
            "font-medium",
            event.to_user_id === currentUserId && "text-semantic-positive"
          )}
        >
          {event.to_user_id === currentUserId ? t("common.you", "You") : event.to_user_name}
        </span>
      </p>

      <p className="mt-0.5 text-xs text-muted-foreground">
        {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
        {" • "}
        {getMethodLabel(event.method, t)}
      </p>
    </div>

    <div className="flex-shrink-0 text-right">
      <p className="text-sm font-semibold">
        {formatCurrency(event.amount, event.currency)}
      </p>
    </div>
  </div>
  );
};

const DashboardPaymentTrailRow: React.FC<{
  event: PaymentEvent;
  currentUserId: string;
}> = ({ event, currentUserId }) => {
  const { t } = useTranslation();

  return (
    <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">
          <span className={cn(event.from_user_id === currentUserId && "text-semantic-negative")}>
            {event.from_user_id === currentUserId ? t("common.you", "You") : event.from_user_name}
          </span>
          {" → "}
          <span className={cn(event.to_user_id === currentUserId && "text-semantic-positive")}>
            {event.to_user_id === currentUserId ? t("common.you", "You") : event.to_user_name}
          </span>
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {getMethodLabel(event.method, t)} ·{" "}
          {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
        </p>
      </div>
      <p className="text-sm font-semibold tabular-nums text-foreground md:text-right">
        {formatCurrency(event.amount, event.currency)}
      </p>
    </div>
  );
};

const DefaultActivityRow = React.forwardRef<HTMLDivElement, EnhancedActivityRowProps>(
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
    const { t } = useTranslation();
    const { tap } = useHaptics();

    const detailRoute =
      activity.type === "payment"
        ? `/payments/show/${activity.id}`
        : `/expenses/show/${activity.id}`;

    const handleRowClick = (event?: React.MouseEvent) => {
      if (
        event &&
        ((event.target as HTMLElement).closest("[data-expand-control]") ||
          (event.target as HTMLElement).closest("[data-action-menu]"))
      ) {
        return;
      }

      tap();
      go({ to: detailRoute });
    };

    const handleExpandClick = (event: React.MouseEvent) => {
      event.stopPropagation();
      tap();
      onToggleExpand();
    };

    const handleQuickView = (event: React.MouseEvent) => {
      event.stopPropagation();
      tap();
      go({ to: detailRoute });
    };

    const handleBulkSettlement = (event: React.MouseEvent) => {
      event.stopPropagation();
      tap();
      go({ to: `/expenses/show/${activity.id}?action=settle` });
    };

    const hasPaymentEvents = activity.type === "expense" && activity.paymentEvents.length > 0;
    const showBulkSettlement = activity.type === "expense" && activity.paymentState !== "paid";
    const isSettled = activity.paymentState === "paid";
    const displayAmount = getDefaultDisplayAmount(activity);

    const settledParticipants = React.useMemo(() => {
      if (!isSettled || activity.paymentEvents.length === 0) {
        return [];
      }

      const seen = new Set<string>();
      const participants: Array<{ id: string; name: string; avatar?: string }> = [];

      for (const paymentEvent of activity.paymentEvents) {
        if (!seen.has(paymentEvent.from_user_id)) {
          seen.add(paymentEvent.from_user_id);
          participants.push({
            id: paymentEvent.from_user_id,
            name: paymentEvent.from_user_name,
            avatar: paymentEvent.from_user_avatar,
          });
        }

        if (!seen.has(paymentEvent.to_user_id)) {
          seen.add(paymentEvent.to_user_id);
          participants.push({
            id: paymentEvent.to_user_id,
            name: paymentEvent.to_user_name,
            avatar: paymentEvent.to_user_avatar,
          });
        }
      }

      return participants.slice(0, 3);
    }, [activity.paymentEvents, isSettled]);

    const settledDate = React.useMemo(() => {
      if (!isSettled || activity.paymentEvents.length === 0) {
        return null;
      }

      const sortedEvents = [...activity.paymentEvents].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      return sortedEvents[0]?.created_at || null;
    }, [activity.paymentEvents, isSettled]);

    return (
      <div ref={ref} className={cn("space-y-0 card-hover-subtle", className)}>
        <div
          role="button"
          tabIndex={0}
          onClick={handleRowClick}
          onKeyDown={onButtonKeyDown(handleRowClick)}
          className={cn(
            "group flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50",
            isSettled && "border-status-success-border/50 bg-status-success-bg/20"
          )}
        >
          <div className="flex flex-shrink-0 items-center gap-2">
            <PaymentStateBadge
              state={activity.paymentState}
              percentage={activity.partialPercentage}
              size="md"
            />

            {hasPaymentEvents && (
              <button type="button"
                data-expand-control
                onClick={handleExpandClick}
                className={cn(
                  "rounded p-1 transition-colors hover:bg-muted",
                  "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                )}
                aria-label={
                  isExpanded
                    ? t("dashboard.activityFeed.collapsePayments", "Collapse payment events")
                    : t("dashboard.activityFeed.expandPayments", "Expand payment events")
                }
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

          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "truncate text-base font-semibold",
                isSettled && "text-muted-foreground line-through"
              )}
            >
              {activity.description}
            </p>

            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>{formatDistanceToNow(new Date(activity.date), { addSuffix: true })}</span>

              {activity.groupName && (
                <>
                  <span>•</span>
                  <span className="truncate">{activity.groupName}</span>
                </>
              )}

              <span>•</span>
              <span>
                {activity.participantCount}{" "}
                {activity.participantCount === 1
                  ? t("dashboard.activityFeed.person", "person")
                  : t("dashboard.activityFeed.people", "people")}
              </span>

              {showDuplicateContext && activity.contextLine && (
                <>
                  <span>•</span>
                  <span className="text-xs">{activity.contextLine}</span>
                </>
              )}
            </div>

            {isSettled && (settledParticipants.length > 0 || settledDate) && (
              <div className="mt-1.5 flex items-center gap-2">
                {settledParticipants.length > 0 && (
                  <div className="flex -space-x-1.5" aria-label="Settled participants">
                    {settledParticipants.map((participant) => (
                      <Avatar
                        key={participant.id}
                        className="h-5 w-5 border border-status-success-border"
                      >
                        <AvatarImage src={participant.avatar || undefined} alt={participant.name} />
                        <AvatarFallback className="bg-status-success-bg text-[7px] font-bold text-status-success-foreground">
                          {getInitials(participant.name)}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                )}

                {settledDate && (
                  <span className="text-[11px] font-medium text-status-success-foreground">
                    {t("dashboard.activityFeed.settledOn", {
                      defaultValue: "Settled {{date}}",
                      date: format(new Date(settledDate), "dd/MM/yyyy"),
                    })}
                  </span>
                )}
              </div>
            )}

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

          <div className="flex flex-shrink-0 items-center gap-2">
            <div className="text-right">
              <p className="text-xs font-medium text-muted-foreground">
                {t("dashboard.activityFeed.total", "Total")}
              </p>
              <p className="text-sm font-semibold tabular-nums text-foreground">
                {displayAmount.totalLabel}
              </p>
              <p className="mt-1 text-xs font-medium text-muted-foreground">
                {t("dashboard.activityFeed.myShare", "My share")}
              </p>
              <p className={cn("text-lg font-bold tabular-nums", displayAmount.className)}>
                {displayAmount.userLabel}
              </p>
            </div>

            {showActions && (
              <div data-action-menu>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100"
                      aria-label={t("dashboard.activityFeed.actions", "Transaction actions")}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <MoreVerticalIcon className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleQuickView}>
                      <EyeIcon className="mr-2 h-4 w-4" />
                      {t("dashboard.activityFeed.quickView", "Quick View")}
                    </DropdownMenuItem>
                    {showBulkSettlement && (
                      <DropdownMenuItem onClick={handleBulkSettlement}>
                        <CheckCircle2Icon className="mr-2 h-4 w-4" />
                        {t("dashboard.activityFeed.bulkSettlement", "Bulk Settlement")}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </div>

        <AnimatePresence initial={false}>
          {isExpanded && hasPaymentEvents && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="mr-4 ml-12 space-y-2 pt-2 pb-2">
                {activity.paymentEvents.map((paymentEvent) => (
                  <DefaultPaymentEventRow
                    key={paymentEvent.id}
                    event={paymentEvent}
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

DefaultActivityRow.displayName = "DefaultActivityRow";


function getDashboardActorVisual(
  activity: EnhancedActivityItem,
  currentUserId: string,
  t: TFunction
) {
  if (activity.type === "payment") {
    const payment = activity.originalPayment;
    const isViewerSender = payment?.from_user === currentUserId;
    const profile = isViewerSender ? payment?.from_profile : payment?.from_profile;
    const name = isViewerSender
      ? t("common.you", "You")
      : payment?.from_profile?.full_name || t("common.someone", "Someone");
    return {
      name,
      avatar: profile?.avatar_url || payment?.from_profile?.avatar_url || null,
    };
  }

  const latest = activity.paymentEvents[0];
  if (latest) {
    return {
      name:
        latest.from_user_id === currentUserId
          ? t("common.you", "You")
          : latest.from_user_name,
      avatar: latest.from_user_avatar || null,
    };
  }

  const participant = activity.payingParticipants[0];
  if (participant) {
    return { name: participant.name, avatar: participant.avatar || null };
  }

  const expenseProfile = activity.originalExpense?.profiles;
  return {
    name: expenseProfile?.full_name || t("common.someone", "Someone"),
    avatar: expenseProfile?.avatar_url || null,
  };
}

function getStatusRingClass(paymentState: EnhancedActivityItem["paymentState"]) {
  switch (paymentState) {
    case "paid":
      return "ring-status-success-foreground";
    case "partial":
      return "ring-status-info-foreground";
    case "unpaid":
      return "ring-status-warning-foreground";
    default: {
      const _exhaustive: never = paymentState;
      return _exhaustive;
    }
  }
}

function getStatusDotClass(paymentState: EnhancedActivityItem["paymentState"]) {
  switch (paymentState) {
    case "paid":
      return "bg-status-success-foreground";
    case "partial":
      return "bg-status-info-foreground";
    case "unpaid":
      return "bg-status-warning-foreground";
    default: {
      const _exhaustive: never = paymentState;
      return _exhaustive;
    }
  }
}

const DashboardActivityRow = React.forwardRef<HTMLDivElement, EnhancedActivityRowProps>(
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
    const { t } = useTranslation();
    const { tap } = useHaptics();
    const narrative = getDashboardNarrative(activity, currentUserId, t);
    const displayAmount = getDashboardDisplayAmount(activity, currentUserId);
    const latestPaymentEvent = activity.paymentEvents[0];
    const hasPaymentEvents = activity.type === "expense" && activity.paymentEvents.length > 0;
    const activityTimestamp = activity.activityDate || activity.date;
    const isPartial = activity.paymentState === "partial";
    const isExpense = activity.type === "expense";
    const actor = getDashboardActorVisual(activity, currentUserId, t);

    return (
      <div ref={ref} className={cn("relative", className)}>
        <button
          type="button"
          onClick={() => {
            if (!isExpense) {
              tap();
              go({ to: `/payments/show/${activity.id}` });
              return;
            }
            tap();
            onToggleExpand();
          }}
          className={cn(
            "group relative grid w-full grid-cols-[3rem_minmax(0,1fr)_auto] gap-3 px-4 py-3.5 text-left",
            "transition-colors hover:bg-muted/50",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
            isExpanded && "bg-muted/30"
          )}
          aria-expanded={isExpense ? isExpanded : undefined}
          aria-label={
            isExpense
              ? isExpanded
                ? t("dashboard.activityFeed.collapsePayments", "Collapse payment events")
                : t("dashboard.activityFeed.expandPayments", "Expand payment events")
              : t("dashboard.activityFeed.openPayment", "Open payment")
          }
        >
          {/* Timeline rail + avatar */}
          <div className="relative flex justify-center pt-0.5">
            <span
              className="absolute top-10 bottom-[-1.15rem] left-1/2 w-px -translate-x-1/2 bg-border group-last:hidden"
              aria-hidden
            />
            <span className="relative">
              <UserAvatar
                user={{ full_name: actor.name, avatar_url: actor.avatar }}
                size="lg"
                className={cn("ring-2 ring-offset-2 ring-offset-background", getStatusRingClass(activity.paymentState))}
              />
              <span
                className={cn(
                  "absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-background",
                  getStatusDotClass(activity.paymentState)
                )}
                aria-hidden
              />
            </span>
          </div>

          {/* Narrative */}
          <div className="min-w-0 space-y-1.5">
            <p className="typography-row-title text-balance">
              <span className="font-semibold text-foreground">{narrative.actor}</span>{" "}
              <span className="font-normal text-muted-foreground">{narrative.action}</span>{" "}
              <span className="font-semibold text-foreground">{narrative.description}</span>
            </p>

            <div className="flex flex-wrap items-center gap-1.5">
              <PaymentStateBadge
                state={activity.paymentState}
                percentage={activity.partialPercentage}
                size="sm"
              />
              {activity.groupName && (
                <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {activity.groupName}
                </span>
              )}
              {latestPaymentEvent && (
                <span className="text-[11px] text-muted-foreground">
                  {getMethodLabel(latestPaymentEvent.method, t)}
                </span>
              )}
              <span className="text-[11px] text-muted-foreground">
                {formatDistanceToNow(new Date(activityTimestamp), { addSuffix: true })}
              </span>
              {showDuplicateContext && activity.contextLine && (
                <span className="text-[11px] text-muted-foreground">{activity.contextLine}</span>
              )}
            </div>

            {isPartial && (
              <div className="max-w-xs pt-0.5">
                <div className="mb-1 flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  <span>{t("dashboard.activityFeed.settled", "Settled")}</span>
                  <span className="tabular-nums">{activity.settlementProgressPct}%</span>
                </div>
                <Progress
                  value={activity.settlementProgressPct}
                  className="h-1.5 bg-status-info-bg [&_[data-slot=progress-indicator]]:bg-status-info-foreground"
                />
              </div>
            )}

            {activity.payingParticipants.length > 0 && (
              <div className="pt-0.5">
                <PayingParticipantsChips participants={activity.payingParticipants} />
              </div>
            )}
          </div>

          {/* Amount */}
          <div className="flex shrink-0 flex-col items-end gap-1 self-start pt-0.5">
            <span className={cn("typography-amount-prominent", displayAmount.className)}>
              {displayAmount.prefix}
              {displayAmount.label}
            </span>
            <span className="inline-flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors group-hover:bg-muted group-hover:text-foreground">
              {isExpense ? (
                isExpanded ? (
                  <ChevronDownIcon className="size-4" />
                ) : (
                  <ChevronRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
                )
              ) : (
                <ChevronRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
              )}
            </span>
          </div>
        </button>

        <AnimatePresence initial={false}>
          {isExpense && isExpanded && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="border-t border-border/70 bg-muted/25"
            >
              <div className="space-y-3 px-4 py-4 pl-[4.5rem]">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("dashboard.activityFeed.paymentTrail", "Payment trail")}
                </p>

                {hasPaymentEvents ? (
                  <div className="relative space-y-0">
                    <span
                      className="absolute top-3 bottom-3 left-[11px] w-px bg-border"
                      aria-hidden
                    />
                    {activity.paymentEvents.map((paymentEvent) => (
                      <div key={paymentEvent.id} className="relative flex gap-3 py-2">
                        <span className="relative z-10 mt-1.5 size-2.5 shrink-0 rounded-full bg-primary ring-4 ring-muted/25" />
                        <div className="min-w-0 flex-1 rounded-lg border border-border/80 bg-background px-3 py-2.5">
                          <DashboardPaymentTrailRow
                            event={paymentEvent}
                            currentUserId={currentUserId}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
                    {t(
                      "dashboard.activityFeed.noPaymentsForExpense",
                      "No payments yet for this expense."
                    )}
                  </div>
                )}

                <ActivityDetailLink activity={activity} className="w-full sm:ml-auto sm:w-auto" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

DashboardActivityRow.displayName = "DashboardActivityRow";

export const EnhancedActivityRow = React.forwardRef<HTMLDivElement, EnhancedActivityRowProps>(
  (props, ref) => {
    if (props.variant === "dashboard") {
      return <DashboardActivityRow ref={ref} {...props} />;
    }

    return <DefaultActivityRow ref={ref} {...props} />;
  }
);

EnhancedActivityRow.displayName = "EnhancedActivityRow";
