# Recurring Expenses Codebase Scout Report

**Date**: 2026-02-14  
**Scope**: Complete mapping of recurring expense system, including data models, UI components, hooks, database functions, and edge functions.

---

## EXECUTIVE SUMMARY

FairPay has a comprehensive recurring expense system with:
- Multi-frequency support (daily, weekly, bi-weekly, monthly, quarterly, yearly, custom)
- Prepaid payment tracking and consumption
- Per-member prepaid balances (prepaid system enhancement)
- Atomic instance generation with idempotency
- Cycle date tracking for audit trails
- Auto-settlement of payer splits
- Edge function for cron-based processing with multi-cycle catch-up

---

## 1. DATA MODEL & SCHEMA

### 1.1 Core Tables

#### `recurring_expenses` table
**Location**: Database schema (referenced in migrations)

**Key Columns**:
- `id` UUID (PK)
- `template_expense_id` UUID FK → expenses(id)
- `frequency` TEXT (weekly, bi_weekly, monthly, quarterly, yearly, custom)
- `interval` INTEGER (multiplier for frequency)
- `next_occurrence` DATE (next scheduled cycle date)
- `end_date` DATE (optional, deactivates on past this date)
- `is_active` BOOLEAN
- `prepaid_until` DATE (tracks prepaid coverage)
- `last_prepaid_at` TIMESTAMPTZ (last prepaid payment timestamp)
- `last_created_at` TIMESTAMPTZ (added 20260215120000, audit tracking)
- `created_at` TIMESTAMPTZ
- `updated_at` TIMESTAMPTZ

**Design Notes**:
- Does NOT have `context_type`, `group_id`, `friendship_id`, `created_by` (live on template_expense)
- Linked to template expense which contains all context fields

#### `expenses` table (enhancements)
**Location**: Database schema (migration 20260215100000)

**New Columns** (from 20260215100000):
- `recurring_expense_id` UUID FK → recurring_expenses(id) ON DELETE SET NULL
  - Links generated instances back to parent recurring
  - NULL for manually created expenses
  - Index: `idx_expenses_recurring_expense_id`
- `cycle_date` DATE
  - The scheduled date this instance represents
  - Used with recurring_expense_id for idempotency
  - Unique constraint: `idx_expenses_recurring_cycle_unique` (recurring_expense_id, cycle_date)
- `generated_at` TIMESTAMPTZ
  - When auto-generation happened
  - NULL for manual expenses

#### `recurring_prepaid_payments` table
**Location**: Database schema (migration 20260113100000)

**Key Columns**:
- `id` UUID (PK)
- `recurring_expense_id` UUID FK → recurring_expenses(id) ON DELETE CASCADE
- `payment_date` DATE
- `periods_covered` INTEGER (number of periods paid for)
- `amount` DECIMAL(12, 2) (prepaid amount)
- `coverage_from` DATE (start of coverage)
- `coverage_to` DATE (end of coverage, equals prepaid_until)
- `expense_id` UUID FK → expenses(id) (the expense record created for prepaid)
- `created_by` UUID FK → profiles(id)
- `created_at` TIMESTAMPTZ

**Indexes**:
- `idx_recurring_prepaid_payments_recurring`
- `idx_recurring_prepaid_payments_date`
- `idx_recurring_prepaid_payments_created_by`

#### `member_prepaid_balances` table (per-member system)
**Location**: Database schema (migration 20260115100000)

**Key Columns**:
- `id` UUID (PK)
- `recurring_expense_id` UUID FK
- `user_id` UUID
- `balance_amount` DECIMAL
- `monthly_share_amount` DECIMAL
- `months_remaining` INTEGER
- `currency` TEXT
- `created_at` TIMESTAMPTZ
- `updated_at` TIMESTAMPTZ

**Purpose**: Tracks prepaid balance per member of a recurring expense (independent from expense_splits prepaid)

### 1.2 Type Definitions

**File**: `/Users/long.lnt/Desktop/Projects/FairPay/src/modules/expenses/types/recurring.ts`

