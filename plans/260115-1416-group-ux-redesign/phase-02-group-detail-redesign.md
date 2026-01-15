# Phase 2: Group Detail Page Redesign

**Status:** Pending
**Priority:** Critical (Core User Experience)
**Estimated Time:** 16-20 hours
**Dependencies:** Phase 1 (Design System)

---

## Overview

Transform group detail page from confusing tabbed interface to single scrollable page with clear "who owes who" focus.

---

## Current Issues (show.tsx - 654 lines)

**Problems:**
- 4-tab interface (Expenses/Balances/Recurring/Members) splits user attention
- Balance info hidden behind "Balances" tab - not visible by default
- Users need to click tabs to understand group status
- Member list paginated (10 per page) - hard to see full picture
- Action buttons scattered across multiple locations

**User Feedback:**
- "Too much information at once"
- "Balance display unclear - who owes who?"
- "Navigation unclear (tabs, back buttons)"
- Primary goal: "See who owes money quickly"

---

## Solution: Single Scrollable Page

### New Layout Structure

```
┌─────────────────────────────────────────┐
│ [Back Button]                            │
├─────────────────────────────────────────┤
│ 🏷️  Group Name & Description            │
│    Created: Date | 4 members            │
│    [+ Add Expense]                      │
└─────────────────────────────────────────┘
         ⬇️ SCROLL
┌─────────────────────────────────────────┐
│ 💰 MY BALANCE (HERO - STICKY)           │
│    You owe: 250,000 ₫                   │
│    Owed to you: 150,000 ₫               │
│    [Settle Up]                          │
└─────────────────────────────────────────┘
         ⬇️ SCROLL
┌─────────────────────────────────────────┐
│ 🔴 YOU OWE                              │
│    ▸ [Card] Alice - 100,000 ₫ [Pay]    │
│    ▸ [Card] Bob   - 150,000 ₫ [Pay]    │
└─────────────────────────────────────────┘
         ⬇️ SCROLL
┌─────────────────────────────────────────┐
│ 🟢 OWES YOU                             │
│    ▸ [Card] Charlie - 80,000 ₫         │
│    ▸ [Card] Diana   - 70,000 ₫         │
└─────────────────────────────────────────┘
         ⬇️ SCROLL
┌─────────────────────────────────────────┐
│ 📋 RECENT EXPENSES (Expandable)         │
│    ▸ [Card] Lunch - 400,000 ₫          │
│    ▸ [Card] Movie - 200,000 ₫          │
└─────────────────────────────────────────┘
         ⬇️ SCROLL
┌─────────────────────────────────────────┐
│ 🔁 RECURRING (Expandable)               │
│    ▸ [Card] Netflix - 200,000/month    │
│    ▸ [Card] iCloud  - 200,000/month    │
└─────────────────────────────────────────┘
         ⬇️ SCROLL
┌─────────────────────────────────────────┐
│ 👥 MEMBERS                              │
│    [Member Cards - All Visible]         │
│    [+ Add Member]                       │
└─────────────────────────────────────────┘
```

---

## Implementation Details

### 1. Remove Tabs Component

**Current (lines 385-419):**
```tsx
<Tabs defaultValue="expenses" className="w-full">
  <TabsList className="grid w-full grid-cols-4">
    <TabsTrigger value="expenses">Expenses</TabsTrigger>
    <TabsTrigger value="balances">Balances</TabsTrigger>
    <TabsTrigger value="recurring">Recurring</TabsTrigger>
    <TabsTrigger value="members">Members</TabsTrigger>
  </TabsList>
  <TabsContent value="expenses">...</TabsContent>
  <TabsContent value="balances">...</TabsContent>
  <TabsContent value="recurring">...</TabsContent>
  <TabsContent value="members">...</TabsContent>
</Tabs>
```

**Replace With:** Single `<div className="space-y-6">` containing all sections

---

### 2. Hero Balance Section (Sticky)

**New Component Location:** After group header card

```tsx
{/* Hero Balance Section - Sticky on Scroll */}
<div className="sticky top-0 z-10 bg-background pb-4">
  <Card className="border-2 bg-gradient-to-br from-primary/5 to-primary/10">
    <CardContent className="pt-6">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-6">
        {/* My Total Balance */}
        <div className="flex-1 w-full">
          <div className="flex items-center gap-2 mb-3">
            <BanknoteIcon className="h-5 w-5 text-primary" />
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              My Balance
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {/* I Owe */}
            <div className="flex flex-col gap-1">
              <span className="text-xs text-red-600 font-medium">YOU OWE</span>
              <span className="text-2xl font-bold text-red-600">
                {formatNumber(totalIOwe)} ₫
              </span>
            </div>
            {/* Owed to Me */}
            <div className="flex flex-col gap-1">
              <span className="text-xs text-green-600 font-medium">OWES YOU</span>
              <span className="text-2xl font-bold text-green-600">
                {formatNumber(totalOwedToMe)} ₫
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        {isAdmin && unsettledCount > 0 && (
          <Button
            variant="default"
            size="lg"
            onClick={() => setSettleAllDialogOpen(true)}
            className="w-full sm:w-auto"
          >
            <CheckCircle2Icon className="h-4 w-4 mr-2" />
            Settle All ({unsettledCount})
          </Button>
        )}
      </div>
    </CardContent>
  </Card>
</div>
```

