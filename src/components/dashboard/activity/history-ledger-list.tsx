import * as React from "react";
import { formatDistanceToNow } from "date-fns";
import { useGo } from "@refinedev/core";
import { useTranslation } from "react-i18next";

import { AnimatedList } from "@/components/ui/animated-list";
import { AnimatedRow } from "@/components/ui/animated-row";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { LoadingBeam } from "@/components/ui/loading-beam";
import { PaymentStateBadge } from "@/components/ui/payment-state-badge";
import { PaginationControls, type PaginationMetadata } from "@/components/ui/pagination-controls";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  HistoryIcon,
} from "@/components/ui/icons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useHaptics } from "@/hooks/use-haptics";
import { formatCurrency } from "@/lib/locale-utils";
import { cn } from "@/lib/utils";
import {
  BALANCE_EXPAND_GLASS_SURFACE,
  BALANCE_TABLE_GLASS_DIVIDE,
  BALANCE_TABLE_GLASS_SEPARATOR,
  BALANCE_TABLE_ROW_BASE,
  BALANCE_TABLE_ROW_ZEBRA_EVEN,
} from "@/components/dashboard/balance/balance-table-surface";
import type { EnhancedActivityItem, PaymentEvent } from "@/types/activity";

import { EnhancedActivityRow } from "./enhanced-activity-row";

interface HistoryLedgerListProps {
  activities: EnhancedActivityItem[];
  currentUserId: string;
  isLoading?: boolean;
  pageSize?: number;
}

function getDetailRoute(activity: EnhancedActivityItem) {
  return activity.type === "payment"
    ? `/payments/show/${activity.id}`
    : `/expenses/show/${activity.id}`;
}

function getCounterpartyLabel(
  activity: EnhancedActivityItem,
  currentUserId: string,
  youLabel: string,
  peopleLabel: (count: number) => string
) {
  if (activity.type === "payment") {
    const payment = activity.originalPayment;
    const fromName =
      payment?.from_user === currentUserId
        ? youLabel
        : payment?.from_profile?.full_name || "—";
    const toName =
      payment?.to_user === currentUserId
        ? youLabel
        : payment?.to_profile?.full_name || "—";

    return `${fromName} → ${toName}`;
  }

  const payerName =
    activity.originalExpense?.paid_by_user_id === currentUserId
      ? youLabel
      : activity.originalExpense?.profiles?.full_name || "—";

  return `${payerName} • ${peopleLabel(activity.participantCount)}`;
}

function PaymentTrail({
  events,
  currentUserId,
}: {
  events: PaymentEvent[];
  currentUserId: string;
}) {
  const { t } = useTranslation();

  return (
    <div className="divide-y divide-border/60 rounded-lg border border-border/60 bg-card">
      {events.map((event) => (
        <div
          key={event.id}
          className="grid gap-1 px-3 py-2 text-sm md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">
              {event.from_user_id === currentUserId ? t("common.you", "You") : event.from_user_name}
              {" → "}
              {event.to_user_id === currentUserId ? t("common.you", "You") : event.to_user_name}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
            </p>
          </div>
          <p className="text-sm font-semibold tabular-nums text-foreground md:text-right">
            {formatCurrency(event.amount, event.currency)}
          </p>
        </div>
      ))}
    </div>
  );
}