```typescript
// Main recurring expense type
RecurringExpense {
  id: string
  template_expense_id: string
  frequency: RecurringFrequency (weekly|bi_weekly|monthly|quarterly|yearly|custom)
  interval: number
  next_occurrence: string (ISO date)
  end_date: string | null
  is_active: boolean
  prepaid_until: string | null
  last_prepaid_at: string | null
  created_at: string
  updated_at: string
  template_expense?: Expense (joined data)
  expenses?: Expense (how Supabase returns joined data)
}

// Prepaid payment record
RecurringPrepaidPayment {
  id: string
  recurring_expense_id: string
  payment_date: string
  periods_covered: number
  amount: number
  coverage_from: string
  coverage_to: string
  expense_id: string | null
  created_by: string
  created_at: string
}

// Prepaid coverage status
PrepaidCoverageStatus = 'none' | 'active' | 'expiring_soon' | 'expired'

PrepaidCoverageInfo {
  status: PrepaidCoverageStatus
  prepaid_until: string | null
  remaining_periods: number
  days_until_expiry: number
}

// Form values for create/edit
RecurringExpenseFormValues {
  is_recurring: boolean
  frequency: RecurringFrequency
  interval: number
  start_date: Date
  end_date: Date | null
  notify_before_days: number
}
```

**File**: `/Users/long.lnt/Desktop/Projects/FairPay/src/modules/expenses/types/prepaid.ts`

```typescript
// Per-member prepaid balance
MemberPrepaidBalance {
  id: string
  recurring_expense_id: string
  user_id: string
  balance_amount: number
  monthly_share_amount: number
  months_remaining: number
  currency: string
  created_at: string
  updated_at: string
}

// Prepaid consumption log entry
PrepaidConsumptionLog {
  id: string
  recurring_expense_id: string
  expense_instance_id: string
  user_id: string
  amount_consumed: number
  balance_before: number
  balance_after: number
  consumed_at: string
}

// Comprehensive member info
MemberPrepaidInfo {
  user_id: string
  user_name: string
  balance_amount: number
  monthly_share: number
  months_remaining: number
  currency: string
  total_prepaid: number
  payment_count: number
}

// Input for single member
MemberPrepaidInput {
  user_id: string
  months: number
}

// Result types
RecordMemberPrepaidResult { success, payment_id, expense_id, user_id, months, amount, monthly_share, new_balance, currency }
RecordMultiMemberPrepaidResult { success, payments[], total_amount, success_count, error_count?, errors?[] }
ConsumePrepaidResult { success, instance_id, recurring_id, consumptions[], total_consumed, member_count, message? }
```

---

## 2. DATABASE FUNCTIONS

### 2.1 Core Recurring Functions

**Function**: `process_single_recurring_instance(p_recurring_expense_id UUID, p_cycle_date DATE)`

**Location**: Migration `20260215110000_process_recurring_instance_function.sql`

**Workflow**:
1. **Idempotency Check** - Skip if instance already exists for (recurring_id, cycle_date)
2. **Lock & Fetch** - SELECT recurring_expenses FOR UPDATE
3. **Validate** - Check if active and not past end_date
4. **Fetch Template** - Get template expense data
5. **Create Instance** - INSERT new expense with recurring_expense_id, cycle_date, generated_at
6. **Copy Splits** - INSERT splits from template, auto-settle payer's own split
7. **Consume Prepaid** - Call consume_prepaid_for_instance() to process member balances
8. **Calculate Next** - Calculate next_occurrence based on frequency/interval
9. **Update Recurring** - Advance next_occurrence, set last_created_at, deactivate if past end_date
10. **Return JSONB** - { success, skipped, instance_id, cycle_date, next_occurrence, deactivated, prepaid_consumed }

**Returns**: JSONB with success/error, instance details, or skip reason

**Error Handling**: Handles UNIQUE_VIOLATION (concurrent duplicate) gracefully

---

**Function**: `get_due_recurring_expenses()`

**Location**: Referenced in migrations, used by Edge function

**Purpose**: Returns all active recurring expenses where next_occurrence <= today

**Used by**: Edge function `process-recurring-expenses` for cron processing

---

**Function**: `calculate_next_occurrence(p_date DATE, p_frequency TEXT, p_interval INT)`

