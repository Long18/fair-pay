# Recurring Expenses Management Page - Implementation Plan

**Date**: 2026-01-14 | **Status**: Ready for Implementation | **Owner**: Development Team

---

## Executive Summary

Implement a comprehensive Recurring Expenses Management Page that showcases the new Phase 1-5 design system components while delivering high user value. The feature automates repetitive expense entry for rent, subscriptions, utilities, and other regular payments.

**Current State**: Recurring expense components exist but are not integrated as a standalone page. Components include:
- `RecurringExpenseList` - List view with active/paused tabs
- `RecurringExpenseCard` - Individual expense card
- `RecurringExpenseForm` - Create/edit form
- `useRecurringExpenses` hook - Data fetching logic
- Complete data model in `recurring.ts`

**Target State**: Dedicated `/recurring-expenses` page with full CRUD operations, mobile optimization, and complete design system integration.

---

## Feature Requirements

### Core Functionality

**1. View Management**
- List all recurring expenses (active & paused)
- Filter by group/friend context
- Search by description
- Sort by next occurrence, amount, frequency
- Tab persistence using `usePersistedState`

**2. CRUD Operations**
- Create new recurring expense templates
- Edit existing recurring expenses
- Pause/resume recurring expenses
- Delete recurring expenses
- Prepaid payment management

**3. Notifications & Insights**
- Upcoming expenses (7-day lookahead)
- Prepaid coverage status
- Next occurrence dates
- Total monthly recurring cost summary

**4. Mobile Optimization**
- Bottom navigation integration
- Mobile app bar for compact header
- Responsive card layouts
- Touch-optimized actions

### User Stories

**US1**: As a user, I want to view all my recurring expenses in one place
- **AC1**: See list of active recurring expenses
- **AC2**: See list of paused recurring expenses
- **AC3**: Tab selection persists across sessions
- **AC4**: Empty states guide me to create first recurring expense

**US2**: As a user, I want to create a recurring expense template
- **AC1**: Select frequency (weekly, bi-weekly, monthly, quarterly, yearly, custom)
- **AC2**: Set start date and optional end date
- **AC3**: Define split between participants
- **AC4**: Template validates before saving

**US3**: As a user, I want quick actions on recurring expenses
- **AC1**: Pause/resume with single click
- **AC2**: Skip next occurrence
- **AC3**: Record prepaid payment
- **AC4**: Edit template details

**US4**: As a mobile user, I want optimized mobile experience
- **AC1**: Bottom navigation for easy thumb access
- **AC2**: Swipe actions for quick edits
- **AC3**: Mobile app bar with back navigation
- **AC4**: Touch targets meet 44px minimum

---

## Design System Integration

### Phase 1-5 Components Usage

**Layout Components (Phase 3)**:
```tsx
<PageContainer variant="default">
  <PageHeader
    title="Recurring Expenses"
    description="Manage your automatic recurring payments"
    action={<Button>Create Recurring</Button>}
  />
  <PageContent>
    {/* Content */}
  </PageContent>
  <BottomNavigationSpacer />
</PageContainer>
```

**State Persistence (Phase 4)**:
```tsx
const [activeTab, setActiveTab] = usePersistedState<"active" | "paused">(
  "recurring-expenses-tab",
  "active"
);

const [sortBy, setSortBy] = usePersistedState<SortField>(
  "recurring-expenses-sort",
  "next_occurrence"
);
```

**Keyboard Shortcuts (Phase 4)**:
```tsx
useKeyboardShortcut([
  { key: "n", callback: () => setCreateDialogOpen(true) },
  { key: "1", callback: () => setActiveTab("active") },
  { key: "2", callback: () => setActiveTab("paused") },
]);
```

**Mobile Components (Phase 5)**:
```tsx
<MobileOnly>
  <MobileAppBar title="Recurring" showBack />
  <BottomNavigation>
    <BottomNavigationItem to="/dashboard" icon={<HomeIcon />} label="Home" />
    <BottomNavigationItem to="/recurring-expenses" icon={<RepeatIcon />} label="Recurring" />
  </BottomNavigation>
</MobileOnly>

<DesktopOnly>
  <PageHeader title="Recurring Expenses" />
</DesktopOnly>
```

