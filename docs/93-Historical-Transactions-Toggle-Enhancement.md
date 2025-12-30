# Historical Transactions Toggle Enhancement

## Overview

Enhanced the "Show all transactions (including settled)" toggle on the Dashboard with improved UI/UX and fixed the underlying SQL error that prevented it from working.

## Problem Analysis

### Original Issues

1. **SQL Error**: The `get_user_debts_history` function had ambiguous column references causing PostgreSQL error:
   ```
   column reference "total_amount" is ambiguous
   ```

2. **Poor UX**: The toggle lacked:
   - Visual feedback during loading
   - Clear indication of what "settled" means
   - Error handling
   - Visual distinction between active and settled debts

### Root Cause

In the `debt_calculations` CTE within `get_user_debts_history`, column references like `total_amount`, `settled_amount`, and `remaining_amount` were not qualified with the table alias `udh` (for `user_debts_history` view), causing PostgreSQL to be unable to determine if they referred to:
- Columns from the view
- Variables within the function scope

## Solution Implementation

### 1. Database Fix (Migration 030)

**File**: `supabase/migrations/030_fix_debts_history_ambiguous_columns.sql`

**Changes**:
- Dropped and recreated `get_user_debts_history` function
- Added table alias `udh` to all column references in the CTE
- Properly qualified all column names to eliminate ambiguity

**Key SQL Changes**:
```sql
-- Before (ambiguous)
WHEN owes_user = p_user_id THEN total_amount

-- After (qualified)
WHEN udh.owes_user = p_user_id THEN udh.total_amount
```

### 2. UI/UX Enhancements

#### Dashboard Toggle (`src/pages/dashboard.tsx`)

**Added**:
- Loading state indicator with spinner during toggle
- Tooltip explaining what the toggle does
- History icon for better visual recognition
- Error message display if data fetch fails
- Improved styling with background highlight

**Features**:
```tsx
- TooltipProvider with helpful description
- HistoryIcon for visual clarity
- Loading spinner during state transition
- Error boundary for failed requests
- Improved layout with muted background
```

#### Balance Table (`src/components/dashboard/BalanceTable.tsx`)

**Enhanced Display**:
- Visual distinction for fully settled debts:
  - Green background tint
  - Checkmark badge on avatar
  - "Settled" badge instead of "You Owe"/"Owes You"
  - Strikethrough on counterparty name
  - Green text for ₫0 amount
- Additional columns in history mode:
  - Total Amount (lifetime)
  - Settled Amount
  - Transaction Count badge
- Last transaction date shown below counterparty name
- Better formatting with date-fns

#### Icon System (`src/components/ui/icons.tsx`)

**Added**:
- `HistoryIcon`: Clock with arrow icon for historical view indication

### 3. Translation Keys

**Added Keys** (to be added to locale files):
```json
{
  "dashboard.showAllTransactions": "Show all transactions (including settled)",
  "dashboard.showAllTransactionsTooltip": "Toggle to view your complete transaction history, including debts that have been fully settled",
  "dashboard.errorLoadingDebts": "Failed to load debts. Please try again.",
  "dashboard.settled": "Settled",
  "dashboard.totalAmount": "Total",
  "dashboard.settledAmount": "Settled",
  "dashboard.remainingAmount": "Remaining",
  "dashboard.transactions": "Txns",
  "dashboard.lastTransaction": "Last: "
}
```

## Testing Checklist

### Database Testing

- [x] Migration applies successfully without errors
- [x] `get_user_debts_history` function executes without ambiguous column errors
- [x] Function returns correct data for users with settled debts
- [x] Function returns correct data for users with active debts
- [x] Function returns correct data for users with mixed (settled + active) debts

### UI Testing

#### Toggle Functionality
- [ ] Toggle switches between active and history modes
- [ ] Loading spinner appears during state transition
- [ ] Tooltip displays on hover
- [ ] Error message shows if fetch fails
- [ ] No console errors when toggling

#### Balance Table Display

**Active Mode (Toggle OFF)**:
- [ ] Shows only outstanding debts
- [ ] Displays single "Amount" column
- [ ] Shows "You Owe" or "Owes You" badges
- [ ] No settled debts visible

