# Phase 1: DB Auto-Claim Function & Trigger

## Context
- `expense_splits` already has `pending_email TEXT`, `is_claimed BOOLEAN`, nullable `user_id`
- Constraint: `user_id XOR pending_email` (can't have both)
- Need: When user registers with email X, all splits with `pending_email = X` get claimed

## Requirements
1. Create `claim_pending_email_splits(p_user_id UUID, p_email TEXT)` function
2. Create trigger on `profiles` table INSERT to auto-call claim function
3. Function must be idempotent and handle edge cases

## Architecture
```
User registers → Supabase creates auth.users row
  → Existing trigger creates profiles row
    → NEW trigger fires claim_pending_email_splits()
      → Updates expense_splits: user_id = new_user_id, pending_email = NULL, is_claimed = TRUE
```

## Implementation Steps

### 1.1 Create claim function
```sql
CREATE FUNCTION claim_pending_email_splits(p_user_id UUID, p_email TEXT)
RETURNS JSONB
```
- Find all `expense_splits` WHERE `pending_email = LOWER(p_email)` AND `is_claimed = FALSE`
- For each: SET `user_id = p_user_id`, `pending_email = NULL`, `is_claimed = TRUE`
- Return count of claimed splits
- SECURITY DEFINER (runs with elevated privileges)

### 1.2 Create trigger function
```sql
CREATE FUNCTION handle_new_user_claim_splits()
RETURNS TRIGGER
```
- Fires AFTER INSERT on `profiles`
- Gets email from `NEW.email` or from `auth.users` table
- Calls `claim_pending_email_splits(NEW.id, email)`

### 1.3 Create trigger
```sql
CREATE TRIGGER on_profile_created_claim_splits
AFTER INSERT ON profiles
FOR EACH ROW EXECUTE FUNCTION handle_new_user_claim_splits()
```

## Related Files
- `supabase/migrations/20260201000000_add_email_participant_support.sql` (existing schema)
- New: `supabase/migrations/20260211000000_create_claim_pending_email_function.sql`

## Success Criteria
- [ ] Function correctly updates matching splits
- [ ] Trigger fires on new profile creation
- [ ] No duplicate records after claim
- [ ] Existing splits unaffected
- [ ] Idempotent (running twice doesn't break anything)