**DataCard Components (Phase 2)**:
```tsx
<DataCard variant="default">
  <DataCard.Header
    title={expense.template_expense?.description}
    badge={<FrequencyBadge frequency={expense.frequency} />}
  />
  <DataCard.Content>
    <DataCard.Stat label="Next" value={formatDate(expense.next_occurrence)} />
    <DataCard.Stat label="Amount" value={formatCurrency(amount)} />
  </DataCard.Content>
  <DataCard.Actions>
    <Button variant="ghost" size="sm">Pause</Button>
    <Button variant="ghost" size="sm">Edit</Button>
  </DataCard.Actions>
</DataCard>
```

---

## Architecture Design

### File Structure

```
src/
├── pages/
│   └── recurring-expenses.tsx          # Main page (NEW)
├── modules/
│   └── expenses/
│       ├── components/
│       │   ├── recurring-expense-card.tsx        # (EXISTS)
│       │   ├── recurring-expense-form.tsx        # (EXISTS)
│       │   ├── recurring-expense-quick-actions.tsx  # (NEW)
│       │   ├── recurring-expense-filters.tsx     # (NEW)
│       │   └── recurring-upcoming-preview.tsx    # (NEW)
│       ├── hooks/
│       │   ├── use-recurring-expenses.ts         # (EXISTS)
│       │   ├── use-recurring-stats.ts            # (NEW)
│       │   └── use-recurring-actions.ts          # (NEW)
│       ├── pages/
│       │   └── recurring-list.tsx                # (EXISTS - refactor)
│       └── types/
│           └── recurring.ts                      # (EXISTS)
```

### New Components

**1. recurring-expenses.tsx** (Main Page)
```tsx
export function RecurringExpensesPage() {
  const [activeTab, setActiveTab] = usePersistedState("recurring-tab", "active");
  const [sortBy, setSortBy] = usePersistedState("recurring-sort", "next_occurrence");
  const [filterContext, setFilterContext] = useState<"all" | "groups" | "friends">("all");

  const { recurring, active, paused, isLoading } = useRecurringExpenses();
  const stats = useRecurringStats(recurring);
  const actions = useRecurringActions();

  return (
    <>
      <ResponsiveAppBar
        title="Recurring Expenses"
        description="Manage your automatic recurring payments"
        showBack
        action={<CreateRecurringButton />}
      />

      <PageContainer>
        <PageContent>
          {/* Stats Summary */}
          <RecurringStats stats={stats} />

          {/* Upcoming Preview */}
          <RecurringUpcomingPreview expenses={getUpcoming(recurring, 7)} />

          {/* Filters */}
          <RecurringFilters
            context={filterContext}
            onContextChange={setFilterContext}
            sortBy={sortBy}
            onSortChange={setSortBy}
          />

          {/* Main List */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="active">Active ({active.length})</TabsTrigger>
              <TabsTrigger value="paused">Paused ({paused.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="active">
              <RecurringList expenses={active} actions={actions} />
            </TabsContent>

            <TabsContent value="paused">
              <RecurringList expenses={paused} actions={actions} />
            </TabsContent>
          </Tabs>
        </PageContent>
        <BottomNavigationSpacer />
      </PageContainer>

      <MobileOnly>
        <BottomNavigation>
          <BottomNavigationItem to="/dashboard" icon={<HomeIcon />} label="Home" />
          <BottomNavigationItem to="/recurring-expenses" icon={<RepeatIcon />} label="Recurring" />
          <BottomNavigationItem to="/balances" icon={<WalletIcon />} label="Balances" />
        </BottomNavigation>
      </MobileOnly>
    </>
  );
}
```

