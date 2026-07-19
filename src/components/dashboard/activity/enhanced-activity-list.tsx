import * as React from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ActivityIcon, SearchIcon, XIcon } from "@/components/ui/icons";
import { useHaptics } from "@/hooks/use-haptics";
import { cn } from "@/lib/utils";
import { debounce } from "@/lib/performance";
import { ActivityRowSkeleton } from "@/components/skeletons/ActivityRowSkeleton";

import { AnimatedList } from "@/components/ui/animated-list";
import { AnimatedRow } from "@/components/ui/animated-row";
import { ItemGroup } from "@/components/ui/item";
import { ActivityFilterControls, type PaymentStateFilter, type FilterCounts } from "./activity-filter-controls";
import { ActivityInsightStrip } from "./activity-insight-strip";
import { ActivitySortControls, type SortOption } from "./activity-sort-controls";
import { ActivitySummary } from "./activity-summary";
import { ActivityTimePeriodGroup } from "./activity-time-period-group";
import { EnhancedActivityRow, type EnhancedActivityItem } from "./enhanced-activity-row";
import { PaginationControls, type PaginationMetadata } from "@/components/ui/pagination-controls";
import { useProgressiveDisclosure } from "@/hooks/ui/use-progressive-disclosure";
import {
  groupActivitiesByTimePeriod,
  sortActivitiesByDate,
  sortActivitiesByAmount,
  detectDuplicateDescriptions,
  generateContextLine,
} from "@/lib/activity-grouping";
import type { SupportedCurrency } from "@/lib/format-utils";

// =============================================
// Component Props
// =============================================

export type PaginationMode = "progressive" | "pagination";
export type EnhancedActivityListVariant = "default" | "dashboard";

export interface EnhancedActivityListProps {
  activities: EnhancedActivityItem[];
  currentUserId: string;
  currency?: SupportedCurrency;
  isLoading?: boolean;
  showSummary?: boolean;
  showFilters?: boolean;
  showSort?: boolean;
  showTimeGrouping?: boolean;
  showActions?: boolean;
  variant?: EnhancedActivityListVariant;
  compactControls?: boolean;
  paginationMode?: PaginationMode;
  pageSize?: number;
  className?: string;
}

// =============================================
// Enhanced Activity List Component
// =============================================

