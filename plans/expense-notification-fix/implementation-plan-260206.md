# Expense Notification Fix - Implementation Plan

**Date:** 2026-02-06
**Priority:** HIGH
**Estimated Effort:** 2-3 hours
**Risk Level:** LOW (backward compatible fix)

---

## Executive Summary

Fix `notify_expense_added()` database function to handle NULL user_id values (pending email participants) and correct schema mismatch with `notifications` table. Also ensure trigger is properly created in production.

**Root Causes:**
1. Function attempts INSERT with NULL user_id when splits have pending_email participants
2. Function uses wrong column names: `reference_id`, `reference_type` instead of `link`
3. Trigger exists in test schema but missing from production dump

---

## Implementation Steps

### Step 1: Update notify_expense_added() Function

**File to Create:** `supabase/migrations/20260206000000_fix_notify_expense_added_function.sql`

**Changes Required:**
1. Add NULL check in WHERE clause to skip pending email participants
2. Replace `reference_id`, `reference_type` with `link` column
3. Generate proper link path for expense detail page
4. Ensure function signature matches TRIGGER requirements

**SQL Migration Content:**

```sql
-- Fix notify_expense_added() to handle NULL user_id and correct schema
CREATE OR REPLACE FUNCTION "public"."notify_expense_added"()
RETURNS "trigger"
LANGUAGE "plpgsql"
AS $$
DECLARE
  v_participant_id UUID;
  v_expense RECORD;
BEGIN
  -- Get expense details for notification
  SELECT id, description, created_by
  INTO v_expense
  FROM expenses
  WHERE id = NEW.expense_id;

  -- Notify all participants except the creator
  -- Skip NULL user_id (pending email participants)
  FOR v_participant_id IN
    SELECT user_id
    FROM expense_splits
    WHERE expense_id = NEW.expense_id
      AND user_id IS NOT NULL              -- ← KEY FIX: Skip pending participants
      AND user_id != v_expense.created_by  -- Skip creator
  LOOP
    -- Only create notification if user has enabled this notification type
    IF should_send_notification(v_participant_id, 'expense_added') THEN
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        link,                               -- ← Use 'link' not 'reference_id'
        is_read,
        created_at
      ) VALUES (
        v_participant_id,
        'expense_added',
        'New Expense Added',
        'A new expense "' || v_expense.description || '" was added',
        '/expenses/show/' || v_expense.id::text,  -- ← Proper link format
        FALSE,
        NOW()
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Update function ownership
ALTER FUNCTION "public"."notify_expense_added"() OWNER TO "postgres";

-- Update function comment
COMMENT ON FUNCTION "public"."notify_expense_added"()
IS 'Trigger function to notify group members when expense is added. Skips pending email participants.';

-- Ensure trigger is properly created (recreate if exists)
DROP TRIGGER IF EXISTS "trigger_notify_expense_added" ON "public"."expense_splits";

CREATE TRIGGER "trigger_notify_expense_added"
  AFTER INSERT ON "public"."expense_splits"
  FOR EACH ROW
  EXECUTE FUNCTION "public"."notify_expense_added"();

-- Grant permissions
GRANT ALL ON FUNCTION "public"."notify_expense_added"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_expense_added"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_expense_added"() TO "service_role";
```