**2. recurring-expense-quick-actions.tsx**
```tsx
export function RecurringQuickActions({ expense, onAction }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontalIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => onAction('pause')}>
          <PauseIcon /> {expense.is_active ? 'Pause' : 'Resume'}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAction('skip')}>
          <SkipIcon /> Skip Next
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAction('prepay')}>
          <CreditCardIcon /> Record Prepayment
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onAction('edit')}>
          <EditIcon /> Edit Template
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAction('delete')} className="text-destructive">
          <TrashIcon /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

**3. recurring-expense-filters.tsx**
```tsx
export function RecurringFilters({ context, onContextChange, sortBy, onSortChange }: Props) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Select value={context} onValueChange={onContextChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Expenses</SelectItem>
          <SelectItem value="groups">Groups Only</SelectItem>
          <SelectItem value="friends">Friends Only</SelectItem>
        </SelectContent>
      </Select>

      <Select value={sortBy} onValueChange={onSortChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="next_occurrence">Next Due</SelectItem>
          <SelectItem value="amount">Amount</SelectItem>
          <SelectItem value="frequency">Frequency</SelectItem>
          <SelectItem value="created_at">Created Date</SelectItem>
        </SelectContent>
      </Select>

      <SearchInput placeholder="Search recurring expenses..." />
    </div>
  );
}
```

**4. recurring-upcoming-preview.tsx**
```tsx
export function RecurringUpcomingPreview({ expenses }: Props) {
  const upcomingThisWeek = expenses.filter(e =>
    isWithinDays(e.next_occurrence, 7)
  );

  if (upcomingThisWeek.length === 0) return null;

  return (
    <Alert>
      <CalendarIcon className="h-4 w-4" />
      <AlertTitle>Upcoming This Week</AlertTitle>
      <AlertDescription>
        {upcomingThisWeek.length} recurring expense{upcomingThisWeek.length > 1 ? 's' : ''}
        will be created in the next 7 days.
        <div className="mt-2 space-y-1">
          {upcomingThisWeek.map(e => (
            <div key={e.id} className="text-xs">
              • {e.template_expense?.description} - {formatDate(e.next_occurrence)}
            </div>
          ))}
        </div>
      </AlertDescription>
    </Alert>
  );
}
```

**5. use-recurring-stats.ts**
```tsx
export function useRecurringStats(recurring: RecurringExpense[]) {
  return useMemo(() => {
    const active = recurring.filter(r => r.is_active);
    const paused = recurring.filter(r => !r.is_active);

    // Calculate total monthly cost (normalize all frequencies to monthly)
    const monthlyTotal = active.reduce((sum, r) => {
      const amount = r.template_expense?.amount || 0;
      const monthlyAmount = normalizeToMonthly(amount, r.frequency, r.interval);
      return sum + monthlyAmount;
    }, 0);

    // Upcoming in next 30 days
    const upcoming30Days = active.filter(r =>
      isWithinDays(r.next_occurrence, 30)
    ).length;

    return {
      total: recurring.length,
      active: active.length,
      paused: paused.length,
      monthlyTotal,
      upcoming30Days,
    };
  }, [recurring]);
}
```

**6. use-recurring-actions.ts**
```tsx
export function useRecurringActions() {
  const { mutate: updateRecurring } = useUpdate();
  const { mutate: deleteRecurring } = useDelete();

  const pause = useCallback((id: string) => {
    updateRecurring({
      resource: 'recurring_expenses',
      id,
      values: { is_active: false },
    });
  }, [updateRecurring]);

  const resume = useCallback((id: string) => {
    updateRecurring({
      resource: 'recurring_expenses',
      id,
      values: { is_active: true },
    });
  }, [updateRecurring]);

  const skip = useCallback((expense: RecurringExpense) => {
    const nextOccurrence = calculateNextOccurrence(
      new Date(expense.next_occurrence),
      expense.frequency,
      expense.interval
    );

    updateRecurring({
      resource: 'recurring_expenses',
      id: expense.id,
      values: { next_occurrence: nextOccurrence.toISOString() },
    });
  }, [updateRecurring]);

  const remove = useCallback((id: string) => {
    deleteRecurring({
      resource: 'recurring_expenses',
      id,
    });
  }, [deleteRecurring]);

  return { pause, resume, skip, remove };
}
```

---

## Implementation Tasks

### Phase 1: Core Page Setup (2-3 hours)
1. Create `src/pages/recurring-expenses.tsx` main page component
2. Add route to `App.tsx`:
   ```tsx
   const RecurringExpensesPage = lazy(() => import("./pages/recurring-expenses").then(m => ({ default: m.RecurringExpensesPage })));

   // In routes:
   <Route path="/recurring-expenses" element={<RecurringExpensesPage />} />
   ```
3. Add navigation menu item:
   ```tsx
   {
     name: "recurring",
     list: "/recurring-expenses",
     meta: {
       label: "Recurring",
       icon: <RepeatIcon />,
     },
   }
   ```
4. Integrate layout components (PageContainer, PageHeader, PageContent)
5. Add mobile app bar and bottom navigation

**Success Criteria**: Page accessible at `/recurring-expenses`, layout renders correctly on mobile and desktop

### Phase 2: Data Integration (2 hours)
1. Refactor `RecurringExpenseList` to use new layout
2. Integrate `useRecurringExpenses` hook
3. Implement tab state persistence with `usePersistedState`
4. Add loading states and error handling

**Success Criteria**: List displays active/paused expenses, tab selection persists

### Phase 3: Stats & Filters (2-3 hours)
1. Create `use-recurring-stats.ts` hook
2. Create `RecurringStats` component (monthly total, upcoming count)
3. Create `RecurringFilters` component (context, sort, search)
4. Implement sort persistence with `usePersistedState`

**Success Criteria**: Stats calculate correctly, filters work, sort order persists

### Phase 4: Quick Actions (2 hours)
1. Create `RecurringQuickActions` component
2. Create `use-recurring-actions.ts` hook
3. Implement pause/resume functionality
4. Implement skip next occurrence
5. Add delete with confirmation dialog

**Success Criteria**: All actions work, optimistic updates, proper error handling

### Phase 5: Upcoming Preview (1 hour)
1. Create `RecurringUpcomingPreview` component
2. Calculate upcoming expenses (7-day window)
3. Add dismissible alert with upcoming list

**Success Criteria**: Preview shows upcoming expenses, can be dismissed

### Phase 6: Mobile Optimization (2 hours)
1. Add swipe gestures for quick actions (using existing `use-touch-interactions`)
2. Optimize card layout for mobile
3. Test touch targets (44px minimum)
4. Add bottom navigation integration

**Success Criteria**: Mobile experience smooth, touch targets accessible, gestures work

### Phase 7: Keyboard Shortcuts (1 hour)
1. Add shortcut for new recurring expense (N)
2. Add shortcuts for tab switching (1, 2)
3. Document shortcuts in help text

**Success Criteria**: Shortcuts work, don't interfere with text input

### Phase 8: Polish & Testing (2 hours)
1. Add empty states for each tab
2. Add loading skeletons
3. Add error boundaries
4. Test all CRUD operations
5. Test responsive layout
6. Accessibility audit

**Success Criteria**: All edge cases handled, no console errors, passes a11y checks

---

## Technical Specifications

### Data Flow

```
User Action → Component → Hook → Supabase → Real-time Update → UI Refresh
               ↓
          Analytics Tracking
