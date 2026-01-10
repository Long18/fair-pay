# Performance Optimizations

This document outlines the performance optimizations implemented in the FairPay application.

## Overview

The application implements several performance optimization strategies to ensure smooth user experience, especially when dealing with large datasets and complex UI interactions.

## Implemented Optimizations

### 1. Code Splitting & Lazy Loading

**Location**: `src/App.tsx`

All route components are lazy-loaded using React's `lazy()` and `Suspense`:

```typescript
const ExpenseCreate = lazy(() => import("./modules/expenses").then(m => ({ default: m.ExpenseCreate })));
const GroupList = lazy(() => import("./modules/groups").then(m => ({ default: m.GroupList })));
// ... etc
```

**Benefits**:
- Reduces initial bundle size
- Faster initial page load
- Components loaded on-demand

### 2. Image Lazy Loading

**Location**: `src/modules/expenses/components/attachment-list.tsx`

Images in the receipts/attachments section use native browser lazy loading:

```typescript
<img
  src={imageUrl}
  alt={attachment.file_name}
  loading="lazy"  // Native lazy loading
  onLoad={() => handleImageLoad(attachment.id)}
  onError={() => handleImageError(attachment.id)}
/>
```

**Benefits**:
- Images load only when near viewport
- Reduces initial bandwidth usage
- Improves perceived performance

### 3. Memoization

**Locations**: Throughout the codebase

Extensive use of `React.useMemo` and `React.useCallback` for expensive calculations:

#### Enhanced Activity List (`src/components/dashboard/enhanced-activity-list.tsx`)

```typescript
// Memoized filtering
const filteredActivities = React.useMemo(() => {
  if (activeFilter === "all") return activities;
  return activities.filter((activity) => activity.paymentState === activeFilter);
}, [activities, activeFilter]);

// Memoized sorting
const sortedActivities = React.useMemo(() => {
  switch (activeSort) {
    case "date-desc": return sortActivitiesByDate(filteredActivities, "desc");
    // ... other cases
  }
}, [filteredActivities, activeSort]);

// Memoized duplicate detection
const duplicateIds = React.useMemo(() => {
  return detectDuplicateDescriptions(sortedActivities);
}, [sortedActivities]);

// Memoized time grouping
const timeGroups = React.useMemo(() => {
  if (!showTimeGrouping) return null;
  return groupActivitiesByTimePeriod(visibleItems);
}, [visibleItems, showTimeGrouping]);

// Memoized filter counts
const filterCounts = React.useMemo(() => ({
  all: activities.length,
  paid: activities.filter((a) => a.paymentState === "paid").length,
  unpaid: activities.filter((a) => a.paymentState === "unpaid").length,
  partial: activities.filter((a) => a.paymentState === "partial").length,
}), [activities]);

// Memoized summary metrics
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
  return { totalOwed, totalToReceive, netBalance: totalToReceive - totalOwed };
}, [activities]);
```

#### Other Components

- `src/hooks/use-split-calculation.ts` - Memoized split calculations
- `src/hooks/use-category-breakdown.ts` - Memoized category data
- `src/hooks/use-spending-summary.ts` - Memoized spending summaries
- `src/hooks/use-global-balance.ts` - Memoized balance calculations
- `src/components/dashboard/balance-chart.tsx` - Memoized chart data

**Benefits**:
- Prevents unnecessary recalculations
- Reduces render cycles
- Improves responsiveness

### 4. Debouncing

**Locations**: 
- `src/lib/performance.ts` - Debounce utility
- `src/components/dashboard/enhanced-activity-list.tsx` - Debounced filter/sort
- `src/hooks/use-aggregated-debts.ts` - Debounced debt fetching

#### Filter/Sort Debouncing

```typescript
// Debounced handlers to avoid excessive URL updates and re-renders
const debouncedFilterChange = React.useMemo(
  () => debounce(handleFilterChange, 300),
  [handleFilterChange]
);

const debouncedSortChange = React.useMemo(
  () => debounce(handleSortChange, 300),
  [handleSortChange]
);
```

#### Debt Fetching Debouncing

```typescript
const debouncedFetchDebts = useCallback(() => {
  if (debounceTimerRef.current) {
    clearTimeout(debounceTimerRef.current);
  }
  debounceTimerRef.current = setTimeout(() => {
    fetchDebts();
  }, 500); // 500ms debounce
}, [fetchDebts]);
```

**Benefits**:
- Reduces API calls
- Prevents excessive URL updates
- Smoother user interactions
- Reduces unnecessary re-renders

### 5. Progressive Disclosure

**Location**: `src/hooks/use-progressive-disclosure.ts`

Custom hook for paginated/incremental loading:

```typescript
const {
  visibleItems,
  hasMore,
  loadMore,
  totalCount,
  visibleCount,
} = useProgressiveDisclosure(activitiesWithContext, {
  initialCount: 10,
  incrementCount: 10,
});
```

**Benefits**:
- Renders only visible items initially
- Loads more on demand
- Reduces initial render time
- Better memory usage

### 6. Callback Memoization

**Locations**: Throughout the codebase

Event handlers wrapped in `React.useCallback`:

```typescript
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
```

**Benefits**:
- Prevents unnecessary child re-renders
- Stable function references
- Better React.memo effectiveness

## Future Optimizations (Not Yet Implemented)

### 1. Virtual Scrolling

For very long lists (1000+ items), consider implementing virtual scrolling using:
- `react-window` or `react-virtualized`
- Only renders visible items in viewport
- Significant performance improvement for large datasets

**When to implement**: If users report performance issues with large activity lists

### 2. Web Workers

For heavy computations (complex balance calculations, large data processing):
- Offload to Web Workers
- Keeps UI thread responsive
- Better for CPU-intensive operations

**When to implement**: If balance calculations become a bottleneck

### 3. Service Worker Caching

For offline support and faster subsequent loads:
- Cache API responses
- Cache static assets
- Progressive Web App (PWA) capabilities

**When to implement**: When offline support is required

## Performance Monitoring

### Metrics to Track

1. **Initial Load Time**: Time to interactive
2. **Route Transition Time**: Time to render new route
3. **Filter/Sort Response Time**: Time from user action to UI update
4. **Memory Usage**: Heap size over time
5. **Bundle Size**: Total JavaScript size

### Tools

- Chrome DevTools Performance tab
- React DevTools Profiler
- Lighthouse audits
- Bundle analyzer (webpack-bundle-analyzer or similar)

## Best Practices

1. **Always profile before optimizing**: Use React DevTools Profiler to identify bottlenecks
2. **Measure impact**: Compare before/after metrics
3. **Don't over-optimize**: Premature optimization can hurt code readability
4. **Use production builds**: Development builds are slower
5. **Monitor bundle size**: Keep an eye on dependencies

## Related Files

- `src/lib/performance.ts` - Performance utilities (debounce, throttle)
- `src/hooks/use-progressive-disclosure.ts` - Progressive loading hook
- `src/App.tsx` - Route lazy loading
- `src/components/dashboard/enhanced-activity-list.tsx` - Optimized activity list
- `src/modules/expenses/components/attachment-list.tsx` - Lazy-loaded images

## References

- [React Performance Optimization](https://react.dev/learn/render-and-commit)
- [Web.dev Performance](https://web.dev/performance/)
- [React Profiler](https://react.dev/reference/react/Profiler)
