# Phase 2: Component Deduplication & CVA Implementation

**Date**: 2026-01-13 | **Priority**: 🔴 Critical | **Status**: 🟠 Blocked by Phase 1
**Duration**: 2 weeks | **Dependencies**: Phase 1 design system rules

---

## Context

**Research Sources**:
- [Component Architecture Research](./research-component-architecture.md) - Duplication patterns, refactoring strategies
- [Scout: UI Components](./scout-ui-components.md) - 33 dashboard components with overlapping logic
- [UI Inconsistencies Research](./research-ui-inconsistencies.md) - CVA usage recommendations

---

## Overview

FairPay has **33 dashboard components** with significant duplication:
- **Card variants**: `creditor-card`, `group-balance-card`, `one-off-payment-card`, `statistics-card` - all recreate similar card+header+footer patterns
- **Table components**: `accounting-records-table`, `payments-table`, `friends-table`, `groups-table` - duplicated filtering/sorting/pagination logic
- **Activity feeds**: `activity-feed`, `balance-feed` - similar rendering patterns

**The Problem**: Every new feature requires copying existing component patterns. No reusable abstractions exist. This creates:
- **Maintenance hell**: Bug fix requires changing 5+ files
- **Inconsistent UX**: Each card variant has slightly different padding/spacing
- **Developer friction**: Can't find "the right way" to build new features

**The Solution**: Extract common patterns into composable primitives using CVA (Class Variance Authority) and custom hooks.

---

## Key Insights from Research

### Critical Duplication Patterns

#### Pattern 1: Card Wrappers (5+ variants)
**Files**:
- `/src/components/dashboard/creditor-card.tsx`
- `/src/components/dashboard/group-balance-card.tsx`
- `/src/components/dashboard/one-off-payment-card.tsx`
- `/src/components/dashboard/statistics-card.tsx`
- `/src/components/dashboard/repayment-plan-card.tsx`

**Common Structure**:
```tsx
<Card className="p-4 space-y-2">
  <div className="flex justify-between">
    <h3>{title}</h3>
    <Badge>{status}</Badge>
  </div>
  <div>{content}</div>
  <div className="flex gap-2">{actions}</div>
</Card>
```

**Problem**: Each reimplements header/content/footer layout. Padding inconsistent (`p-4` vs `p-6`).

#### Pattern 2: Table Logic Duplication
**Files**:
- `/src/components/dashboard/accounting-records-table.tsx`
- `/src/components/dashboard/payments-table.tsx`
- `/src/components/dashboard/friends-table.tsx`
- `/src/components/dashboard/groups-table.tsx`

**Duplicated Logic**:
- Filtering state management
- Sorting state management
- Pagination state management
- Loading skeleton rendering
- Empty state display

**Problem**: Filter logic copied 4+ times. Bug fix requires changing all files.

#### Pattern 3: Activity Feed Rendering
**Files**:
- `/src/components/dashboard/activity-feed.tsx`
- `/src/components/dashboard/BalanceFeed.tsx`

**Common Pattern**: Map over items, render icon + title + timestamp + action button

**Problem**: No shared rendering primitive.

---

## Requirements

### Must Deliver

1. **Composite Card Component** (`src/components/ui/data-card.tsx`)
   - Base card with CVA variants
   - Compound component pattern (DataCard.Header, DataCard.Content, DataCard.Footer)
   - Variants: `default`, `elevated`, `flat`

2. **Custom Hooks for Table Logic**
   - `useTableFilter` - Filter state management
   - `useTableSort` - Sort state management
   - `useTablePagination` - Pagination logic

3. **Refactored Dashboard Components**
   - Convert card variants to use `DataCard`
   - Convert tables to use custom hooks
   - Eliminate duplicated logic

4. **CVA Variant System**
   - Button variants (primary/secondary/destructive/ghost)
   - Badge variants (status colors)
   - Card variants (elevation levels)

