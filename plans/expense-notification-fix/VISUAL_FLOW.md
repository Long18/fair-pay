# Expense Notification Fix - Visual Flow Diagram

## Before Fix (Buggy Behavior)

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. User Creates Expense with Pending Email Participant             │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         v
┌─────────────────────────────────────────────────────────────────────┐
│ 2. Frontend: Create expense_splits records                          │
│                                                                      │
│    Split A: user_id = USER_1 (creator)     ✓                       │
│    Split B: user_id = USER_2               ✓                       │
│    Split C: user_id = NULL                 ⚠️                       │
│             pending_email = "new@test.com"                          │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         v
┌─────────────────────────────────────────────────────────────────────┐
│ 3. Database: AFTER INSERT trigger fires                             │
│    Trigger: trigger_notify_expense_added                            │
│    Function: notify_expense_added()                                 │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         v
┌─────────────────────────────────────────────────────────────────────┐
│ 4. Function Logic (BUGGY):                                          │
│                                                                      │
│    FOR v_participant_id IN                                          │
│      SELECT user_id FROM expense_splits                             │
│      WHERE expense_id = NEW.id          ❌ Wrong! NEW is split row  │
│        AND user_id != NEW.created_by    ❌ NEW has no created_by    │
│    LOOP                                                             │
│      -- Loop iterations:                                            │
│      -- 1st: v_participant_id = USER_1  (creator)                   │
│      -- 2nd: v_participant_id = USER_2                              │
│      -- 3rd: v_participant_id = NULL    ⚠️ Problem!                 │
│                                                                      │
│      INSERT INTO notifications (                                    │
│        user_id,              ← NULL value here! 💥                  │
│        type,                                                        │
│        reference_id,         ❌ Column doesn't exist                │
│        reference_type        ❌ Column doesn't exist                │
│      ) VALUES (                                                     │
│        v_participant_id,     ← NULL when pending_email              │
│        'expense_added',                                             │
│        NEW.id,                                                      │
│        'expense'                                                    │
│      );                                                             │
│    END LOOP;                                                        │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         v
┌─────────────────────────────────────────────────────────────────────┐
│ 5. RESULT: ERROR! 💥                                                │
│                                                                      │
│    ERROR: null value in column "user_id" of relation                │
│           "notifications" violates not-null constraint              │
│                                                                      │
│    - Expense created ✓                                              │
│    - Splits created ✓                                               │
│    - Notification creation FAILED ❌                                │
│    - User sees error in console                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## After Fix (Correct Behavior)

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. User Creates Expense with Pending Email Participant             │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         v
┌─────────────────────────────────────────────────────────────────────┐
│ 2. Frontend: Create expense_splits records                          │
│                                                                      │
│    Split A: user_id = USER_1 (creator)     ✓                       │
│    Split B: user_id = USER_2               ✓                       │
│    Split C: user_id = NULL                 ✓                       │
│             pending_email = "new@test.com"                          │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         v
┌─────────────────────────────────────────────────────────────────────┐
│ 3. Database: AFTER INSERT trigger fires                             │
│    Trigger: trigger_notify_expense_added                            │
│    Function: notify_expense_added() (FIXED)                         │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         v
┌─────────────────────────────────────────────────────────────────────┐
│ 4. Function Logic (FIXED):                                          │
│                                                                      │
│    -- Step 1: Get expense details                                   │
│    SELECT id, description, created_by                               │
│    INTO v_expense                                                   │
│    FROM expenses                                                    │
│    WHERE id = NEW.expense_id;  ✅ Correct! NEW.expense_id           │
│                                                                      │
│    -- Step 2: Loop through valid participants only                  │
│    FOR v_participant_id IN                                          │
│      SELECT user_id FROM expense_splits                             │
│      WHERE expense_id = NEW.expense_id    ✅ Correct expense_id     │
│        AND user_id IS NOT NULL            ✅ Skip pending emails     │
│        AND user_id != v_expense.created_by  ✅ Skip creator         │
│    LOOP                                                             │
│      -- Loop iterations:                                            │
│      -- USER_1 (creator): SKIPPED by created_by check ✓            │
│      -- USER_2: INCLUDED ✓                                          │
│      -- NULL (pending): SKIPPED by IS NOT NULL check ✓             │
│                                                                      │
│      INSERT INTO notifications (                                    │
│        user_id,              ✅ Always valid user_id                │
│        type,                                                        │
│        title,                                                       │
│        message,                                                     │
│        link,                 ✅ Correct column name                 │
│        is_read,                                                     │
│        created_at                                                   │
│      ) VALUES (                                                     │
│        v_participant_id,     ✅ Never NULL                          │
│        'expense_added',                                             │
│        'New Expense Added',                                         │
│        'A new expense "..." was added',                             │
│        '/expenses/show/' || v_expense.id::text,  ✅ Proper link     │
│        FALSE,                                                       │
│        NOW()                                                        │
│      );                                                             │
│    END LOOP;                                                        │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         v
┌─────────────────────────────────────────────────────────────────────┐
│ 5. RESULT: SUCCESS! ✅                                              │
│                                                                      │
│    - Expense created ✓                                              │
│    - All splits created (including pending email) ✓                 │
│    - Notification sent to USER_2 only ✓                            │
│    - No notification for creator (USER_1) ✓                         │
│    - No notification for pending email ✓                            │
│    - No errors! ✓                                                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Schema Comparison

