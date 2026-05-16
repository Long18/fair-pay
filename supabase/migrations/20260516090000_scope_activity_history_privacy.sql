-- Migration: Scope product activity/history surfaces to directly involved users
-- Date: 2026-05-16
-- Purpose:
--   1. Remove permissive public-read policies that leak unrelated transactions.
--   2. Make product-surface reads participant-only while preserving admin access.
--   3. Lock user-scoped debt/activity RPCs so regular users cannot request another
--      user's private ledger by swapping p_user_id.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Participant-only product read policies
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Public can view all expenses" ON public.expenses;
DROP POLICY IF EXISTS "Participants can view expenses" ON public.expenses;

CREATE POLICY "Participants can view expenses"
  ON public.expenses
  FOR SELECT
  TO authenticated
  USING (
    paid_by_user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.expense_splits es
      WHERE es.expense_id = expenses.id
        AND es.user_id = auth.uid()
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Can view splits for accessible expenses" ON public.expense_splits;
DROP POLICY IF EXISTS "Anonymous users can view expense splits" ON public.expense_splits;

CREATE POLICY "Can view splits for accessible expenses"
  ON public.expense_splits
  FOR SELECT
  TO authenticated
  USING (
    expense_id IN (
      SELECT e.id
      FROM public.expenses e
    )
  );

DROP POLICY IF EXISTS "Public can view all payments" ON public.payments;
DROP POLICY IF EXISTS "Involved parties can view payments" ON public.payments;

CREATE POLICY "Involved parties can view payments"
  ON public.payments
  FOR SELECT
  TO authenticated
  USING (
    from_user = auth.uid()
    OR to_user = auth.uid()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "payment_events_read_policy" ON public.payment_events;

CREATE POLICY "payment_events_read_policy"
  ON public.payment_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.expenses e
      WHERE e.id = payment_events.expense_id
        AND (
          e.paid_by_user_id = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM public.expense_splits es
            WHERE es.expense_id = e.id
              AND es.user_id = auth.uid()
          )
        )
    )
    OR public.is_admin()
  );

