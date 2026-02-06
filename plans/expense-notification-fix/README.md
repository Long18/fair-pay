# Expense Notification Fix - Complete Documentation

**Issue:** Database constraint violation when creating expenses with pending email participants
**Root Cause:** `notify_expense_added()` function tries to INSERT NULL user_id into notifications table
**Status:** Ready for Deployment
**Priority:** HIGH

---

## Quick Start

### For Deployers

1. **Read:** `EXECUTION_SUMMARY.md` (2 min read)
2. **Follow:** `DEPLOYMENT_CHECKLIST.md` (42 min execution)
3. **Verify:** Run test cases from `test-cases-260206.sql`

### For Reviewers

1. **Investigation:** `reports/260206-investigation-report.md` (complete analysis)
2. **Plan:** `implementation-plan-260206.md` (13-page detailed plan)
3. **Visual:** `VISUAL_FLOW.md` (diagrams and flow charts)

### For Developers

1. **Migration:** `supabase/migrations/20260206000000_fix_notify_expense_added_function.sql`
2. **Tests:** `test-cases-260206.sql` (5 comprehensive test scenarios)
3. **Context:** `VISUAL_FLOW.md` (before/after comparison)

---

## Document Index

| Document | Purpose | Audience | Read Time |
|----------|---------|----------|-----------|
| **README.md** | This file - navigation and overview | Everyone | 5 min |
| **EXECUTION_SUMMARY.md** | Quick deployment guide | DevOps, Tech Lead | 3 min |
| **DEPLOYMENT_CHECKLIST.md** | Step-by-step deployment tasks | DevOps, QA | Reference |
| **implementation-plan-260206.md** | Complete implementation details | Developers, Reviewers | 20 min |
| **VISUAL_FLOW.md** | Diagrams and visual explanations | Developers, QA | 10 min |
| **test-cases-260206.sql** | SQL test scripts | QA, Developers | Reference |
| **reports/260206-investigation-report.md** | Root cause analysis | Developers, Architects | 15 min |

---

## Problem Statement

### Symptom

When users create expenses with pending email participants (users not yet registered), the operation fails with:

```
ERROR: null value in column "user_id" of relation "notifications" violates not-null constraint
```

### Impact

- ❌ Expense creation blocked for pending email participants
- ❌ Poor user experience (error shown to user)
- ❌ Feature regression (email participants added in migration 20260201000000)

### Affected Code

1. **Database Function:** `notify_expense_added()` (line 2145-2180 in production schema)
2. **Database Trigger:** `trigger_notify_expense_added` (missing from production)
3. **Frontend:** `src/modules/expenses/pages/create.tsx` (no changes needed)

---

## Solution Overview

### Key Changes

1. **Add NULL check:** Skip participants with `user_id IS NOT NULL`
2. **Fix column names:** Use `link` instead of `reference_id`/`reference_type`
3. **Fix record context:** Use `NEW.expense_id` instead of `NEW.id`
4. **Ensure trigger exists:** Recreate trigger in migration

### Migration File

**Location:** `supabase/migrations/20260206000000_fix_notify_expense_added_function.sql`

**What it does:**
- Updates `notify_expense_added()` function with NULL handling
- Recreates trigger to ensure existence
- Maintains backward compatibility

### Impact Assessment

**Risk:** LOW (backward compatible, no schema changes)

**Backward Compatibility:** YES
- Existing expenses unaffected
- Existing notifications unchanged
- Only adds NULL check (additional safety)

**Performance:** NO IMPACT
- Function complexity unchanged (same loop logic)
- NULL check is simple condition (no performance hit)
- Trigger fires same as before (AFTER INSERT)

---

## Repository Structure

```
plans/expense-notification-fix/
├── README.md                                    ← You are here
├── EXECUTION_SUMMARY.md                         ← Quick deployment guide
├── DEPLOYMENT_CHECKLIST.md                      ← Detailed deployment steps
├── implementation-plan-260206.md                ← Complete implementation plan
├── VISUAL_FLOW.md                               ← Visual diagrams
├── test-cases-260206.sql                        ← SQL test scripts
└── reports/
    └── 260206-investigation-report.md           ← Root cause analysis

supabase/migrations/
└── 20260206000000_fix_notify_expense_added_function.sql  ← Production migration
```

---

## Deployment Process

### Timeline

| Phase | Duration | Owner |
|-------|----------|-------|
| Backup production | 5 min | DevOps |
| Apply migration | 5 min | DevOps |
| Verify deployment | 10 min | DevOps |
| Functional testing | 15 min | QA |
| Schema sync | 5 min | DevOps |
| **Total** | **40 min** | |