**History Mode (Toggle ON)**:
- [ ] Shows all debts including settled ones
- [ ] Displays "Total", "Settled", "Txns", and "Remaining" columns
- [ ] Settled debts have:
  - [ ] Green background tint
  - [ ] Checkmark on avatar
  - [ ] "Settled" badge
  - [ ] Strikethrough on name
  - [ ] Green ₫0 in remaining column
  - [ ] Last transaction date displayed
- [ ] Active debts show normally with all columns
- [ ] Transaction count badge displays correctly

### Responsive Testing
- [ ] Toggle works on mobile devices
- [ ] Table columns adjust properly on small screens
- [ ] Tooltip is readable on mobile
- [ ] Icons scale appropriately

### Performance Testing
- [ ] Toggle response is fast (<500ms)
- [ ] No memory leaks when toggling repeatedly
- [ ] Real-time subscriptions work correctly
- [ ] Pagination works in both modes

## Manual Testing Steps

1. **Start the application**:
   ```bash
   pnpm dev
   ```

2. **Navigate to Dashboard**:
   - Go to the main dashboard
   - Locate the toggle at the top of the Balances tab

3. **Test Toggle OFF (Active Debts Only)**:
   - Ensure toggle is OFF
   - Verify only outstanding debts are shown
   - Check that settled debts are not visible
   - Confirm single "Amount" column

4. **Test Toggle ON (Historical View)**:
   - Click the toggle to turn it ON
   - Verify loading spinner appears briefly
   - Check that all debts (settled + active) are shown
   - Verify additional columns appear (Total, Settled, Txns)
   - Confirm settled debts have green styling
   - Check checkmark badges on settled debt avatars
   - Verify last transaction dates display

5. **Test Tooltip**:
   - Hover over the toggle area
   - Verify tooltip appears with explanation
   - Check tooltip text is readable

6. **Test Error Handling**:
   - Temporarily break database connection
   - Toggle the switch
   - Verify error message displays
   - Restore connection and verify recovery

7. **Check Console**:
   - Open browser DevTools
   - Toggle between modes
   - Verify no errors in console
   - Check network tab for successful RPC calls

## Production Deployment

### Prerequisites
- Backup production database
- Test migration on staging environment
- Verify no breaking changes to existing queries

### Deployment Steps

1. **Apply Migration**:
   ```bash
   npx supabase db push
   ```

2. **Verify Migration**:
   ```bash
   npx supabase db diff
   ```

3. **Deploy Frontend**:
   ```bash
   git add .
   git commit -m "feat: enhance historical transactions toggle with improved UI/UX"
   git push origin main
   ```

4. **Verify Production**:
   - Test toggle functionality
   - Check for console errors
   - Verify data displays correctly
   - Monitor error logs

### Rollback Plan

If issues occur:

1. **Revert Migration**:
   ```sql
   -- Restore original function from migration 025
   -- (Keep backup of migration 025 for quick restoration)
   ```

2. **Revert Frontend**:
   ```bash
   git revert HEAD
   git push origin main
   ```

## Benefits

### User Experience
- Clear visual feedback during loading
- Better understanding of what the toggle does
- Easy identification of settled vs active debts
- More informative historical view
- Professional, polished interface

### Technical
- Fixed critical SQL error
- Improved code maintainability
- Better error handling
- Consistent with design system
- Reusable icon components

### Business
- Users can track their complete transaction history
- Better transparency in debt settlements
- Increased user trust and satisfaction
- Reduced support requests about "missing" debts

## Future Enhancements

1. **Filtering Options**:
   - Filter by date range
   - Filter by amount threshold
   - Filter by counterparty

2. **Export Functionality**:
   - Export historical data to CSV
   - Generate PDF reports
   - Email transaction summaries

3. **Analytics**:
   - Show settlement trends
   - Display average settlement time
   - Highlight most frequent counterparties

4. **Notifications**:
   - Alert when debts are settled
   - Remind about outstanding debts
   - Celebrate settlement milestones

## Related Documentation

- [Historical Transactions View (Migration 025)](./89-Historical-Transactions-View.md)
- [UX/UI Conventions](./.serena/memories/ux_ui_conventions.md)
- [Dashboard Balance Real-Time Update](./70-Dashboard-Balance-Realtime-Update.md)

## Conclusion

This enhancement successfully fixes the SQL error preventing the historical transactions toggle from working and significantly improves the user experience with better visual feedback, clearer information display, and professional styling. The implementation follows project conventions and integrates seamlessly with the existing design system.