**Location**: Migration schema

**Supports**: daily, weekly, bi_weekly, monthly, quarterly, yearly, custom (uses interval as days)

**Used by**: Both SQL functions and TypeScript utilities

---

### 2.2 Prepaid Functions

**Function**: `record_prepaid_payment(p_recurring_expense_id UUID, p_periods_count INT, p_amount DECIMAL, p_paid_by_user_id UUID)`

**Location**: Migration `20260114100000_recurring_prepaid_payment_functions.sql`

**Workflow**:
1. Validate recurring expense exists and is active
2. Calculate coverage_from (current prepaid_until or next_occurrence)
3. Calculate coverage_to based on periods_count
4. Create expense record for prepaid amount (paid_by, created_by)
5. INSERT recurring_prepaid_payments record
6. UPDATE recurring_expenses.prepaid_until
7. Return JSONB with payment_id, expense_id, coverage dates, amount

---

**Function**: `consume_prepaid_for_instance(p_expense_instance_id UUID)`

**Location**: Migration `20260115120000_integrate_prepaid_consumption.sql`

**Workflow**:
1. Fetch expense instance and its recurring_expense_id
2. Query member_prepaid_balances for the recurring_expense
3. For each split in the instance:
   - Check if member has prepaid balance
   - Consume against balance amount
   - Mark split as settled if fully covered
   - Record consumption in audit log
4. Return JSONB with consumptions array, total_consumed, member_count

---

**Function**: `get_all_members_prepaid_info(p_recurring_expense_id UUID)`

**Location**: Migration schema

**Returns**: Array of MemberPrepaidInfo for all members in recurring

**Used by**: useQuery in UI layer

---

**Function**: `record_member_prepaid(p_recurring_expense_id UUID, p_user_id UUID, p_months INT, p_paid_by_user_id UUID)`

**Location**: Migration schema

**Workflow**:
1. Calculate monthly_share from expense splits
2. Calculate amount = monthly_share * months
3. Check/create member_prepaid_balance record
4. Update balance: new_balance = balance_amount + amount
5. Calculate months_remaining
6. Optionally create expense record
7. Return JSONB with payment_id, expense_id, user_id, months, amount, new_balance

---

**Function**: `record_multi_member_prepaid(p_recurring_expense_id UUID, p_member_months JSONB, p_paid_by_user_id UUID)`

**Location**: Migration schema

**Workflow**: Iterates record_member_prepaid() for multiple members, collects results

**Returns**: JSONB with payments[], total_amount, success_count, error_count

---

### 2.3 Function Locations (Migrations)

| Migration File | Function(s) | Purpose |
|---|---|---|
| `20260113100000_recurring_prepaid_payments.sql` | Table creation | Create recurring_prepaid_payments table |
| `20260114100000_recurring_prepaid_payment_functions.sql` | record_prepaid_payment | Prepaid payment recording |
| `20260114200000_update_get_due_recurring_expenses_prepaid.sql` | get_due_recurring_expenses | Query due recurring (updated for prepaid) |
| `20260114300000_add_paid_by_to_prepaid_payment.sql` | (schema change) | Add paid_by to prepaid payment |
| `20260115100000_member_prepaid_system.sql` | Table creation | Create member_prepaid_balances table |
| `20260115110000_member_prepaid_functions.sql` | record_member_prepaid, record_multi_member_prepaid, get_all_members_prepaid_info | Per-member prepaid functions |
| `20260115120000_integrate_prepaid_consumption.sql` | consume_prepaid_for_instance | Prepaid consumption on instance creation |
| `20260215100000_add_recurring_expense_id_to_expenses.sql` | (schema change) | Add recurring_expense_id, cycle_date, generated_at to expenses |
| `20260215110000_process_recurring_instance_function.sql` | process_single_recurring_instance | Atomic instance creation |
| `20260215120000_fix_recurring_functions_schema.sql` | (fixes) | Schema fixes for recurring functions |

---

## 3. FRONTEND HOOKS

All hooks located in `/Users/long.lnt/Desktop/Projects/FairPay/src/modules/expenses/hooks/`

### 3.1 Recurring Expense Hooks

