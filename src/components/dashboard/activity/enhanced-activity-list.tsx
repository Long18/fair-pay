import * as React from "react";
import { useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { LoadingBeam } from "@/components/ui/loading-beam";
import { ActivityIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { debounce } from "@/lib/performance";

import { ActivityFilterControls, type PaymentStateFilter, type FilterCounts } from "./activity-filter-controls";
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
  type TimePeriodGroup,
} from "@/lib/activity-grouping";
import type { SupportedCurrency } from "@/lib/format-utils";

// =============================================
// Component Props
// =============================================

export type PaginationMode = "progressive" | "pagination";

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
  paginationMode = "progressive",
  pageSize = 10,
  className,
}) => {
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

  // Filter activities
  const filteredActivities = React.useMemo(() => {
    if (activeFilter === "all") {
      return activities;
    }
    return activities.filter((activity) => activity.paymentState === activeFilter);
  }, [activities, activeFilter]);

  // Sort activities
  const sortedActivities = React.useMemo(() => {
    switch (activeSort) {
      case "date-desc":
        return sortActivitiesByDate(filteredActivities, "desc");
      case "date-asc":
        return sortActivitiesByDate(filteredActivities, "asc");
      case "amount-desc":
        return sortActivitiesByAmount(filteredActivities, "desc");
      case "amount-asc":
        return sortActivitiesByAmount(filteredActivities, "asc");
      default:
        return filteredActivities;
    }
  }, [filteredActivities, activeSort]);

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
  }, [activeFilter, activeSort]);

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
    return groupActivitiesByTimePeriod(visibleItems);
  }, [visibleItems, showTimeGrouping]);

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
  searchParamsRef.current = searchParams;
  setSearchParamsRef.current = setSearchParams;

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
      <div className={cn("", className)}>
        <LoadingBeam text="Đang tải hoạt động..." />
      </div>
    );
  }

  // Empty state
  if (activities.length === 0) {
    return (
      <div className={cn("text-center py-12", className)}>
        <ActivityIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-foreground font-medium">No activity yet</p>
        <p className="text-sm text-muted-foreground mt-2">
          Create your first expense to get started
        </p>
      </div>
    );
  }

  // No results after filtering
  if (filteredActivities.length === 0) {
    return (
      <div className={cn("space-y-4", className)}>
        {showSummary && (
          <ActivitySummary
            totalOwed={summaryMetrics.totalOwed}
            totalToReceive={summaryMetrics.totalToReceive}
            netBalance={summaryMetrics.netBalance}
            currency={currency}
            isCollapsed={isSummaryCollapsed}
            onToggleCollapse={() => setIsSummaryCollapsed(!isSummaryCollapsed)}
          />
        )}

        {showFilters && (
          <ActivityFilterControls
            activeFilter={activeFilter}
            onFilterChange={handleFilterChange}
            counts={filterCounts}
          />
        )}

        <div className="text-center py-12">
          <ActivityIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-foreground font-medium">No activities match your filter</p>
          <p className="text-sm text-muted-foreground mt-2">
            Try selecting a different filter
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={listRef} className={cn("space-y-4", className)}>
      {/* Summary Section */}
      {showSummary && (
        <ActivitySummary
          totalOwed={summaryMetrics.totalOwed}
          totalToReceive={summaryMetrics.totalToReceive}
          netBalance={summaryMetrics.netBalance}
          currency={currency}
          isCollapsed={isSummaryCollapsed}
          onToggleCollapse={() => setIsSummaryCollapsed(!isSummaryCollapsed)}
        />
      )}

      {/* Filter and Sort Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {showFilters && (
          <ActivityFilterControls
            activeFilter={activeFilter}
            onFilterChange={debouncedFilterChange}
            counts={filterCounts}
          />
        )}

        {showSort && (
          <ActivitySortControls
            activeSort={activeSort}
            onSortChange={debouncedSortChange}
          />
        )}
      </div>

      {/* Activity List */}
      <div className="space-y-4">
        {showTimeGrouping && timeGroups ? (
          // Time-grouped view
          timeGroups.map((group) => (
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
            />
          ))
        ) : (
          // Flat list view
          <div className="space-y-2">
            {visibleItems.map((activity) => (
              <EnhancedActivityRow
                key={activity.id}
                activity={activity}
                currentUserId={currentUserId}
                isExpanded={expandedActivityIds.has(activity.id)}
                onToggleExpand={() => handleToggleActivity(activity.id)}
                showDuplicateContext={duplicateIds.has(activity.id)}
                showActions={showActions}
              />
            ))}
          </div>
        )}

        {/* Pagination or Load More */}
        {paginationMode === "pagination" ? (
          activitiesWithContext.length > pageSize && (
            <div className="pt-4">
              <PaginationControls
                metadata={paginationMetadata}
                onPageChange={handlePageChange}
              />
            </div>
          )
        ) : (
          hasMore && (
            <div className="text-center pt-4">
              <Button
                variant="outline"
                onClick={loadMore}
                className="rounded-lg"
              >
                Load More ({visibleCount} of {progressiveTotalCount})
              </Button>
            </div>
          )
        )}
      </div>
    </div>
  );
};
