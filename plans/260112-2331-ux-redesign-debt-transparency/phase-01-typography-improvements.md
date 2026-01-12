# Phase 1: Typography & Readability Improvements

**Status:** Not Started
**Priority:** High
**Effort:** 4-6 hours
**Dependencies:** None

## Context

User feedback: "Font is hard to read" - current typography increases cognitive load for financial data.

## Overview

Establish readable type scale with clear hierarchy: page title > section title > row title > metadata. Ensure amounts are bold, easy to scan, and right-aligned consistently.

## Key Insights

- Financial apps need high readability (scanning amounts frequently)
- Current font may be decorative or lack clear weight hierarchy
- Metadata (dates, groups, participants) should be muted, not compete with amounts
- shadcn/ui provides good defaults, but may need customization

## Requirements

### Functional
- Define type scale: h1 (page), h2 (section), h3 (card title), body (content), small (metadata)
- Right-align all amounts
- Bold primary amounts (debts, totals)
- Mute secondary text (dates, descriptions)

### Non-Functional
- Maintain existing color theme
- Use system fonts for better performance
- Ensure WCAG AA contrast ratios
- Responsive font sizes for mobile

## Architecture

### Typography System
```
Page Title:    text-2xl md:text-3xl font-bold
Section Title: text-xl font-semibold
Card Title:    text-lg font-medium
Row Title:     text-base font-medium
Body Text:     text-sm
Metadata:      text-xs text-muted-foreground
Amounts:       text-sm font-semibold tabular-nums
```

### Font Stack
```css
font-sans: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
font-mono: ui-monospace, 'Cascadia Code', 'Source Code Pro', monospace (for amounts)
```

## Related Code Files

**Files to Modify:**
- `src/App.css` - Add typography utilities
- `tailwind.config.js` - Update font configuration
- `src/components/dashboard/BalanceTable.tsx` - Apply new typography
- `src/pages/dashboard.tsx` - Update page title styles
- `src/modules/profile/pages/show-unified.tsx` - Update profile typography
- `src/modules/expenses/pages/show.tsx` - Update expense detail typography
- `src/components/dashboard/enhanced-activity-list.tsx` - Update activity list typography

**Files to Create:**
- None

## Implementation Steps

### Step 1: Update Tailwind Configuration
**File:** `tailwind.config.js`
```js
export default {
  theme: {
    extend: {
      fontSize: {
        // Financial data optimized sizes
        'amount-sm': ['0.875rem', { lineHeight: '1.25rem', fontWeight: '600' }],
        'amount-md': ['1rem', { lineHeight: '1.5rem', fontWeight: '600' }],
        'amount-lg': ['1.125rem', { lineHeight: '1.75rem', fontWeight: '700' }],
      },
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
        mono: [
          'ui-monospace',
          '"Cascadia Code"',
          '"Source Code Pro"',
          'monospace',
        ],
      },
    },
  },
}
```

### Step 2: Create Typography Utility Classes
**File:** `src/App.css`
```css
/* Typography Utilities */
.typography-page-title {
  @apply text-2xl md:text-3xl font-bold tracking-tight;
}

.typography-section-title {
  @apply text-xl font-semibold tracking-tight;
}

.typography-card-title {
  @apply text-lg font-medium;
}

.typography-row-title {
  @apply text-base font-medium;
}

.typography-metadata {
  @apply text-xs text-muted-foreground;
}

.typography-amount {
  @apply font-semibold tabular-nums text-right;
}

.typography-amount-prominent {
  @apply font-bold tabular-nums text-right text-amount-md;
}
```

### Step 3: Update Dashboard Typography
**File:** `src/pages/dashboard.tsx`

Update page structure (around line 125-130):
```tsx
<div className="space-y-6">
  {/* Page title with improved typography */}
  <h1 className="typography-page-title">
    {t('dashboard.title', 'Dashboard')}
  </h1>

  {/* Main Content Tabs */}
  <Tabs defaultValue="balances" className="space-y-6">
    {/* ... rest */}
  </Tabs>
</div>
```