**Why These Changes:**
- `user_id IS NOT NULL` prevents NULL constraint violation
- `link` column exists in actual schema (reference_id/reference_type don't)
- Fetch expense details to get `created_by` (NEW record is expense_splits, not expenses)
- Recreate trigger ensures it exists in production
- Proper ownership and permissions for security

---

### Step 2: Update Production Schema Dump

**File to Update:** `supabase/scripts/sync/dumps/production-schema.sql`

**Action:** Replace function definition at lines 2145-2180 with new version from Step 1.

**Manual Steps:**
1. Open `production-schema.sql`
2. Locate function at line 2145
3. Replace entire function body (lines 2145-2180) with fixed version
4. Ensure trigger definition exists in triggers section (around line 4288-4316)

**Expected Result:**
- Function matches new schema
- Trigger properly defined in dump file
- Production dump synchronized with migration

---

### Step 3: Frontend Defensive Checks (Optional Enhancement)

**File:** `src/modules/expenses/pages/create.tsx`

**Current Code (lines 162-176):** Already has validation
```typescript
const validSplits = splits.filter(split => {
  if (!split.user_id && !split.pending_email) {
    console.warn('Skipping split with neither user_id nor pending_email:', split);
    return false;
  }
  if (split.computed_amount === undefined || split.computed_amount === null) {
    console.warn('Skipping split with missing computed_amount:', split);
    return false;
  }
  return true;
});
```

**Enhancement (Optional):** Add logging for notification eligibility
```typescript
// After line 176, add:
console.log(`[ExpenseCreate] Creating ${validSplits.length} splits:`, {
  withUserId: validSplits.filter(s => s.user_id).length,
  pendingEmail: validSplits.filter(s => s.pending_email).length,
  notificationEligible: validSplits.filter(s => s.user_id && s.user_id !== values.paid_by_user_id).length
});
```

**Decision:** Not strictly necessary (backend handles it), but useful for debugging.

---

### Step 4: Test Strategy

#### 4.1 Database Function Tests

**Test Case 1: Regular Split (All Users)**
```sql
-- Setup test data
INSERT INTO expenses (id, description, amount, paid_by_user_id, created_by, context_type)
VALUES (
  'test-expense-1'::uuid,
  'Test Regular Split',
  100.00,
  'user-1'::uuid,
  'user-1'::uuid,
  'group'
);

-- Create splits (all with user_id)
INSERT INTO expense_splits (expense_id, user_id, computed_amount, split_method)
VALUES
  ('test-expense-1'::uuid, 'user-1'::uuid, 50.00, 'equal'),
  ('test-expense-1'::uuid, 'user-2'::uuid, 50.00, 'equal');

-- Verify notification created for user-2 only (not creator)
SELECT COUNT(*) FROM notifications
WHERE user_id = 'user-2'::uuid
  AND type = 'expense_added'
  AND link LIKE '%/expenses/show/test-expense-1%';
-- Expected: 1

-- Verify no notification for creator
SELECT COUNT(*) FROM notifications
WHERE user_id = 'user-1'::uuid
  AND type = 'expense_added';
-- Expected: 0
```

**Test Case 2: Pending Email Participant**
```sql
-- Setup test data
INSERT INTO expenses (id, description, amount, paid_by_user_id, created_by, context_type)
VALUES (
  'test-expense-2'::uuid,
  'Test Pending Email',
  100.00,
  'user-1'::uuid,
  'user-1'::uuid,
  'group'
);

-- Create splits (one with pending_email)
INSERT INTO expense_splits (expense_id, user_id, pending_email, computed_amount, split_method, is_claimed)
VALUES
  ('test-expense-2'::uuid, 'user-1'::uuid, NULL, 50.00, 'equal', TRUE),
  ('test-expense-2'::uuid, NULL, 'newuser@example.com', 50.00, 'equal', FALSE);

-- Verify no error thrown (function handles NULL user_id)
-- Verify no notification created for pending email
SELECT COUNT(*) FROM notifications
WHERE type = 'expense_added'
  AND link LIKE '%/expenses/show/test-expense-2%';
-- Expected: 0 (creator skipped, pending email skipped)
```

**Test Case 3: Mixed Participants**
```sql
-- Setup test data
INSERT INTO expenses (id, description, amount, paid_by_user_id, created_by, context_type)
VALUES (
  'test-expense-3'::uuid,
  'Test Mixed',
  150.00,
  'user-1'::uuid,
  'user-1'::uuid,
  'group'
);

-- Create splits (creator, regular user, pending email)
INSERT INTO expense_splits (expense_id, user_id, pending_email, computed_amount, split_method, is_claimed)
VALUES
  ('test-expense-3'::uuid, 'user-1'::uuid, NULL, 50.00, 'equal', TRUE),
  ('test-expense-3'::uuid, 'user-2'::uuid, NULL, 50.00, 'equal', TRUE),
  ('test-expense-3'::uuid, NULL, 'pending@example.com', 50.00, 'equal', FALSE);

-- Verify notification created for user-2 only
SELECT user_id, type, message FROM notifications
WHERE link LIKE '%/expenses/show/test-expense-3%';
-- Expected: 1 row with user_id = 'user-2'
```

#### 4.2 Frontend Integration Tests

**Manual Test:**
1. Create expense in group context
2. Add 2 regular members + 1 email participant
3. Submit expense
4. Verify:
   - Expense created successfully
   - All 3 splits created
   - No errors in console
   - Notification sent to 1 regular member (not creator, not pending email)

**UI Test Checklist:**
- [ ] Expense creation succeeds with mixed participants
- [ ] No error toasts shown
- [ ] Splits created correctly (check database)
- [ ] Notifications created only for valid user_ids
- [ ] Console logs show proper split breakdown

#### 4.3 Edge Cases

**Edge Case 1: All Pending Emails**
```sql
-- All splits have pending_email (no registered users)
INSERT INTO expense_splits (expense_id, user_id, pending_email, computed_amount, split_method, is_claimed)
VALUES
  ('test-edge-1'::uuid, NULL, 'email1@test.com', 50.00, 'equal', FALSE),
  ('test-edge-1'::uuid, NULL, 'email2@test.com', 50.00, 'equal', FALSE);

-- Expected: No notifications created, no errors
```

**Edge Case 2: Creator is Only User**
```sql
-- Only creator + pending emails
INSERT INTO expense_splits (expense_id, user_id, pending_email, computed_amount, split_method, is_claimed)
VALUES
  ('test-edge-2'::uuid, 'user-1'::uuid, NULL, 100.00, 'exact', TRUE),
  ('test-edge-2'::uuid, NULL, 'email@test.com', 50.00, 'exact', FALSE);

-- Expected: No notifications (creator excluded, pending email skipped)
```

---

### Step 5: Rollback Strategy

**If Migration Fails:**

```sql
-- Rollback migration
BEGIN;

-- Restore old function (with bug)
CREATE OR REPLACE FUNCTION "public"."notify_expense_added"()
RETURNS "trigger"
LANGUAGE "plpgsql"
AS $$
DECLARE
  v_participant_id UUID;
BEGIN
  FOR v_participant_id IN
    SELECT user_id
    FROM expense_splits
    WHERE expense_id = NEW.id
      AND user_id != NEW.created_by
  LOOP
    IF should_send_notification(v_participant_id, 'expense_added') THEN
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        reference_id,
        reference_type
      ) VALUES (
        v_participant_id,
        'expense_added',
        'New Expense Added',
        'A new expense "' || NEW.description || '" was added',
        NEW.id,
        'expense'
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Remove trigger to prevent errors
DROP TRIGGER IF EXISTS "trigger_notify_expense_added" ON "public"."expense_splits";

COMMIT;
```

**Impact of Rollback:**
- Notifications disabled for expense creation
- No errors during expense creation with pending emails
- Manual notification re-enable required after proper fix

---

## Verification Checklist

After applying migration:

### Database Level
- [ ] Function exists: `SELECT proname FROM pg_proc WHERE proname = 'notify_expense_added';`
- [ ] Trigger exists: `SELECT tgname FROM pg_trigger WHERE tgname = 'trigger_notify_expense_added';`
- [ ] Trigger attached to expense_splits: `SELECT tgrelid::regclass FROM pg_trigger WHERE tgname = 'trigger_notify_expense_added';`
- [ ] Function uses correct columns: Review function source for `link` (not reference_id)
- [ ] NULL check present: Review function source for `user_id IS NOT NULL`

### Application Level
- [ ] Create expense with regular users → notifications created
- [ ] Create expense with pending email → no error, no notification for pending
- [ ] Create expense with mixed participants → only valid users notified
- [ ] Check browser console: no errors during expense creation
- [ ] Check Supabase logs: no constraint violation errors

### Production Sync
- [ ] Production schema dump updated with new function
- [ ] Trigger definition present in production dump
- [ ] Local database matches production schema

---

## Deployment Steps

### 1. Pre-Deployment
```bash
# Backup current production schema
cd /Users/long.lnt/Desktop/Projects/FairPay
supabase db dump --remote -f supabase/scripts/backup/production-backup-before-notification-fix-$(date +%y%m%d).sql

# Create migration file
cat > supabase/migrations/20260206000000_fix_notify_expense_added_function.sql << 'EOF'
[Paste SQL from Step 1]
EOF
```

### 2. Local Testing
```bash
# Reset local database with migration
pnpm db:reset

# Run test cases from Step 4
psql $DATABASE_URL -f tests/notify_expense_test_cases.sql

# Test via UI
pnpm dev
# Navigate to group → create expense with mixed participants
```

### 3. Production Deployment
```bash
# Push migration to production
supabase db push --remote

# Verify trigger active
supabase db query --remote "SELECT tgname, tgrelid::regclass FROM pg_trigger WHERE tgname = 'trigger_notify_expense_added';"

# Dump updated schema
supabase db dump --remote --schema-only -f supabase/scripts/sync/dumps/production-schema.sql
```

### 4. Post-Deployment Verification
```bash
# Check Supabase logs for errors
supabase logs --remote --tail 50

# Create test expense via UI with pending email
# Monitor for errors in logs

# Query notifications created
supabase db query --remote "SELECT COUNT(*), type FROM notifications WHERE created_at > NOW() - INTERVAL '1 hour' GROUP BY type;"
```

---

## Additional Considerations

### Future Enhancements (Not in Scope)

1. **Email Notification Queue:** When pending participant claims their split, send retroactive notification
2. **Notification Preferences:** Allow users to disable expense_added notifications
3. **Batch Notifications:** Group multiple expense additions in same group
4. **Rich Notifications:** Include amount, payer name, split details

### Known Limitations

1. **Pending participants never notified:** Even after claiming split, no retroactive notification
2. **No creator notification:** Creator never notified of their own expense
3. **No email to pending participants:** System doesn't send email to pending_email addresses

### Schema Drift Prevention

**Action Required:** Update `production-schema.sql` manually after every migration to prevent drift.

**Verification Command:**
```bash
# Compare local vs production schema
diff <(supabase db dump --local --schema-only) <(supabase db dump --remote --schema-only)
```

---

## Success Criteria

Migration is successful when:

1. ✅ Function `notify_expense_added()` exists with NULL check
2. ✅ Trigger `trigger_notify_expense_added` attached to `expense_splits`
3. ✅ Expense creation with pending email succeeds (no errors)
4. ✅ Notifications created only for valid user_ids
5. ✅ No constraint violations in Supabase logs
6. ✅ Production schema dump synchronized with migration
7. ✅ All test cases pass (Step 4)

---

## Timeline

| Phase | Duration | Owner |
|-------|----------|-------|
| Migration file creation | 15 min | Developer |
| Local testing | 30 min | Developer |
| Code review | 15 min | Tech Lead |
| Production deployment | 15 min | DevOps |
| Post-deployment verification | 30 min | QA |
| **Total** | **1h 45min** | |

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Migration syntax error | LOW | HIGH | Test locally first, peer review |
| Trigger performance issue | LOW | MEDIUM | AFTER INSERT trigger is fast, minimal logic |
| Notification spam | VERY LOW | LOW | Function already checks preferences |
| Production downtime | VERY LOW | HIGH | Migration is backward compatible |
| Data loss | NONE | N/A | No data modification, only function update |

**Overall Risk Level:** LOW (backward compatible, no schema changes)

---

## Unresolved Questions

1. **Should pending participants receive email notifications?**
   - Current: No notification (they don't have accounts)
   - Possible: Send email to pending_email address
   - Decision needed from product team

2. **Should trigger be active at all?**
   - Current: Enabled in test, missing in production dump
   - Possible: Intentionally disabled in production?
   - Recommendation: Enable with fix

3. **Notification delivery method?**
   - Current: In-app notifications table only
   - Possible: Email, push notifications, SMS
   - Future enhancement

4. **Retroactive notifications for claimed splits?**
   - When pending participant claims split, notify about past expenses?
   - Requires separate trigger on expense_splits UPDATE (is_claimed change)

---

## References

- Investigation Report: `plans/expense-notification-fix/reports/260206-investigation-report.md`
- Original Migration: `supabase/migrations/20260201000000_add_email_participant_support.sql`
- Production Schema: `supabase/scripts/sync/dumps/production-schema.sql` (lines 2145-2180, 3812-3821)
- Frontend Code: `src/modules/expenses/pages/create.tsx` (lines 134-218)

---

## Approval

- [ ] Technical Lead Review
- [ ] Database Schema Review
- [ ] Product Owner Approval (notification behavior)
- [ ] Ready for Deployment

**Prepared by:** Planning Agent
**Date:** 2026-02-06
**Version:** 1.0
