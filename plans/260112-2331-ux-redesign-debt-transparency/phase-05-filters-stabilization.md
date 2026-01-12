# Phase 5: Filters Stabilization

**Status:** Not Started
**Priority:** Medium
**Effort:** 4-6 hours
**Dependencies:** None (can run in parallel with other phases)

## Context

User feedback: "Filters are bugged, so I avoid using them." Unreliable filters create frustration and reduce feature adoption.

## Overview

Audit all filter functionality, fix bugs, or disable unreliable filters with clear "Coming soon" messaging. Ensure filter chips reflect correct counts and are consistent with displayed lists.

## Key Insights

- Bugged filters worse than no filters (erodes trust)
- Filter chips must match displayed data (count accuracy critical)
- Sorting must be predictable (Newest/Oldest first)
- Status filters (Paid/Unpaid/Partial) must not mix inconsistently
- If filter can't be fixed quickly, disable it gracefully

## Requirements

### Functional
- **If Reliable**:
  - Filter chips show correct counts
  - Filtered list matches selected chips
  - Sorting works predictably (Newest/Oldest)
  - Status filters exclusive (not mixing Paid/Unpaid)
- **If Unreliable**:
  - Disable filter UI with "Coming soon" message
  - Show tooltip explaining feature in development
  - Remove from UI entirely (cleaner than broken)

### Non-Functional
- Fast filter application (<100ms)
- Smooth animations when filters change
- Mobile-optimized filter controls
- Accessible keyboard navigation

## Architecture

### Current Filter Locations
```
1. Dashboard Activity List
   - src/components/dashboard/enhanced-activity-list.tsx
   - src/components/dashboard/activity-filter-controls.tsx
   - Filters: All, Paid, Unpaid, Partial
   - Sort: Date (desc/asc)

2. Profile Page Activity
   - src/modules/profile/pages/show-unified.tsx
   - Uses EnhancedActivityList component

3. Expense List (if exists)
   - src/modules/expenses/components/expense-list.tsx
   - Filters by status, date range, category

4. Data Table Filter (generic)
   - src/components/refine-ui/data-table/data-table-filter.tsx
```

### Filter Logic Flow
```
User clicks filter chip
  ↓
Update activeFilter state
  ↓
useMemo: filter activities based on activeFilter
  ↓
useMemo: calculate filter counts
  ↓
Render: filtered list + updated chip counts
```

## Related Code Files

**Files to Audit:**
- `src/components/dashboard/enhanced-activity-list.tsx` - Main activity filter
- `src/components/dashboard/activity-filter-controls.tsx` - Filter chips UI
- `src/components/dashboard/activity-sort-controls.tsx` - Sort UI
- `src/components/filters/use-expense-filters.ts` - Expense filter hook
- `src/components/filters/expense-filters-panel.tsx` - Expense filter UI
- `src/components/refine-ui/data-table/data-table-filter.tsx` - Generic data table filter

**Files to Modify:**
- (Determined after audit - may need to fix bugs or disable)

## Implementation Steps

### Step 1: Audit Enhanced Activity List Filters
**File:** `src/components/dashboard/enhanced-activity-list.tsx`

**Check:**
- Filter counts match actual data
- Filtered list shows correct items
- Status filter values consistent with data model
- Sort order predictable

**Common Bugs:**
- Filter counts calculated on original data instead of filtered
- Race condition between filter state and data fetch
- Status enum mismatch ('paid' vs 'Paid' vs 'PAID')
- Sort not resetting offset/pagination

**Fix Pattern:**
```tsx
// CORRECT: Filter counts calculated from source data
const filterCounts = React.useMemo(() => ({
  all: activities.length,
  paid: activities.filter((a) => a.paymentState === "paid").length,
  unpaid: activities.filter((a) => a.paymentState === "unpaid").length,
  partial: activities.filter((a) => a.paymentState === "partial").length,
}), [activities]);

// CORRECT: Filtered data calculated after count
const filteredActivities = React.useMemo(() => {
  if (activeFilter === "all") return activities;
  return activities.filter((activity) => activity.paymentState === activeFilter);
}, [activities, activeFilter]);

// CORRECT: Reset pagination when filter changes
React.useEffect(() => {
  setVisibleCount(initialCount);
}, [activeFilter, activeSort]);
```

### Step 2: Fix Filter Chip Count Inconsistency
**File:** `src/components/dashboard/activity-filter-controls.tsx`

Ensure chip counts updated correctly:
```tsx
interface FilterChipProps {
  label: string;
  count: number;  // Pass actual count from parent
  isActive: boolean;
  onClick: () => void;
}

export function FilterChip({ label, count, isActive, onClick }: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
        isActive
          ? "bg-primary text-primary-foreground"
          : "bg-muted hover:bg-muted/80"
      )}
    >
      <span>{label}</span>
      {count > 0 && (
        <Badge variant={isActive ? "secondary" : "outline"} className="ml-1">
          {count}
        </Badge>
      )}
    </button>
  );
}
```

### Step 3: Fix Sorting Predictability
**File:** `src/components/dashboard/activity-sort-controls.tsx`