### Prerequisites

- [ ] Supabase CLI installed (`supabase --version`)
- [ ] Production database credentials configured
- [ ] Backup storage available (~500MB)
- [ ] Code review completed
- [ ] Tech lead approval obtained

### Quick Commands

```bash
# 1. Backup
supabase db dump --remote -f supabase/scripts/backup/before-notification-fix-260206.sql

# 2. Deploy
supabase db push --remote

# 3. Verify
supabase db query --remote "SELECT tgname FROM pg_trigger WHERE tgname = 'trigger_notify_expense_added';"

# 4. Sync schema
supabase db dump --remote --schema-only -f supabase/scripts/sync/dumps/production-schema.sql
```

---

## Testing Strategy

### Test Coverage

**5 Test Cases:**
1. ✅ Regular split (all registered users)
2. ✅ Pending email participant (NULL user_id handling)
3. ✅ Mixed participants (creator + users + pending)
4. ✅ All pending emails (edge case)
5. ✅ Multiple participants (scalability)

### Running Tests

**Local Testing:**
```bash
# Reset local database with migration
pnpm db:reset

# Run test cases
psql $DATABASE_URL -f plans/expense-notification-fix/test-cases-260206.sql

# Expected output: All assertions pass
```

**Production Testing:**
```bash
# After deployment, create test expense via UI
# - 1 creator (yourself)
# - 1 registered user
# - 1 pending email (test@example.com)

# Verify no errors in console or logs
```

### Success Criteria

- [ ] All 5 SQL test cases pass
- [ ] Expense creation with pending email succeeds
- [ ] Notifications sent to registered users only
- [ ] No constraint violations in logs
- [ ] Zero user-reported issues in 24h

---

## Rollback Strategy

### When to Rollback

Trigger rollback if:
- Migration fails to apply
- Constraint violations continue
- Function syntax errors
- Unexpected production behavior

### Rollback Steps

```sql
-- 1. Disable trigger immediately
DROP TRIGGER IF EXISTS trigger_notify_expense_added ON expense_splits;

-- 2. Verify disabled
SELECT COUNT(*) FROM pg_trigger WHERE tgname = 'trigger_notify_expense_added';
-- Should return 0

-- 3. Restore from backup if needed
-- (Use backup from pre-deployment step)
```

**Recovery Time:** < 5 minutes

---

## Monitoring

### Key Metrics

**Error Rate:**
```bash
supabase logs --remote --tail 100 | grep -c "null value in column 'user_id'"
# Expected: 0 (no constraint violations)
```

**Notification Creation:**
```sql
SELECT COUNT(*) FROM notifications
WHERE type = 'expense_added'
  AND created_at > NOW() - INTERVAL '1 hour';
-- Expected: Similar rate to pre-deployment
```

**Expense Success Rate:**
```sql
SELECT COUNT(*) FROM expenses
WHERE created_at > NOW() - INTERVAL '1 hour';
-- Expected: No drop in creation rate
```

### Alert Thresholds

| Metric | Baseline | Alert If |
|--------|----------|----------|
| Constraint violations | 0/hour | > 0/hour |
| Notification rate | ~10/hour | Drop > 50% |
| Expense creation | ~20/hour | Drop > 25% |

---

## Technical Details

### Root Causes Fixed

**Issue 1: NULL user_id**
- **Before:** Loop includes splits with `user_id = NULL`
- **After:** `WHERE user_id IS NOT NULL` skips pending participants

**Issue 2: Wrong columns**
- **Before:** Tries to INSERT into `reference_id`, `reference_type`
- **After:** Uses `link` column (actual schema)

**Issue 3: Wrong record context**
- **Before:** `NEW.id` (expense_splits.id)
- **After:** `NEW.expense_id` (expenses.id)

### Schema Alignment

**notifications Table (Actual):**
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,      -- ← Must be NOT NULL
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,                   -- ← Use this, not reference_id
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Function Now Matches Schema:**
```sql
INSERT INTO notifications (user_id, type, title, message, link, is_read, created_at)
VALUES (v_participant_id, ...);  -- v_participant_id always NOT NULL
```

---

## Known Limitations

### What This Fix DOES

✅ Prevents constraint violations with pending emails
✅ Ensures notifications sent to registered users only
✅ Maintains backward compatibility
✅ Adds proper NULL handling

### What This Fix DOES NOT Do

❌ Send notifications to pending email addresses (they have no accounts)
❌ Retroactively notify when pending user claims split
❌ Add email notification functionality
❌ Change notification preferences system