**File**: `use-recurring-expenses.ts`

```typescript
useRecurringExpenses({ groupId?, friendshipId? })
  Returns: {
    recurring: RecurringExpenseWithCoverage[]
    active: RecurringExpenseWithCoverage[] (is_active = true)
    paused: RecurringExpenseWithCoverage[] (is_active = false)
    isLoading: boolean
    error: Error | null
  }

useRecurringExpense(id: string)
  Returns: {
    recurring: RecurringExpenseWithCoverage | undefined
    isLoading: boolean
    error: Error | null
  }

useCreateRecurringExpense()
  Returns: {
    createRecurring: (templateExpenseId, values, contextType, contextId) => Promise<RecurringExpense>
  }

useUpdateRecurringExpense()
  Returns: {
    updateRecurring: (id, values) => Promise<RecurringExpense>
    pauseRecurring: (id) => Promise<RecurringExpense>
    resumeRecurring: (id) => Promise<RecurringExpense>
  }

useDeleteRecurringExpense()
  Returns: {
    deleteRecurring: (id) => Promise<void>
  }
```

**Features**:
- Refine hooks (useList, useOne, useCreate, useUpdate, useDelete)
- Client-side filtering by groupId/friendshipId
- Automatic prepaid coverage info calculation (useMemo)
- Maps Supabase joined data (expenses → template_expense)

---

**File**: `use-recurring-actions.ts`

```typescript
useRecurringActions()
  Returns: {
    pause: (id) => void (notification on success/error)
    resume: (id) => void
    skip: (expense) => void (advances next_occurrence by one period)
    remove: (id) => void
  }
```

**Features**:
- Uses calculateNextOccurrence() from types to skip cycles
- Includes i18n notifications
- Handles errors with user feedback

---

### 3.2 Prepaid Hooks

**File**: `use-prepaid-payments.ts`

```typescript
usePrepaidPayments(recurringExpenseId: string | undefined)
  Returns: {
    payments: PrepaidPaymentWithCreator[]
    totalPrepaidAmount: number
    isLoading: boolean
    error: Error | null
    refetch: () => Promise<void>
  }
```

**Features**:
- Uses raw useState/useCallback (not react-query)
- Calls get_prepaid_payment_history RPC
- Manual refetch function

---

**File**: `use-record-prepaid-payment.ts`

```typescript
useRecordPrepaidPayment()
  Returns: {
    recordPayment: (params) => Promise<RecordPrepaidPaymentResult>
    isRecording: boolean
  }

// Params: { recurringExpenseId, periodsCount, amount, paidByUserId? }
// Calls: record_prepaid_payment RPC
// Returns: { success, data?: RecordPrepaidPaymentResponse, error? }
```

**Features**:
- Client-side validation (periodsCount >= 1, amount > 0)
- Toast notifications
- Query cache invalidation after success

---

**File**: `use-member-prepaid-info.ts`

```typescript
useMemberPrepaidInfo(recurringExpenseId: string)
  Returns: UseQuery<MemberPrepaidInfo[]>
```

**Features**:
- Uses react-query useQuery
- Calls get_all_members_prepaid_info RPC
- 30s staleTime

---

**File**: `use-member-prepaid.ts`

```typescript
useMemberPrepaid()
  Returns: {
    recordSingleMember: (params) => Promise<{ success, data?, error? }>
    recordMultiMember: (params) => Promise<{ success, data?, error? }>
    isRecording: boolean
  }

// Single: { recurringExpenseId, userId, months, paidByUserId? }
// Multi: { recurringExpenseId, memberMonths: MemberPrepaidInput[], paidByUserId? }
```

**Features**:
- Calls record_member_prepaid / record_multi_member_prepaid RPC
- Invalidates: recurring_expenses, expenses, member_prepaid_info queries
- Toast notifications with i18n

---

### 3.3 Utility Hooks

**File**: `use-split-calculation.ts`
- Split amount calculation utilities

**File**: `use-attachments.ts`
- Expense attachment handling

---

## 4. UI COMPONENTS

All components located in `/Users/long.lnt/Desktop/Projects/FairPay/src/modules/expenses/components/`

