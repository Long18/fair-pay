# Solution Architecture: Per-Member Prepaid System

## Date: 2026-01-14
## Status: Design Phase

## Design Principles

- **YAGNI**: Only implement what's needed for per-member prepaid
- **KISS**: Simple balance tracking, straightforward consumption
- **DRY**: Reuse existing template split calculations

## Database Schema Design

### New Table: member_prepaid_balances

```sql
CREATE TABLE member_prepaid_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_expense_id UUID NOT NULL REFERENCES recurring_expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  balance_amount DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (balance_amount >= 0),
  monthly_share_amount DECIMAL(12, 2) NOT NULL CHECK (monthly_share_amount > 0),
  months_remaining INTEGER GENERATED ALWAYS AS (
    CASE
      WHEN monthly_share_amount > 0
      THEN FLOOR(balance_amount / monthly_share_amount)
      ELSE 0
    END
  ) STORED,
  currency VARCHAR(3) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(recurring_expense_id, user_id)
);

CREATE INDEX idx_member_prepaid_balances_recurring
  ON member_prepaid_balances(recurring_expense_id);
CREATE INDEX idx_member_prepaid_balances_user
  ON member_prepaid_balances(user_id);
CREATE INDEX idx_member_prepaid_balances_balance
  ON member_prepaid_balances(balance_amount)
  WHERE balance_amount > 0;
```

**Key Fields:**
- `balance_amount`: Current prepaid balance in currency units
- `monthly_share_amount`: Member's share per month from template (cached for performance)
- `months_remaining`: Computed column = floor(balance / monthly_share)
- `UNIQUE(recurring_expense_id, user_id)`: One balance per member per recurring

**Design Decisions:**
- Store monthly_share as denormalized field for performance
- Generated column for months_remaining (auto-calculated)
- Balance cannot go negative (CHECK constraint)

### Modified Table: recurring_prepaid_payments

```sql
ALTER TABLE recurring_prepaid_payments
  ADD COLUMN user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  ADD COLUMN paid_by_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Add index
CREATE INDEX idx_recurring_prepaid_payments_user
  ON recurring_prepaid_payments(user_id);
CREATE INDEX idx_recurring_prepaid_payments_paid_by
  ON recurring_prepaid_payments(paid_by_user_id);
```

**Key Changes:**
- `user_id`: Member who this prepaid is for
- `paid_by_user_id`: Member who made the payment (can be different)

**Backwards Compatibility:**
- Nullable columns (existing records remain valid)
- Existing prepaid_until on recurring_expenses remains (for compatibility)

### New Table: prepaid_consumption_log

```sql
CREATE TABLE prepaid_consumption_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_expense_id UUID NOT NULL REFERENCES recurring_expenses(id) ON DELETE CASCADE,
  expense_instance_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount_consumed DECIMAL(12, 2) NOT NULL CHECK (amount_consumed > 0),
  balance_before DECIMAL(12, 2) NOT NULL,
  balance_after DECIMAL(12, 2) NOT NULL,
  consumed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT valid_balance_deduction CHECK (balance_after = balance_before - amount_consumed)
);

CREATE INDEX idx_prepaid_consumption_recurring
  ON prepaid_consumption_log(recurring_expense_id);
CREATE INDEX idx_prepaid_consumption_instance
  ON prepaid_consumption_log(expense_instance_id);
CREATE INDEX idx_prepaid_consumption_user
  ON prepaid_consumption_log(user_id);
CREATE INDEX idx_prepaid_consumption_date
  ON prepaid_consumption_log(consumed_at DESC);
```

**Key Fields:**
- `expense_instance_id`: The recurring instance where prepaid was consumed
- `amount_consumed`: Amount deducted from balance
- `balance_before/after`: Audit trail

## SQL Functions Design

### 1. get_member_monthly_share

```sql
CREATE OR REPLACE FUNCTION get_member_monthly_share(
  p_recurring_expense_id UUID,
  p_user_id UUID
)
RETURNS DECIMAL(12, 2)
```

**Purpose:** Calculate member's monthly share from template splits

**Logic:**
1. Get template_expense_id from recurring_expenses
2. Query expense_splits for user_id
3. Return computed_amount
4. Return 0 if member not in splits

**Returns:** Member's monthly share amount

### 2. record_member_prepaid

```sql
CREATE OR REPLACE FUNCTION record_member_prepaid(
  p_recurring_expense_id UUID,
  p_user_id UUID,
  p_months INTEGER,
  p_paid_by_user_id UUID DEFAULT NULL
)
RETURNS JSONB
```

**Purpose:** Record prepaid for a single member

**Logic:**
1. Get member's monthly_share using get_member_monthly_share()
2. Calculate amount = monthly_share * p_months
3. Create expense record (amount, paid_by = p_paid_by_user_id)
4. Create prepaid_payment record (with user_id)
5. UPSERT member_prepaid_balances:
   - If exists: balance += amount
   - If not exists: INSERT new record