### BEFORE (Buggy Function)

```sql
CREATE FUNCTION notify_expense_added() RETURNS trigger AS $$
DECLARE
  v_participant_id UUID;
BEGIN
  -- ❌ Problem 1: Wrong NEW context
  FOR v_participant_id IN
    SELECT user_id
    FROM expense_splits
    WHERE expense_id = NEW.id           -- ❌ NEW.id is split id, not expense id
      AND user_id != NEW.created_by     -- ❌ NEW (split row) has no created_by
  LOOP
    IF should_send_notification(v_participant_id, 'expense_added') THEN
      -- ❌ Problem 2: No NULL check, will loop with NULL user_id
      -- ❌ Problem 3: Wrong column names
      INSERT INTO notifications (
        user_id,              -- ❌ Can be NULL
        type,
        title,
        message,
        reference_id,         -- ❌ Column doesn't exist
        reference_type        -- ❌ Column doesn't exist
      ) VALUES (
        v_participant_id,     -- ❌ NULL when pending_email
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
$$ LANGUAGE plpgsql;
```

### AFTER (Fixed Function)

```sql
CREATE FUNCTION notify_expense_added() RETURNS trigger AS $$
DECLARE
  v_participant_id UUID;
  v_expense RECORD;
BEGIN
  -- ✅ Fix 1: Get expense details first
  SELECT id, description, created_by
  INTO v_expense
  FROM expenses
  WHERE id = NEW.expense_id;              -- ✅ Correct: NEW.expense_id

  IF v_expense IS NULL THEN
    RETURN NEW;
  END IF;

  -- ✅ Fix 2: Add NULL check to skip pending emails
  FOR v_participant_id IN
    SELECT user_id
    FROM expense_splits
    WHERE expense_id = NEW.expense_id     -- ✅ Correct expense id
      AND user_id IS NOT NULL             -- ✅ Skip pending emails
      AND user_id != v_expense.created_by -- ✅ Use fetched created_by
  LOOP
    IF should_send_notification(v_participant_id, 'expense_added') THEN
      -- ✅ Fix 3: Use correct column names
      INSERT INTO notifications (
        user_id,              -- ✅ Always NOT NULL
        type,
        title,
        message,
        link,                 -- ✅ Correct column
        is_read,
        created_at
      ) VALUES (
        v_participant_id,     -- ✅ Never NULL
        'expense_added',
        'New Expense Added',
        'A new expense "' || v_expense.description || '" was added',
        '/expenses/show/' || v_expense.id::text,  -- ✅ Proper link
        FALSE,
        NOW()
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## Notification Matrix

| Participant Type | user_id | pending_email | Included in Loop? | Notification Sent? | Reason |
|------------------|---------|---------------|-------------------|-------------------|---------|
| **Expense Creator** | ✓ (NOT NULL) | NULL | ❌ No | ❌ No | Excluded by `user_id != created_by` |
| **Regular User** | ✓ (NOT NULL) | NULL | ✅ Yes | ✅ Yes | Valid registered user |
| **Pending Email** | NULL | ✓ (NOT NULL) | ❌ No | ❌ No | Excluded by `user_id IS NOT NULL` |

---

## Database Trigger Flow

```
expense_splits Table
    │
    │ AFTER INSERT
    │
    v