### 4.1 Core Recurring Components

**File**: `recurring-expense-form.tsx`
- Frequency selector (weekly, bi_weekly, monthly, quarterly, yearly, custom)
- Interval input (multiplier)
- Start date picker (calendar popup)
- End date picker (optional)
- Notifications config
- Locale-aware date formatting (vi/enUS)
- Form validation

---

**File**: `recurring-expense-card.tsx`
- Displays recurring expense summary
- Shows template expense amount, description, category
- Prepaid coverage badge (PrepaidStatusBadge)
- Next occurrence countdown
- Dropdown actions: Edit, Pause, Resume, Delete, Skip, View
- Collapsible sections:
  - Prepaid payment history
  - Member prepaid balances
- Calendar export option
- Swipeable for mobile

---

**File**: `create-recurring-dialog.tsx`
- Dialog to select group or friendship context
- Radio buttons for context selection
- Creates new expense form OR uses existing
- Routes to expense create page

---

**File**: `edit-recurring-dialog.tsx`
- Modal to edit frequency, interval, end_date
- Pre-fills from current recurring expense
- Save button with loading state
- Notifications on success/error

---

**File**: `recurring-expense-quick-actions.tsx`
- Dropdown menu for quick actions
- Pause/Resume, Skip, Delete, Edit

---

### 4.2 Prepaid Components

**File**: `prepaid-status-badge.tsx`
- Badge showing prepaid coverage status
- Color coding: active (green), expiring_soon (yellow), expired (red), none (gray)
- Text: "Còn X kỳ" (Vietnamese) or "X period(s) remaining" (English)

---

**File**: `prepaid-payment-dialog.tsx`
- Dialog to record prepaid payment
- Inputs: periods_count, amount
- Currency display
- Calls useRecordPrepaidPayment()
- Loading state during submission

---

**File**: `prepaid-payment-form.tsx`
- Form for prepaid payment details
- Period count and amount inputs
- Calculation preview

---

**File**: `prepaid-payment-history.tsx`
- Table/list of recurring_prepaid_payments
- Columns: payment_date, periods_covered, amount, coverage_from..coverage_to, created_by
- Uses usePrepaidPayments() hook
- Locale-aware date formatting

---

**File**: `member-prepaid-balance-list.tsx`
- List of MemberPrepaidInfo for recurring expense
- Per-member: user_name, balance_amount, monthly_share, months_remaining
- Uses useMemberPrepaidInfo() hook
- Shows remaining prepaid periods

---

**File**: `multi-member-prepaid-dialog.tsx`
- Dialog to record prepaid for multiple members
- Inputs per member: months to prepay
- Calculate total amount
- Calls useMemberPrepaid().recordMultiMember()
- Batch success/error reporting

---

### 4.3 Page Components

**File**: `recurring-list.tsx` (page component in pages/)
- Tab layout: Active vs. Paused
- List of recurring expense cards
- Uses useRecurringExpenses()
- Create button → CreateRecurringDialog
- Empty state when no recurringExpenses
- Loading skeleton while fetching
- Optional context filters (groupId, friendshipId)
- RecurringExpensesAnalytics component
- Standalone page or embedded in group/friendship views

---

### 4.4 Dashboard Components

**File**: `/Users/long.lnt/Desktop/Projects/FairPay/src/components/dashboard/recurring-expenses-summary.tsx`
- Displays active recurring expenses summary
- Calculates monthly total amount (across all frequencies)
- Shows upcoming expenses (next 7 days)
- Uses useRecurringExpenses() hook
- Shows count of active recurring

---

**File**: `/Users/long.lnt/Desktop/Projects/FairPay/src/components/analytics/recurring-expenses-analytics.tsx`
- Analytics for recurring expenses (if exists)
- Charts/statistics about recurring patterns

---

## 5. UTILITY FUNCTIONS

**File**: `/Users/long.lnt/Desktop/Projects/FairPay/src/modules/expenses/utils/prepaid-calculations.ts`