5. **Documentation** (`docs/components/composites.md`)
   - Composite component usage examples
   - Custom hook API documentation
   - Migration guide for existing components

---

## Architecture Decisions

### Decision 1: Compound Component Pattern for Cards
**Adopted Pattern**:
```tsx
<DataCard variant="elevated">
  <DataCard.Header title="Balance" badge={<Badge>Pending</Badge>} />
  <DataCard.Content>
    <BalanceChart data={data} />
  </DataCard.Content>
  <DataCard.Footer>
    <Button>Settle</Button>
  </DataCard.Footer>
</DataCard>
```

**Rationale**: Provides flexibility without prop-drilling. Clear API. Composable.

**Alternative Rejected**: Single component with all props (too rigid, complex API)

---

### Decision 2: CVA for Variant Management
**Adopted Library**: `class-variance-authority` (already in shadcn/ui)

**Pattern**:
```tsx
const cardVariants = cva(
  "rounded-lg border bg-card text-card-foreground",
  {
    variants: {
      variant: {
        default: "shadow-sm",
        elevated: "shadow-md",
        flat: "shadow-none"
      },
      padding: {
        compact: "p-3",
        comfortable: "p-4",
        spacious: "p-6"
      }
    },
    defaultVariants: {
      variant: "default",
      padding: "comfortable"
    }
  }
)
```

**Rationale**: Separates styling from logic. Reusable. Type-safe.

---

### Decision 3: Custom Hooks for Table State
**Hook APIs**:

```tsx
// useTableFilter
const { filters, setFilter, clearFilters, filteredData } = useTableFilter(data, schema)

// useTableSort
const { sortKey, sortDirection, setSortKey, sortedData } = useTableSort(data)

// useTablePagination
const { page, pageSize, totalPages, paginatedData, nextPage, prevPage } = useTablePagination(data)
```

**Rationale**: Encapsulates state logic. Reusable across all tables. Testable in isolation.

---

### Decision 4: Migration Strategy
**Approach**: Incremental migration, not big-bang refactor

**Steps**:
1. Create new composite components alongside old ones
2. Migrate one dashboard section at a time
3. Test each migration before proceeding
4. Delete old components only after full migration

**Rationale**: Reduces risk. Allows rollback. Maintains feature stability.

---

## Related Code Files

**Will Create**:
- `/Users/long.lnt/Desktop/Projects/FairPay/src/components/ui/data-card.tsx`
- `/Users/long.lnt/Desktop/Projects/FairPay/src/hooks/use-table-filter.ts`
- `/Users/long.lnt/Desktop/Projects/FairPay/src/hooks/use-table-sort.ts`
- `/Users/long.lnt/Desktop/Projects/FairPay/src/hooks/use-table-pagination.ts`
- `/Users/long.lnt/Desktop/Projects/FairPay/docs/components/composites.md`

**Will Refactor**:
- `/Users/long.lnt/Desktop/Projects/FairPay/src/components/dashboard/creditor-card.tsx`
- `/Users/long.lnt/Desktop/Projects/FairPay/src/components/dashboard/group-balance-card.tsx`
- `/Users/long.lnt/Desktop/Projects/FairPay/src/components/dashboard/statistics-card.tsx`
- `/Users/long.lnt/Desktop/Projects/FairPay/src/components/dashboard/accounting-records-table.tsx`
- `/Users/long.lnt/Desktop/Projects/FairPay/src/components/dashboard/payments-table.tsx`

**Will Reference**:
- `/Users/long.lnt/Desktop/Projects/FairPay/src/components/ui/card.tsx` - shadcn/ui base
- `/Users/long.lnt/Desktop/Projects/FairPay/src/components/ui/button.tsx` - CVA patterns

---

## Implementation Steps

### Step 1: Create Composite DataCard Component
**File**: `src/components/ui/data-card.tsx`

