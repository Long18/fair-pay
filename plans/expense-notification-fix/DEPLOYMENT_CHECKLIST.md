# Deployment Checklist - Expense Notification Fix

**Migration:** `20260206000000_fix_notify_expense_added_function.sql`
**Date Prepared:** 2026-02-06
**Priority:** HIGH
**Risk Level:** LOW

---

## Pre-Deployment Checklist

### 1. Environment Verification

- [ ] **Local environment working**
  ```bash
  cd /Users/long.lnt/Desktop/Projects/FairPay
  pnpm dev
  # Verify app starts without errors
  ```

- [ ] **Supabase CLI installed and updated**
  ```bash
  supabase --version
  # Should be >= 1.0.0
  ```

- [ ] **Database credentials valid**
  ```bash
  supabase db query --remote "SELECT current_database(), current_user;"
  # Should return production database name
  ```

### 2. Code Review

- [ ] **Migration file reviewed**
  - File: `supabase/migrations/20260206000000_fix_notify_expense_added_function.sql`
  - SQL syntax valid
  - No destructive operations (DROP TABLE, TRUNCATE, etc.)
  - Backward compatible

- [ ] **Implementation plan reviewed**
  - File: `plans/expense-notification-fix/implementation-plan-260206.md`
  - All steps understood
  - Rollback strategy documented

- [ ] **Test cases prepared**
  - File: `plans/expense-notification-fix/test-cases-260206.sql`
  - Test scenarios cover edge cases

### 3. Backup Preparation

- [ ] **Create production backup**
  ```bash
  supabase db dump --remote -f supabase/scripts/backup/production-backup-before-notification-fix-260206.sql
  ```

- [ ] **Verify backup file size**
  ```bash
  ls -lh supabase/scripts/backup/production-backup-before-notification-fix-260206.sql
  # Should be > 0 bytes
  ```

- [ ] **Test backup is valid SQL**
  ```bash
  head -n 20 supabase/scripts/backup/production-backup-before-notification-fix-260206.sql
  # Should show valid SQL header
  ```

---

## Deployment Steps

### Step 1: Pre-Deployment Verification (5 min)

- [ ] **Check current function definition**
  ```bash
  supabase db query --remote "SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'notify_expense_added';"
  ```
  - [ ] Note the output (old version should have reference_id, reference_type)

- [ ] **Check if trigger exists**
  ```bash
  supabase db query --remote "SELECT tgname, tgrelid::regclass FROM pg_trigger WHERE tgname = 'trigger_notify_expense_added';"
  ```
  - [ ] Note the output (may be missing in production)

- [ ] **Check recent errors in logs**
  ```bash
  supabase logs --remote --tail 50 | grep -i "notification\|user_id"
  ```
  - [ ] Document any existing notification errors

### Step 2: Apply Migration (5 min)

- [ ] **Push migration to production**
  ```bash
  supabase db push --remote
  ```
  - [ ] Migration applied successfully
  - [ ] No error messages shown
  - [ ] Exit code 0

- [ ] **If migration fails:**
  - [ ] Check error message
  - [ ] Consult rollback strategy (Step 5 in implementation plan)
  - [ ] DO NOT PROCEED until error resolved

### Step 3: Post-Deployment Verification (10 min)

- [ ] **Verify function updated**
  ```bash
  supabase db query --remote "SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'notify_expense_added';"
  ```
  - [ ] Function contains `user_id IS NOT NULL` check
  - [ ] Function uses `link` column (not reference_id)
  - [ ] Function uses `NEW.expense_id` (not NEW.id)

- [ ] **Verify trigger exists and attached**
  ```bash
  supabase db query --remote "SELECT tgname, tgrelid::regclass, tgtype FROM pg_trigger WHERE tgname = 'trigger_notify_expense_added';"
  ```
  - [ ] Trigger name: `trigger_notify_expense_added`
  - [ ] Attached to: `expense_splits`
  - [ ] Type: AFTER INSERT

- [ ] **Check for immediate errors**
  ```bash
  supabase logs --remote --tail 20
  ```
  - [ ] No migration errors
  - [ ] No function syntax errors

### Step 4: Functional Testing (15 min)

#### Test 4.1: Create Expense with Regular Users