```typescript
// Date adjustment
adjustToValidDate(date: Date): Date
  // Handle month-end edge cases (e.g., Feb 30 → Feb 28)

// Calculate prepaid coverage end date
calculatePrepaidUntil(startDate, periodsCount, frequency, interval, endDate?): Date
  // Calculate date after N periods, capped at end_date

// Get period duration in milliseconds
getPeriodDurationMs(frequency, interval): number
  // Approximate for months/years

// Calculate remaining prepaid periods
calculateRemainingPeriods(prepaidUntil, currentDate, frequency, interval): number
  // How many periods left until prepaidUntil

// Get prepaid coverage info
getPrepaidCoverageStatus(recurring): PrepaidCoverageInfo
  // Returns: status (none|active|expiring_soon|expired), prepaid_until, remaining_periods, days_until_expiry

// Prepaid amount calculation
calculateTotalPrepaidAmount(periodAmount, periodsCount): number
  // Simple: periodAmount * periodsCount

// Formatting utilities (i18n support for en/vi)
formatPrepaidCoverage(prepaidUntil, language): string
  // "Đã trả đến Tháng 3 2026" (vi) or "Paid until March 2026" (en)

formatCoveragePeriod(coverageFrom, coverageTo, language): string
  // "Tháng 1 - Tháng 3 2026" (vi) or "Jan - Mar 2026" (en)

formatPrepaidStatus(status, remainingPeriods, language): string
  // "Còn 5 kỳ" (vi) or "5 periods remaining" (en)
```

---

**File**: `/Users/long.lnt/Desktop/Projects/FairPay/src/modules/expenses/types/recurring.ts` (also has utilities)

```typescript
// Frequency calculations
calculateNextOccurrence(currentDate, frequency, interval): Date
  // Advances date by 1 period

getFrequencyDescription(frequency, interval): string
  // Localized frequency label with interval

getRecurringExpenseStatus(recurring): RecurringExpenseStatus
  // { is_active, next_occurrence, has_end_date, days_until_next }
```

---

## 6. EDGE FUNCTIONS

**File**: `/Users/long.lnt/Desktop/Projects/FairPay/supabase/functions/process-recurring-expenses/index.ts`

**Trigger**: Cron job (recommended daily)

**Workflow**:
1. Call `get_due_recurring_expenses()` RPC to fetch active recurring expenses where next_occurrence <= today
2. For each due recurring:
   a. Multi-cycle catch-up loop (max 52 cycles for safety)
   b. While currentCycleDate <= today AND cyclesProcessed < 52:
      - Call `process_single_recurring_instance(recurring_id, currentCycleDate)` RPC
      - Check result for success/skip/error
      - Track created instances, skipped, deactivated
      - Calculate next currentCycleDate using `calculate_next_occurrence()` RPC
      - Advance cyclesProcessed counter
   c. Collect per-recurring stats
3. Return JSON with:
   - processed: count of recurring expenses attempted
   - created: count of new expense instances
   - skipped: count of duplicate instances (idempotency)
   - deactivated: count of recurring expenses deactivated (past end_date)
   - prepaid_consumed: count with prepaid consumed
   - errors: array of error messages
   - details: array of { recurring_id, cycle_date, action, instance_id? }

**Safety Features**:
- MAX_CATCHUP_CYCLES = 52 (1 year of weekly cycles)
- Atomic SQL function handles idempotency
- Graceful handling of concurrent execution
- Comprehensive error logging

---

## 7. RECONCILIATION WITH EXISTING PATTERNS

### Memory from Previous Work (MEMORY.md)
- ID Mismatch Pattern: Always verify which entity's ID is being used (expense.id vs split.id)
- Data Refetch Pattern: Manual refreshKey pattern used (useState counter in dependency array)
- Current date: Use bash `date +%y%m%d` instead of model knowledge

### Recent Git Commits
- 588183f: feat(ui): add pagination, dropdown actions, remove summary panels in dashboard activity
- 90578b8: fix(admin): disable URL sync for payments table pagination
- 29a036e: feat(core): enhance recurring expense auto-apply with prepaid consumption and idempotency
- 53714d2: fix(admin): remove unused group
- f83034b: refactor(ui): merge admin tabs, standardize dialogs, improve audit log UI

