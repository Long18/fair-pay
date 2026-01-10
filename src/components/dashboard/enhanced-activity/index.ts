// Enhanced Activity List Components
export { EnhancedActivityList } from "../enhanced-activity-list";
export type { EnhancedActivityListProps } from "../enhanced-activity-list";

export { EnhancedActivityRow } from "../enhanced-activity-row";
export type {
  EnhancedActivityItem,
  PaymentEvent,
  EnhancedActivityRowProps,
} from "../enhanced-activity-row";

export { ActivityFilterControls } from "../activity-filter-controls";
export type {
  PaymentStateFilter,
  FilterCounts,
  ActivityFilterControlsProps,
} from "../activity-filter-controls";

export { ActivitySortControls } from "../activity-sort-controls";
export type {
  SortOption,
  SortOptionConfig,
  ActivitySortControlsProps,
} from "../activity-sort-controls";

export { ActivitySummary } from "../activity-summary";
export type { ActivitySummaryProps } from "../activity-summary";

export { ActivityTimePeriodGroup } from "../activity-time-period-group";
export type { ActivityTimePeriodGroupProps } from "../activity-time-period-group";

// Utility functions
export {
  groupActivitiesByTimePeriod,
  sortActivitiesByDate,
  sortActivitiesByAmount,
  detectDuplicateDescriptions,
  generateContextLine,
  getTimePeriod,
  getTimePeriodLabel,
} from "../../lib/activity-grouping";

export type { TimePeriod, TimePeriodGroup } from "../../lib/activity-grouping";

// Hooks
export { useProgressiveDisclosure } from "../../hooks/use-progressive-disclosure";
export type {
  ProgressiveDisclosureOptions,
  ProgressiveDisclosureResult,
} from "../../hooks/use-progressive-disclosure";