export const EnhancedActivityList: React.FC<EnhancedActivityListProps> = ({
  activities,
  currentUserId,
  currency = "VND",
  isLoading = false,
  showSummary = true,
  showFilters = true,
  showSort = true,
  showTimeGrouping = true,
  showActions = false,
  variant = "default",
  compactControls = false,
  paginationMode = "progressive",
  pageSize = 10,
  className,
}) => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const listRef = React.useRef<HTMLDivElement>(null);

  // URL state management
  const activeFilter = (searchParams.get("filter") as PaymentStateFilter) || "all";
  const activeSort = (searchParams.get("sort") as SortOption) || "date-desc";

  // Local state for expanded items
  const [expandedActivityIds, setExpandedActivityIds] = React.useState<Set<string>>(new Set());
  const [collapsedGroupPeriods, setCollapsedGroupPeriods] = React.useState<Set<string>>(new Set());
  const [isSummaryCollapsed, setIsSummaryCollapsed] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [searchQuery, setSearchQuery] = React.useState("");
  const { tap } = useHaptics();
  const isDashboard = variant === "dashboard";

  // Filter activities
  const filteredActivities = React.useMemo(() => {
    let next = activities;
    if (activeFilter !== "all") {
      next = next.filter((activity) => activity.paymentState === activeFilter);
    }

    const query = searchQuery.trim().toLowerCase();
    if (query) {
      next = next.filter((activity) => {
        const haystack = [
          activity.description,
          activity.groupName,
          activity.contextLine,
          ...activity.payingParticipants.map((p) => p.name),
          activity.originalExpense?.profiles?.full_name,
          activity.originalPayment?.from_profile?.full_name,
          activity.originalPayment?.to_profile?.full_name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      });
    }

    return next;
  }, [activities, activeFilter, searchQuery]);

  // Sort activities
  const sortedActivities = React.useMemo(() => {
    const dateField = variant === "dashboard" ? "activityDate" : "date";
    switch (activeSort) {
      case "date-desc":
        return sortActivitiesByDate(filteredActivities, "desc", dateField);
      case "date-asc":
        return sortActivitiesByDate(filteredActivities, "asc", dateField);
      case "amount-desc":
        return sortActivitiesByAmount(filteredActivities, "desc");
      case "amount-asc":
        return sortActivitiesByAmount(filteredActivities, "asc");
      default:
        return filteredActivities;
    }
  }, [filteredActivities, activeSort, variant]);

  // Detect duplicates and add context lines
  const duplicateIds = React.useMemo(() => {
    return detectDuplicateDescriptions(sortedActivities);
  }, [sortedActivities]);

  const activitiesWithContext = React.useMemo(() => {
    return sortedActivities.map((activity) => {
      if (duplicateIds.has(activity.id)) {
        return {
          ...activity,
          contextLine: generateContextLine(activity),
        };
      }
      return activity;
    });
  }, [sortedActivities, duplicateIds]);

  // Progressive disclosure (used when paginationMode === "progressive")
  const {
    visibleItems: progressiveItems,
    hasMore,
    loadMore,
    totalCount: progressiveTotalCount,
    visibleCount,
  } = useProgressiveDisclosure(activitiesWithContext, {
    initialCount: pageSize,
    incrementCount: pageSize,
  });

  // Pagination logic (used when paginationMode === "pagination")
  const totalPages = Math.ceil(activitiesWithContext.length / pageSize);

  const paginatedItems = React.useMemo(() => {
    if (paginationMode !== "pagination") return [];
    const start = (currentPage - 1) * pageSize;
    return activitiesWithContext.slice(start, start + pageSize);
  }, [activitiesWithContext, currentPage, pageSize, paginationMode]);

  const paginationMetadata: PaginationMetadata = React.useMemo(() => ({
    totalItems: activitiesWithContext.length,
    totalPages,
    currentPage,
    pageSize,
  }), [activitiesWithContext.length, totalPages, currentPage, pageSize]);

  // Reset page when filter/sort changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, activeSort, searchQuery]);

  const handlePageChange = React.useCallback((page: number) => {
    setCurrentPage(page);
    // Scroll to top of list
    listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // Select visible items based on mode
  const visibleItems = paginationMode === "pagination" ? paginatedItems : progressiveItems;

  // Group by time period (if enabled)
  const timeGroups = React.useMemo(() => {
    if (!showTimeGrouping) {
      return null;
    }
    return groupActivitiesByTimePeriod(visibleItems, variant === "dashboard" ? "activityDate" : "date");
  }, [visibleItems, showTimeGrouping, variant]);

  // Calculate filter counts
  const filterCounts: FilterCounts = React.useMemo(() => {
    return {
      all: activities.length,
      paid: activities.filter((a) => a.paymentState === "paid").length,
      unpaid: activities.filter((a) => a.paymentState === "unpaid").length,
      partial: activities.filter((a) => a.paymentState === "partial").length,
    };
  }, [activities]);

  // Calculate summary metrics
  const summaryMetrics = React.useMemo(() => {
    let totalOwed = 0;
    let totalToReceive = 0;

    activities.forEach((activity) => {
      if (activity.oweStatus.direction === "owe") {
        totalOwed += activity.oweStatus.amount;
      } else if (activity.oweStatus.direction === "owed") {
        totalToReceive += activity.oweStatus.amount;
      }
    });

    const netBalance = totalToReceive - totalOwed;

    return { totalOwed, totalToReceive, netBalance };
  }, [activities]);

  // Handlers - use refs to avoid dependency on searchParams
  const searchParamsRef = React.useRef(searchParams);
  const setSearchParamsRef = React.useRef(setSearchParams);
  React.useEffect(() => {
    searchParamsRef.current = searchParams;
    setSearchParamsRef.current = setSearchParams;
  });

  const handleFilterChange = React.useCallback((filter: PaymentStateFilter) => {
    const newParams = new URLSearchParams(searchParamsRef.current);
    if (filter === "all") {
      newParams.delete("filter");
    } else {
      newParams.set("filter", filter);
    }
    setSearchParamsRef.current(newParams);
  }, []); // No dependencies to prevent recreation

  const handleSortChange = React.useCallback((sort: SortOption) => {
    const newParams = new URLSearchParams(searchParamsRef.current);
    if (sort === "date-desc") {
      newParams.delete("sort");
    } else {
      newParams.set("sort", sort);
    }
    setSearchParamsRef.current(newParams);
  }, []); // No dependencies to prevent recreation

  // Debounced handlers to avoid excessive URL updates and re-renders
  // Reduced debounce time to 100ms for more responsive feel
  const debouncedFilterChange = React.useMemo(
    () => debounce(handleFilterChange, 100),
    [handleFilterChange]
  );

  const debouncedSortChange = React.useMemo(
    () => debounce(handleSortChange, 100),
    [handleSortChange]
  );

  const handleToggleActivity = React.useCallback((activityId: string) => {
    setExpandedActivityIds((prev) => {
      const next = new Set(prev);
      if (next.has(activityId)) {
        next.delete(activityId);
      } else {
        next.add(activityId);
      }
      return next;
    });
  }, []);

  const handleToggleGroup = React.useCallback((period: string) => {
    setCollapsedGroupPeriods((prev) => {
      const next = new Set(prev);
      if (next.has(period)) {
        next.delete(period);
      } else {
        next.add(period);
      }
      return next;
    });
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className={cn(isDashboard ? "space-y-0" : "space-y-4", className)}>
        {isDashboard ? (
          <>
            <div className="space-y-3 border-b border-border bg-muted/20 p-4">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-[58px] animate-pulse rounded-xl bg-muted" />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-[64px] animate-pulse rounded-xl bg-muted" />
                ))}
              </div>
            </div>
            <ActivityRowSkeleton count={6} variant="timeline" />
          </>
        ) : (
          <ActivityRowSkeleton count={5} />
        )}
      </div>
    );
  }

  // Empty state
  if (activities.length === 0) {
    return (
      <div className={cn(className)}>
        <Empty className="border-0 py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ActivityIcon />
            </EmptyMedia>
            <EmptyTitle>{t("dashboard.activityFeed.emptyTitle", "No activity yet")}</EmptyTitle>
            <EmptyDescription>
              {t("dashboard.activityFeed.emptyDescription", "Create your first expense to get started")}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  const insight = isDashboard && (
    <ActivityInsightStrip
      totalOwed={summaryMetrics.totalOwed}
      totalToReceive={summaryMetrics.totalToReceive}
      netBalance={summaryMetrics.netBalance}
      currency={currency}
      counts={filterCounts}
      activeFilter={activeFilter}
      onFilterChange={debouncedFilterChange}
    />
  );

  const toolbar = (
    <div
      className={cn(
        "flex flex-col gap-3",
        isDashboard
          ? "sticky top-0 z-20 border-b border-border bg-card/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-card/85"
          : "items-start justify-between sm:flex-row sm:items-center"
      )}
    >
      {isDashboard ? (
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t(
                "dashboard.activityFeed.searchPlaceholder",
                "Search people, expenses, groups…"
              )}
              className="h-9 rounded-full border-border/80 bg-background pl-9 pr-9"
              aria-label={t("dashboard.activityFeed.searchAria", "Search activity")}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  tap();
                  setSearchQuery("");
                }}
                className="absolute right-2 top-1/2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={t("common.clear", "Clear")}
              >
                <XIcon className="size-3.5" />
              </button>
            )}
          </div>
          {showSort && (
            <ActivitySortControls
              activeSort={activeSort}
              onSortChange={debouncedSortChange}
              compact={compactControls}
            />
          )}
        </div>
      ) : (
        <div className="flex w-full flex-col items-start justify-between gap-3 sm:flex-row sm:items-center viewport-transition-flex">
          {showFilters && (
            <ActivityFilterControls
              activeFilter={activeFilter}
              onFilterChange={debouncedFilterChange}
              counts={filterCounts}
              compact={compactControls}
            />
          )}
          {showSort && (
            <ActivitySortControls
              activeSort={activeSort}
              onSortChange={debouncedSortChange}
              compact={compactControls}
            />
          )}
        </div>
      )}
    </div>
  );

  // No results after filtering / search
  if (filteredActivities.length === 0) {
    return (
      <div className={cn(isDashboard ? "space-y-0" : "space-y-4", className)}>
        {showSummary && !isDashboard && (
          <ActivitySummary
            totalOwed={summaryMetrics.totalOwed}
            totalToReceive={summaryMetrics.totalToReceive}
            netBalance={summaryMetrics.netBalance}
            currency={currency}
            isCollapsed={isSummaryCollapsed}
            onToggleCollapse={() => setIsSummaryCollapsed(!isSummaryCollapsed)}
          />
        )}
        {insight}
        {toolbar}
        <Empty className="border-0 py-14">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchIcon />
            </EmptyMedia>
            <EmptyTitle>
              {t("dashboard.activityFeed.filteredEmptyTitle", "No activities match your filter")}
            </EmptyTitle>
            <EmptyDescription>
              {searchQuery
                ? t(
                    "dashboard.activityFeed.searchEmptyDescription",
                    "Try a different name, expense, or group"
                  )
                : t(
                    "dashboard.activityFeed.filteredEmptyDescription",
                    "Try selecting a different filter"
                  )}
            </EmptyDescription>
          </EmptyHeader>
          {(activeFilter !== "all" || searchQuery) && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => {
                tap();
                setSearchQuery("");
                handleFilterChange("all");
              }}
            >
              {t("dashboard.activityFeed.clearFilters", "Clear filters")}
            </Button>
          )}
        </Empty>
      </div>
    );
  }

  const activityList = (
    <div className={cn(isDashboard ? "space-y-0" : "space-y-4")}>
      {showTimeGrouping && timeGroups ? (
        isDashboard ? (
          <div className="divide-y divide-border">
            {timeGroups.map((group) => (
              <ActivityTimePeriodGroup
                key={group.period}
                group={{
                  ...group,
                  isCollapsed: collapsedGroupPeriods.has(group.period),
                }}
                currentUserId={currentUserId}
                expandedActivityIds={expandedActivityIds}
                onToggleActivity={handleToggleActivity}
                onToggleGroup={() => handleToggleGroup(group.period)}
                duplicateIds={duplicateIds}
                showActions={showActions}
                variant={variant}
              />
            ))}
          </div>
        ) : (
          <AnimatedList items={timeGroups} className="space-y-4">
            {timeGroups.map((group, index) => (
              <AnimatedRow key={group.period} index={index}>
                <ActivityTimePeriodGroup
                  group={{
                    ...group,
                    isCollapsed: collapsedGroupPeriods.has(group.period),
                  }}
                  currentUserId={currentUserId}
                  expandedActivityIds={expandedActivityIds}
                  onToggleActivity={handleToggleActivity}
                  onToggleGroup={() => handleToggleGroup(group.period)}
                  duplicateIds={duplicateIds}
                  showActions={showActions}
                  variant={variant}
                />
              </AnimatedRow>
            ))}
          </AnimatedList>
        )
      ) : isDashboard ? (
        <ItemGroup className="divide-y divide-border/70">
          {visibleItems.map((activity) => (
            <EnhancedActivityRow
              key={activity.id}
              activity={activity}
              currentUserId={currentUserId}
              isExpanded={expandedActivityIds.has(activity.id)}
              onToggleExpand={() => handleToggleActivity(activity.id)}
              showDuplicateContext={duplicateIds.has(activity.id)}
              showActions={showActions}
              variant={variant}
            />
          ))}
        </ItemGroup>
      ) : (
        <AnimatedList items={visibleItems} className="space-y-2">
          {visibleItems.map((activity, index) => (
            <AnimatedRow key={activity.id} index={index}>
              <EnhancedActivityRow
                activity={activity}
                currentUserId={currentUserId}
                isExpanded={expandedActivityIds.has(activity.id)}
                onToggleExpand={() => handleToggleActivity(activity.id)}
                showDuplicateContext={duplicateIds.has(activity.id)}
                showActions={showActions}
                variant={variant}
              />
            </AnimatedRow>
          ))}
        </AnimatedList>
      )}

      {paginationMode === "pagination" ? (
        activitiesWithContext.length > pageSize && (
          <div className={cn("pt-4", isDashboard && "border-t border-border px-4 pb-4")}>
            <PaginationControls metadata={paginationMetadata} onPageChange={handlePageChange} />
          </div>
        )
      ) : (
        hasMore && (
          <div className="pt-4 text-center">
            <Button
              variant="outline"
              onClick={() => {
                tap();
                loadMore();
              }}
              className="rounded-lg"
            >
              {t("dashboard.activityFeed.loadMore", {
                defaultValue: "Load More ({{visible}} of {{total}})",
                visible: visibleCount,
                total: progressiveTotalCount,
              })}
            </Button>
          </div>
        )
      )}
    </div>
  );

  return (
    <div ref={listRef} className={cn(isDashboard ? "space-y-0" : "space-y-4", className)}>
      {showSummary && !isDashboard && (
        <ActivitySummary
          totalOwed={summaryMetrics.totalOwed}
          totalToReceive={summaryMetrics.totalToReceive}
          netBalance={summaryMetrics.netBalance}
          currency={currency}
          isCollapsed={isSummaryCollapsed}
          onToggleCollapse={() => setIsSummaryCollapsed(!isSummaryCollapsed)}
        />
      )}

      {insight}
      {(showFilters || showSort || isDashboard) && toolbar}
      {activityList}
    </div>
  );
};