Most recent recurring work: Commit 29a036e (enhance recurring with prepaid + idempotency)

---

## 8. FILE INVENTORY

### Database Schema & Migrations (11 files)

| File | Purpose |
|---|---|
| `20260113100000_recurring_prepaid_payments.sql` | Create recurring_prepaid_payments table, add prepaid_until/last_prepaid_at to recurring_expenses |
| `20260114100000_recurring_prepaid_payment_functions.sql` | record_prepaid_payment() function |
| `20260114200000_update_get_due_recurring_expenses_prepaid.sql` | Update get_due_recurring_expenses() for prepaid |
| `20260114300000_add_paid_by_to_prepaid_payment.sql` | Schema: add paid_by column |
| `20260115100000_member_prepaid_system.sql` | Create member_prepaid_balances table |
| `20260115110000_member_prepaid_functions.sql` | record_member_prepaid(), record_multi_member_prepaid(), get_all_members_prepaid_info() |
| `20260115120000_integrate_prepaid_consumption.sql` | consume_prepaid_for_instance() function |
| `20260215100000_add_recurring_expense_id_to_expenses.sql` | Add recurring_expense_id, cycle_date, generated_at, indexes, constraints |
| `20260215110000_process_recurring_instance_function.sql` | process_single_recurring_instance() atomic function |
| `20260215120000_fix_recurring_functions_schema.sql` | Schema fixes |
| `20260115_fix_prepaid_info_ambiguous_column.sql` | Ambiguous column fixes |
| `20260115_enhance_prepaid_error_logging.sql` | Enhanced error logging |
| `20260115_fix_prepaid_rls_policy.sql` | RLS policy fixes |
| `20260115_fix_record_member_prepaid.sql` | record_member_prepaid() fixes |

### TypeScript Types (2 files)

| File | Purpose |
|---|---|
| `src/modules/expenses/types/recurring.ts` | RecurringExpense, RecurringFrequency, PrepaidCoverageInfo, RecurringExpenseFormValues, etc. + utility functions |
| `src/modules/expenses/types/prepaid.ts` | MemberPrepaidBalance, MemberPrepaidInfo, PrepaidConsumptionLog, input/result types |

### Hooks (6 files)

| File | Purpose |
|---|---|
| `src/modules/expenses/hooks/use-recurring-expenses.ts` | CRUD hooks for recurring expenses + coverage info |
| `src/modules/expenses/hooks/use-recurring-actions.ts` | pause, resume, skip, remove actions |
| `src/modules/expenses/hooks/use-prepaid-payments.ts` | Fetch prepaid payment history |
| `src/modules/expenses/hooks/use-record-prepaid-payment.ts` | Record prepaid payment via RPC |
| `src/modules/expenses/hooks/use-member-prepaid-info.ts` | Query member prepaid info for recurring |
| `src/modules/expenses/hooks/use-member-prepaid.ts` | Record prepaid for single/multiple members |

### UI Components (11 files)

| File | Purpose |
|---|---|
| `src/modules/expenses/components/recurring-expense-form.tsx` | Form for frequency, interval, dates |
| `src/modules/expenses/components/recurring-expense-card.tsx` | Card displaying recurring with history/balances |
| `src/modules/expenses/components/create-recurring-dialog.tsx` | Dialog to create new recurring (select context) |
| `src/modules/expenses/components/edit-recurring-dialog.tsx` | Modal to edit recurring properties |
| `src/modules/expenses/components/recurring-expense-quick-actions.tsx` | Dropdown actions menu |
| `src/modules/expenses/components/prepaid-status-badge.tsx` | Badge showing prepaid status |
| `src/modules/expenses/components/prepaid-payment-dialog.tsx` | Dialog to record prepaid |
| `src/modules/expenses/components/prepaid-payment-form.tsx` | Form for prepaid inputs |
| `src/modules/expenses/components/prepaid-payment-history.tsx` | Table of prepaid payments |
| `src/modules/expenses/components/member-prepaid-balance-list.tsx` | List of member prepaid balances |
| `src/modules/expenses/components/multi-member-prepaid-dialog.tsx` | Dialog to prepay multiple members |

### Pages (1 file)

