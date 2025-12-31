# Future Expense Filter Fix

**Migration:** `033_exclude_future_expenses_from_debts.sql`
**Date:** December 31, 2025
**Status:** ✅ Completed

## Problem Analysis

### Issue Description
Recurring expenses that were scheduled for future dates were appearing in the current balance calculations on the dashboard. This caused users to see debts for expenses that haven't occurred yet.

### Root Cause
The debt calculation views (`user_debts_summary` and `user_debts_history`) were aggregating ALL expenses from the `expenses` table without filtering by `expense_date`. When recurring expenses created future-dated expense records, these were immediately included in debt calculations even though they shouldn't be due until their scheduled date.

### Example Scenario
```
User A creates a recurring monthly expense for $100 starting next week
→ System creates expense record with expense_date = 2025-01-07
→ Dashboard immediately shows User B owes $100
❌ WRONG: The expense hasn't occurred yet!
```

## Solution Details

### Database Changes

#### Updated Views

**1. `user_debts_summary` View**
- **Purpose:** Shows only outstanding (unsettled) debts
- **Change:** Added `AND e.expense_date <= CURRENT_DATE` filter
- **Impact:** Only includes expenses that have already occurred

**2. `user_debts_history` View**
- **Purpose:** Shows all debts including settled ones (for historical view)
- **Change:** Added `AND e.expense_date <= CURRENT_DATE` filter
- **Impact:** Historical view also excludes future expenses

### Migration File
```sql
-- supabase/migrations/033_exclude_future_expenses_from_debts.sql

-- Key change in both views:
WHERE e.is_payment = false
  AND es.user_id != e.paid_by_user_id
  AND e.expense_date <= CURRENT_DATE  -- NEW: Only include expenses that have occurred
```

## Testing Procedures

### Local Testing

1. **Reset database with new migration:**
   ```bash
   cd /Users/long.lnt/Desktop/Projects/FairPay
   supabase db reset
   ```

2. **Run test script:**
   ```bash
   # Create test data with past and future expenses
   supabase db execute -f scripts/test-future-expense-filter.sql
   ```

3. **Expected Results:**
   - Past expenses (expense_date <= today) → Appear in debts
   - Future expenses (expense_date > today) → Do NOT appear in debts

### Frontend Testing

1. **Create a recurring expense:**
   - Go to Expenses → Create Expense
   - Set up recurring schedule starting in the future
   - Save the expense

2. **Check Dashboard:**
   - Navigate to Dashboard → Balances tab
   - Verify future recurring expense does NOT appear in balances
   - Toggle "Show all transactions (including settled)"
   - Verify future expense still does NOT appear

3. **Wait for expense date:**
   - When the expense_date arrives (or manually set to today)
   - Refresh dashboard
   - Verify expense NOW appears in balances

### API Testing

Test the RPC functions directly:

```typescript
// Should only return debts for expenses with expense_date <= today
const { data: debts } = await supabaseClient.rpc('get_user_debts_aggregated', {
  p_user_id: currentUserId
});

// Should only return historical debts for expenses with expense_date <= today
const { data: history } = await supabaseClient.rpc('get_user_debts_history', {
  p_user_id: currentUserId
});
```

## Production Deployment Guide

### Pre-Deployment Checklist

- [x] Migration file created: `033_exclude_future_expenses_from_debts.sql`
- [x] Local testing completed successfully
- [x] Test script created: `scripts/test-future-expense-filter.sql`
- [x] Documentation created
- [x] No breaking changes to existing functionality

### Deployment Steps

1. **Backup Production Database (Recommended):**
   ```bash
   # Pull current production schema
   supabase db pull --project-ref <your-project-ref>
   ```

2. **Deploy Migration:**
   ```bash
   # Push migration to production
   supabase db push --project-ref <your-project-ref>
   ```

3. **Verify Deployment:**
   ```bash
   # Check migration status
   supabase migration list --project-ref <your-project-ref>
   ```

4. **Test in Production:**
   - Log in to production app
   - Check dashboard balances
   - Verify no future expenses appear
   - Test with recurring expenses if available

### Rollback Strategy

If issues occur, the migration can be rolled back by recreating the views without the date filter:

```sql
-- Rollback: Remove date filter from user_debts_summary
DROP VIEW IF EXISTS user_debts_summary CASCADE;

CREATE OR REPLACE VIEW user_debts_summary AS
SELECT
  es.user_id as owes_user,
  e.paid_by_user_id as owed_user,
  SUM(
    CASE
      WHEN es.is_settled = true AND es.settled_amount >= es.computed_amount THEN 0
      WHEN es.settled_amount > 0 THEN es.computed_amount - es.settled_amount
      ELSE es.computed_amount
    END
  ) as amount_owed
FROM expense_splits es
JOIN expenses e ON e.id = es.expense_id
WHERE e.is_payment = false
  AND es.user_id != e.paid_by_user_id
  -- Removed: AND e.expense_date <= CURRENT_DATE
  AND (
    (es.is_settled = false) OR
    (es.is_settled = true AND es.settled_amount < es.computed_amount)
  )
GROUP BY es.user_id, e.paid_by_user_id
HAVING SUM(...) > 0;

-- Repeat for user_debts_history
```

## Impact Analysis

### Affected Components

1. **Dashboard Page** (`src/pages/dashboard.tsx`)
   - Balances tab will now exclude future expenses
   - Historical view toggle will also exclude future expenses

2. **Balance Feed** (`src/components/dashboard/BalanceFeed.tsx`)
   - Summary cards (Owed to you, You owe, Net balance) will reflect only current debts

3. **Hooks**
   - `useAggregatedDebts` - Uses `get_user_debts_aggregated` function
   - Both regular and historical modes affected

4. **Database Functions**
   - `get_user_debts_aggregated()` - Now excludes future expenses
   - `get_user_debts_history()` - Now excludes future expenses

### User Experience Changes

**Before Fix:**
- User sees debts for expenses scheduled in the future
- Confusing UX: "Why do I owe money for something that hasn't happened?"
- Incorrect balance calculations

**After Fix:**
- User only sees debts for expenses that have occurred
- Clear, accurate representation of current financial state
- Future expenses appear on their scheduled date

## Prevention Strategies

### Code Review Guidelines

1. **Always consider temporal aspects:**
   - When creating queries involving expenses, ask: "Should this include future expenses?"
   - Default to filtering by `expense_date <= CURRENT_DATE` unless explicitly needed

2. **View definitions:**
   - Document temporal behavior in view comments
   - Include date filters in all debt calculation views

3. **Testing:**
   - Always test with future-dated data
   - Include temporal edge cases in test suites

### Monitoring

1. **Watch for anomalies:**
   - Sudden spikes in debt amounts
   - User complaints about incorrect balances
   - Recurring expense behavior

2. **Logging:**
   - Log when recurring expenses are created
   - Track expense_date vs created_at discrepancies

## Related Documentation

- [Recurring Expenses Architecture](./008_production_functions.sql) - Original recurring expense implementation
- [Historical Transactions View](./93-Historical-Transactions-Toggle-Enhancement.md) - Related to historical view feature
- [Balance Calculations Fix](./024_fix_balance_calculations_with_settlements.sql) - Previous balance calculation fix

## Technical Notes

### Recurring Expenses Table Structure

```sql
CREATE TABLE recurring_expenses (
  id UUID PRIMARY KEY,
  template_expense_id UUID REFERENCES expenses(id),
  frequency TEXT CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  "interval" INT DEFAULT 1,
  next_occurrence DATE NOT NULL,  -- When next expense should be created
  end_date DATE,
  is_active BOOLEAN DEFAULT true
);
```

### Expense Date vs Created Date

- `expense_date`: When the expense actually occurred (user-specified)
- `created_at`: When the record was created in the database
- For recurring expenses: `expense_date` can be in the future, `created_at` is always now

### Query Performance

The added date filter (`expense_date <= CURRENT_DATE`) should not significantly impact performance:
- `expense_date` is indexed (part of common query patterns)
- Filter reduces rows processed in aggregation
- Net performance impact: Neutral to slightly positive

## Conclusion

This fix ensures that the FairPay dashboard accurately reflects only current financial obligations by excluding future-dated expenses from debt calculations. The change is backward-compatible, non-breaking, and improves the user experience by preventing confusion about debts that haven't occurred yet.

**Status:** ✅ Ready for production deployment