6. Return payment_id, amount, balance

**Returns:**
```json
{
  "success": true,
  "payment_id": "uuid",
  "user_id": "uuid",
  "months": 5,
  "amount": 250000,
  "new_balance": 250000,
  "monthly_share": 50000
}
```

### 3. record_multi_member_prepaid

```sql
CREATE OR REPLACE FUNCTION record_multi_member_prepaid(
  p_recurring_expense_id UUID,
  p_member_months JSONB, -- [{"user_id": "uuid", "months": 5}, ...]
  p_paid_by_user_id UUID DEFAULT NULL
)
RETURNS JSONB
```

**Purpose:** Record prepaid for multiple members in one transaction

**Logic:**
1. Parse p_member_months array
2. For each member:
   - Call record_member_prepaid()
   - Accumulate results
3. Return array of results

**Returns:**
```json
{
  "success": true,
  "payments": [
    {"user_id": "uuid1", "amount": 250000, "months": 5},
    {"user_id": "uuid2", "amount": 100000, "months": 2}
  ],
  "total_amount": 350000
}
```

### 4. consume_prepaid_for_instance

```sql
CREATE OR REPLACE FUNCTION consume_prepaid_for_instance(
  p_expense_instance_id UUID
)
RETURNS JSONB
```

**Purpose:** Automatically consume prepaid when recurring instance created

**Logic:**
1. Get recurring_expense_id from expense instance
2. Get all expense_splits for this instance
3. For each split:
   - Check if member has prepaid balance
   - If balance >= split.computed_amount:
     - Mark split as is_settled = true, settled_amount = computed_amount
     - Deduct from balance
     - Log consumption
   - Else if balance > 0 and < computed_amount (partial):
     - Mark split as is_settled = false, settled_amount = balance
     - Set balance = 0
     - Log consumption
4. Return summary

**Returns:**
```json
{
  "success": true,
  "instance_id": "uuid",
  "consumptions": [
    {"user_id": "uuid", "amount": 50000, "fully_covered": true}
  ],
  "total_consumed": 50000
}
```

### 5. get_member_prepaid_info

```sql
CREATE OR REPLACE FUNCTION get_member_prepaid_info(
  p_recurring_expense_id UUID,
  p_user_id UUID
)
RETURNS TABLE (
  balance_amount DECIMAL(12, 2),
  monthly_share DECIMAL(12, 2),
  months_remaining INTEGER,
  currency VARCHAR(3),
  payment_history JSONB
)
```

**Purpose:** Get comprehensive prepaid info for a member

**Logic:**
1. Get balance from member_prepaid_balances
2. Get payment history from recurring_prepaid_payments WHERE user_id
3. Return combined data

### 6. get_all_members_prepaid_info

```sql
CREATE OR REPLACE FUNCTION get_all_members_prepaid_info(
  p_recurring_expense_id UUID
)
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  balance_amount DECIMAL(12, 2),
  monthly_share DECIMAL(12, 2),
  months_remaining INTEGER,
  currency VARCHAR(3),
  total_prepaid DECIMAL(12, 2),
  payment_count INTEGER
)
```

**Purpose:** Get prepaid info for all members in a recurring expense

**Logic:**
1. Get all members from template expense splits
2. LEFT JOIN with member_prepaid_balances
3. Aggregate payment history
4. Return complete member list with prepaid info

## Consumption Integration

### Integration Point: Recurring Instance Generation

**Current System:** (Need to locate)
- Likely has a cron job or scheduled function
- Creates expense instances based on next_occurrence
- Copies template expense and splits

**Required Changes:**
1. After creating instance expense and splits
2. Call: `consume_prepaid_for_instance(new_instance_id)`
3. Prepaid consumption happens automatically
4. No UI changes needed for consumption (automatic)

**Pseudocode:**
```sql
-- Existing instance creation
INSERT INTO expenses (...)
SELECT ... FROM expenses WHERE id = template_expense_id
RETURNING id INTO v_instance_id;

INSERT INTO expense_splits (...)
SELECT ... FROM expense_splits WHERE expense_id = template_expense_id;

-- NEW: Consume prepaid
SELECT consume_prepaid_for_instance(v_instance_id);
```

## Frontend Components Design

### 1. MemberPrepaidBalanceList Component

**Purpose:** Display prepaid balance for each member

**Props:**
- `recurringExpenseId: string`
- `members: Member[]`

**Data:** Fetch from `get_all_members_prepaid_info()`

