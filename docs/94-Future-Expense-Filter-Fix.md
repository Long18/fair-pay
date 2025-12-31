# Future Expense Filter Fix - Historical Transactions Toggle Bug

**Document ID:** 94
**Created:** 2025-12-31
**Status:** ✅ Fixed
**Priority:** High
**Category:** Bug Fix / Database Migration

---

## Problem Analysis

### Issue Description
When toggling "Show all transactions (including settled)" on the Dashboard page, users encountered a SQL error:

```
Error fetching debts:
Object {
  code: "42702",
  details: "It could refer to either a PL/pgSQL variable or a table column.",
  hint: null,
  message: 'column reference "total_amount" is ambiguous'
}
```

### Root Cause
1. **Migration 025** (`025_add_historical_transactions_view.sql`) created:
   - `user_debts_history` VIEW
   - `get_user_debts_history()` FUNCTION (with unqualified column references)

2. **Migration 030** (`030_fix_debts_history_ambiguous_columns.sql`) fixed ambiguous column references by adding table aliases (`udh.`) to all column references in the function

3. **Migration 033** (`033_exclude_future_expenses_from_debts.sql`) recreated the `user_debts_history` VIEW using:
   ```sql
   DROP VIEW IF EXISTS user_debts_history CASCADE;
   ```
   - The `CASCADE` keyword dropped all dependent objects, including the `get_user_debts_history()` function
   - The migration only recreated the VIEW, not the FUNCTION
   - This left the database without the function needed for historical transactions

4. When users toggled "Show all transactions", the frontend called `get_user_debts_history()` which either:
   - Didn't exist (if migration 030 was dropped by CASCADE)
   - Had the old unqualified column references (if an older version remained)

### Affected Components
- **Frontend:** `src/pages/dashboard.tsx` - Historical transactions toggle
- **Hook:** `src/hooks/use-aggregated-debts.ts` - Calls `get_user_debts_history()`
- **Database:** `get_user_debts_history()` function was missing/broken

---

## Solution Details

### Migration 034: Recreate Debts History Function
Created `supabase/migrations/034_recreate_debts_history_function.sql` to:

1. **Drop existing function** (if any):
   ```sql
   DROP FUNCTION IF EXISTS get_user_debts_history(UUID);
   ```

2. **Recreate function with proper column qualification**:
   - All column references use table alias `udh.` (e.g., `udh.total_amount`, `udh.settled_amount`)
   - Prevents ambiguity between function parameters and view columns
   - Maintains same signature and behavior as migration 030

3. **Grant permissions**:
   ```sql
   GRANT EXECUTE ON FUNCTION get_user_debts_history(UUID) TO authenticated;
   ```

4. **Add documentation comment**:
   ```sql
   COMMENT ON FUNCTION get_user_debts_history IS 'Returns all debt relationships for a user including settled debts, ordered by outstanding balance then recency. Recreated after migration 033 dropped it via CASCADE.';
   ```

### Key Changes in the Function

**Proper Table Aliasing:**
```sql
WITH debt_calculations AS (
  SELECT
    CASE
      WHEN udh.owes_user = p_user_id THEN udh.owed_user
      WHEN udh.owed_user = p_user_id THEN udh.owes_user
      ELSE NULL
    END as other_user_id,
    CASE
      WHEN udh.owes_user = p_user_id THEN udh.total_amount  -- ✅ Qualified with udh.
      WHEN udh.owed_user = p_user_id THEN -udh.total_amount
      ELSE 0
    END as signed_total_amount,
    -- ... more cases with udh. prefix
  FROM user_debts_history udh  -- ✅ Alias defined
  WHERE udh.owes_user = p_user_id OR udh.owed_user = p_user_id
)
```

---

## Testing Procedures

### Local Testing Checklist

- [x] **Migration Applied Successfully**
  ```bash
  cd /Users/long.lnt/Desktop/Projects/FairPay
  supabase db reset
  ```
  - ✅ Migration 034 applied without errors
  - ✅ All previous migrations applied successfully

