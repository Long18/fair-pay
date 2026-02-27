# Enhanced Activity List

A comprehensive activity list implementation with parent/child grouping, filtering, sorting, and progressive disclosure.

## Overview

The Enhanced Activity List displays expenses as parent rows with expandable payment events as child rows. It includes:

- **Parent/Child Grouping**: Expenses grouped with their payment events (collapsed by default)
- **Time Period Grouping**: Activities grouped by Today, This Week, This Month, Earlier
- **Filtering**: Filter by payment state (All, Paid, Unpaid, Partial)
- **Sorting**: Sort by date or amount (ascending/descending)
- **Progressive Disclosure**: Load More functionality for long lists
- **Duplicate Disambiguation**: Extra context for expenses with duplicate descriptions
- **Summary Metrics**: Total owed, total to receive, net balance

## Components

### EnhancedActivityList

Main container component that orchestrates all features.

```tsx
import { EnhancedActivityList } from "@/components/dashboard/enhanced-activity";

<EnhancedActivityList
  activities={activities}
  currentUserId={userId}
  currency="VND"
  isLoading={false}
  showSummary={true}
  showFilters={true}
  showSort={true}
  showTimeGrouping={true}
/>
```

**Props:**
- `activities`: Array of EnhancedActivityItem
- `currentUserId`: Current user's ID for owe/owed calculations
- `currency`: Currency code (default: "VND")
- `isLoading`: Loading state
- `showSummary`: Show summary metrics (default: true)
- `showFilters`: Show filter controls (default: true)
- `showSort`: Show sort controls (default: true)
- `showTimeGrouping`: Group by time periods (default: true)

### EnhancedActivityRow

Parent row component for expenses with expand/collapse for payment events.

```tsx
import { EnhancedActivityRow } from "@/components/dashboard/enhanced-activity";

<EnhancedActivityRow
  activity={activity}
  currentUserId={userId}
  isExpanded={false}
  onToggleExpand={() => {}}
  showDuplicateContext={false}
/>
```

**Features:**
- Payment state badge (Paid/Unpaid/Partial)
- Expand control for payment events
- Owe/Owed indicator
- Click to navigate to expense detail
- Duplicate disambiguation context

### ActivityFilterControls

Filter pills with badge counts.

```tsx
import { ActivityFilterControls } from "@/components/dashboard/enhanced-activity";

<ActivityFilterControls
  activeFilter="all"
  onFilterChange={(filter) => {}}
  counts={{ all: 10, paid: 5, unpaid: 3, partial: 2 }}
/>
```

### ActivitySortControls

Sort dropdown for date and amount sorting.

```tsx
import { ActivitySortControls } from "@/components/dashboard/enhanced-activity";

<ActivitySortControls
  activeSort="date-desc"
  onSortChange={(sort) => {}}
/>
```

### ActivitySummary

Summary metrics card with collapsible mobile view.

```tsx
import { ActivitySummary } from "@/components/dashboard/enhanced-activity";

<ActivitySummary
  totalOwed={1000}
  totalToReceive={2000}
  netBalance={1000}
  currency="VND"
  isCollapsed={false}
  onToggleCollapse={() => {}}
/>
```

### ActivityTimePeriodGroup

Time period group with collapsible sections.

```tsx
import { ActivityTimePeriodGroup } from "@/components/dashboard/enhanced-activity";

<ActivityTimePeriodGroup
  group={timePeriodGroup}
  currentUserId={userId}
  expandedActivityIds={expandedIds}
  onToggleActivity={(id) => {}}
  onToggleGroup={() => {}}
  duplicateIds={duplicateIds}
/>
```

## Hooks

### useEnhancedActivity

Fetch and transform expenses into EnhancedActivityItem format.

```tsx
import { useEnhancedActivity } from "@/hooks/use-enhanced-activity";

const { activities, isLoading, isRefetching, error } = useEnhancedActivity({
  limit: 50,
  groupId: "group-id", // optional
  friendshipId: "friendship-id", // optional
});
```

**Features:**
- Fetches expenses with splits
- Calculates payment state (paid/unpaid/partial)
- Calculates owe/owed status for current user
- Fetches payment events in batch
- Transforms to EnhancedActivityItem format

### useProgressiveDisclosure

Progressive disclosure for long lists.

```tsx
import { useProgressiveDisclosure } from "@/hooks/use-progressive-disclosure";

const { visibleItems, hasMore, loadMore, reset } = useProgressiveDisclosure(items, {
  initialCount: 10,
  incrementCount: 10,
});
```

## Utility Functions

### Activity Grouping

