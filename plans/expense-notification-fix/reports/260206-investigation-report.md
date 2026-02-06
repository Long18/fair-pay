# Expense Notification Bug - Investigation Report

**Date:** 2026-02-06
**Investigator:** Analyst Agent
**Issue:** "null value in column 'user_id' of relation 'notification' violates not-null constraint"

---

## Executive Summary

**Root Cause Identified:** Schema mismatch between `notify_expense_added()` function and `notifications` table structure.

**Impact:** Expense creation fails when adding participants with pending emails (new users not yet in system). Expense record created but splits fail silently.

**Immediate Fix Required:** Update notification function to match actual table schema OR disable notification trigger until schema aligned.

---

## Technical Analysis

### 1. Code Flow for Expense Creation

**File:** `/Users/long.lnt/Desktop/Projects/FairPay/src/modules/expenses/pages/create.tsx`

Lines 134-218 handle expense creation:
1. User submits expense form with splits (lines 134-145)
2. Expense record created via Refine mutation (lines 146-156)
3. Frontend manually creates expense_splits records (lines 182-200)
4. Each split can have `user_id` (existing user) OR `pending_email` (new participant)

**Critical Code (lines 182-199):**
```typescript
const splitPromises = validSplits.map((split) => {
  const isPendingEmail = !!split.pending_email && !split.user_id;
  const isPayer = !!split.user_id && split.user_id === values.paid_by_user_id;
  return supabaseClient
    .from("expense_splits")
    .insert({
      expense_id: expenseId,
      user_id: split.user_id || null,          // ← Can be NULL
      pending_email: split.pending_email || null,
      split_method: values.split_method,
      split_value: split.split_value ?? null,
      computed_amount: split.computed_amount,
      is_settled: isPayer,
      is_claimed: !isPendingEmail,
      settled_amount: isPayer ? split.computed_amount : 0,
      settled_at: isPayer ? new Date().toISOString() : null,
    });
});
```

### 2. Database Trigger Chain

**When:** `expense_splits` INSERT occurs
**Trigger:** `trigger_notify_expense_added` (AFTER INSERT on `expense_splits`)
**Function:** `notify_expense_added()` at line 2145-2180 in production schema

**Problem in Function Logic:**
```sql
-- Line 2152-2156: Query selects user_id from expense_splits
FOR v_participant_id IN
  SELECT user_id
  FROM expense_splits
  WHERE expense_id = NEW.id
    AND user_id != NEW.created_by
LOOP
  -- Line 2160-2174: Attempts to INSERT notification
  INSERT INTO notifications (
    user_id,              -- ← REQUIRES NOT NULL
    type,
    title,
    message,
    reference_id,        -- ← Column doesn't exist in table!
    reference_type       -- ← Column doesn't exist in table!
  ) VALUES (
    v_participant_id,    -- ← NULL when pending_email used
    'expense_added',
    'New Expense Added',
    'A new expense "' || NEW.description || '" was added',
    NEW.id,
    'expense'
  );
```

### 3. Schema Mismatch

**Actual `notifications` Table Schema:**
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,           -- ← NOT NULL constraint
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,                        -- ← Has 'link' field
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