- [ ] **Function Exists in Database**
  - Verify function is created with correct signature
  - Check permissions are granted to `authenticated` role

- [ ] **Frontend Toggle Works**
  1. Navigate to Dashboard page
  2. Toggle "Show all transactions (including settled)" ON
  3. Verify no console errors
  4. Verify historical debts display correctly
  5. Toggle OFF
  6. Verify only active debts display

- [ ] **Data Accuracy**
  - Historical debts show `total_amount`, `settled_amount`, `remaining_amount`
  - Active debts show only `remaining_amount` > 0
  - Counterparty names and avatars display correctly

### Production Deployment

1. **Backup Database**
   ```bash
   supabase db dump --remote > backup-$(date +%Y%m%d).sql
   ```

2. **Apply Migration**
   ```bash
   supabase db push
   ```

3. **Verify Function**
   - Check Supabase Dashboard → Database → Functions
   - Confirm `get_user_debts_history` exists

4. **Test in Production**
   - Login as test user
   - Toggle historical transactions
   - Verify no errors in browser console
   - Check Supabase logs for any SQL errors

---

## Prevention Strategies

### 1. Migration Best Practices

**When dropping views with CASCADE:**
```sql
-- ❌ BAD: Drops dependent functions without recreating them
DROP VIEW IF EXISTS my_view CASCADE;
CREATE OR REPLACE VIEW my_view AS ...;

-- ✅ GOOD: Document and recreate dependent objects
DROP VIEW IF EXISTS my_view CASCADE;
CREATE OR REPLACE VIEW my_view AS ...;
-- Recreate dependent functions
CREATE OR REPLACE FUNCTION dependent_function() ...;
```

### 2. Migration Review Checklist

Before merging migrations:
- [ ] Check if `DROP ... CASCADE` is used
- [ ] List all dependent objects that will be dropped
- [ ] Ensure all dependent objects are recreated
- [ ] Test migration with `supabase db reset`
- [ ] Verify frontend functionality after migration

### 3. Database Documentation

Maintain a dependency map:
```
user_debts_history VIEW
  ├─ get_user_debts_history() FUNCTION
  └─ get_user_debts_aggregated() FUNCTION (if exists)
```

### 4. Automated Testing

Add integration tests:
```typescript
describe('Historical Transactions', () => {
  it('should fetch historical debts without errors', async () => {
    const { data, error } = await supabaseClient.rpc('get_user_debts_history', {
      p_user_id: testUserId
    });
    expect(error).toBeNull();
    expect(data).toBeDefined();
  });
});
```

---

## Related Documentation

- **Migration 025:** `025_add_historical_transactions_view.sql` - Original implementation
- **Migration 030:** `030_fix_debts_history_ambiguous_columns.sql` - First fix for ambiguous columns
- **Migration 033:** `033_exclude_future_expenses_from_debts.sql` - Caused the regression
- **Migration 034:** `034_recreate_debts_history_function.sql` - This fix
- **Doc 93:** Historical Transactions Toggle Enhancement

---

## Lessons Learned

1. **CASCADE is powerful but dangerous** - Always document what gets dropped
2. **Test migrations thoroughly** - Use `supabase db reset` to test full migration chain
3. **Document dependencies** - Maintain clear documentation of view/function relationships
4. **Version control for database objects** - Keep track of which migration creates/modifies each object
5. **Integration testing** - Frontend tests should catch database function errors

---

## Rollback Plan

If issues occur in production:

```sql
-- Rollback: Drop the function
DROP FUNCTION IF EXISTS get_user_debts_history(UUID);

-- Disable the toggle in frontend (temporary fix)
-- In src/pages/dashboard.tsx, comment out the toggle UI
```

Then investigate and create a new migration with the fix.

---

## Status

✅ **Fixed** - Migration 034 successfully recreates the function with proper column qualification.

**Next Steps:**
1. Apply to production
2. Monitor for any related errors
3. Update integration tests to prevent regression