---

## Future Enhancements (Out of Scope)

1. **Retroactive Notifications**
   - When pending participant claims split, send notification about past expenses
   - Requires new trigger on `UPDATE expense_splits SET is_claimed = TRUE`

2. **Email to Pending Participants**
   - Send email to `pending_email` address
   - "You've been added to an expense, click to claim"

3. **Batch Notifications**
   - Group multiple expense notifications
   - "3 new expenses added to Group X"

4. **Rich Notifications**
   - Include amount, payer name, split breakdown
   - Deep links to expense detail page

---

## Troubleshooting

### Issue: Migration fails to apply

**Symptom:** Error during `supabase db push`

**Diagnosis:**
```bash
# Check function exists
supabase db query --remote "SELECT proname FROM pg_proc WHERE proname = 'notify_expense_added';"

# Check trigger exists
supabase db query --remote "SELECT tgname FROM pg_trigger WHERE tgname = 'trigger_notify_expense_added';"
```

**Solution:**
1. Review error message
2. Check syntax in migration file
3. Ensure no conflicting changes in production
4. Consult rollback plan

### Issue: Notifications not created

**Symptom:** No notifications after expense creation

**Diagnosis:**
```sql
-- Check trigger is active
SELECT tgname, tgenabled FROM pg_trigger
WHERE tgname = 'trigger_notify_expense_added';
-- tgenabled should be 'O' (enabled)

-- Check function exists
SELECT proname FROM pg_proc WHERE proname = 'notify_expense_added';

-- Check notification preferences
SELECT * FROM user_settings WHERE user_id = '[test-user-id]';
```

**Solution:**
1. Verify trigger enabled
2. Check user notification preferences
3. Ensure participants are registered users (not all pending)

### Issue: Still getting constraint violations

**Symptom:** "null value in column 'user_id'" error persists

**Diagnosis:**
```bash
# Check if migration applied
supabase db query --remote "SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'notify_expense_added';"
# Should contain "user_id IS NOT NULL"
```

**Solution:**
1. Verify migration actually applied
2. Check function source contains NULL check
3. Review Supabase logs for actual error source
4. May be different issue - investigate further

---

## FAQ

**Q: Will this affect existing expenses?**
A: No. Migration only updates function logic, doesn't modify data.

**Q: Do pending participants ever get notified?**
A: No (currently). They have no user_id, so can't receive in-app notifications. Future enhancement could email them.

**Q: What if all participants are pending emails?**
A: No notifications sent (correct behavior). Expense still created successfully.

**Q: Why wasn't this caught in testing?**
A: Pending email feature added in migration 20260201000000. Notification function not updated at that time.

**Q: Is the trigger supposed to be active?**
A: Yes. Exists in test schema, should exist in production. Migration recreates it.

**Q: Performance impact?**
A: None. NULL check is trivial, trigger fires same as before.

---

## Support

### For Questions

- **Technical:** Review `implementation-plan-260206.md` (Section: Unresolved Questions)
- **Deployment:** Check `DEPLOYMENT_CHECKLIST.md`
- **Testing:** See `test-cases-260206.sql` comments

### For Issues

1. Check troubleshooting section above
2. Review Supabase logs: `supabase logs --remote --tail 100`
3. Check investigation report for context
4. Consult rollback plan if critical

---

## Change History

| Date | Version | Changes |
|------|---------|---------|
| 2026-02-06 | 1.0 | Initial plan created |
| | | - Investigation completed |
| | | - Migration file prepared |
| | | - Test cases written |
| | | - Documentation finalized |

---

## Related Issues

- **Root Issue:** Pending email participant support (migration 20260201000000)
- **Related PR:** (To be added after deployment)
- **Investigation:** `reports/260206-investigation-report.md`

---

## Approval Trail

- [x] **Investigation:** Completed (260206-investigation-report.md)
- [x] **Planning:** Completed (implementation-plan-260206.md)
- [x] **Migration:** Ready (20260206000000_fix_notify_expense_added_function.sql)
- [x] **Test Cases:** Prepared (test-cases-260206.sql)
- [x] **Documentation:** Complete (all files)
- [ ] **Code Review:** Pending
- [ ] **Tech Lead Approval:** Pending
- [ ] **Deployment:** Pending
- [ ] **Post-Deployment Verification:** Pending

---

**Plan Prepared By:** Planning Agent
**Date:** 2026-02-06
**Status:** Ready for Review and Deployment
**Next Step:** Code review and tech lead approval