Implement compound component:
- `DataCard` root with CVA variants
- `DataCard.Header` with title + optional badge slot
- `DataCard.Content` with configurable padding
- `DataCard.Footer` with action button slot
- Export type definitions for TypeScript

**Acceptance**: Can render all 3 variants, all slots optional

### Step 2: Create useTableFilter Hook
**File**: `src/hooks/use-table-filter.ts`

Implement:
- Generic filter state management
- Filter schema validation
- Filtered data computation
- Clear filters function
- TypeScript generics for type safety

**Acceptance**: Works with accounting records table test case

### Step 3: Create useTableSort Hook
**File**: `src/hooks/use-table-sort.ts`

Implement:
- Sort key + direction state
- Toggle sort direction on re-click
- Sorted data computation
- Support for custom sort functions

**Acceptance**: Can sort by date, amount, name

### Step 4: Create useTablePagination Hook
**File**: `src/hooks/use-table-pagination.ts`

Implement:
- Page + pageSize state
- Total pages calculation
- Next/prev page navigation
- Jump to page function
- Page bounds validation

**Acceptance**: Handles edge cases (last page, first page)

### Step 5: Refactor Creditor Card
**File**: `src/components/dashboard/creditor-card.tsx`

Migrate to use DataCard:
- Replace Card with DataCard
- Use DataCard.Header for title + status badge
- Use DataCard.Content for amount display
- Use DataCard.Footer for action buttons
- Verify styling matches original

**Acceptance**: Visual regression test passes

### Step 6: Refactor Statistics Card
**File**: `src/components/dashboard/statistics-card.tsx`

Migrate to use DataCard:
- Replace custom card wrapper
- Use `variant="flat"` for minimal elevation
- Use `padding="compact"` for dense layout

**Acceptance**: Dashboard statistics section unchanged visually

### Step 7: Refactor Group Balance Card
**File**: `src/components/dashboard/group-balance-card.tsx`

Migrate to use DataCard:
- Use DataCard.Header with group name + member count badge
- DataCard.Content with balance breakdown
- DataCard.Footer with "View Group" button

**Acceptance**: Group balance display unchanged

### Step 8: Refactor Accounting Records Table
**File**: `src/components/dashboard/accounting-records-table.tsx`

Integrate custom hooks:
- Replace inline filter state with `useTableFilter`
- Replace inline sort state with `useTableSort`
- Replace inline pagination with `useTablePagination`
- Extract filter schema to constants

**Acceptance**: All filters/sorting/pagination work as before

### Step 9: Refactor Payments Table
**File**: `src/components/dashboard/payments-table.tsx`

Apply same pattern as Step 8

**Acceptance**: Payments table functionality unchanged

### Step 10: Extract CVA Button Variants
**File**: `src/components/ui/button.tsx` (update)

Audit button usage across dashboard:
- Document primary/secondary/destructive/ghost variants
- Add missing variants if needed
- Ensure consistent sizing (44px touch targets)

**Acceptance**: All buttons use CVA variants, no inline classes

### Step 11: Create Activity Feed Primitive
**File**: `src/components/ui/activity-item.tsx`

Extract common rendering pattern:
- Icon slot (left side)
- Title + description (center)
- Timestamp + action (right side)
- Responsive layout (stack on mobile)

**Acceptance**: Both activity feeds use primitive

### Step 12: Write Composite Component Docs
**File**: `docs/components/composites.md`

Document:
- DataCard API with all variants
- Custom hook APIs with examples
- Migration guide from old patterns
- When to create new composites

**Acceptance**: New developer can use DataCard without asking questions

### Step 13: Code Review & Testing
- Submit PR with all changes
- Run visual regression tests
- Test on mobile devices
- Get team review
- Address feedback

### Step 14: Cleanup Old Code
- Delete unused card variants (if fully migrated)
- Remove duplicated filter logic
- Update imports across codebase

---

## Todo Checklist