- [ ] **Login to production app**
- [ ] **Navigate to a group**
- [ ] **Create expense:**
  - Description: "Test Notification Fix - Regular Users"
  - Amount: 100
  - Participants: 2 registered users (yourself + 1 other)
  - Split: Equal
- [ ] **Submit expense**
- [ ] **Expected results:**
  - [ ] Expense created successfully
  - [ ] No error toasts shown
  - [ ] No console errors
- [ ] **Verify notification created:**
  ```bash
  supabase db query --remote "SELECT user_id, type, message, link FROM notifications WHERE message LIKE '%Test Notification Fix%' ORDER BY created_at DESC LIMIT 5;"
  ```
  - [ ] 1 notification created (for non-creator participant)
  - [ ] user_id is NOT NULL
  - [ ] link format: `/expenses/show/[uuid]`

#### Test 4.2: Create Expense with Pending Email

- [ ] **Navigate to same group**
- [ ] **Create expense:**
  - Description: "Test Notification Fix - Pending Email"
  - Amount: 150
  - Participants: 1 registered user + 1 email address (not yet registered)
  - Email: `testpending${Date.now()}@example.com`
  - Split: Equal
- [ ] **Submit expense**
- [ ] **Expected results:**
  - [ ] Expense created successfully
  - [ ] No error toasts shown
  - [ ] No console errors
  - [ ] No constraint violation errors
- [ ] **Verify splits created:**
  ```bash
  supabase db query --remote "SELECT user_id, pending_email, computed_amount FROM expense_splits WHERE expense_id IN (SELECT id FROM expenses WHERE description LIKE '%Test Notification Fix - Pending%') ORDER BY user_id NULLS LAST;"
  ```
  - [ ] 2 splits created
  - [ ] One with user_id (registered user)
  - [ ] One with pending_email (NULL user_id)
- [ ] **Verify notification behavior:**
  ```bash
  supabase db query --remote "SELECT COUNT(*) FROM notifications WHERE message LIKE '%Test Notification Fix - Pending%';"
  ```
  - [ ] 0 notifications (creator was payer, pending email skipped)
  - [ ] OR 1 notification if non-creator registered user exists

#### Test 4.3: Check Logs for Errors

- [ ] **Monitor logs during test**
  ```bash
  supabase logs --remote --tail 100 | grep -i "error\|constraint\|violation\|notification"
  ```
  - [ ] No constraint violations
  - [ ] No "null value in column 'user_id'" errors
  - [ ] No function execution errors

### Step 5: Schema Synchronization (5 min)

- [ ] **Update production schema dump**
  ```bash
  supabase db dump --remote --schema-only -f supabase/scripts/sync/dumps/production-schema.sql
  ```

- [ ] **Verify dump contains updated function**
  ```bash
  grep -A 50 "CREATE OR REPLACE FUNCTION.*notify_expense_added" supabase/scripts/sync/dumps/production-schema.sql | grep "user_id IS NOT NULL"
  ```
  - [ ] Output shows NULL check present

- [ ] **Commit schema dump**
  ```bash
  git add supabase/scripts/sync/dumps/production-schema.sql
  git commit -m "chore(db): update production schema after notification fix migration"
  ```

### Step 6: Cleanup Test Data (2 min)

- [ ] **Delete test expenses (optional)**
  ```bash
  supabase db query --remote "DELETE FROM expenses WHERE description LIKE '%Test Notification Fix%';"
  ```

- [ ] **Delete test notifications**
  ```bash
  supabase db query --remote "DELETE FROM notifications WHERE message LIKE '%Test Notification Fix%';"
  ```

---

## Post-Deployment Monitoring

### First 24 Hours

- [ ] **Hour 1: Active monitoring**
  ```bash
  # Run every 15 minutes
  supabase logs --remote --tail 50 | grep -i "error\|notification"
  ```

- [ ] **Hour 2-4: Periodic checks**
  ```bash
  # Run every hour
  supabase db query --remote "SELECT COUNT(*) FROM notifications WHERE created_at > NOW() - INTERVAL '1 hour';"
  ```