┌─────────────────────────────────┐
│ trigger_notify_expense_added    │
│ (FOR EACH ROW)                  │
└────────────┬────────────────────┘
             │
             │ Calls function
             v
┌─────────────────────────────────┐
│ notify_expense_added()          │
│                                 │
│ 1. Fetch expense record         │
│ 2. Loop valid participants      │
│ 3. Check notification prefs     │
│ 4. Insert notifications         │
└─────────────────────────────────┘
```

---

## Key Changes Summary

| Issue | Before | After |
|-------|--------|-------|
| **NULL user_id** | Tries to INSERT NULL → error | Skipped with `IS NOT NULL` check |
| **Wrong record context** | `NEW.id` (split id) | `NEW.expense_id` (expense id) |
| **Wrong column names** | `reference_id`, `reference_type` | `link` |
| **Missing expense data** | Can't access `created_by` | Fetch expense record first |
| **Trigger existence** | Missing in production dump | Recreated in migration |

---

## Testing Scenarios

```
Scenario 1: All Registered Users
┌─────────┐  ┌─────────┐  ┌─────────┐
│ USER_1  │  │ USER_2  │  │ USER_3  │
│(creator)│  │  (✓)    │  │  (✓)    │
└─────────┘  └─────────┘  └─────────┘
     ❌           ✅           ✅
  (skipped)  (notified)   (notified)


Scenario 2: Mixed Participants
┌─────────┐  ┌─────────┐  ┌──────────────┐
│ USER_1  │  │ USER_2  │  │pending@email │
│(creator)│  │  (✓)    │  │    (NULL)    │
└─────────┘  └─────────┘  └──────────────┘
     ❌           ✅              ❌
  (skipped)  (notified)      (skipped)


Scenario 3: All Pending Emails
┌──────────────┐  ┌──────────────┐
│pending1@email│  │pending2@email│
│   (NULL)     │  │   (NULL)     │
└──────────────┘  └──────────────┘
       ❌                ❌
   (skipped)         (skipped)
   No notifications sent
```

---

## Migration Impact

**Before Migration:**
- ❌ Expense creation with pending emails → ERROR
- ❌ Notification table schema mismatch
- ❌ Trigger missing from production

**After Migration:**
- ✅ Expense creation with pending emails → SUCCESS
- ✅ Notification schema aligned
- ✅ Trigger active in production
- ✅ Only valid users receive notifications
- ✅ No constraint violations

**Backward Compatibility:** YES (existing functionality unchanged)

---

## Files Modified/Created

```
FairPay/
├── supabase/
│   └── migrations/
│       └── 20260206000000_fix_notify_expense_added_function.sql  ✨ NEW
├── plans/
│   └── expense-notification-fix/
│       ├── implementation-plan-260206.md                          ✨ NEW
│       ├── test-cases-260206.sql                                  ✨ NEW
│       ├── EXECUTION_SUMMARY.md                                   ✨ NEW
│       ├── VISUAL_FLOW.md                                         ✨ NEW (this file)
│       └── reports/
│           └── 260206-investigation-report.md                     ✅ EXISTING
└── src/
    └── modules/
        └── expenses/
            └── pages/
                └── create.tsx                                     ✅ NO CHANGES (already has validation)
```

---

**Visual Guide Created:** 2026-02-06
**Purpose:** Quick reference for understanding the bug and fix
**Audience:** Developers, reviewers, QA team
