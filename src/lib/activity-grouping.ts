import {
  isToday,
  isThisWeek,
  isThisMonth,
} from "date-fns";
import type { EnhancedActivityItem } from "@/types/activity";

// =============================================
// Time Period Types
// =============================================

export type TimePeriod = "today" | "this_week" | "this_month" | "earlier";

export interface TimePeriodGroup {
  period: TimePeriod;
  label: string;
  activities: EnhancedActivityItem[];
  isCollapsed: boolean;
}

// =============================================
// Time Period Grouping Logic
// =============================================

/**
 * Determine which time period an activity belongs to
 */
export function getTimePeriod(date: string | Date): TimePeriod {
  const activityDate = typeof date === "string" ? new Date(date) : date;

  if (isToday(activityDate)) {
    return "today";
  }

  if (isThisWeek(activityDate, { weekStartsOn: 1 })) {
    // Week starts on Monday
    return "this_week";
  }

  if (isThisMonth(activityDate)) {
    return "this_month";
  }

  return "earlier";
}

/**
 * Get human-readable label for time period
 */
export function getTimePeriodLabel(period: TimePeriod): string {
  switch (period) {
    case "today":
      return "Today";
    case "this_week":
      return "This Week";
    case "this_month":
      return "This Month";
    case "earlier":
      return "Earlier";
    default:
      return "Unknown";
  }
}

/**
 * Group activities by time period
 * - Groups parent expense rows into time buckets
 * - Sorts parent rows by date-desc inside each bucket
 * - Child payment events remain grouped under parent (default collapsed, sort time-asc)
 * - Filtering applies to parent rows only; buckets render only if they contain ≥1 matched parent
 */
export function groupActivitiesByTimePeriod(
  activities: EnhancedActivityItem[],
  dateField: "date" | "activityDate" = "date"
): TimePeriodGroup[] {
  // Group activities by time period
  const grouped = new Map<TimePeriod, EnhancedActivityItem[]>();

  // Initialize all periods
  const periods: TimePeriod[] = ["today", "this_week", "this_month", "earlier"];
  periods.forEach((period) => grouped.set(period, []));

  // Assign each activity to its time period
  activities.forEach((activity) => {
    const period = getTimePeriod(activity[dateField]);
    grouped.get(period)?.push(activity);
  });

  // Sort activities within each period by date-desc
  grouped.forEach((activities) => {
    activities.sort((a, b) => {
      return new Date(b[dateField]).getTime() - new Date(a[dateField]).getTime();
    });
  });

  // Convert to array of TimePeriodGroup, filtering out empty periods
  const result: TimePeriodGroup[] = periods
    .map((period) => ({
      period,
      label: getTimePeriodLabel(period),
      activities: grouped.get(period) || [],
      isCollapsed: false, // Default to expanded
    }))
    .filter((group) => group.activities.length > 0); // Only include non-empty groups

  return result;
}

/**
 * Sort activities by date (descending)
 * Handles null/undefined dates by treating them as epoch (oldest possible date)
 */
export function sortActivitiesByDate(
  activities: EnhancedActivityItem[],
  order: "asc" | "desc" = "desc",
  dateField: "date" | "activityDate" = "date"
): EnhancedActivityItem[] {
  return [...activities].sort((a, b) => {
    // Handle null/undefined dates by defaulting to 0 (epoch)
    const dateA = a[dateField] ? new Date(a[dateField]).getTime() : 0;
    const dateB = b[dateField] ? new Date(b[dateField]).getTime() : 0;

    // Check for invalid dates (NaN)
    const validA = !isNaN(dateA) ? dateA : 0;
    const validB = !isNaN(dateB) ? dateB : 0;

    return order === "desc" ? validB - validA : validA - validB;
  });
}

/**
 * Sort activities by amount
 * Handles null/undefined amounts by treating them as 0
 */
export function sortActivitiesByAmount(
  activities: EnhancedActivityItem[],
  order: "asc" | "desc" = "desc"
): EnhancedActivityItem[] {
  return [...activities].sort((a, b) => {
    // Handle null/undefined amounts by defaulting to 0
    const amountA = a.amount ?? 0;
    const amountB = b.amount ?? 0;

    return order === "desc" ? amountB - amountA : amountA - amountB;
  });
}

// =============================================
// Duplicate Detection
// =============================================

/**
 * Detect duplicate expense descriptions in activity list
 * Returns a Set of expense IDs that have duplicate descriptions
 */
export function detectDuplicateDescriptions(
  activities: EnhancedActivityItem[]
): Set<string> {
  const descriptionCounts = new Map<string, string[]>();

  // Count occurrences of each description
  activities.forEach((activity) => {
    const description = activity.description.toLowerCase().trim();
    if (!descriptionCounts.has(description)) {
      descriptionCounts.set(description, []);
    }
    descriptionCounts.get(description)?.push(activity.id);
  });

  // Find descriptions that appear more than once
  const duplicateIds = new Set<string>();
  descriptionCounts.forEach((ids) => {
    if (ids.length > 1) {
      ids.forEach((id) => duplicateIds.add(id));
    }
  });

  return duplicateIds;
}

/**
 * Generate context line for duplicate disambiguation
 */
export function generateContextLine(activity: EnhancedActivityItem): string {
  const parts: string[] = [];

  // Add date (short format)
  const date = new Date(activity.date);
  const dateStr = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  parts.push(dateStr);

  // Add amount
  const amountStr = new Intl.NumberFormat("en-US", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(activity.amount);
  parts.push(`${amountStr} ${activity.currency}`);

  // Add payment state
  parts.push(activity.paymentState);

  return parts.join(" • ");
}