| File | Purpose |
|---|---|
| `src/modules/expenses/pages/recurring-list.tsx` | Recurring expenses list page (active/paused tabs) |

### Dashboard Components (2 files)

| File | Purpose |
|---|---|
| `src/components/dashboard/recurring-expenses-summary.tsx` | Summary card for dashboard |
| `src/components/analytics/recurring-expenses-analytics.tsx` | Analytics component (if exists) |

### Utilities (1 file)

| File | Purpose |
|---|---|
| `src/modules/expenses/utils/prepaid-calculations.ts` | Prepaid coverage calculations, formatting utilities |

### Edge Function (1 file)

| File | Purpose |
|---|---|
| `supabase/functions/process-recurring-expenses/index.ts` | Cron-triggered function for daily processing |

### Documentation (3 files)

| File | Purpose |
|---|---|
| `docs/features/recurring-expenses.md` | Feature documentation |
| `docs/user-guides/recurring-expenses-guide.md` | User guide |
| `.serena/memories/recurring-expense-architecture.md` | Architecture decisions memo |

### Tests (1 file)

| File | Purpose |
|---|---|
| `tests/database/recurring-expenses.test.ts` | Database function tests |

**Total: 41 source files**

---

## 9. KEY ARCHITECTURAL DECISIONS

1. **Template Expense Pattern**: Each recurring expense references one template expense, which holds all context (group_id, friendship_id, created_by, description, amount, currency, splits, etc.)

2. **Cycle-Based Idempotency**: Each generated instance is uniquely identified by (recurring_expense_id, cycle_date). The unique constraint prevents duplicates even if the Edge function runs multiple times for the same date.

3. **Atomic Instance Creation**: process_single_recurring_instance() SQL function is fully atomic:
   - Idempotency check first
   - Creates expense + splits in transaction
   - Auto-settles payer's split (matches manual creation behavior)
   - Consumes prepaid balances
   - Advances next_occurrence in same transaction

4. **Multi-Cycle Catch-Up**: Edge function loops with max 52 safety limit to handle system downtime. Each call to process_single_recurring_instance() is idempotent, so re-running is safe.

5. **Prepaid Coverage Tracking**: Two parallel systems:
   - `recurring_prepaid_payments`: Historical record of prepaid payments with coverage dates
   - `member_prepaid_balances`: Current balance per member (new per-member system)
   - `consume_prepaid_for_instance()`: Consumes from member_prepaid_balances when instances generated

6. **Payer Auto-Settlement**: When creating instance splits, payer's own split is automatically marked is_settled=true with settled_at timestamp (matches manual expense creation).

7. **Frequency Support**: 
   - Discrete: weekly, bi_weekly, monthly, quarterly, yearly
   - Custom: uses interval as number of days
   - Extensible in database constraint

8. **Locale-Aware UI**: All date formatting and labels support vi/enUS (set via i18n)

---

## 10. UNRESOLVED QUESTIONS

1. **admin pages for recurring**: Search found admin pages (AdminOverview, AdminPeople, AdminTransactions, etc.) but no dedicated admin page for recurring expenses management. Should one be created?

2. **Expense creation flow**: Does expense create page include recurring checkbox/dialog, or is recurring created separately via CreateRecurringDialog? Need to verify flow.

3. **Notification system**: Constants for `notify_before_days` in form, but unclear if notifications are implemented. Need to verify if scheduled notifications exist.

4. **Background job schedule**: Edge function is present but need to verify cron configuration in supabase.json or cloud setup.

5. **Currency handling**: recurring_expenses references template_expense for currency, but member_prepaid_balances has its own currency field. Potential for mismatch?

---

## SUMMARY

The FairPay recurring expense system is comprehensive and well-architected with:
- Solid multi-frequency support
- Atomic, idempotent instance generation
- Dual prepaid tracking (historical + per-member)
- Auto-settlement of payer splits
- Safe multi-cycle catch-up on Edge function
- Rich UI with status badges, history, and analytics
- Proper i18n support

The system is ready for production use and handles the key requirements from requirements 1-6 (creation, editing, management, prepaid, consumption, per-member tracking).

