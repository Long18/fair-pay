# Recurring Expenses Feature

## Overview

The Recurring Expenses feature automates the creation of repetitive payments like rent, subscriptions, utilities, and other regular financial obligations. This feature helps users manage predictable expenses and provides visibility into their ongoing financial commitments.

## Features

### 1. CRUD Operations

#### Create
- **Context Selection**: Users select a group or friend context before creating
- **Frequency Options**: Weekly, bi-weekly, monthly, quarterly, yearly
- **Interval Support**: Repeat every N periods (e.g., every 2 weeks)
- **End Date**: Optional end date for finite recurring expenses
- **Template Expense**: Each recurring expense has an associated template

**Implementation**: `CreateRecurringDialog` component
**Location**: `/src/modules/expenses/components/create-recurring-dialog.tsx`

#### Read/List
- **Tabbed View**: Active, Paused, and Analytics tabs
- **Stats Dashboard**: Total count, monthly total, upcoming preview
- **Filtering**: Automatic separation of active vs paused expenses
- **Upcoming Alert**: Shows expenses due in next 7 days

**Implementation**: `RecurringExpensesPage` component
**Location**: `/src/pages/recurring-expenses.tsx`

#### Update/Edit
- **Frequency Editing**: Change how often expense repeats
- **Interval Editing**: Adjust repeat interval
- **End Date Management**: Set or remove end date
- **Responsive Dialog**: Bottom sheet on mobile, dialog on desktop

**Implementation**: `EditRecurringDialog` component
**Location**: `/src/modules/expenses/components/edit-recurring-dialog.tsx`

#### Delete
- **Confirmation Dialog**: Prevents accidental deletion
- **Toast Notification**: Success/error feedback
- **Cascade Prevention**: Does not delete past expenses

**Implementation**: `useRecurringActions` hook
**Location**: `/src/modules/expenses/hooks/use-recurring-actions.ts`

### 2. Quick Actions

#### Pause/Resume
- **Toggle State**: Temporarily disable expense creation
- **Visual Feedback**: Badge shows active/paused status
- **Toast Notifications**: Confirms action success

#### Skip
- **Next Occurrence**: Skip the immediate next scheduled expense
- **Recalculation**: Automatically calculates new next occurrence date
- **Notification**: Toast confirms skip

#### Mobile Swipe Actions
- **Swipe Right**: Reveals pause/resume and delete actions
- **Touch-Optimized**: 44px+ touch targets
- **Visual Feedback**: Smooth animations and haptics

**Implementation**: `SwipeableCard` component
**Location**: `/src/components/ui/swipeable-card.tsx`

### 3. Dashboard Integration

#### Summary Widget
- **Monthly Total**: Normalized monthly cost from all frequencies
- **Upcoming Preview**: Next 3 expenses within 7 days
- **Quick Navigation**: "View All" button to full page
- **Conditional Display**: Only shows when recurring expenses exist

**Implementation**: `RecurringExpensesSummary` component
**Location**: `/src/components/dashboard/recurring-expenses-summary.tsx`

### 4. Notifications

#### Notification Center
- **Overdue Expenses**: Expenses past their next occurrence date
- **Upcoming Expenses**: Expenses due within next 7 days
- **Badge Counter**: Shows total notification count
- **Sheet UI**: Slide-in panel with categorized lists

**Implementation**: `NotificationCenter` and `NotificationBell` components
**Location**: `/src/components/notifications/`

#### Toast Notifications
- **Action Feedback**: Pause, resume, skip, delete confirmations
- **Error Handling**: User-friendly error messages
- **Descriptions**: Context about what happened

**Implementation**: `useRecurringActions` hook with `useNotification`

### 5. Analytics

#### Monthly Overview
- **Monthly Total**: Sum of all active recurring expenses (normalized)
- **Yearly Projection**: Monthly total × 12
- **Active/Paused Ratio**: Visual progress bar showing distribution

#### Category Breakdown
- **Top 5 Categories**: Sorted by monthly cost
- **Progress Bars**: Visual representation of percentage
- **Count & Total**: Shows number of expenses and cost per category

#### Frequency Distribution
- **Visual Distribution**: Shows how expenses are distributed by frequency
- **Percentage**: Displays proportion of each frequency type
- **Count Badges**: Number of expenses per frequency

