# Phase 2: DB Include Email Debts in Aggregation

## Context
- `get_user_debts_aggregated` currently has `AND es.user_id IS NOT NULL` (line 57)
- This excludes ALL pending email splits from dashboard/debt views
- Need: Payer should see email participants in their debt summary

## Key Insight
- Pending email participants can ONLY appear from the payer's perspective
- The email person hasn't registered, so they can't query their own debts
- After claim (Phase 1), splits convert to UUID-based and work normally

## Architecture Change
Current return type:
```
counterparty_id UUID, counterparty_name TEXT, ...
```
New return type adds:
```
counterparty_email TEXT  -- NULL for UUID-based, email for pending
```

## Implementation Steps

### 2.1 Modify `get_user_debts_aggregated`
- Remove `AND es.user_id IS NOT NULL` filter
- Add `es.pending_email` to the `user_splits` CTE
- In `signed_debts` CTE: use `COALESCE(user_id::TEXT, pending_email)` as grouping key
- Handle self-split exclusion: `AND (es.user_id != e.paid_by_user_id OR es.user_id IS NULL)`
- Add `counterparty_email TEXT` to return columns
- For pending email rows: `counterparty_id = NULL`, `counterparty_name = pending_email`, `counterparty_email = pending_email`

### 2.2 Handle bilateral netting edge case
- Pending email participants can only owe (they didn't pay for anything)
- No netting needed for email-only counterparties
- After claim, netting works normally via UUID

## Related Files
- `supabase/migrations/20260209100000_fix_debt_netting_and_rounding.sql` (current function)
- New: `supabase/migrations/20260211100000_include_pending_email_in_debt_aggregation.sql`

## Success Criteria
- [ ] Payer sees email participant debts in dashboard
- [ ] Existing UUID-based debts unchanged
- [ ] Return type backward-compatible (new column is NULL for existing rows)
- [ ] After claim, email debts merge into UUID-based debts seamlessly