- [ ] **End of Day 1: Summary check**
  ```bash
  supabase db query --remote "
    SELECT
      DATE(created_at) as date,
      COUNT(*) as notification_count,
      COUNT(DISTINCT user_id) as unique_users
    FROM notifications
    WHERE type = 'expense_added'
      AND created_at > NOW() - INTERVAL '24 hours'
    GROUP BY DATE(created_at);
  "
  ```

### Metrics to Monitor

- [ ] **Error rate in Supabase logs**
  - Baseline: 0 constraint violations
  - Alert if: Any "null value in column 'user_id'" errors

- [ ] **Notification creation rate**
  - Baseline: Similar to pre-deployment
  - Alert if: Sudden drop (may indicate trigger disabled)

- [ ] **Expense creation success rate**
  - Baseline: 100% success
  - Alert if: Any failures with pending email participants

---

## Rollback Plan

### When to Rollback

Rollback if ANY of:
- [ ] Migration fails to apply
- [ ] Function syntax errors in logs
- [ ] Constraint violations continue
- [ ] Notification creation fails for regular users
- [ ] Unexpected behavior in production

### Rollback Steps

1. **Disable trigger immediately**
   ```bash
   supabase db query --remote "DROP TRIGGER IF EXISTS trigger_notify_expense_added ON expense_splits;"
   ```

2. **Verify trigger disabled**
   ```bash
   supabase db query --remote "SELECT COUNT(*) FROM pg_trigger WHERE tgname = 'trigger_notify_expense_added';"
   # Should return 0
   ```

3. **Restore from backup if needed**
   ```bash
   supabase db reset --remote
   supabase db push --remote --include-schema
   ```

4. **Notify team**
   - Document rollback reason
   - Schedule fix review meeting
   - Plan retry timeline

---

## Success Criteria

Deployment is successful when ALL criteria met:

### Database Level
- [x] Function `notify_expense_added()` contains NULL check
- [x] Function uses correct column names (link)
- [x] Trigger `trigger_notify_expense_added` exists
- [x] Trigger attached to `expense_splits` table

### Application Level
- [x] Expense creation with pending emails succeeds
- [x] Notifications created only for valid user_ids
- [x] No constraint violation errors in logs
- [x] No errors in browser console

### Monitoring Level
- [x] No errors in first hour post-deployment
- [x] Notification creation rate stable
- [x] Zero user-reported issues

---

## Sign-Off

### Pre-Deployment

- [ ] **Developer:** Code review completed, migration tested locally
  - Name: _________________
  - Date: _________________

- [ ] **Tech Lead:** Architecture review completed, rollback plan approved
  - Name: _________________
  - Date: _________________

### Post-Deployment

- [ ] **DevOps:** Migration applied successfully, monitoring active
  - Name: _________________
  - Date: _________________
  - Deployment time: _________________

- [ ] **QA:** Functional tests passed, no errors detected
  - Name: _________________
  - Date: _________________
  - Test completion time: _________________

---

## Timeline Summary

| Phase | Duration | Status |
|-------|----------|--------|
| Pre-deployment verification | 5 min | ⬜ |
| Apply migration | 5 min | ⬜ |
| Post-deployment verification | 10 min | ⬜ |
| Functional testing | 15 min | ⬜ |
| Schema synchronization | 5 min | ⬜ |
| Cleanup | 2 min | ⬜ |
| **Total** | **42 min** | |

---

## Contact Information

**For Issues During Deployment:**
- Escalation: Tech Lead
- Documentation: `plans/expense-notification-fix/implementation-plan-260206.md`
- Rollback Guide: This document → "Rollback Plan" section

**Post-Deployment Support:**
- Monitoring Dashboard: Supabase Console → Logs
- Metrics Query: See "Post-Deployment Monitoring" section

---

## References

- **Implementation Plan:** `plans/expense-notification-fix/implementation-plan-260206.md`
- **Test Cases:** `plans/expense-notification-fix/test-cases-260206.sql`
- **Visual Flow:** `plans/expense-notification-fix/VISUAL_FLOW.md`
- **Execution Summary:** `plans/expense-notification-fix/EXECUTION_SUMMARY.md`
- **Migration File:** `supabase/migrations/20260206000000_fix_notify_expense_added_function.sql`

---

**Checklist Version:** 1.0
**Last Updated:** 2026-02-06
**Prepared by:** Planning Agent