### Composite Components
- [ ] Create DataCard composite component with CVA variants
- [ ] Create ActivityItem primitive component
- [ ] Test DataCard with all 3 variants (default, elevated, flat)
- [ ] Test DataCard with optional slots (header only, content only, etc.)

### Custom Hooks
- [ ] Implement useTableFilter hook with TypeScript generics
- [ ] Implement useTableSort hook with custom sort functions
- [ ] Implement useTablePagination hook with bounds validation
- [ ] Write unit tests for each hook

### Dashboard Component Migration
- [ ] Refactor creditor-card.tsx to use DataCard
- [ ] Refactor statistics-card.tsx to use DataCard
- [ ] Refactor group-balance-card.tsx to use DataCard
- [ ] Refactor one-off-payment-card.tsx to use DataCard
- [ ] Refactor repayment-plan-card.tsx to use DataCard

### Table Component Migration
- [ ] Refactor accounting-records-table.tsx to use custom hooks
- [ ] Refactor payments-table.tsx to use custom hooks
- [ ] Refactor friends-table.tsx to use custom hooks
- [ ] Refactor groups-table.tsx to use custom hooks

### CVA Variants
- [ ] Audit button usage across dashboard
- [ ] Document button variants in design system
- [ ] Extract badge variants to CVA
- [ ] Ensure all interactive elements meet 44px touch target

### Activity Feed
- [ ] Extract activity-feed.tsx to use ActivityItem primitive
- [ ] Extract BalanceFeed.tsx to use ActivityItem primitive
- [ ] Verify responsive layout on mobile

### Documentation & Cleanup
- [ ] Write composites.md documentation
- [ ] Create migration guide for old card patterns
- [ ] Delete unused old components
- [ ] Update imports across codebase
- [ ] Run visual regression tests
- [ ] Test on mobile devices (iOS Safari, Chrome Android)

---

## Success Criteria

### Code Reduction
- [ ] Dashboard component count reduced from 33 → <25
- [ ] Table logic duplication eliminated (4 files → 3 custom hooks)
- [ ] Card component LoC reduced by 40%

### Consistency
- [ ] All dashboard cards use DataCard composite
- [ ] All tables use custom hooks (no inline filter/sort logic)
- [ ] All buttons use CVA variants (no inline Tailwind classes)

### Developer Experience
- [ ] New card variant takes <10 minutes to create (using DataCard)
- [ ] New table component takes <15 minutes (using custom hooks)
- [ ] Zero questions from team about "which card component to use"

### Visual Consistency
- [ ] All card padding uses design system scale (p-3, p-4, p-6)
- [ ] Visual regression tests pass (100% pixel match)
- [ ] Mobile layout consistent across all cards

---

## Risk Assessment

### High Risk
- **Breaking Changes**: Refactoring may break edge cases → **Mitigation**: Incremental migration, feature flags
- **Visual Regressions**: Subtle styling differences → **Mitigation**: Chromatic visual testing, manual QA

### Medium Risk
- **Hook Complexity**: Custom hooks may be too generic → **Mitigation**: Start simple, add features as needed
- **Performance**: CVA overhead on re-renders → **Mitigation**: Memoization, React.memo for heavy components

---

## Next Steps

**After Phase 2 Completion**:
1. Proceed to [Phase 3: Layout Consistency](./phase-03-layout-consistency.md)
2. Apply design system rules to page layouts
3. Standardize container padding across all pages

**Blockers for Phase 3**:
- ✅ DataCard composite created and tested
- ✅ Custom hooks extracted and working
- ✅ At least 3 dashboard components migrated successfully

---

## Unresolved Questions

1. **Performance impact of CVA?** - Need benchmark before/after
2. **Should we extract table component too?** - Or just hooks sufficient?
3. **Activity feed needs real-time updates?** - WebSocket integration?
4. **Card elevation accessibility?** - Does shadow-md meet contrast requirements?
5. **How to handle card hover states?** - Consistent across all variants?