#### Quick Stats
- **Total Expenses**: Count of all recurring expenses
- **Average Monthly Cost**: Average cost per expense
- **Categories Count**: Number of unique categories
- **Active Rate**: Percentage of active vs total

**Implementation**: `RecurringExpensesAnalytics` component
**Location**: `/src/components/analytics/recurring-expenses-analytics.tsx`

## Data Model

### RecurringExpense Interface

```typescript
interface RecurringExpense {
  id: string;
  template_expense_id: string;
  frequency: RecurringFrequency;
  interval: number;
  next_occurrence: string;
  end_date: string | null;
  is_active: boolean;
  prepaid_until: string | null;
  last_prepaid_at: string | null;
  created_at: string;
  updated_at: string;
  template_expense?: Expense;
  expenses?: Expense;
}

type RecurringFrequency =
  | 'weekly'
  | 'bi_weekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly'
  | 'custom';
```

### Calculation Logic

#### Monthly Normalization

Different frequencies are normalized to monthly equivalents for analytics:

```typescript
switch (frequency) {
  case 'weekly':
    monthlyAmount = amount * 4.33; // Avg weeks per month
    break;
  case 'bi_weekly':
    monthlyAmount = amount * 2.165;
    break;
  case 'monthly':
    monthlyAmount = amount;
    break;
  case 'quarterly':
    monthlyAmount = amount / 3;
    break;
  case 'yearly':
    monthlyAmount = amount / 12;
    break;
}

// Account for interval (e.g., every 2 months)
monthlyTotal = monthlyAmount / (interval || 1);
```

#### Next Occurrence Calculation

```typescript
function calculateNextOccurrence(
  currentDate: Date,
  frequency: RecurringFrequency,
  interval: number
): Date {
  const next = new Date(currentDate);

  switch (frequency) {
    case 'weekly':
      next.setDate(next.getDate() + (7 * interval));
      break;
    case 'bi_weekly':
      next.setDate(next.getDate() + (14 * interval));
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + interval);
      break;
    case 'quarterly':
      next.setMonth(next.getMonth() + (3 * interval));
      break;
    case 'yearly':
      next.setFullYear(next.getFullYear() + interval);
      break;
  }

  return next;
}
```

## Mobile Optimizations

### Responsive Dialogs
- **Desktop**: Centered modal dialog (500px max width)
- **Mobile**: Bottom sheet that slides up from bottom
- **Handle Indicator**: Visual drag handle on mobile
- **Full-Width Buttons**: Buttons stack and fill width on mobile

### Swipe Actions
- **Horizontal Swipe**: Reveals quick actions (pause, delete)
- **Threshold**: 40% of max swipe distance to trigger snap
- **Max Swipe**: 120px maximum swipe distance
- **Disabled on Desktop**: Only enabled on touch devices

### Touch Targets
- **Minimum Size**: 44px × 44px for all interactive elements
- **Spacing**: Adequate spacing between touch targets
- **Visual Feedback**: Hover states and active states

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `1` | Switch to Active tab |
| `2` | Switch to Paused tab |
| `3` | Switch to Analytics tab |
| `N` | Create new recurring expense |

## Design System Integration

### Components Used

- **DataCard**: All card components (stats, analytics)
- **PageContainer**: Page layout wrapper
- **PageHeader**: Page title and actions
- **PageContent**: Main content area
- **Tabs**: Tab navigation (Active, Paused, Analytics)
- **ResponsiveDialog**: Mobile-optimized dialogs
- **SwipeableCard**: Touch gesture support
- **Badge**: Status indicators
- **Progress**: Visual progress bars
- **Alert**: Information banners

### Color System

- **Primary**: Active state, icons, progress bars
- **Destructive**: Delete actions, overdue expenses
- **Secondary**: Paused state, inactive elements
- **Success**: Successful actions, active badges
- **Muted**: Secondary text, disabled states

## API Integration

### Hooks

#### useRecurringExpenses
```typescript
const { recurring, active, paused, isLoading, error } = useRecurringExpenses({});
```

Fetches and categorizes recurring expenses into active and paused lists.

#### useRecurringActions
```typescript
const { pause, resume, skip, remove } = useRecurringActions();
```

Provides mutation functions with toast notification feedback.

### Supabase Resource

**Resource Name**: `recurring_expenses`

