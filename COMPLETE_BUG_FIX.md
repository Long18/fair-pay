# Complete Bug Fix: Debt Summary Navigation Errors

## Issues Fixed

### Issue 1: "function max(uuid) does not exist"
**Migration**: `20260206140000_populate_debts_by_person_and_group.sql`

**Problem**: Invalid column references in `person_debts` CTE
- Referenced `uds.id` which doesn't exist in `user_debts_summary` view
- Referenced `uds.currency` which doesn't exist in the view

**Solution**:
```sql
-- BEFORE (Line 79)
WHERE uds.id IS NOT NULL

-- AFTER
WHERE uds.owed_user IS NOT NULL OR uds.owes_user IS NOT NULL
```

```sql
-- BEFORE (Line 71)
'currency', COALESCE(uds.currency, 'USD'),

-- AFTER
'currency', 'USD',
```

---

### Issue 2: "structure of query does not match function result type" (TYPE MISMATCH)
**Migration**: `20260206130000_fix_get_user_debts_aggregated_overload.sql`

**Problem**: Function signature expects `TIMESTAMPTZ` but column returns `DATE`
- Column 13 (`last_transaction_date`) type mismatch
- `expense_date` is `DATE` type, but function expects `TIMESTAMPTZ`

**Solution**:
```sql
-- BEFORE (Line 92)
e.expense_date as last_transaction_date

-- AFTER
e.expense_date::TIMESTAMPTZ as last_transaction_date
```

---

### Issue 3: Backup/Comprehensive Fix
**Migration**: `20260206150000_fix_max_uuid_error.sql` (New)

Complete recreation of `get_all_users_debt_detailed()` function with:
- All invalid column references removed
- Proper NULL handling for joins
- Correct GROUP BY clauses
- Consistent ordering

---

## Deployment Checklist

After deploying these migrations, verify:

- [ ] Run migrations: `supabase db push`
- [ ] Test: Navigate to dashboard → go to another page → return to dashboard
- [ ] Verify: Debt summary loads without errors
- [ ] Check console: No "function max(uuid)" or type mismatch errors
- [ ] Confirm: All debt relationships display correctly

---

## Files Modified/Created

| File | Status | Change |
|------|--------|--------|
| `20260206130000_fix_get_user_debts_aggregated_overload.sql` | ✅ UPDATED | Added TIMESTAMPTZ cast |
| `20260206140000_populate_debts_by_person_and_group.sql` | ✅ UPDATED | Fixed NULL checks & removed invalid columns |
| `20260206150000_fix_max_uuid_error.sql` | ✅ CREATED | Comprehensive function recreation |

---

## Technical Details

**Root Cause Analysis**:
- PostgreSQL views have fixed schemas
- Attempting to reference non-existent columns triggers implicit type errors
- Date/Timestamp type mismatches break function signatures
- Strict GROUP BY rules prevent ambiguous aggregations

**Why It Happened After Navigation**:
- Initial page load cached results
- Navigation trigger fresh query execution
- Invalid SQL paths only appear on live query execution
- Subsequent calls exposed the schema mismatch

**Prevention**:
- Always verify view/table schemas before referencing columns
- Cast DATE to TIMESTAMPTZ when needed for function contracts
- Use LSP/IDE to catch column reference errors early
- Test navigation flows thoroughly