**UI:**
```
┌─────────────────────────────────────┐
│ Member Prepaid Balances             │
├─────────────────────────────────────┤
│ Member A          ✓ 5 months        │
│ Balance: 250,000 VND                │
│ Monthly: 50,000 VND                 │
├─────────────────────────────────────┤
│ Member B          - No prepaid      │
│ Monthly: 50,000 VND                 │
├─────────────────────────────────────┤
│ Member C          ⚠ 1 month         │
│ Balance: 50,000 VND                 │
│ Monthly: 50,000 VND                 │
└─────────────────────────────────────┘
```

### 2. MultiMemberPrepaidDialog Component

**Purpose:** Record prepaid for one or multiple members

**Props:**
- `recurringExpenseId: string`
- `members: Member[]`
- `open: boolean`
- `onOpenChange: (open: boolean) => void`

**UI Flow:**
1. Select members (checkboxes)
2. For each selected member:
   - Input months to prepay
   - Show calculated amount (monthly_share * months)
3. Show total amount
4. Select who pays (paid_by)
5. Submit

**Form State:**
```typescript
interface MemberPrepaidInput {
  user_id: string;
  months: number;
  calculated_amount: number;
  monthly_share: number;
}

const [selectedMembers, setSelectedMembers] = useState<MemberPrepaidInput[]>([]);
const [paidBy, setPaidBy] = useState<string>("");
```

### 3. MemberPrepaidHistory Component

**Purpose:** Show prepaid payment history per member

**Props:**
- `recurringExpenseId: string`
- `userId: string`

**Data:** Fetch from `recurring_prepaid_payments` WHERE user_id

**UI:**
```
┌─────────────────────────────────────┐
│ Prepaid History - Member A          │
├─────────────────────────────────────┤
│ Jan 10, 2026    5 months            │
│ 250,000 VND                         │
│ Coverage: Jan-May 2026              │
├─────────────────────────────────────┤
│ Dec 15, 2025    3 months            │
│ 150,000 VND                         │
│ Coverage: Dec-Feb 2026              │
└─────────────────────────────────────┘
```

### 4. MemberConsumptionLog Component

**Purpose:** Show prepaid consumption audit trail

**Props:**
- `recurringExpenseId: string`
- `userId?: string` (optional, all members if not provided)

**Data:** Fetch from `prepaid_consumption_log`

**UI:**
```
┌─────────────────────────────────────┐
│ Consumption Log                     │
├─────────────────────────────────────┤
│ Feb 2026 Instance                   │
│ Member A: 50,000 VND consumed       │
│ Balance: 200,000 → 150,000 VND      │
├─────────────────────────────────────┤
│ Jan 2026 Instance                   │
│ Member A: 50,000 VND consumed       │
│ Balance: 250,000 → 200,000 VND      │
└─────────────────────────────────────┘
```

### 5. Integration into RecurringExpenseCard

**Location:** `recurring-expense-card.tsx`

**Changes:**
1. Add badge showing "X members prepaid"
2. Add collapsible section for member balances
3. Replace current PrepaidPaymentDialog with MultiMemberPrepaidDialog

**UI Mockup:**
```
┌─────────────────────────────────────────┐
│ 💰 iCloud Subscription      [●●●]       │
│ 200,000 VND / month                     │
│ [Monthly] [Active] [1 member prepaid]   │
├─────────────────────────────────────────┤
│ ▼ Member Prepaid Balances               │
│   Member A: 5 months (250,000 VND)      │
│   Member B: No prepaid                  │
│   Member C: No prepaid                  │
│   Member D: No prepaid                  │
│                                         │
│   [+ Add Prepaid for Members]           │
└─────────────────────────────────────────┘
```

## TypeScript Types

```typescript
// Member prepaid balance
interface MemberPrepaidBalance {
  id: string;
  recurring_expense_id: string;
  user_id: string;
  balance_amount: number;
  monthly_share_amount: number;
  months_remaining: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

// Prepaid consumption log entry
interface PrepaidConsumptionLog {
  id: string;
  recurring_expense_id: string;
  expense_instance_id: string;
  user_id: string;
  amount_consumed: number;
  balance_before: number;
  balance_after: number;
  consumed_at: string;
}

// Member prepaid info (comprehensive)
interface MemberPrepaidInfo {
  user_id: string;
  user_name: string;
  balance_amount: number;
  monthly_share: number;
  months_remaining: number;
  currency: string;
  payment_history: PrepaidPaymentRecord[];
}

// Multi-member prepaid input
interface MemberPrepaidInput {
  user_id: string;
  months: number;
}

// Multi-member prepaid result
interface MultiMemberPrepaidResult {
  success: boolean;
  payments: Array<{
    user_id: string;
    amount: number;
    months: number;
    new_balance: number;
  }>;
  total_amount: number;
}
```

## Migration Strategy

### Phase 1: Schema Changes (Non-Breaking)
1. Create member_prepaid_balances table
2. Create prepaid_consumption_log table
3. Add user_id, paid_by_user_id to recurring_prepaid_payments
4. Keep existing prepaid_until on recurring_expenses

