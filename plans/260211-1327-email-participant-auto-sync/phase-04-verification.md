# Phase 4: Verification & Testing

## Test Scenarios

### Case 1: Create Expense with Email Participant
1. User A creates expense with email "bob@example.com"
2. Verify split created with `pending_email = 'bob@example.com'`, `user_id = NULL`, `is_claimed = FALSE`
3. Verify expense appears in User A's dashboard
4. Verify "bob@example.com" appears as counterparty with pending badge

### Case 2: Email Participant Registers (Auto-Sync)
1. "bob@example.com" signs up
2. Trigger fires, claim function runs
3. Verify split updated: `user_id = bob_uuid`, `pending_email = NULL`, `is_claimed = TRUE`
4. Verify User A's dashboard now shows Bob's real name/avatar
5. Verify Bob's dashboard shows the debt

### Case 3: Multiple Expenses Before Registration
1. Create 3 expenses with "bob@example.com" across different groups
2. Bob registers
3. Verify ALL 3 splits claimed
4. Verify all balances correct from both perspectives

### Case 4: Edge Cases
- Email already registered (should not create pending split)
- Same email added twice to same expense (prevented by UI)
- Email with different casing (normalized to lowercase)
- Settlement of pending email split (should work)

## Verification Commands
```bash
# Type check
pnpm type-check

# Build
pnpm build

# Test claim function directly
psql -c "SELECT claim_pending_email_splits('uuid', 'email@test.com')"

# Test debt aggregation
psql -c "SELECT * FROM get_user_debts_aggregated('user-uuid')"
```

## Success Criteria
- [ ] All type checks pass
- [ ] Build succeeds
- [ ] Claim function works correctly
- [ ] Dashboard renders email participants
- [ ] No regressions in existing debt calculations