**Function Tries to Insert:**
- `reference_id` (doesn't exist, should be part of `link` or removed)
- `reference_type` (doesn't exist)
- Missing `link` field

**Constraint Violation:**
- `user_id` column is `NOT NULL`
- Function passes NULL when split has `pending_email` instead of `user_id`

---

## Evidence

### A. Trigger Exists But Not Attached

**Finding:** Function `notify_expense_added()` exists in production schema (line 2145) but NO CREATE TRIGGER statement found in production dump.

**Search Results:**
```bash
$ grep -i "trigger.*notify_expense" production-schema.sql
# No results for CREATE TRIGGER
```

**Triggers Present in Production (lines 4288-4316):**
- `donation_settings_updated_at`
- `on_group_created`
- `update_expenses_updated_at`
- `update_friendships_updated_at`
- `update_groups_updated_at`
- `update_profiles_updated_at`
- `update_recurring_expenses_updated_at`
- `update_user_settings_updated_at`

**Missing:** `trigger_notify_expense_added` on `expense_splits` table

### B. Test Schema Has Trigger

**File:** `supabase/scripts/sync/dumps/test/schema-20260110-175500.sql`
**Line 5051:**
```sql
CREATE OR REPLACE TRIGGER "trigger_notify_expense_added"
  AFTER INSERT ON "public"."expense_splits"
  FOR EACH ROW
  EXECUTE FUNCTION "public"."notify_expense_added"();
```

**Conclusion:** Test environment has trigger enabled, production does not (or was dropped).

### C. Migration Support for Pending Emails

**File:** `supabase/migrations/20260201000000_add_email_participant_support.sql`

Lines 1-34 add support for email-based participants:
- Makes `user_id` nullable (line 3)
- Adds `pending_email` column (line 7)
- Adds `is_claimed` tracking (line 21)
- Adds constraint: either `user_id` OR `pending_email` required (lines 10-12)

**This migration enables the bug:** Once `user_id` became nullable, any notification logic assuming `user_id` always exists breaks.

---

## Root Cause Summary

**Primary Issue:**
`notify_expense_added()` function written for old schema where `user_id` was always NOT NULL on `expense_splits`. After migration `20260201000000`, splits can have NULL `user_id` (when `pending_email` set). Function loops through splits, gets NULL user_id, tries to INSERT into notifications with NULL user_id → violates NOT NULL constraint.

**Secondary Issue:**
Function uses wrong column names (`reference_id`, `reference_type` instead of `link`).

**Tertiary Issue:**
Trigger may not be active in production (orphaned function).

---

## Affected Code Locations

| Location | Issue |
|----------|-------|
| `supabase/scripts/sync/dumps/production-schema.sql:2145-2180` | Function has schema mismatch |
| `src/modules/expenses/pages/create.tsx:182-200` | Creates splits with NULL user_id |
| `supabase/migrations/20260201000000_add_email_participant_support.sql` | Made user_id nullable without updating notification logic |
| Production DB triggers | Missing `trigger_notify_expense_added` (if intended to be active) |

---

## Recommended Fixes

### Option 1: Update Function to Handle NULL user_id (Preferred)

```sql
CREATE OR REPLACE FUNCTION notify_expense_added()
RETURNS TRIGGER AS $$
DECLARE
  v_participant_id UUID;
BEGIN
  -- Notify all participants except the creator
  FOR v_participant_id IN
    SELECT user_id
    FROM expense_splits
    WHERE expense_id = NEW.id
      AND user_id IS NOT NULL              -- ← Add NULL check
      AND user_id != NEW.created_by
  LOOP
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
        'A new expense "' || NEW.description || '" was added',
        '/expenses/show/' || NEW.id,        -- ← Use actual link
        FALSE,
        NOW()
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Option 2: Skip Notifications for Pending Users

Add logic to only notify claimed (non-pending) participants.

### Option 3: Remove Trigger Entirely

If notifications not needed, drop trigger:
```sql
DROP TRIGGER IF EXISTS trigger_notify_expense_added ON expense_splits;
```

---

## Unresolved Questions

1. **Is the trigger supposed to be active in production?** Function exists but trigger missing from production schema dump.

2. **Should pending email participants receive notifications?** Need product decision - they don't have accounts yet.

3. **Is `should_send_notification()` function working correctly?** Not investigated in this report.

4. **Why does test schema have trigger but production doesn't?** Schema drift or intentional?

---

## Next Steps

1. Verify if trigger exists in actual production DB: `SELECT * FROM pg_trigger WHERE tgname = 'trigger_notify_expense_added';`
2. Apply Option 1 fix to update function schema
3. Create migration to recreate trigger with updated function
4. Test with pending email participants
5. Verify notifications created only for valid user_ids