```tsx
import {
  groupActivitiesByTimePeriod,
  sortActivitiesByDate,
  sortActivitiesByAmount,
  detectDuplicateDescriptions,
  generateContextLine,
} from "@/lib/activity-grouping";

// Group by time period
const groups = groupActivitiesByTimePeriod(activities);

// Sort activities
const sorted = sortActivitiesByDate(activities, "desc");

// Detect duplicates
const duplicateIds = detectDuplicateDescriptions(activities);

// Generate context line
const contextLine = generateContextLine(activity);
```

## Data Types

### EnhancedActivityItem

```typescript
interface EnhancedActivityItem {
  id: string;
  type: "expense";
  description: string;
  amount: number;
  currency: SupportedCurrency;
  date: string;
  paymentState: "paid" | "unpaid" | "partial";
  partialPercentage?: number;
  oweStatus: {
    direction: "owe" | "owed" | "neutral";
    amount: number;
  };
  participantCount: number;
  groupName?: string;
  paymentEvents: PaymentEvent[];
  contextLine?: string; // For duplicate disambiguation
}
```

### PaymentEvent

```typescript
interface PaymentEvent {
  id: string;
  event_type: "manual_settle" | "momo_payment" | "banking_payment" | "settle_all";
  from_user_id: string;
  from_user_name: string;
  from_user_avatar?: string;
  to_user_id: string;
  to_user_name: string;
  to_user_avatar?: string;
  amount: number;
  currency: string;
  method: "manual" | "momo" | "banking";
  actor_user_id: string;
  actor_user_name: string;
  metadata?: Record<string, any>;
  created_at: string;
}
```

## URL State Management

The component uses URL search parameters for filter and sort state:

- `?filter=paid` - Filter by payment state (all, paid, unpaid, partial)
- `?sort=date-desc` - Sort order (date-desc, date-asc, amount-desc, amount-asc)

Default values:
- filter: "all"
- sort: "date-desc"

## Database Integration

### Required Tables

- `expenses` - Expense records
- `expense_splits` - Split records with settlement tracking
- `payment_events` - Payment/settlement event log

### Required RPC Functions

- `get_expenses_with_payment_events(p_expense_ids UUID[])` - Batch fetch payment events

## Styling

Uses existing design system:
- shadcn/ui components (Card, Button, Badge, Select, Skeleton)
- Tailwind CSS utilities
- Design tokens for status colors (from Phase 1)
- framer-motion for animations

## Accessibility

- Keyboard navigation support
- ARIA labels for expand controls
- Screen reader announcements
- Focus management
- Color contrast compliance (WCAG AA)

## Mobile Responsiveness

- Collapsible summary section on mobile
- Stacked filter pills on small screens
- Touch-friendly targets (44x44px minimum)
- Responsive grid layouts

## Performance Optimizations

- Progressive disclosure (initial 10 items)
- Batch fetching of payment events
- Memoized calculations
- Efficient re-renders with React.memo
- Virtualization ready (can add react-window)

## Example Usage

```tsx
import { EnhancedActivityList } from "@/components/dashboard/enhanced-activity";
import { useEnhancedActivity } from "@/hooks/use-enhanced-activity";
import { useGetIdentity } from "@refinedev/core";

function MyActivityPage() {
  const { data: identity } = useGetIdentity();
  const { activities, isLoading } = useEnhancedActivity({ limit: 50 });

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Activity</h1>
      
      <EnhancedActivityList
        activities={activities}
        currentUserId={identity?.id || ""}
        currency="VND"
        isLoading={isLoading}
      />
    </div>
  );
}
```

## Testing

See test files:
- `tests/components/enhanced-activity-row.test.tsx`
- `tests/hooks/use-enhanced-activity.test.ts`
- `tests/lib/activity-grouping.test.ts`

## Related Components

- `PaymentStateBadge` - Payment state indicator (Phase 1)
- `OweStatusIndicator` - Owe/owed indicator (Phase 1)
- `ActionButtonGroup` - Action button layout (Phase 1)

## Requirements Satisfied

- **1.1**: Activity list with owe/owed indicators
- **1.2**: Duplicate expense disambiguation
- **1.3**: Payment state badges
- **1.4**: Filtering by payment state
- **1.5**: Time period grouping
- **1.6**: Summary metrics
- **1.7**: Navigate to expense detail
- **9.1**: Progressive disclosure
- **9.2-9.7**: Various UX improvements

## Future Enhancements

- Virtualization for very long lists (react-window)
- Pull-to-refresh on mobile
- Swipe gestures for actions
- Export to CSV/PDF
- Advanced filtering (date range, amount range)
- Search functionality