**Impact:** No breaking changes, existing code continues to work

### Phase 2: SQL Functions (Additive)
1. Create get_member_monthly_share()
2. Create record_member_prepaid()
3. Create record_multi_member_prepaid()
4. Create consume_prepaid_for_instance()
5. Create get_member_prepaid_info()
6. Create get_all_members_prepaid_info()
7. Keep existing record_prepaid_payment() for backwards compatibility

**Impact:** New functions added, old functions remain

### Phase 3: Data Migration (Optional)
1. For existing prepaid_payments without user_id:
   - Set user_id = NULL (represents all members)
   - OR distribute evenly across members
   - Decision: Skip migration, only new prepaid uses per-member

**Impact:** Existing prepaid remains at expense level

### Phase 4: Frontend Changes
1. Create new components (MemberPrepaidBalanceList, etc.)
2. Update RecurringExpenseCard to show member balances
3. Replace PrepaidPaymentDialog with MultiMemberPrepaidDialog
4. Keep old components for backwards compatibility initially

**Impact:** New UI, old UI remains functional

### Phase 5: Consumption Integration
1. Locate recurring instance generation function
2. Add consume_prepaid_for_instance() call
3. Test with iCloud example

**Impact:** Automatic prepaid consumption starts working

## Test Case Implementation: iCloud Example

### Setup
```sql
-- 1. Create recurring expense (200k/month, 4 members)
-- (Assume already exists with template_expense_id)

-- 2. Verify template splits
SELECT user_id, computed_amount
FROM expense_splits
WHERE expense_id = <template_id>;
-- Expect: 4 rows, each with 50,000 VND

-- 3. Member A prepays 5 months
SELECT record_member_prepaid(
  p_recurring_expense_id := <recurring_id>,
  p_user_id := <member_a_id>,
  p_months := 5,
  p_paid_by_user_id := <member_a_id>
);
-- Expect: amount = 250,000 VND, balance = 250,000

-- 4. Verify balance
SELECT * FROM member_prepaid_balances
WHERE recurring_expense_id = <recurring_id>
  AND user_id = <member_a_id>;
-- Expect: balance_amount = 250,000, months_remaining = 5
```

### Month 1 Instance
```sql
-- Generate instance (via scheduled job)
-- ... instance creation logic ...
-- Returns: instance_id

-- Consume prepaid
SELECT consume_prepaid_for_instance(instance_id);

-- Verify Member A's split marked paid
SELECT is_settled, settled_amount
FROM expense_splits
WHERE expense_id = instance_id AND user_id = <member_a_id>;
-- Expect: is_settled = true, settled_amount = 50,000

-- Verify balance reduced
SELECT balance_amount, months_remaining
FROM member_prepaid_balances
WHERE recurring_expense_id = <recurring_id>
  AND user_id = <member_a_id>;
-- Expect: balance_amount = 200,000, months_remaining = 4

-- Verify consumption log
SELECT * FROM prepaid_consumption_log
WHERE expense_instance_id = instance_id AND user_id = <member_a_id>;
-- Expect: amount_consumed = 50,000, balance_before = 250,000, balance_after = 200,000
```

### Month 5 Instance
```sql
-- After 5 months, balance should be 0
SELECT balance_amount, months_remaining
FROM member_prepaid_balances
WHERE recurring_expense_id = <recurring_id>
  AND user_id = <member_a_id>;
-- Expect: balance_amount = 0, months_remaining = 0
```

### Month 6 Instance
```sql
-- No prepaid left, normal payment
SELECT is_settled, settled_amount
FROM expense_splits
WHERE expense_id = instance_id AND user_id = <member_a_id>;
-- Expect: is_settled = false, settled_amount = 0
```

## Unresolved Questions - Decisions

1. **Partial Consumption:** Allow balance < monthly_share to partially cover
   - **Decision:** YES - More user-friendly
   - **Implementation:** Mark split as partially settled

2. **Refunds:** If recurring cancelled mid-prepaid
   - **Decision:** V1 - No automatic refund, just show remaining balance
   - **V2:** Add manual refund function

3. **Split Changes:** If template splits change after prepaid
   - **Decision:** Use original monthly_share_amount from balance table
   - **Reason:** Cached value prevents recalculation issues

4. **Currency:** Multi-currency support
   - **Decision:** Enforce same currency as template
   - **Validation:** Check currency matches before recording

## Success Metrics

1. iCloud test case passes end-to-end
2. Multiple members can prepay simultaneously
3. Same member can prepay multiple times (accumulates)
4. Consumption happens automatically
5. Audit trail complete
6. UI shows per-member balances
7. No regression on existing prepaid (backward compatible)

## Next: Implementation Plan

See `plan.md` for step-by-step implementation phases.