Ensure sort order clear and consistent:
```tsx
export type SortOption = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';

const sortOptions: Array<{ value: SortOption; label: string }> = [
  { value: 'date-desc', label: 'Newest First' },
  { value: 'date-asc', label: 'Oldest First' },
  { value: 'amount-desc', label: 'Highest Amount' },
  { value: 'amount-asc', label: 'Lowest Amount' },
];

// Ensure sort functions handle null/undefined dates
function sortActivitiesByDate(activities: Activity[], order: 'asc' | 'desc') {
  return [...activities].sort((a, b) => {
    const dateA = new Date(a.date || 0).getTime();
    const dateB = new Date(b.date || 0).getTime();
    return order === 'desc' ? dateB - dateA : dateA - dateB;
  });
}
```

### Step 4: Audit Expense Filters
**File:** `src/components/filters/use-expense-filters.ts`

**Check:**
- Date range filter works correctly
- Category filter matches expense categories
- Status filter consistent with expense_splits.is_settled
- Group filter shows only user's groups

**Common Bugs:**
- Date range not inclusive (off-by-one)
- Category enum mismatch
- Status calculated incorrectly (not checking all splits)
- Performance issues with large datasets

### Step 5: Disable Unreliable Filters
If filter cannot be fixed quickly, disable gracefully:

**Option A: Show "Coming Soon" UI**
```tsx
<div className="relative">
  <div className="opacity-50 pointer-events-none">
    <FilterChip label="By Category" count={0} isActive={false} onClick={() => {}} />
  </div>
  <Tooltip>
    <TooltipTrigger asChild>
      <div className="absolute inset-0 flex items-center justify-center">
        <InfoIcon className="h-4 w-4 text-muted-foreground" />
      </div>
    </TooltipTrigger>
    <TooltipContent>
      <p>Category filter coming soon</p>
    </TooltipContent>
  </Tooltip>
</div>
```

**Option B: Remove Entirely**
```tsx
// Comment out or remove unreliable filter
{/* <FilterChip label="By Category" ... /> */}
```

### Step 6: Add Filter Reset Button
Provide clear way to reset all filters:
```tsx
<Button
  variant="ghost"
  size="sm"
  onClick={handleResetFilters}
  className="ml-auto"
>
  <XIcon className="h-4 w-4 mr-2" />
  {t('filters.reset')}
</Button>
```

### Step 7: Add Loading States for Filters
Show loading indicator when filters applying:
```tsx
{isApplyingFilter && (
  <div className="flex items-center gap-2 text-sm text-muted-foreground">
    <Loader2Icon className="h-4 w-4 animate-spin" />
    <span>{t('filters.applying')}</span>
  </div>
)}
```

## Todo List

- [ ] Audit enhanced-activity-list.tsx filter logic
- [ ] Fix filter count calculations
- [ ] Fix filtered list consistency
- [ ] Audit activity-filter-controls.tsx chip counts
- [ ] Fix sorting predictability
- [ ] Audit use-expense-filters.ts
- [ ] Fix or disable unreliable filters
- [ ] Add filter reset button
- [ ] Add loading states for filter application
- [ ] Test filter edge cases (empty lists, all items filtered out)
- [ ] Test filter + sort combinations
- [ ] Test on mobile (touch targets, scrolling)
- [ ] Add translations for new filter messages

## Success Criteria

- [ ] Filter chips show correct counts (match filtered list)
- [ ] Clicking filter updates list immediately (<100ms)
- [ ] Sorted list order predictable and labeled clearly
- [ ] Status filters mutually exclusive (selecting one deselects others)
- [ ] Filter + sort combinations work correctly
- [ ] Unreliable filters either fixed or disabled gracefully
- [ ] Reset button clears all filters
- [ ] Loading states show for async filter operations
- [ ] Mobile filter controls accessible (44x44px touch targets)

## Common Filter Bugs to Fix

1. **Count Mismatch**
   - Symptom: Chip shows "Paid (5)" but filtered list has 3 items
   - Fix: Calculate counts from same data source as filtered list

2. **Race Condition**
   - Symptom: Filter applies but list doesn't update
   - Fix: Use consistent state management, avoid stale closures

3. **Enum Mismatch**
   - Symptom: Filter for "paid" but data has "Paid" or "PAID"
   - Fix: Normalize enum values in data layer or filter logic

4. **Sort Not Resetting**
   - Symptom: Changing filter doesn't reset pagination
   - Fix: Reset pagination state when filter changes

5. **Null/Undefined Handling**
   - Symptom: Sort breaks on null dates
   - Fix: Provide default values, handle null explicitly

## Risk Assessment

**Low Risk:**
- Filter logic isolated to specific components
- No data model changes
- Easy to rollback

**Mitigation:**
- Test filter combinations exhaustively
- Add comprehensive unit tests for filter logic
- Consider feature flags for new filters

## Security Considerations

None - filters are client-side display logic only.

## Next Steps

After completion:
1. Monitor filter usage analytics
2. Gather user feedback on filter reliability
3. Proceed to Phase 6 (Integration & Testing)