**Calculations Needed:**
```tsx
const totalIOwe = balances
  .filter(b => b.balance < 0)
  .reduce((sum, b) => sum + Math.abs(b.balance), 0);

const totalOwedToMe = balances
  .filter(b => b.balance > 0)
  .reduce((sum, b) => sum + b.balance, 0);
```

---

### 3. Debt Cards Section ("You Owe" / "Owes You")

**Use:** BalanceCard component from Phase 1

```tsx
{/* Debts Section */}
<div className="space-y-6">
  {/* I Owe Section */}
  {balances.filter(b => b.balance < 0).length > 0 && (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-1 w-12 bg-red-600 rounded-full" />
        <h3 className="text-lg font-semibold text-red-600 uppercase tracking-wide">
          You Owe
        </h3>
      </div>
      <div className="space-y-2">
        {balances
          .filter(b => b.balance < 0)
          .map(balance => (
            <BalanceCard
              key={balance.userId}
              amount={Math.abs(balance.balance)}
              currency="VND"
              status="owe"
              userName={balance.userName}
              userAvatar={balance.userAvatar}
              isExpandable={true}
              onClick={() => handleSettleUp(balance.userId, Math.abs(balance.balance))}
            >
              {/* Expandable: Show expense breakdown */}
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Recent expenses with {balance.userName}
                </p>
                {/* List recent shared expenses */}
              </div>
            </BalanceCard>
          ))
        }
      </div>
    </div>
  )}

  {/* Owes Me Section */}
  {balances.filter(b => b.balance > 0).length > 0 && (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-1 w-12 bg-green-600 rounded-full" />
        <h3 className="text-lg font-semibold text-green-600 uppercase tracking-wide">
          Owes You
        </h3>
      </div>
      <div className="space-y-2">
        {balances
          .filter(b => b.balance > 0)
          .map(balance => (
            <BalanceCard
              key={balance.userId}
              amount={balance.balance}
              currency="VND"
              status="owed"
              userName={balance.userName}
              userAvatar={balance.userAvatar}
              isExpandable={true}
            >
              {/* Expandable: Show expense breakdown */}
            </BalanceCard>
          ))
        }
      </div>
    </div>
  )}

  {/* All Settled State */}
  {balances.every(b => b.balance === 0) && (
    <Card className="border-2 border-dashed">
      <CardContent className="py-16 text-center">
        <div className="space-y-4">
          <div className="text-6xl">✅</div>
          <div>
            <p className="font-semibold text-lg">All settled up!</p>
            <p className="text-muted-foreground">No outstanding balances.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )}
</div>
```

---

### 4. Expandable Expenses Section

**Use:** ExpandableCard from Phase 1

```tsx
{/* Recent Expenses Section */}
<ExpandableCard
  title="Recent Expenses"
  subtitle={`${expenses.length} expense(s)`}
  badge={
    <Badge variant="secondary">
      {formatNumber(expenses.reduce((sum, e) => sum + e.amount, 0))} ₫
    </Badge>
  }
  expanded={false}
>
  <ExpenseList groupId={group.id} members={membersList} compact={true} />
</ExpandableCard>
```

---

### 5. Expandable Recurring Section

```tsx
{/* Recurring Expenses Section */}
<ExpandableCard
  title="Recurring Expenses"
  subtitle="Monthly subscriptions"
  badge={
    recurringExpenses.length > 0 && (
      <Badge variant="outline">{recurringExpenses.length}</Badge>
    )
  }
  expanded={false}
>
  <RecurringExpenseList groupId={group.id} />
</ExpandableCard>
```

---

### 6. Members Section (Remove Pagination)

**Current:** Paginated (10 per page) with controls
**New:** Show all members, no pagination

```tsx
{/* Members Section */}
<Card className="border-2">
  <CardHeader>
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-2">
        <UsersIcon className="h-5 w-5 text-primary" />
        <CardTitle className="text-lg">Members</CardTitle>
        <Badge variant="secondary">{allMembers.length}</Badge>
      </div>
      {isAdmin && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAddMemberModalOpen(true)}
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Member
        </Button>
      )}
    </div>
  </CardHeader>
  <CardContent>
    <MemberList
      members={allMembers.map((m: any) => ({
        ...m,
        profile: m.profiles,
      }))}
      currentUserId={identity?.id || ""}
      isAdmin={isAdmin}
      onRemoveMember={handleRemoveMember}
      isLoading={isLoadingMembers}
      showPagination={false} // NEW PROP
    />
  </CardContent>
</Card>
```

---

### 7. Debt Simplification (Keep but Relocate)

**Current:** Inside Balances tab
**New:** Inside hero balance section (optional toggle)