export function HistoryLedgerList({
  activities,
  currentUserId,
  isLoading = false,
  pageSize = 10,
}: HistoryLedgerListProps) {
  const { t } = useTranslation();
  const go = useGo();
  const { tap } = useHaptics();
  const [currentPage, setCurrentPage] = React.useState(1);
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(new Set());

  const sortedActivities = React.useMemo(
    () =>
      [...activities].sort(
        (a, b) => new Date(b.activityDate).getTime() - new Date(a.activityDate).getTime()
      ),
    [activities]
  );

  const totalPages = Math.max(1, Math.ceil(sortedActivities.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedActivities = React.useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return sortedActivities.slice(start, start + pageSize);
  }, [pageSize, safeCurrentPage, sortedActivities]);

  const metadata: PaginationMetadata = React.useMemo(
    () => ({
      totalItems: sortedActivities.length,
      totalPages,
      currentPage: safeCurrentPage,
      pageSize,
    }),
    [pageSize, safeCurrentPage, sortedActivities.length, totalPages]
  );

  const toggleRow = (activityId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(activityId)) {
        next.delete(activityId);
      } else {
        next.add(activityId);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="px-3 py-6 sm:px-4">
        <LoadingBeam text={t("history.loading", "Loading history...")} />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <Empty className="border-0 py-12">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <HistoryIcon className="h-6 w-6" />
          </EmptyMedia>
          <EmptyTitle>{t("history.noTransactions", "No transactions yet")}</EmptyTitle>
          <EmptyDescription>
            {t(
              "history.noTransactionsDescription",
              "Expenses and direct payments involving you will appear here."
            )}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <AnimatedList
        items={paginatedActivities}
        className={cn("block md:hidden", BALANCE_TABLE_GLASS_DIVIDE)}
      >
        {paginatedActivities.map((activity, index) => (
          <AnimatedRow key={activity.id} index={index}>
            <EnhancedActivityRow
              activity={activity}
              currentUserId={currentUserId}
              isExpanded={expandedRows.has(activity.id)}
              onToggleExpand={() => toggleRow(activity.id)}
              variant="group"
            />
          </AnimatedRow>
        ))}
      </AnimatedList>

      <div className="hidden md:block px-1">
        <Table>
          <TableHeader>
            <TableRow
              className={cn("hover:bg-transparent border-b", BALANCE_TABLE_GLASS_SEPARATOR)}
            >
              <TableHead className="w-12" />
              <TableHead className="text-xs font-medium text-muted-foreground">
                {t("dashboard.transaction", "Transaction")}
              </TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">
                {t("dashboard.people", "People")}
              </TableHead>
              <TableHead className="text-right text-xs font-medium text-muted-foreground">
                {t("dashboard.totalAmount", "Total")}
              </TableHead>
              <TableHead className="text-right text-xs font-medium text-muted-foreground">
                {t("dashboard.myShare", "My share")}
              </TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">
                {t("profile.status", "Status")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedActivities.map((activity, index) => {
              const hasTrail = activity.type === "expense" && activity.paymentEvents.length > 0;
              const isExpanded = expandedRows.has(activity.id);

              return (
                <React.Fragment key={activity.id}>
                  <TableRow
                    className={cn(
                      "cursor-pointer",
                      BALANCE_TABLE_ROW_BASE,
                      index % 2 === 0 && BALANCE_TABLE_ROW_ZEBRA_EVEN,
                      activity.paymentState === "paid" && "bg-status-success-bg/10"
                    )}
                    onClick={() => {
                      tap();
                      go({ to: getDetailRoute(activity) });
                    }}
                  >
                    <TableCell>
                      {hasTrail ? (
                        <button
                          type="button"
                          className="rounded p-1 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label={
                            isExpanded
                              ? t("dashboard.activityFeed.collapsePayments", "Collapse payment events")
                              : t("dashboard.activityFeed.expandPayments", "Expand payment events")
                          }
                          aria-expanded={isExpanded}
                          onClick={(event) => {
                            event.stopPropagation();
                            tap();
                            toggleRow(activity.id);
                          }}
                        >
                          {isExpanded ? (
                            <ChevronDownIcon className="h-4 w-4" />
                          ) : (
                            <ChevronRightIcon className="h-4 w-4" />
                          )}
                        </button>
                      ) : null}
                    </TableCell>
                    <TableCell className="py-2.5">
                      <div className="min-w-0">
                        <p className="typography-row-title truncate">{activity.description}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {formatDistanceToNow(new Date(activity.activityDate), { addSuffix: true })}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5 text-sm text-muted-foreground">
                      {getCounterpartyLabel(
                        activity,
                        currentUserId,
                        t("common.you", "You"),
                        (count) =>
                          `${count} ${
                            count === 1
                              ? t("dashboard.activityFeed.person", "person")
                              : t("dashboard.activityFeed.people", "people")
                          }`
                      )}
                    </TableCell>
                    <TableCell className="py-2.5 text-right typography-amount-prominent tabular-nums">
                      {formatCurrency(activity.totalAmount, activity.currency)}
                    </TableCell>
                    <TableCell className="py-2.5 text-right typography-amount-prominent tabular-nums">
                      {formatCurrency(activity.userAmount, activity.currency)}
                    </TableCell>
                    <TableCell className="py-2.5">
                      <PaymentStateBadge
                        state={activity.paymentState}
                        percentage={activity.partialPercentage}
                        size="sm"
                      />
                    </TableCell>
                  </TableRow>

                  {hasTrail && isExpanded && (
                    <TableRow className={BALANCE_EXPAND_GLASS_SURFACE}>
                      <TableCell colSpan={6} className="px-3 py-2.5 sm:px-4">
                        <PaymentTrail events={activity.paymentEvents} currentUserId={currentUserId} />
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="px-3 pb-3 sm:px-4 sm:pb-4">
          <PaginationControls
            metadata={metadata}
            onPageChange={(page) => {
              setCurrentPage(page);
              setExpandedRows(new Set());
            }}
            showFirstLast={true}
            maxVisiblePages={5}
          />
        </div>
      )}
    </div>
  );
}
