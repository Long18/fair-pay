# Per-Member Prepaid System - Plan Summary

## Status: ✅ Ready for Implementation

## Overview

Complete redesign of recurring expense prepaid system from expense-level to per-member level tracking. Enables individual members to prepay their shares for multiple months with automatic consumption.

## Problem Solved

**Current System Limitations:**
- ❌ Only tracks single `prepaid_until` for entire expense
- ❌ Cannot handle "Member A prepays 5 months" scenario
- ❌ No per-member balance tracking
- ❌ No automatic consumption when instances generated
- ❌ Cannot accumulate multiple prepayments per member

**Required Behavior (iCloud Example):**
- Recurring: 200,000 VND/month, 4 members
- Each member owes: 50,000 VND/month
- Member A prepays 5 months
- Prepay amount: 50,000 × 5 = 250,000 VND
- Next 5 instances: Member A's split auto-settled
- After 5 months: Member A returns to normal payment

## Solution Architecture

### Database Changes

**New Tables:**
1. `member_prepaid_balances` - Per-member balance tracking
   - `balance_amount`, `monthly_share_amount`, `months_remaining`
   - UNIQUE(recurring_expense_id, user_id)

2. `prepaid_consumption_log` - Audit trail
   - Tracks: instance_id, user_id, amount_consumed, balances before/after

**Modified Tables:**
3. `recurring_prepaid_payments` - Add `user_id`, `paid_by_user_id`

### SQL Functions

1. `get_member_monthly_share(recurring_id, user_id)` → amount
2. `record_member_prepaid(recurring_id, user_id, months, paid_by)` → payment
3. `record_multi_member_prepaid(recurring_id, members[], paid_by)` → payments
4. `consume_prepaid_for_instance(instance_id)` → consumptions
5. `get_all_members_prepaid_info(recurring_id)` → member info table

### Frontend Components

1. **MemberPrepaidBalanceList** - Display per-member balances
2. **MultiMemberPrepaidDialog** - Record prepaid for multiple members
3. **Updated RecurringExpenseCard** - Collapsible member balance section

### Integration Point

- **Recurring Instance Generation:** Add `consume_prepaid_for_instance()` call
- Automatically settles splits for members with prepaid balance

## Implementation Phases

### Phase 1: Database Schema [4 hours]
- Create 2 new tables
- Modify existing table
- RLS policies
- Indexes

### Phase 2: SQL Functions [4 hours]
- 5 new functions
- Test with iCloud example
- Verify calculations

### Phase 3: TypeScript Types & Hooks [4 hours]
- Type definitions
- `useMemberPrepaid` hook
- `useMemberPrepaidInfo` hook

### Phase 4: UI Components [8 hours]
- MemberPrepaidBalanceList
- MultiMemberPrepaidDialog
- Update RecurringExpenseCard
- Integration testing

### Phase 5: Instance Generation Integration [4 hours]
- Locate generation function
- Add consumption call
- End-to-end testing

### Phase 6: Testing & Validation [4 hours]
- Unit tests (SQL)
- Integration tests
- Edge case testing
- iCloud example verification

**Total Estimated Effort: 3-4 days**

## Key Features

✅ **Per-Member Balances** - Track separately for each member
✅ **Accumulation** - Same member can prepay multiple times
✅ **Multi-Member** - Select and prepay for multiple members at once
✅ **Auto-Consumption** - Automatic when instances generated
✅ **Audit Trail** - Complete consumption log
✅ **Partial Coverage** - Handle balance < monthly_share
✅ **Backwards Compatible** - Existing prepaid continues working

## Test Case: iCloud Subscription

```sql
-- Setup
Recurring: 200,000 VND/month
Members: A, B, C, D (50,000 each)

-- Action
Member A prepays 5 months
→ Creates payment: 250,000 VND
→ Balance: 250,000 VND (5 months)

-- Instance 1 Generated
→ Consume 50,000 from A's balance
→ A's split marked settled
→ Balance: 200,000 VND (4 months)

-- Instance 2-5
→ Same consumption each month
→ Balance decreases: 150k, 100k, 50k, 0

-- Instance 6
→ No prepaid left for A
→ A's split not auto-settled
→ Returns to normal payment
```

## Decisions Made

| Question | Decision | Rationale |
|----------|----------|-----------|
| Partial consumption? | YES | More user-friendly, mark as partially settled |
| Refunds on cancellation? | V1: No, V2: Yes | Simplify initial implementation |
| Handle split changes? | Use cached amount | Prevents recalculation issues |
| Multi-currency? | Enforce same as template | Simplify validation |

## Files Created

```
plans/260114-2232-prepaid-per-member-redesign/
├── plan.md (Main implementation plan)
├── research/
│   └── 01-current-implementation-analysis.md
├── reports/
│   └── 02-solution-architecture.md
└── SUMMARY.md (This file)
```

## Next Actions

1. ✅ Review plan (Complete)
2. → Begin Phase 1: Database schema
3. → Test each phase before proceeding
4. → Deploy to staging
5. → Production deployment

## Success Criteria

- [ ] iCloud test case passes end-to-end
- [ ] Multiple members can prepay simultaneously
- [ ] Same member can prepay multiple times (accumulates)
- [ ] Consumption automatic during instance generation
- [ ] Complete audit trail in logs
- [ ] UI displays per-member balances
- [ ] Multi-member dialog functional
- [ ] TypeScript compiles
- [ ] No regressions on existing functionality

## Risks & Mitigation

| Risk | Mitigation |
|------|-----------|
| Breaking existing prepaid | Backwards compatible design, keep old columns |
| Complex consumption logic | Comprehensive unit tests, SQL test suite |
| UI complexity | Phased rollout, feature flag option |
| Performance (many members) | Indexed properly, batch operations |

## Documentation

- SQL functions have inline comments
- TypeScript has TSDoc
- Will update `docs/features/recurring-expenses.md`
- Will update `docs/implementation-summary-jan-2026.md`

---

**Plan Status:** ✅ Complete and ready for implementation

**Estimated Timeline:** 3-4 days (28 hours)

**Complexity:** High - Database redesign, integration with existing system

**Priority:** High - Fixes fundamental limitation in prepaid system