**Operations**:
- `list`: Fetch all recurring expenses
- `update`: Update frequency, interval, end_date, is_active
- `delete`: Remove recurring expense

## User Flows

### Create Recurring Expense Flow

1. User clicks "Create Recurring" button (header, empty state, or keyboard shortcut N)
2. `CreateRecurringDialog` opens
3. User selects context (group or friend)
4. User clicks "Continue"
5. Navigates to existing expense creation page with `?recurring=true` query param
6. User fills out expense template and recurring settings
7. Expense is created with recurring schedule

### Edit Recurring Expense Flow

1. User clicks three-dot menu on recurring expense card
2. Selects "Edit" from dropdown
3. `EditRecurringDialog` opens with current values
4. User modifies frequency, interval, or end date
5. User clicks "Save"
6. Toast notification confirms success
7. Card updates with new values

### Pause/Resume Flow

1. **Desktop**: User clicks dropdown menu → Pause/Resume
2. **Mobile**: User swipes right on card → taps Pause/Resume button
3. Toast notification confirms action
4. Card updates to show new status (badge changes color)
5. Expense moves between Active/Paused tabs

### Delete Flow

1. **Desktop**: User clicks dropdown menu → Delete
2. **Mobile**: User swipes right on card → taps Delete button
3. Confirmation dialog appears
4. User confirms deletion
5. Toast notification confirms success
6. Card is removed from list

## Accessibility

### Screen Reader Support
- **ARIA Labels**: All interactive elements have proper labels
- **Keyboard Navigation**: All actions accessible via keyboard
- **Focus Management**: Proper focus trapping in dialogs

### Visual Accessibility
- **Color Contrast**: WCAG AA compliant color ratios
- **Icon Labels**: Icons paired with text labels
- **Progress Indicators**: Both color and text convey state

### Motion
- **Reduced Motion**: Respects `prefers-reduced-motion` media query
- **Smooth Transitions**: 300ms transition timing
- **Optional Animations**: Can be disabled via system preferences

## Performance Considerations

### Data Fetching
- **React Query**: Automatic caching and background refetching
- **Pagination Mode**: Off (loads all recurring expenses)
- **Conditional Queries**: Only fetch when dialog is open

### Rendering Optimization
- **useMemo**: Expensive calculations memoized
- **React.memo**: Card components memoized
- **Virtualization**: Not needed (typical user has <50 recurring expenses)

### Mobile Performance
- **Touch Events**: Debounced and throttled
- **Swipe Gestures**: Hardware-accelerated transforms
- **Image Loading**: Lazy loading for avatars

## Future Enhancements

1. **Email Reminders**: Notify users before recurring expenses are created
2. **Prepaid Tracking**: Track prepaid periods and coverage
3. **Smart Suggestions**: Suggest recurring expenses based on patterns
4. **Bulk Actions**: Pause/resume/delete multiple expenses at once
5. **Export**: Export recurring expenses to CSV/PDF
6. **Calendar Integration**: Sync with external calendars
7. **Budget Integration**: Alert when recurring costs exceed budget
8. **Custom Frequencies**: Support for custom repeat patterns

## Testing

### Unit Tests
- Test `calculateNextOccurrence` function
- Test monthly normalization calculations
- Test category breakdown logic
- Test frequency distribution calculations

### Integration Tests
- Test create flow end-to-end
- Test edit flow end-to-end
- Test pause/resume/skip/delete actions
- Test swipe gesture interactions

### E2E Tests
- Test full user journey from create to delete
- Test mobile responsive behavior
- Test keyboard navigation
- Test notification system

## Troubleshooting

### Common Issues

**Recurring expenses not showing**
- Check `is_active` filter in query
- Verify Supabase RLS policies
- Check network tab for API errors

**Swipe actions not working**
- Only enabled on mobile (touch devices)
- Check for parent elements preventing touch events
- Verify `pointer-events-none` is set on desktop

**Analytics not updating**
- Clear React Query cache
- Verify calculations include all active expenses
- Check for division by zero in percentage calculations

**Notifications not appearing**
- Check `useNotification` hook is available
- Verify toast component is rendered in layout
- Check notification permissions

## Related Documentation

- [Design System Components](../components/composites.md)
- [Mobile Optimization Guidelines](../design-guidelines.md)
- [API Integration Patterns](../system-architecture.md)
- [Accessibility Standards](../code-standards.md)
