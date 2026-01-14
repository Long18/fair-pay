# Current Prepaid Implementation Analysis

## Date: 2026-01-14
## Status: Research Phase

## Current Architecture

### Database Schema

**recurring_expenses table:**
- `prepaid_until`: DATE - Single date for entire expense
- `last_prepaid_at`: TIMESTAMPTZ - Last prepaid timestamp

**recurring_prepaid_payments table:**
- `id`: UUID (PK)
- `recurring_expense_id`: UUID (FK)
- `payment_date`: DATE
- `periods_covered`: INTEGER
- `amount`: DECIMAL(12,2)
- `coverage_from`: DATE
- `coverage_to`: DATE
- `expense_id`: UUID (FK to expenses)
- `created_by`: UUID
- `created_at`: TIMESTAMPTZ

**Key Issue:** No `user_id` field - tracks prepaid for entire expense, not per-member

### SQL Functions

**calculate_prepaid_until()**
- Input: start_date, periods_count, frequency, interval
- Output: DATE
- Handles month-end edge cases
- Works at expense level, not member level

**record_prepaid_payment()**
- Input: recurring_expense_id, periods_count, amount
- Creates single expense record for full prepaid amount
- Copies ALL splits from template
- Updates single prepaid_until for entire expense
- No per-member balance tracking

**get_prepaid_payment_history()**
- Returns all prepaid payments for a recurring expense
- No member-specific filtering

### Frontend Components

**PrepaidPaymentForm**
- Single amount calculation: `periodAmount * periodsCount`
- Uses template expense amount (total, not per-member)
- No member selection for partial prepay
- Payer selection, but amount is total

**PrepaidStatusBadge**
- Shows status: active, expiring_soon, expired
- Based on single prepaid_until date

**PrepaidPaymentHistory**
- Lists all prepaid payments
- No member breakdown

## Critical Gaps

### 1. Data Model
- ❌ No per-member balance tracking
- ❌ No member-specific prepaid amounts
- ❌ Cannot handle "Member A prepays 5 months" scenario
- ❌ No accumulation support for same member

### 2. Calculation Logic
- ❌ Calculates total expense amount, not per-member share
- ❌ No function to get member's monthly share from template splits
- ❌ Cannot determine which member has paid what

### 3. Consumption Logic
- ❌ No automatic consumption when generating instances
- ❌ No tracking of which member's prepaid was consumed
- ❌ No integration with recurring instance generation

### 4. UI/UX
- ❌ No member-specific prepaid display
- ❌ Cannot select specific members to prepay
- ❌ No visualization of per-member balances
- ✅ Already in group recurring detail (good)

## Test Case Analysis: iCloud Example

**Scenario:**
- Recurring: 200,000 VND/month
- 4 members, each owes 50,000 VND/month
- Member A wants to prepay 5 months

**Current System Behavior:**
- Would create prepaid for 200,000 * 5 = 1,000,000 VND (WRONG)
- Would mark entire expense prepaid for 5 months (WRONG)
- Cannot track that only Member A prepaid (WRONG)

**Required Behavior:**
- Create prepaid for 50,000 * 5 = 250,000 VND (Member A's share only)
- Track Member A's balance: 250,000 VND = 5 months
- When instances generated:
  - Month 1: Member A's split marked paid, balance = 200,000 VND (4 months)
  - Month 2: Member A's split marked paid, balance = 150,000 VND (3 months)
  - ...
  - Month 5: Member A's split marked paid, balance = 0 VND (0 months)
  - Month 6: Member A returns to normal payment

## Architectural Requirements for Redesign

### Must Have:
1. Per-member prepaid balance table
2. Function to calculate member's monthly share from template splits
3. Multi-member prepaid creation support
4. Accumulation support (same member, multiple prepays)
5. Automatic consumption during instance generation
6. Consumption audit trail
7. UI to display per-member balances

### Nice to Have:
1. Partial consumption support (balance < monthly_share)
2. Refund mechanism for cancelled recurring
3. Handle split changes after prepaid recorded
4. Visual charts/graphs for prepaid status

## Integration Points

### 1. Template Expense Splits (Source of Truth)
```sql
SELECT
  es.user_id,
  es.computed_amount as monthly_share
FROM expense_splits es
WHERE es.expense_id = <template_expense_id>
```

### 2. Recurring Instance Generation
- Location: TBD (need to find where instances are created)
- Must call: consume_prepaid_for_instance(instance_id)
- Must mark splits as settled for members with prepaid

### 3. Expense Creation
- Creates prepaid payment expense
- Amount = member_monthly_share * months
- Only for members who are prepaying

### 4. Group/Friendship Members
- Source: group_members or friendships table
- Used to: list available members for prepaid selection

## Unresolved Questions

1. **Partial Consumption:** If member has 45,000 VND balance but monthly_share is 50,000 VND:
   - Option A: Allow partial (mark 45k paid, 5k still owed)
   - Option B: Require exact multiples (don't consume if balance < share)
   - **Recommendation:** Option A (more flexible)

2. **Refunds:** If recurring cancelled mid-prepaid:
   - Should remaining balance be refunded?
   - Create negative expense?
   - Just mark as void?
   - **Recommendation:** Mark as void initially, add refund in future

3. **Split Changes:** If template splits change after prepaid:
   - Use original monthly_share amount?
   - Recalculate months_remaining based on new share?
   - **Recommendation:** Use original amount, document in consumption log

4. **Currency:** Multi-currency support?
   - Assume same currency as template expense
   - Validate during prepaid creation
   - **Recommendation:** Enforce same currency

## Next Steps

1. Design new database schema
2. Design SQL functions
3. Design consumption logic
4. Design UI components
5. Create migration strategy
6. Write implementation plan
