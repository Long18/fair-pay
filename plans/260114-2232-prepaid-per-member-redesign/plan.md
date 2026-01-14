# Implementation Plan: Per-Member Prepaid System

## Status: Ready for Implementation
## Date: 2026-01-14
## Estimated Effort: 3-4 days

## Overview

Redesign prepaid system from expense-level to per-member level. Enable members to prepay their individual shares for multiple months, with automatic consumption when recurring instances generated.

## Problem Statement

Current system tracks prepaid at recurring expense level (single `prepaid_until` date). Cannot handle:
- Member A prepays 5 months while others don't
- Multiple members prepaying different amounts
- Same member prepaying multiple times
- Per-member balance tracking and consumption

## Solution Summary

1. **New table:** `member_prepaid_balances` - tracks balance per member
2. **Modified table:** Add `user_id` to `recurring_prepaid_payments`
3. **New table:** `prepaid_consumption_log` - audit trail
4. **New functions:** Calculate member share, record/consume prepaid
5. **New UI:** Multi-member prepaid dialog, balance display
6. **Integration:** Auto-consume during instance generation

## Test Case: iCloud Subscription

- 200,000 VND/month, 4 members
- Each member: 50,000 VND/month
- Member A prepays 5 months → 250,000 VND
- Expected: 5 instances auto-consume Member A's prepaid

## Implementation Phases

### Phase 1: Database Schema [Day 1, Morning]

**File:** `supabase/migrations/20260115100000_member_prepaid_system.sql`

#### 1.1 Create member_prepaid_balances Table

```sql
CREATE TABLE member_prepaid_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_expense_id UUID NOT NULL REFERENCES recurring_expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  balance_amount DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (balance_amount >= 0),
  monthly_share_amount DECIMAL(12, 2) NOT NULL CHECK (monthly_share_amount > 0),
  months_remaining INTEGER GENERATED ALWAYS AS (
    FLOOR(balance_amount / NULLIF(monthly_share_amount, 0))
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

COMMENT ON TABLE member_prepaid_balances IS
'Per-member prepaid balances for recurring expenses. Tracks how much each member has prepaid.';
```

#### 1.2 Modify recurring_prepaid_payments Table

```sql
ALTER TABLE recurring_prepaid_payments
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS paid_by_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_recurring_prepaid_payments_user
  ON recurring_prepaid_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_prepaid_payments_paid_by
  ON recurring_prepaid_payments(paid_by_user_id);

COMMENT ON COLUMN recurring_prepaid_payments.user_id IS
'Member who this prepaid is for. NULL for legacy expense-level prepaid.';
COMMENT ON COLUMN recurring_prepaid_payments.paid_by_user_id IS
'Member who made the payment. Can differ from user_id.';
```

#### 1.3 Create prepaid_consumption_log Table

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

COMMENT ON TABLE prepaid_consumption_log IS
'Audit trail of prepaid consumption when recurring instances are generated.';
```

#### 1.4 RLS Policies

```sql
-- member_prepaid_balances
ALTER TABLE member_prepaid_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view prepaid balances for their recurring expenses"
  ON member_prepaid_balances FOR SELECT
  TO authenticated
  USING (
    recurring_expense_id IN (
      SELECT re.id FROM recurring_expenses re
      JOIN expenses e ON re.template_expense_id = e.id
      WHERE e.created_by = auth.uid()
        OR e.group_id IN (
          SELECT group_id FROM group_members WHERE user_id = auth.uid()
        )
        OR e.friendship_id IN (
          SELECT id FROM friendships
          WHERE user_id = auth.uid() OR friend_id = auth.uid()
        )
    )
  );

-- prepaid_consumption_log
ALTER TABLE prepaid_consumption_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view consumption log for their recurring expenses"
  ON prepaid_consumption_log FOR SELECT
  TO authenticated
  USING (
    recurring_expense_id IN (
      SELECT re.id FROM recurring_expenses re
      JOIN expenses e ON re.template_expense_id = e.id
      WHERE e.created_by = auth.uid()
        OR e.group_id IN (
          SELECT group_id FROM group_members WHERE user_id = auth.uid()
        )
        OR e.friendship_id IN (
          SELECT id FROM friendships
          WHERE user_id = auth.uid() OR friend_id = auth.uid()
        )
    )
  );