```

### State Management

```tsx
// Local component state
const [createDialogOpen, setCreateDialogOpen] = useState(false);

// Persisted state (survives page refresh)
const [activeTab, setActiveTab] = usePersistedState("recurring-tab", "active");
const [sortBy, setSortBy] = usePersistedState("recurring-sort", "next_occurrence");

// Server state (React Query via Refine)
const { recurring, isLoading } = useRecurringExpenses();
```

### Performance Optimizations

1. **Lazy Loading**: Main page lazy loaded, only loads when route accessed
2. **Memoization**: `useRecurringStats` memoized to prevent recalculations
3. **Virtual Scrolling**: If >50 items, use virtual list (react-window)
4. **Optimistic Updates**: Pause/resume updates UI immediately
5. **Query Caching**: React Query caches for 5 minutes (staleTime)

### Accessibility

- **Keyboard Navigation**: Tab through all interactive elements
- **Screen Readers**: Proper ARIA labels, semantic HTML
- **Focus Management**: Focus trap in dialogs, visible focus indicators
- **Touch Targets**: 44x44px minimum (WCAG AAA)
- **Color Contrast**: 4.5:1 minimum ratio

---

## Integration Points

### Routing

```tsx
// App.tsx additions
import { RecurringExpensesPage } from "./pages/recurring-expenses";