```tsx
{/* Inside Hero Balance Section */}
{allMembers.length >= 3 && (
  <div className="pt-4 border-t">
    <SimplifiedDebtsToggle
      isSimplified={useServerSimplification}
      onToggle={handleToggleSimplification}
      rawCount={balances.filter(b => b.balance !== 0).length}
      simplifiedCount={simplifiedCount}
      disabled={isLoadingSimplified}
    />
  </div>
)}
```

---

## File Changes

### `/src/modules/groups/pages/show.tsx`

**Changes:**
1. **Remove** `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>` (lines 385-639)
2. **Add** hero balance section (sticky)
3. **Add** debt cards section using BalanceCard
4. **Add** expandable sections using ExpandableCard
5. **Remove** member pagination logic (lines 56-57, 144-156)
6. **Update** MemberList to show all members

**Expected Line Count:** 654 → ~480 lines (-27% reduction)

### `/src/modules/groups/components/member-list.tsx`

**Changes:**
1. **Add** `showPagination?: boolean` prop (default true)
2. **Conditionally render** pagination controls
```tsx
interface MemberListProps {
  // ... existing props
  showPagination?: boolean;
}

export function MemberList({ showPagination = true, ...props }: MemberListProps) {
  // ... existing code
  return (
    <>
      {/* Member cards */}
      {showPagination && <PaginationControls {...paginationProps} />}
    </>
  );
}
```

---

## New Calculations Required

### Total Balances for Hero Section

```tsx
// Add to show.tsx
const { totalIOwe, totalOwedToMe, netBalance } = useMemo(() => {
  const iOwe = balances
    .filter(b => b.balance < 0)
    .reduce((sum, b) => sum + Math.abs(b.balance), 0);

  const owedToMe = balances
    .filter(b => b.balance > 0)
    .reduce((sum, b) => sum + b.balance, 0);

  return {
    totalIOwe: iOwe,
    totalOwedToMe: owedToMe,
    netBalance: owedToMe - iOwe,
  };
}, [balances]);
```

---

## Mobile Optimizations

1. **Sticky Hero:** Use `position: sticky` with `top: 0` + `z-index: 10`
2. **Touch Targets:** All buttons minimum 44px height
3. **Card Spacing:** Adequate spacing between debt cards (8px minimum)
4. **Collapse by Default:** Expenses and Recurring sections collapsed initially
5. **Swipe Hint:** Visual indicator that cards are expandable

---

## Accessibility

- **Keyboard Navigation:** All expandable cards keyboard-accessible
- **Screen Reader:** Announce balance totals, debt status
- **Focus Management:** Proper focus order top-to-bottom
- **Color + Text:** Never rely on color alone (use "YOU OWE" / "OWES YOU" labels)

---

## Success Criteria

- [ ] Tabs component removed
- [ ] Hero balance section sticky on scroll
- [ ] "You Owe" section displays red cards
- [ ] "Owes You" section displays green cards
- [ ] Expenses section expandable (collapsed by default)
- [ ] Recurring section expandable (collapsed by default)
- [ ] Members section shows all members (no pagination)
- [ ] Balance calculations correct (totalIOwe, totalOwedToMe)
- [ ] Debt simplification toggle accessible from hero section
- [ ] Mobile touch targets meet 44px minimum
- [ ] Keyboard navigation works end-to-end
- [ ] Screen readers announce sections correctly

---

## Testing Checklist

**Scenarios to Test:**

1. **Balanced State:** User owes 0, owed 0 → Show "All settled up"
2. **Debt Only:** User owes 500k, owed 0 → Only "You Owe" section visible
3. **Credit Only:** User owes 0, owed 300k → Only "Owes You" section visible
4. **Mixed:** User owes 200k, owed 150k → Both sections visible
5. **Empty Group:** No expenses → Show empty state
6. **Large Group:** 15+ members → All visible (no pagination)
7. **Debt Simplification:** Toggle works, calculations correct
8. **Expandable Cards:** Click to expand expenses/recurring
9. **Settle Up:** Click debt card navigates to payment creation
10. **Mobile:** Scroll, tap, expand all work smoothly

---

## Migration Notes

**Breaking Changes:**
- URL hash navigation (`#expenses`, `#balances`) will break
- Bookmarks to specific tabs will redirect to single page
- Browser back button behavior changes (no tab history)

**Solution:** Remove tab-based routing entirely, single-page only

---

## Performance Considerations

1. **Lazy Rendering:** Use `react-window` if member list > 50
2. **Memoization:** Memoize balance calculations
3. **Query Optimization:** Maintain existing staleTime (2 minutes)
4. **Image Lazy Load:** Avatar images load lazily

---

## Dependencies

**From Phase 1:**
- BalanceCard component
- DebtStatusBadge component
- SettlementButton component
- ExpandableCard component
- DEBT_STATUS_COLORS constants

**Existing:**
- SimplifiedBalanceView (refactor to use BalanceCard)
- ExpenseList (add `compact` prop for embedded view)
- RecurringExpenseList (no changes needed)
- MemberList (add `showPagination` prop)

---

## Next Phase

Phase 3: Balance Visualization Enhancement (deeper insights into debt breakdowns)