```

**Verification:**
```bash
pnpm supabase db reset
# Check tables created successfully
```

---

### Phase 2: SQL Functions [Day 1, Afternoon]

**File:** `supabase/migrations/20260115110000_member_prepaid_functions.sql`

#### 2.1 get_member_monthly_share Function

```sql
CREATE OR REPLACE FUNCTION get_member_monthly_share(
  p_recurring_expense_id UUID,
  p_user_id UUID
)
RETURNS DECIMAL(12, 2)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_template_expense_id UUID;
  v_monthly_share DECIMAL(12, 2);
BEGIN
  -- Get template expense id
  SELECT template_expense_id INTO v_template_expense_id
  FROM recurring_expenses
  WHERE id = p_recurring_expense_id;

  IF v_template_expense_id IS NULL THEN
    RAISE EXCEPTION 'Recurring expense not found';
  END IF;

  -- Get member's share from template splits
  SELECT computed_amount INTO v_monthly_share
  FROM expense_splits
  WHERE expense_id = v_template_expense_id
    AND user_id = p_user_id;

  RETURN COALESCE(v_monthly_share, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION get_member_monthly_share(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION get_member_monthly_share(UUID, UUID) IS
'Calculate member monthly share from template expense splits.';
```

#### 2.2 record_member_prepaid Function

```sql
CREATE OR REPLACE FUNCTION record_member_prepaid(
  p_recurring_expense_id UUID,
  p_user_id UUID,
  p_months INTEGER,
  p_paid_by_user_id UUID DEFAULT NULL
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  v_monthly_share DECIMAL(12, 2);
  v_amount DECIMAL(12, 2);
  v_currency VARCHAR(3);
  v_template RECORD;
  v_expense_id UUID;
  v_payment_id UUID;
  v_new_balance DECIMAL(12, 2);
  v_current_user UUID;
BEGIN
  v_current_user := auth.uid();
  IF v_current_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Validate months
  IF p_months < 1 THEN
    RAISE EXCEPTION 'Months must be at least 1';
  END IF;

  -- Get member monthly share
  v_monthly_share := get_member_monthly_share(p_recurring_expense_id, p_user_id);

  IF v_monthly_share <= 0 THEN
    RAISE EXCEPTION 'Member not found in recurring expense splits';
  END IF;

  -- Calculate prepaid amount
  v_amount := v_monthly_share * p_months;

  -- Get template expense details
  SELECT e.currency, e.description, e.group_id, e.friendship_id, e.context_type
  INTO v_currency, v_template.description, v_template.group_id,
       v_template.friendship_id, v_template.context_type
  FROM recurring_expenses re
  JOIN expenses e ON re.template_expense_id = e.id
  WHERE re.id = p_recurring_expense_id;

  -- Create expense record for prepaid payment
  INSERT INTO expenses (
    description,
    amount,
    currency,
    expense_date,
    paid_by_user_id,
    is_payment,
    context_type,
    group_id,
    friendship_id,
    created_by
  ) VALUES (
    v_template.description || ' (Prepaid ' || p_months || ' months for member)',
    v_amount,
    v_currency,
    CURRENT_DATE,
    COALESCE(p_paid_by_user_id, p_user_id),
    false,
    v_template.context_type,
    v_template.group_id,
    v_template.friendship_id,
    v_current_user
  ) RETURNING id INTO v_expense_id;

  -- Create single expense split for the member who prepaid
  INSERT INTO expense_splits (
    expense_id,
    user_id,
    split_method,
    computed_amount,
    is_settled,
    settled_amount
  ) VALUES (
    v_expense_id,
    p_user_id,
    'exact',
    v_amount,
    true,
    v_amount
  );

  -- Create prepaid payment record
  INSERT INTO recurring_prepaid_payments (
    recurring_expense_id,
    user_id,
    paid_by_user_id,
    payment_date,
    periods_covered,
    amount,
    coverage_from,
    coverage_to,
    expense_id,
    created_by
  ) VALUES (
    p_recurring_expense_id,
    p_user_id,
    COALESCE(p_paid_by_user_id, p_user_id),
    CURRENT_DATE,
    p_months,
    v_amount,
    CURRENT_DATE,
    CURRENT_DATE + (p_months || ' months')::INTERVAL,
    v_expense_id,
    v_current_user
  ) RETURNING id INTO v_payment_id;

  -- Upsert member prepaid balance
  INSERT INTO member_prepaid_balances (
    recurring_expense_id,
    user_id,
    balance_amount,
    monthly_share_amount,
    currency
  ) VALUES (
    p_recurring_expense_id,
    p_user_id,
    v_amount,
    v_monthly_share,
    v_currency
  )
  ON CONFLICT (recurring_expense_id, user_id)
  DO UPDATE SET
    balance_amount = member_prepaid_balances.balance_amount + EXCLUDED.balance_amount,
    updated_at = NOW()
  RETURNING balance_amount INTO v_new_balance;

  RETURN jsonb_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'expense_id', v_expense_id,
    'user_id', p_user_id,
    'months', p_months,
    'amount', v_amount,
    'monthly_share', v_monthly_share,
    'new_balance', v_new_balance,
    'currency', v_currency
  );
END;
$$;

GRANT EXECUTE ON FUNCTION record_member_prepaid(UUID, UUID, INTEGER, UUID) TO authenticated;
```

#### 2.3 record_multi_member_prepaid Function

```sql
CREATE OR REPLACE FUNCTION record_multi_member_prepaid(
  p_recurring_expense_id UUID,
  p_member_months JSONB,
  p_paid_by_user_id UUID DEFAULT NULL
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  v_member RECORD;
  v_result JSONB;
  v_payments JSONB := '[]'::JSONB;
  v_total_amount DECIMAL(12, 2) := 0;
BEGIN
  -- Iterate through member_months array
  FOR v_member IN
    SELECT
      (item->>'user_id')::UUID AS user_id,
      (item->>'months')::INTEGER AS months
    FROM jsonb_array_elements(p_member_months) AS item
  LOOP
    -- Record prepaid for each member
    v_result := record_member_prepaid(
      p_recurring_expense_id,
      v_member.user_id,
      v_member.months,
      p_paid_by_user_id
    );

    -- Accumulate results
    v_payments := v_payments || jsonb_build_object(
      'user_id', v_member.user_id,
      'months', v_member.months,
      'amount', v_result->>'amount',
      'new_balance', v_result->>'new_balance'
    );

    v_total_amount := v_total_amount + (v_result->>'amount')::DECIMAL(12, 2);
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'payments', v_payments,
    'total_amount', v_total_amount
  );
END;
$$;

GRANT EXECUTE ON FUNCTION record_multi_member_prepaid(UUID, JSONB, UUID) TO authenticated;
```

#### 2.4 consume_prepaid_for_instance Function

```sql
CREATE OR REPLACE FUNCTION consume_prepaid_for_instance(
  p_expense_instance_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_recurring_id UUID;
  v_split RECORD;
  v_balance RECORD;
  v_amount_to_consume DECIMAL(12, 2);
  v_consumptions JSONB := '[]'::JSONB;
  v_total_consumed DECIMAL(12, 2) := 0;
BEGIN
  -- Get recurring expense id from instance
  SELECT recurring_expense_id INTO v_recurring_id
  FROM expenses
  WHERE id = p_expense_instance_id;

  IF v_recurring_id IS NULL THEN
    -- Not a recurring instance, skip
    RETURN jsonb_build_object('success', true, 'consumptions', '[]'::JSONB);
  END IF;

  -- Process each split in the instance
  FOR v_split IN
    SELECT user_id, computed_amount, id AS split_id
    FROM expense_splits
    WHERE expense_id = p_expense_instance_id
  LOOP
    -- Get member prepaid balance
    SELECT * INTO v_balance
    FROM member_prepaid_balances
    WHERE recurring_expense_id = v_recurring_id
      AND user_id = v_split.user_id
      AND balance_amount > 0
    FOR UPDATE;

    IF FOUND THEN
      -- Determine amount to consume
      v_amount_to_consume := LEAST(v_balance.balance_amount, v_split.computed_amount);

      -- Update split
      UPDATE expense_splits
      SET
        is_settled = (v_amount_to_consume >= v_split.computed_amount),
        settled_amount = v_amount_to_consume
      WHERE id = v_split.split_id;

      -- Update balance
      UPDATE member_prepaid_balances
      SET
        balance_amount = balance_amount - v_amount_to_consume,
        updated_at = NOW()
      WHERE recurring_expense_id = v_recurring_id
        AND user_id = v_split.user_id;

      -- Log consumption
      INSERT INTO prepaid_consumption_log (
        recurring_expense_id,
        expense_instance_id,
        user_id,
        amount_consumed,
        balance_before,
        balance_after
      ) VALUES (
        v_recurring_id,
        p_expense_instance_id,
        v_split.user_id,
        v_amount_to_consume,
        v_balance.balance_amount,
        v_balance.balance_amount - v_amount_to_consume
      );

      -- Accumulate result
      v_consumptions := v_consumptions || jsonb_build_object(
        'user_id', v_split.user_id,
        'amount', v_amount_to_consume,
        'fully_covered', (v_amount_to_consume >= v_split.computed_amount)
      );

      v_total_consumed := v_total_consumed + v_amount_to_consume;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'instance_id', p_expense_instance_id,
    'consumptions', v_consumptions,
    'total_consumed', v_total_consumed
  );
END;
$$;

GRANT EXECUTE ON FUNCTION consume_prepaid_for_instance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION consume_prepaid_for_instance(UUID) TO service_role;
```

#### 2.5 get_all_members_prepaid_info Function

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
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    es.user_id,
    p.full_name AS user_name,
    COALESCE(mpb.balance_amount, 0) AS balance_amount,
    es.computed_amount AS monthly_share,
    COALESCE(mpb.months_remaining, 0) AS months_remaining,
    COALESCE(mpb.currency, e.currency) AS currency,
    COALESCE(
      (SELECT SUM(amount) FROM recurring_prepaid_payments
       WHERE recurring_expense_id = p_recurring_expense_id
         AND user_id = es.user_id),
      0
    ) AS total_prepaid,
    COALESCE(
      (SELECT COUNT(*) FROM recurring_prepaid_payments
       WHERE recurring_expense_id = p_recurring_expense_id
         AND user_id = es.user_id),
      0
    )::INTEGER AS payment_count
  FROM recurring_expenses re
  JOIN expenses e ON re.template_expense_id = e.id
  JOIN expense_splits es ON e.id = es.expense_id
  JOIN profiles p ON es.user_id = p.id
  LEFT JOIN member_prepaid_balances mpb
    ON mpb.recurring_expense_id = p_recurring_expense_id
    AND mpb.user_id = es.user_id
  WHERE re.id = p_recurring_expense_id
  ORDER BY p.full_name;
END;
$$;

GRANT EXECUTE ON FUNCTION get_all_members_prepaid_info(UUID) TO authenticated;
```

**Verification:**
```sql
-- Test get_member_monthly_share
SELECT get_member_monthly_share(<recurring_id>, <user_id>);

-- Test record_member_prepaid
SELECT record_member_prepaid(<recurring_id>, <user_id>, 5);

-- Test get_all_members_prepaid_info
SELECT * FROM get_all_members_prepaid_info(<recurring_id>);
```

---

### Phase 3: TypeScript Types & Hooks [Day 2, Morning]

**File:** `src/modules/expenses/types/prepaid.ts`

```typescript
export interface MemberPrepaidBalance {
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

export interface PrepaidConsumptionLog {
  id: string;
  recurring_expense_id: string;
  expense_instance_id: string;
  user_id: string;
  amount_consumed: number;
  balance_before: number;
  balance_after: number;
  consumed_at: string;
}

export interface MemberPrepaidInfo {
  user_id: string;
  user_name: string;
  balance_amount: number;
  monthly_share: number;
  months_remaining: number;
  currency: string;
  total_prepaid: number;
  payment_count: number;
}

export interface MemberPrepaidInput {
  user_id: string;
  months: number;
}

export interface RecordMemberPrepaidResult {
  success: boolean;
  payment_id: string;
  expense_id: string;
  user_id: string;
  months: number;
  amount: number;
  monthly_share: number;
  new_balance: number;
  currency: string;
}

export interface RecordMultiMemberPrepaidResult {
  success: boolean;
  payments: Array<{
    user_id: string;
    months: number;
    amount: number;
    new_balance: number;
  }>;
  total_amount: number;
}
```

**File:** `src/modules/expenses/hooks/use-member-prepaid.ts`

```typescript
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabaseClient } from '@/utility/supabaseClient';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import type {
  MemberPrepaidInput,
  RecordMemberPrepaidResult,
  RecordMultiMemberPrepaidResult,
} from '../types/prepaid';

interface RecordMemberPrepaidParams {
  recurringExpenseId: string;
  userId: string;
  months: number;
  paidByUserId?: string;
}

interface RecordMultiMemberPrepaidParams {
  recurringExpenseId: string;
  memberMonths: MemberPrepaidInput[];
  paidByUserId?: string;
}

export function useMemberPrepaid() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isRecording, setIsRecording] = useState(false);

  const recordSingleMember = async (params: RecordMemberPrepaidParams) => {
    setIsRecording(true);
    try {
      const { data, error } = await supabaseClient.rpc('record_member_prepaid', {
        p_recurring_expense_id: params.recurringExpenseId,
        p_user_id: params.userId,
        p_months: params.months,
        p_paid_by_user_id: params.paidByUserId || null,
      });

      if (error) throw error;

      const result = data as RecordMemberPrepaidResult;

      await queryClient.invalidateQueries({ queryKey: ['recurring_expenses'] });
      await queryClient.invalidateQueries({ queryKey: ['expenses'] });

      toast.success(
        t('prepaid.recordSuccess', 'Prepaid {{months}} month(s) for member', {
          months: params.months,
        })
      );

      return { success: true, data: result };
    } catch (error) {
      console.error('Error recording member prepaid:', error);
      toast.error(t('prepaid.recordError', 'Failed to record prepaid'));
      return { success: false, error };
    } finally {
      setIsRecording(false);
    }
  };

  const recordMultiMember = async (params: RecordMultiMemberPrepaidParams) => {
    setIsRecording(true);
    try {
      const { data, error } = await supabaseClient.rpc('record_multi_member_prepaid', {
        p_recurring_expense_id: params.recurringExpenseId,
        p_member_months: params.memberMonths,
        p_paid_by_user_id: params.paidByUserId || null,
      });

      if (error) throw error;

      const result = data as RecordMultiMemberPrepaidResult;

      await queryClient.invalidateQueries({ queryKey: ['recurring_expenses'] });
      await queryClient.invalidateQueries({ queryKey: ['expenses'] });

      toast.success(
        t('prepaid.multiRecordSuccess', 'Prepaid recorded for {{count}} member(s)', {
          count: params.memberMonths.length,
        })
      );

      return { success: true, data: result };
    } catch (error) {
      console.error('Error recording multi-member prepaid:', error);
      toast.error(t('prepaid.recordError', 'Failed to record prepaid'));
      return { success: false, error };
    } finally {
      setIsRecording(false);
    }
  };

  return {
    recordSingleMember,
    recordMultiMember,
    isRecording,
  };
}
```

**File:** `src/modules/expenses/hooks/use-member-prepaid-info.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabaseClient } from '@/utility/supabaseClient';
import type { MemberPrepaidInfo } from '../types/prepaid';

export function useMemberPrepaidInfo(recurringExpenseId: string) {
  return useQuery({
    queryKey: ['member_prepaid_info', recurringExpenseId],
    queryFn: async () => {
      const { data, error } = await supabaseClient.rpc(
        'get_all_members_prepaid_info',
        { p_recurring_expense_id: recurringExpenseId }
      );

      if (error) throw error;

      return data as MemberPrepaidInfo[];
    },
    enabled: !!recurringExpenseId,
  });
}
```

**Verification:**
```bash
pnpm tsc --noEmit
```

---

### Phase 4: UI Components [Day 2, Afternoon - Day 3]

#### 4.1 MemberPrepaidBalanceList Component

**File:** `src/modules/expenses/components/member-prepaid-balance-list.tsx`

```typescript
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2Icon, XCircleIcon } from '@/components/ui/icons';
import { formatNumber } from '@/lib/locale-utils';
import { useMemberPrepaidInfo } from '../hooks/use-member-prepaid-info';
import type { MemberPrepaidInfo } from '../types/prepaid';

interface MemberPrepaidBalanceListProps {
  recurringExpenseId: string;
}

export function MemberPrepaidBalanceList({
  recurringExpenseId,
}: MemberPrepaidBalanceListProps) {
  const { t } = useTranslation();
  const { data: members, isLoading } = useMemberPrepaidInfo(recurringExpenseId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (!members || members.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {members.map((member) => (
        <MemberBalanceCard key={member.user_id} member={member} />
      ))}
    </div>
  );
}

function MemberBalanceCard({ member }: { member: MemberPrepaidInfo }) {
  const { t } = useTranslation();
  const hasPrepaid = member.balance_amount > 0;

  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium">{member.user_name}</span>
          {hasPrepaid ? (
            <Badge variant="default" className="gap-1">
              <CheckCircle2Icon className="h-3 w-3" />
              {t('prepaid.months', '{{count}} month(s)', {
                count: member.months_remaining,
              })}
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1">
              <XCircleIcon className="h-3 w-3" />
              {t('prepaid.noPrepaid', 'No prepaid')}
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-muted-foreground">
            {t('prepaid.balance', 'Balance')}
          </p>
          <p className="font-semibold">
            {formatNumber(member.balance_amount)} {member.currency}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">
            {t('prepaid.monthlyShare', 'Monthly share')}
          </p>
          <p className="font-semibold">
            {formatNumber(member.monthly_share)} {member.currency}
          </p>
        </div>
      </div>

      {member.payment_count > 0 && (
        <p className="text-xs text-muted-foreground">
          {t('prepaid.totalPrepaid', 'Total prepaid: {{amount}} {{currency}}', {
            amount: formatNumber(member.total_prepaid),
            currency: member.currency,
          })}
        </p>
      )}
    </div>
  );
}
```

#### 4.2 MultiMemberPrepaidDialog Component

**File:** `src/modules/expenses/components/multi-member-prepaid-dialog.tsx`

```typescript
import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2Icon, BanknoteIcon } from '@/components/ui/icons';
import { formatNumber } from '@/lib/locale-utils';
import { useMemberPrepaid } from '../hooks/use-member-prepaid';
import { useMemberPrepaidInfo } from '../hooks/use-member-prepaid-info';
import type { MemberPrepaidInput } from '../types/prepaid';

interface Member {
  id: string;
  full_name: string;
}

interface MultiMemberPrepaidDialogProps {
  recurringExpenseId: string;
  members: Member[];
  currentUserId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function MultiMemberPrepaidDialog({
  recurringExpenseId,
  members,
  currentUserId,
  open,
  onOpenChange,
  onSuccess,
}: MultiMemberPrepaidDialogProps) {
  const { t } = useTranslation();
  const { recordMultiMember, isRecording } = useMemberPrepaid();
  const { data: prepaidInfo } = useMemberPrepaidInfo(recurringExpenseId);

  const [selectedMembers, setSelectedMembers] = useState<Map<string, number>>(
    new Map()
  );
  const [paidBy, setPaidBy] = useState<string>(currentUserId);

  const memberShares = useMemo(() => {
    const map = new Map<string, number>();
    prepaidInfo?.forEach((info) => {
      map.set(info.user_id, info.monthly_share);
    });
    return map;
  }, [prepaidInfo]);

  const currency = prepaidInfo?.[0]?.currency || 'VND';

  const totalAmount = useMemo(() => {
    let total = 0;
    selectedMembers.forEach((months, userId) => {
      const monthlyShare = memberShares.get(userId) || 0;
      total += monthlyShare * months;
    });
    return total;
  }, [selectedMembers, memberShares]);

  const handleMemberToggle = (userId: string, checked: boolean) => {
    const newSelected = new Map(selectedMembers);
    if (checked) {
      newSelected.set(userId, 1);
    } else {
      newSelected.delete(userId);
    }
    setSelectedMembers(newSelected);
  };

  const handleMonthsChange = (userId: string, value: string) => {
    const months = parseInt(value, 10);
    if (isNaN(months) || months < 1) return;

    const newSelected = new Map(selectedMembers);
    newSelected.set(userId, months);
    setSelectedMembers(newSelected);
  };

  const handleSubmit = async () => {
    const memberMonths: MemberPrepaidInput[] = Array.from(
      selectedMembers.entries()
    ).map(([user_id, months]) => ({
      user_id,
      months,
    }));

    const result = await recordMultiMember({
      recurringExpenseId,
      memberMonths,
      paidByUserId: paidBy,
    });

    if (result.success) {
      setSelectedMembers(new Map());
      onOpenChange(false);
      onSuccess?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t('prepaid.payUpfrontMultiple', 'Pay upfront for members')}
          </DialogTitle>
          <DialogDescription>
            {t(
              'prepaid.selectMembersDescription',
              'Select members and months to prepay'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Member Selection */}
          <div className="space-y-3">
            {members.map((member) => {
              const monthlyShare = memberShares.get(member.id) || 0;
              const months = selectedMembers.get(member.id) || 1;
              const isSelected = selectedMembers.has(member.id);
              const amount = monthlyShare * months;

              return (
                <div
                  key={member.id}
                  className="rounded-lg border p-3 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) =>
                        handleMemberToggle(member.id, checked as boolean)
                      }
                    />
                    <Label className="font-medium cursor-pointer">
                      {member.full_name}
                      {member.id === currentUserId && ' (You)'}
                    </Label>
                  </div>

                  {isSelected && (
                    <div className="ml-6 grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">
                          {t('prepaid.months', 'Months')}
                        </Label>
                        <Input
                          type="number"
                          min={1}
                          max={24}
                          value={months}
                          onChange={(e) =>
                            handleMonthsChange(member.id, e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs">
                          {t('prepaid.amount', 'Amount')}
                        </Label>
                        <div className="h-10 px-3 border rounded-lg flex items-center bg-muted">
                          <span className="font-semibold">
                            {formatNumber(amount)} {currency}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <p className="ml-6 text-xs text-muted-foreground">
                    {t(
                      'prepaid.monthlyShareInfo',
                      'Monthly share: {{amount}} {{currency}}',
                      {
                        amount: formatNumber(monthlyShare),
                        currency,
                      }
                    )}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Paid By */}
          <div className="space-y-2">
            <Label>{t('prepaid.paidBy', 'Paid by')}</Label>
            <select
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
              className="w-full h-10 px-3 border rounded-lg bg-background"
            >
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.full_name}
                  {member.id === currentUserId && ' (You)'}
                </option>
              ))}
            </select>
          </div>

          {/* Total Amount */}
          {selectedMembers.size > 0 && (
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BanknoteIcon className="h-5 w-5 text-primary" />
                  <span className="font-medium">
                    {t('prepaid.totalAmount', 'Total amount')}
                  </span>
                </div>
                <span className="text-2xl font-bold text-primary">
                  {formatNumber(totalAmount)} {currency}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {t(
                  'prepaid.membersSelected',
                  '{{count}} member(s) selected',
                  { count: selectedMembers.size }
                )}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isRecording || selectedMembers.size === 0}
          >
            {isRecording ? (
              <>
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                {t('common.loading', 'Loading...')}
              </>
            ) : (
              t('prepaid.recordPayment', 'Record payment')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

#### 4.3 Update RecurringExpenseCard

**File:** `src/modules/expenses/components/recurring-expense-card.tsx`

**Changes:**
1. Import MemberPrepaidBalanceList
2. Replace PrepaidPaymentDialog with MultiMemberPrepaidDialog
3. Add collapsible section for member balances
4. Update badge to show member count with prepaid

```typescript
// Add imports
import { MemberPrepaidBalanceList } from './member-prepaid-balance-list';
import { MultiMemberPrepaidDialog } from './multi-member-prepaid-dialog';
import { useMemberPrepaidInfo } from '../hooks/use-member-prepaid-info';

// In component:
const { data: prepaidInfo } = useMemberPrepaidInfo(recurring.id);
const membersWithPrepaid = prepaidInfo?.filter(m => m.balance_amount > 0) || [];

// Replace prepaid badge section:
{membersWithPrepaid.length > 0 && (
  <Badge variant="default">
    {t('prepaid.membersPrepaid', '{{count}} member(s) prepaid', {
      count: membersWithPrepaid.length
    })}
  </Badge>
)}

// Add collapsible section in CardContent:
<Collapsible>
  <CollapsibleTrigger asChild>
    <Button variant="ghost" className="w-full justify-between">
      <span>{t('prepaid.memberBalances', 'Member balances')}</span>
      <ChevronDownIcon className="h-4 w-4" />
    </Button>
  </CollapsibleTrigger>
  <CollapsibleContent>
    <MemberPrepaidBalanceList recurringExpenseId={recurring.id} />
    <Button
      variant="outline"
      size="sm"
      className="w-full mt-2"
      onClick={() => setShowPrepaidDialog(true)}
    >
      {t('prepaid.addPrepaid', 'Add prepaid for members')}
    </Button>
  </CollapsibleContent>
</Collapsible>

// Replace PrepaidPaymentDialog with MultiMemberPrepaidDialog:
<MultiMemberPrepaidDialog
  recurringExpenseId={recurring.id}
  members={members}
  currentUserId={currentUserId}
  open={showPrepaidDialog}
  onOpenChange={setShowPrepaidDialog}
  onSuccess={handlePrepaidSuccess}
/>
```

**Verification:**
```bash
pnpm tsc --noEmit
# Manual testing in browser
```

---

### Phase 5: Integration with Recurring Instance Generation [Day 3]

**Task:** Find where recurring instances are created and integrate consumption

#### 5.1 Locate Instance Generation

**Search Strategy:**
```bash
grep -r "INSERT INTO expenses" supabase/migrations/*.sql | grep recurring
# OR
grep -r "next_occurrence" supabase/migrations/*.sql
```

**Expected:** Find function that:
- Creates expense from template
- Copies expense_splits
- Updates next_occurrence
- Likely named: `generate_recurring_instance` or similar

#### 5.2 Add Consumption Call

**Modify function to include:**
```sql
-- After creating instance and splits
v_instance_id := /* newly created expense id */;

-- Consume prepaid for this instance
PERFORM consume_prepaid_for_instance(v_instance_id);
```

**Test:**
1. Create recurring expense with Member A prepaid
2. Manually trigger instance generation
3. Verify Member A's split marked as settled
4. Verify balance reduced
5. Verify consumption log created

---

### Phase 6: Testing & Validation [Day 4]

#### 6.1 Unit Tests (SQL)

**File:** `supabase/migrations/test_member_prepaid_system.sql`

```sql
-- Test Case: iCloud Example
-- Setup: 200k/month, 4 members, Member A prepays 5 months

BEGIN;

-- Create test data
-- (Insert test recurring expense, template, splits)

-- Test 1: Record prepaid
SELECT record_member_prepaid(
  p_recurring_expense_id := <test_recurring_id>,
  p_user_id := <member_a_id>,
  p_months := 5
);

-- Verify balance created
SELECT balance_amount, months_remaining
FROM member_prepaid_balances
WHERE recurring_expense_id = <test_recurring_id>
  AND user_id = <member_a_id>;
-- Expected: 250000, 5

-- Test 2: Generate instance and consume
-- (Create test instance)
SELECT consume_prepaid_for_instance(<instance_id>);

-- Verify split settled
SELECT is_settled, settled_amount
FROM expense_splits
WHERE expense_id = <instance_id> AND user_id = <member_a_id>;
-- Expected: true, 50000

-- Verify balance reduced
SELECT balance_amount, months_remaining
FROM member_prepaid_balances
WHERE recurring_expense_id = <test_recurring_id>
  AND user_id = <member_a_id>;
-- Expected: 200000, 4

ROLLBACK;
```

#### 6.2 Integration Tests

**Manual Test Checklist:**
- [ ] Create recurring expense with 4 members
- [ ] Member A prepays 5 months
- [ ] Verify balance shows 5 months
- [ ] Generate 5 instances
- [ ] Verify each instance consumes Member A's prepaid
- [ ] Verify balance reaches 0 after 5 instances
- [ ] Generate 6th instance, verify Member A not auto-settled
- [ ] Member B prepays 2 months
- [ ] Member A prepays 3 more months (accumulation)
- [ ] Verify balances correct

#### 6.3 Edge Cases

- [ ] Prepay when existing prepaid balance exists (accumulation)
- [ ] Prepay by member who is not in the recurring expense (should fail)
- [ ] Consume when no prepaid exists (should not error)
- [ ] Partial consumption (balance < monthly_share)
- [ ] Multi-member prepaid (3 members prepay different amounts)

---

## Migration Path

### Backwards Compatibility

**Existing prepaid records:**
- `recurring_prepaid_payments` without `user_id`: Legacy expense-level prepaid
- Keep `prepaid_until` on `recurring_expenses` for legacy display
- New prepaid uses per-member system
- Old prepaid continues to work (no breaking changes)

**Deprecation Plan:**
- Phase 1 (Current): Both systems coexist
- Phase 2 (Future): Migrate legacy prepaid to per-member
- Phase 3 (Future): Remove expense-level prepaid_until

---

## Rollback Plan

If issues found:
1. Revert migration: `pnpm supabase db reset`
2. Restore from backup
3. Frontend: Hide new UI components via feature flag
4. Backend: Functions are additive, no breaking changes

---

## Success Criteria

- [ ] iCloud test case passes (Member A prepays 5 months, consumes correctly)
- [ ] Multiple members can prepay simultaneously
- [ ] Same member can prepay multiple times (accumulates)
- [ ] Consumption happens automatically during instance generation
- [ ] Audit trail complete in prepaid_consumption_log
- [ ] UI displays per-member balances correctly
- [ ] Multi-member prepaid dialog works
- [ ] TypeScript compilation passes
- [ ] No regressions on existing prepaid functionality
- [ ] Documentation updated

---

## Documentation

**Update Files:**
- `docs/features/recurring-expenses.md` - Add per-member prepaid section
- `docs/implementation-summary-jan-2026.md` - Add this implementation
- Add inline SQL comments
- Add TSDoc comments to functions

---

## Unresolved Questions & Decisions

1. **Partial Consumption:** DECISION = Allow (mark as partially settled)
2. **Refunds:** DECISION = V1 skip, V2 add manual refund
3. **Split Changes:** DECISION = Use cached monthly_share_amount
4. **Currency:** DECISION = Enforce same as template

---

## Next Steps

1. Review plan with team
2. Get approval on schema changes
3. Begin Phase 1 implementation
4. Test each phase before proceeding
5. Deploy to staging for validation
6. Deploy to production

---

## Related Files

- Research: `research/01-current-implementation-analysis.md`
- Architecture: `reports/02-solution-architecture.md`
- Current Implementation: `supabase/migrations/20260114100000_recurring_prepaid_payment_functions.sql`