-- ---------------------------------------------------------------------------
-- 2. Tighten payment-event RPC permission checks to match participant-only RLS
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_expense_payment_events(
  p_expense_id UUID
)
RETURNS TABLE (
  id UUID,
  event_type TEXT,
  from_user_id UUID,
  from_user_name TEXT,
  from_user_avatar TEXT,
  to_user_id UUID,
  to_user_name TEXT,
  to_user_avatar TEXT,
  amount DECIMAL,
  currency TEXT,
  method TEXT,
  actor_user_id UUID,
  actor_user_name TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.expenses e
    WHERE e.id = p_expense_id
      AND (
        e.paid_by_user_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.expense_splits es
          WHERE es.expense_id = e.id
            AND es.user_id = auth.uid()
        )
        OR public.is_admin()
      )
  ) THEN
    RAISE EXCEPTION 'Permission denied: You are not involved in this expense';
  END IF;

  RETURN QUERY
  SELECT
    pe.id,
    pe.event_type,
    pe.from_user_id,
    from_user.full_name AS from_user_name,
    from_user.avatar_url AS from_user_avatar,
    pe.to_user_id,
    to_user.full_name AS to_user_name,
    to_user.avatar_url AS to_user_avatar,
    pe.amount,
    pe.currency,
    pe.method,
    pe.actor_user_id,
    actor_user.full_name AS actor_user_name,
    pe.metadata,
    pe.created_at
  FROM public.payment_events pe
  INNER JOIN public.profiles from_user ON from_user.id = pe.from_user_id
  INNER JOIN public.profiles to_user ON to_user.id = pe.to_user_id
  INNER JOIN public.profiles actor_user ON actor_user.id = pe.actor_user_id
  WHERE pe.expense_id = p_expense_id
  ORDER BY pe.created_at ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_expenses_with_payment_events(
  p_expense_ids UUID[]
)
RETURNS TABLE (
  expense_id UUID,
  payment_events JSONB
)
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pe.expense_id,
    jsonb_agg(
      jsonb_build_object(
        'id', pe.id,
        'event_type', pe.event_type,
        'from_user_id', pe.from_user_id,
        'from_user_name', from_user.full_name,
        'from_user_avatar', from_user.avatar_url,
        'to_user_id', pe.to_user_id,
        'to_user_name', to_user.full_name,
        'to_user_avatar', to_user.avatar_url,
        'amount', pe.amount,
        'currency', pe.currency,
        'method', pe.method,
        'actor_user_id', pe.actor_user_id,
        'actor_user_name', actor_user.full_name,
        'metadata', pe.metadata,
        'created_at', pe.created_at
      )
      ORDER BY pe.created_at ASC
    ) AS payment_events
  FROM public.payment_events pe
  INNER JOIN public.profiles from_user ON from_user.id = pe.from_user_id
  INNER JOIN public.profiles to_user ON to_user.id = pe.to_user_id
  INNER JOIN public.profiles actor_user ON actor_user.id = pe.actor_user_id
  WHERE pe.expense_id = ANY(p_expense_ids)
    AND EXISTS (
      SELECT 1
      FROM public.expenses e
      WHERE e.id = pe.expense_id
        AND (
          e.paid_by_user_id = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM public.expense_splits es
            WHERE es.expense_id = e.id
              AND es.user_id = auth.uid()
          )
          OR public.is_admin()
        )
    )
  GROUP BY pe.expense_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Canonical participant-scoped ledger surface for product UI
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_activity_ledger(
  p_viewer_id UUID DEFAULT auth.uid(),
  p_shared_with_user_id UUID DEFAULT NULL,
  p_group_id UUID DEFAULT NULL,
  p_friendship_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  type TEXT,
  date TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_viewer_id IS DISTINCT FROM auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: activity ledger is viewer-scoped';
  END IF;

  RETURN QUERY
  WITH expense_rows AS (
    SELECT
      e.id,
      'expense'::TEXT AS type,
      COALESCE(
        (
          SELECT MAX(pe.created_at)
          FROM public.payment_events pe
          WHERE pe.expense_id = e.id
        ),
        e.expense_date::TIMESTAMPTZ,
        e.created_at
      ) AS date,
      e.created_at
    FROM public.expenses e
    WHERE (
      e.paid_by_user_id = p_viewer_id
      OR EXISTS (
        SELECT 1
        FROM public.expense_splits viewer_split
        WHERE viewer_split.expense_id = e.id
          AND viewer_split.user_id = p_viewer_id
      )
    )
      AND (
        p_shared_with_user_id IS NULL
        OR e.paid_by_user_id = p_shared_with_user_id
        OR EXISTS (
          SELECT 1
          FROM public.expense_splits shared_split
          WHERE shared_split.expense_id = e.id
            AND shared_split.user_id = p_shared_with_user_id
        )
      )
      AND (p_group_id IS NULL OR e.group_id = p_group_id)
      AND (p_friendship_id IS NULL OR e.friendship_id = p_friendship_id)
      AND COALESCE(e.is_payment, false) = false
      AND e.expense_date <= CURRENT_DATE
  ),
  payment_rows AS (
    SELECT
      p.id,
      'payment'::TEXT AS type,
      p.payment_date::TIMESTAMPTZ AS date,
      p.created_at
    FROM public.payments p
    WHERE (
      p.from_user = p_viewer_id
      OR p.to_user = p_viewer_id
    )
      AND (
        p_shared_with_user_id IS NULL
        OR p.from_user = p_shared_with_user_id
        OR p.to_user = p_shared_with_user_id
      )
      AND (p_group_id IS NULL OR p.group_id = p_group_id)
      AND (p_friendship_id IS NULL OR p.friendship_id = p_friendship_id)
      AND p.payment_date <= CURRENT_DATE
  ),
  ledger_rows AS (
    SELECT * FROM expense_rows
    UNION ALL
    SELECT * FROM payment_rows
  )
  SELECT *
  FROM ledger_rows
  ORDER BY date DESC, created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Lock user-scoped RPCs to self, except for admins
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.get_user_activities(UUID, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.get_user_activities(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 10,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  type TEXT,
  description TEXT,
  total_amount NUMERIC,
  user_share NUMERIC,
  currency TEXT,
  date TIMESTAMPTZ,
  group_name TEXT,
  group_id UUID,
  paid_by_user_id UUID,
  paid_by_name TEXT,
  is_lender BOOLEAN,
  is_borrower BOOLEAN,
  is_payment BOOLEAN,
  is_involved BOOLEAN,
  created_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: user activity is self-scoped';
  END IF;

  RETURN QUERY
  WITH activities AS (
    SELECT
      e.id,
      'expense'::TEXT AS type,
      e.description,
      e.amount AS total_amount,
      COALESCE(my_split.computed_amount, 0) AS user_share,
      COALESCE(e.currency, 'USD') AS currency,
      e.expense_date::TIMESTAMPTZ AS date,
      g.name AS group_name,
      g.id AS group_id,
      e.paid_by_user_id,
      payer.full_name AS paid_by_name,
      e.paid_by_user_id = p_user_id AS is_lender,
      COALESCE(my_split.user_id = p_user_id AND e.paid_by_user_id != p_user_id, false) AS is_borrower,
      FALSE AS is_payment,
      TRUE AS is_involved,
      e.created_at
    FROM public.expenses e
    LEFT JOIN public.expense_splits my_split
      ON my_split.expense_id = e.id
      AND my_split.user_id = p_user_id
    LEFT JOIN public.groups g ON e.group_id = g.id
    LEFT JOIN public.profiles payer ON e.paid_by_user_id = payer.id
    WHERE (
      e.paid_by_user_id = p_user_id
      OR my_split.user_id = p_user_id
    )
      AND COALESCE(e.is_payment, false) = false
      AND e.expense_date <= CURRENT_DATE

    UNION ALL

    SELECT
      pay.id,
      'payment'::TEXT AS type,
      COALESCE(
        pay.note,
        CASE
          WHEN pay.from_user = p_user_id
            THEN 'Payment to ' || to_profile.full_name
          ELSE 'Payment from ' || from_profile.full_name
        END
      ) AS description,
      pay.amount AS total_amount,
      pay.amount AS user_share,
      COALESCE(pay.currency, 'USD') AS currency,
      pay.payment_date::TIMESTAMPTZ AS date,
      g.name AS group_name,
      g.id AS group_id,
      pay.from_user AS paid_by_user_id,
      from_profile.full_name AS paid_by_name,
      pay.to_user = p_user_id AS is_lender,
      pay.from_user = p_user_id AS is_borrower,
      TRUE AS is_payment,
      TRUE AS is_involved,
      pay.created_at
    FROM public.payments pay
    LEFT JOIN public.groups g ON pay.group_id = g.id
    LEFT JOIN public.profiles from_profile ON pay.from_user = from_profile.id
    LEFT JOIN public.profiles to_profile ON pay.to_user = to_profile.id
    WHERE (
      pay.from_user = p_user_id
      OR pay.to_user = p_user_id
    )
      AND pay.payment_date <= CURRENT_DATE
  )
  SELECT *
  FROM activities
  ORDER BY date DESC, created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

DO $$
BEGIN
  IF to_regprocedure('public.get_user_debts_aggregated(uuid,timestamptz,timestamptz)') IS NOT NULL
     AND to_regprocedure('public.get_user_debts_aggregated_unchecked(uuid,timestamptz,timestamptz)') IS NULL THEN
    ALTER FUNCTION public.get_user_debts_aggregated(UUID, TIMESTAMPTZ, TIMESTAMPTZ)
      RENAME TO get_user_debts_aggregated_unchecked;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.get_user_debts_aggregated_unchecked(UUID, TIMESTAMPTZ, TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_user_debts_aggregated(
  p_user_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  counterparty_id UUID,
  counterparty_name TEXT,
  counterparty_avatar_url TEXT,
  amount NUMERIC,
  currency TEXT,
  i_owe_them BOOLEAN,
  owed_to_name TEXT,
  owed_to_id UUID,
  total_amount NUMERIC,
  settled_amount NUMERIC,
  remaining_amount NUMERIC,
  transaction_count BIGINT,
  last_transaction_date TIMESTAMPTZ,
  counterparty_email TEXT
)
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: debt summaries are self-scoped';
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.get_user_debts_aggregated_unchecked(
    p_user_id,
    p_start_date,
    p_end_date
  );
END;
$$;

DO $$
BEGIN
  IF to_regprocedure('public.get_user_debts_history(uuid)') IS NOT NULL
     AND to_regprocedure('public.get_user_debts_history_unchecked(uuid)') IS NULL THEN
    ALTER FUNCTION public.get_user_debts_history(UUID)
      RENAME TO get_user_debts_history_unchecked;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.get_user_debts_history_unchecked(UUID)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_user_debts_history(
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS TABLE (
  counterparty_id UUID,
  counterparty_name TEXT,
  amount NUMERIC,
  currency TEXT,
  i_owe_them BOOLEAN,
  total_amount NUMERIC,
  settled_amount NUMERIC,
  remaining_amount NUMERIC,
  transaction_count INTEGER,
  last_transaction_date TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: debt history is self-scoped';
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.get_user_debts_history_unchecked(p_user_id);
END;
$$;

-- Keep the explicitly secret-gated public endpoint functional while regular
-- product callers are forced through the self-scoped wrapper above.
CREATE OR REPLACE FUNCTION public.get_user_debt_by_secret(
  p_user_id UUID,
  p_secret_token TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  error_message TEXT,
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  total_owed_to_me NUMERIC,
  total_i_owe NUMERIC,
  net_balance NUMERIC,
  currency TEXT,
  debts_by_person JSONB,
  debts_by_group JSONB,
  settlement_summary JSONB
) AS $$
DECLARE
  v_secret_record RECORD;
  v_balance RECORD;
  v_debts_person JSONB;
  v_debts_group JSONB;
  v_settlement JSONB;
BEGIN
  SELECT * INTO v_secret_record
  FROM public.api_secrets
  WHERE user_id = p_user_id
    AND secret_token = p_secret_token
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW());

  IF v_secret_record IS NULL THEN
    RETURN QUERY SELECT
      false,
      'Invalid or expired API secret',
      NULL::UUID,
      NULL::TEXT,
      NULL::TEXT,
      NULL::NUMERIC,
      NULL::NUMERIC,
      NULL::NUMERIC,
      NULL::TEXT,
      NULL::JSONB,
      NULL::JSONB,
      NULL::JSONB;
    RETURN;
  END IF;

  UPDATE public.api_secrets
  SET last_used_at = NOW()
  WHERE id = v_secret_record.id;

  SELECT * INTO v_balance
  FROM public.get_user_balance(p_user_id);

  SELECT JSONB_AGG(JSONB_BUILD_OBJECT(
    'counterparty_id', counterparty_id,
    'counterparty_name', counterparty_name,
    'amount', amount,
    'currency', currency,
    'i_owe_them', i_owe_them,
    'total_amount', total_amount,
    'settled_amount', settled_amount,
    'remaining_amount', remaining_amount,
    'transaction_count', transaction_count,
    'last_transaction_date', last_transaction_date
  ))
  INTO v_debts_person
  FROM public.get_user_debts_history_unchecked(p_user_id);

  SELECT JSONB_AGG(JSONB_BUILD_OBJECT(
    'group_id', g.id,
    'group_name', g.name,
    'group_avatar_url', g.avatar_url,
    'total_owed_to_me', COALESCE(SUM(CASE WHEN i_owe_them = false THEN remaining_amount ELSE 0 END), 0),
    'total_i_owe', COALESCE(SUM(CASE WHEN i_owe_them = true THEN remaining_amount ELSE 0 END), 0),
    'net_balance', COALESCE(
      SUM(CASE WHEN i_owe_them = false THEN remaining_amount ELSE -remaining_amount END),
      0
    ),
    'debts_in_group', JSONB_AGG(JSONB_BUILD_OBJECT(
      'counterparty_id', counterparty_id,
      'counterparty_name', counterparty_name,
      'amount', remaining_amount,
      'currency', currency,
      'i_owe_them', i_owe_them
    ))
  ) ORDER BY g.name)
  INTO v_debts_group
  FROM public.get_user_debts_history_unchecked(p_user_id) hist
  LEFT JOIN public.friendships f ON (
    (f.user_a = p_user_id AND f.user_b = hist.counterparty_id) OR
    (f.user_b = p_user_id AND f.user_a = hist.counterparty_id)
  )
  LEFT JOIN public.expense_splits es ON es.user_id = hist.counterparty_id
  LEFT JOIN public.expenses e ON e.id = es.expense_id
  LEFT JOIN public.groups g ON g.id = e.group_id
  WHERE e.group_id IS NOT NULL
  GROUP BY g.id, g.name, g.avatar_url;

  SELECT JSONB_BUILD_OBJECT(
    'total_expenses', COUNT(DISTINCT e.id),
    'total_settled_splits', COUNT(DISTINCT CASE WHEN es.is_settled THEN es.id END),
    'total_unsettled_splits', COUNT(DISTINCT CASE WHEN NOT es.is_settled THEN es.id END),
    'total_settled_amount', COALESCE(SUM(CASE WHEN es.is_settled THEN es.settled_amount ELSE 0 END), 0),
    'total_unsettled_amount', COALESCE(SUM(CASE WHEN NOT es.is_settled THEN es.computed_amount - COALESCE(es.settled_amount, 0) ELSE 0 END), 0)
  )
  INTO v_settlement
  FROM public.expenses e
  LEFT JOIN public.expense_splits es ON es.expense_id = e.id
  WHERE e.paid_by_user_id = p_user_id
    AND e.is_payment = false
    AND e.expense_date <= CURRENT_DATE;

  RETURN QUERY
  SELECT
    true,
    NULL::TEXT,
    p_user_id,
    (SELECT full_name FROM public.profiles WHERE id = p_user_id),
    (SELECT email FROM auth.users WHERE id = p_user_id),
    v_balance.total_owed_to_me,
    v_balance.total_i_owe,
    v_balance.net_balance,
    'USD'::TEXT,
    COALESCE(v_debts_person, '[]'::JSONB),
    COALESCE(v_debts_group, '[]'::JSONB),
    v_settlement;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_user_activities(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_activity_ledger(UUID, UUID, UUID, UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_debts_aggregated(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_debts_history(UUID) TO authenticated;

COMMIT;