// In resources:
{
  name: "recurring_expenses",
  list: "/recurring-expenses",
  create: "/recurring-expenses/create",
  edit: "/recurring-expenses/edit/:id",
  meta: {
    label: "Recurring",
    icon: <RepeatIcon />,
  },
}
```

### Navigation Updates

**Desktop Sidebar**:
```tsx
// Already exists in Refine resources, auto-generated
```

**Mobile Bottom Nav**:
```tsx
<BottomNavigationItem
  to="/recurring-expenses"
  icon={<RepeatIcon />}
  label="Recurring"
  badge={upcomingCount > 0 ? upcomingCount : undefined}
/>
```

### Analytics Tracking

```tsx
// Track page view
useEffect(() => {
  analyticsManager.trackPage('recurring_expenses', {
    total_recurring: recurring.length,
    active_recurring: active.length,
  });
}, [recurring]);

// Track actions
const handlePause = (id: string) => {
  actions.pause(id);
  analyticsManager.trackEvent({
    category: 'Recurring',
    action: 'paused',
    label: id,
  });
};
```

---

## Testing Strategy

### Unit Tests

```tsx
// use-recurring-stats.test.ts
describe('useRecurringStats', () => {
  it('calculates monthly total correctly', () => {
    const recurring = [
      { frequency: 'weekly', interval: 1, template_expense: { amount: 100 } },
      { frequency: 'monthly', interval: 1, template_expense: { amount: 500 } },
    ];
    const stats = useRecurringStats(recurring);
    expect(stats.monthlyTotal).toBe(900); // 100*4.33 + 500
  });
});
```

### Integration Tests

```tsx
// recurring-expenses.test.tsx
describe('RecurringExpensesPage', () => {
  it('persists tab selection across remount', () => {
    const { unmount, rerender } = render(<RecurringExpensesPage />);

    fireEvent.click(screen.getByText('Paused'));
    unmount();

    rerender(<RecurringExpensesPage />);
    expect(screen.getByRole('tab', { selected: true })).toHaveTextContent('Paused');
  });
});
```

### E2E Tests

```typescript
// recurring-expenses.spec.ts
test('create recurring expense', async ({ page }) => {
  await page.goto('/recurring-expenses');
  await page.click('text=Create Recurring');

  await page.fill('[name="description"]', 'Monthly Rent');
  await page.selectOption('[name="frequency"]', 'monthly');
  await page.fill('[name="amount"]', '1500');

  await page.click('text=Save');

  await expect(page.locator('text=Monthly Rent')).toBeVisible();
});
```

---

## Verification Checklist

### Functional Requirements
- [ ] List displays all recurring expenses
- [ ] Active/paused tabs work correctly
- [ ] Tab selection persists across sessions
- [ ] Sort by next occurrence, amount, frequency
- [ ] Sort order persists across sessions
- [ ] Filter by groups/friends context
- [ ] Search by description works
- [ ] Create new recurring expense
- [ ] Edit existing recurring expense
- [ ] Pause/resume recurring expense
- [ ] Skip next occurrence
- [ ] Delete recurring expense
- [ ] Record prepaid payment
- [ ] Stats show correct monthly total
- [ ] Upcoming preview shows next 7 days
- [ ] Empty states for each tab

### Design System Integration
- [ ] Uses PageContainer for layout
- [ ] Uses PageHeader with title and action
- [ ] Uses PageContent for spacing
- [ ] Uses usePersistedState for tabs
- [ ] Uses usePersistedState for sort
- [ ] Uses useKeyboardShortcut
- [ ] Uses MobileAppBar on mobile
- [ ] Uses BottomNavigation on mobile
- [ ] Uses BottomNavigationSpacer
- [ ] Uses DataCard components
- [ ] Uses MobileOnly/DesktopOnly

### Mobile Experience
- [ ] Bottom navigation visible on mobile
- [ ] Touch targets are 44px minimum
- [ ] Swipe gestures work for actions
- [ ] Cards stack vertically on mobile
- [ ] No horizontal scroll
- [ ] Safe area padding on notched devices

### Performance
- [ ] Page lazy loaded
- [ ] Stats calculation memoized
- [ ] Optimistic updates work
- [ ] No unnecessary re-renders
- [ ] Query caching working

### Accessibility
- [ ] Keyboard navigation works
- [ ] Screen reader announces properly
- [ ] Focus management in dialogs
- [ ] Color contrast passes WCAG AA
- [ ] Touch targets meet WCAG AAA

### Code Quality
- [ ] TypeScript types complete
- [ ] No console errors
- [ ] No console warnings
- [ ] ESLint passes
- [ ] Prettier formatted
- [ ] Unit tests pass
- [ ] Integration tests pass

---

## Dependencies

### Existing Code (Reuse)
- `RecurringExpenseList` component
- `RecurringExpenseCard` component
- `RecurringExpenseForm` component
- `useRecurringExpenses` hook
- Recurring types and utilities
- `use-touch-interactions` hook

### New Design System Components (Phase 1-5)
- PageContainer, PageHeader, PageContent
- usePersistedState hook
- useKeyboardShortcut hook
- MobileAppBar, DesktopAppBar, ResponsiveAppBar
- BottomNavigation, BottomNavigationItem, BottomNavigationSpacer
- MobileOnly, DesktopOnly, ResponsiveText
- DataCard (if refactoring existing card)

### External Dependencies
- None (all dependencies already in package.json)

---

## Risks & Mitigations

### Risk: Performance with Many Recurring Expenses
**Mitigation**: Implement virtual scrolling if > 50 items, paginate if > 200

### Risk: Complex State Management
**Mitigation**: Use React Query for server state, minimal local state

### Risk: Mobile Layout Breaks on Small Screens
**Mitigation**: Test on real devices, use Chrome DevTools device emulation

### Risk: Keyboard Shortcuts Conflict
**Mitigation**: Only activate when not typing in input fields

---

## Success Metrics

### User Adoption
- 30% of active users create at least 1 recurring expense (within 30 days)
- 50% of users with recurring expenses pause/resume at least once

### User Satisfaction
- Recurring expense creation time < 60 seconds
- Zero "where is recurring expenses?" support tickets

### Technical Quality
- Lighthouse score > 90
- Zero console errors
- < 200ms page load time
- 100% TypeScript coverage

---

## Timeline Estimate

| Phase | Tasks | Hours | Total |
|-------|-------|-------|-------|
| Phase 1 | Core Page Setup | 2-3 | 3h |
| Phase 2 | Data Integration | 2 | 2h |
| Phase 3 | Stats & Filters | 2-3 | 3h |
| Phase 4 | Quick Actions | 2 | 2h |
| Phase 5 | Upcoming Preview | 1 | 1h |
| Phase 6 | Mobile Optimization | 2 | 2h |
| Phase 7 | Keyboard Shortcuts | 1 | 1h |
| Phase 8 | Polish & Testing | 2 | 2h |
| **TOTAL** | | | **16 hours** |

**Realistic Estimate**: 2-3 working days for one developer

---

## Related Documentation

- [Phase 1-5 Implementation Plan](../260113-1935-ui-ux-system-refactor/plan.md)
- [Mobile Patterns](../../docs/mobile-patterns.md)
- [Layout Components](../../docs/components/layout.md)
- [UX Optimizations](../../docs/ux-optimizations.md)
- [Recurring Types](../../src/modules/expenses/types/recurring.ts)

---

## Unresolved Questions

1. **Should recurring expenses appear in main expense list?** (Currently: No, separate list)
2. **Notification strategy for upcoming recurring?** (Email? In-app? Push?)
3. **Should users edit individual generated expenses or template?** (Recommend: Template only)
4. **Maximum number of recurring expenses per user?** (Suggest: 50 limit)
5. **Archive strategy for completed recurring expenses?** (If end_date passed)