### Step 4: Update BalanceTable Typography
**File:** `src/components/dashboard/BalanceTable.tsx`

Update amount display (line 183-194, 296-309):
```tsx
{/* Mobile card - make amount prominent */}
<span className={cn(
  "typography-amount-prominent",
  balance.i_owe_them ? getOweStatusColors('owe').text : getOweStatusColors('owed').text
)}>
  {balance.i_owe_them ? '-' : '+'}
  {formatCurrency(Number(balance.remaining_amount ?? balance.amount), balance.currency || "VND")}
</span>

{/* Desktop table - consistent alignment */}
<TableCell className="typography-amount">
  {formatCurrency(Number(balance.remaining_amount ?? balance.amount), balance.currency || "VND")}
</TableCell>
```

Update metadata (line 171-176, 264-269):
```tsx
{/* Last transaction date - muted */}
{showHistory && balance.last_transaction_date && (
  <span className="typography-metadata">
    {t('dashboard.lastTransaction', 'Last: ')}
    {formatDate(balance.last_transaction_date)}
  </span>
)}
```

### Step 5: Update Profile Page Typography
**File:** `src/modules/profile/pages/show-unified.tsx`

Add page title and consistent amount formatting:
```tsx
<ProfileHeader
  profile={profile}
  isOwnProfile={isOwnProfile}
  titleClassName="typography-page-title"
  amountClassName="typography-amount-prominent"
/>
```

### Step 6: Update Expense Detail Typography
**File:** `src/modules/expenses/pages/show.tsx`

Emphasize amounts and clarify hierarchy:
```tsx
{/* Expense amount - prominent */}
<ExpenseAmountDisplay
  amount={expense.amount}
  currency={expense.currency}
  className="typography-amount-prominent"
/>

{/* Participant amounts - clear but secondary */}
<div className="typography-amount text-amount-sm">
  {formatCurrency(split.computed_amount, expense.currency)}
</div>

{/* Metadata - date, category - muted */}
<div className="typography-metadata">
  {formatDateShort(expense.expense_date)} • {t(`categories.${expense.category}`)}
</div>
```

### Step 7: Update Enhanced Activity List
**File:** `src/components/dashboard/enhanced-activity-list.tsx`

Ensure consistent typography across activity rows:
```tsx
{/* Activity description - row title */}
<h4 className="typography-row-title">
  {activity.description}
</h4>

{/* Activity amount - prominent */}
<span className="typography-amount-prominent">
  {formatCurrency(activity.amount, currency)}
</span>

{/* Activity metadata - muted */}
<p className="typography-metadata">
  {formatDateShort(activity.date)} • {participantNames}
</p>
```

## Todo List

- [ ] Update Tailwind config with financial font sizes
- [ ] Add typography utility classes to App.css
- [ ] Update Dashboard page title typography
- [ ] Update BalanceTable amount and metadata styles
- [ ] Update Profile page typography
- [ ] Update Expense detail typography
- [ ] Update Enhanced Activity list typography
- [ ] Test responsive typography on mobile (320px-768px)
- [ ] Test typography on desktop (1024px+)
- [ ] Verify WCAG AA contrast ratios

## Success Criteria

- [ ] All amounts right-aligned, bold, easy to scan
- [ ] Clear visual hierarchy: page > section > card > row > metadata
- [ ] Metadata text muted (text-muted-foreground)
- [ ] Primary amounts use tabular-nums for alignment
- [ ] Typography readable at 16px base size (no squinting)
- [ ] Consistent font weights across similar elements
- [ ] Mobile typography scales appropriately

## Risk Assessment

**Low Risk:**
- CSS-only changes, no logic modifications
- Tailwind utilities are stable and well-supported
- Easy to revert if issues arise

**Mitigation:**
- Test on multiple screen sizes
- Verify contrast ratios with accessibility tools
- Keep changes isolated to presentation layer

## Security Considerations

None - typography changes do not affect data or authentication.

## Next Steps

After completion:
1. Verify typography improvements with screenshots
2. Proceed to Phase 2 (Dashboard Debt Breakdown)
3. Ensure new components use established typography system
