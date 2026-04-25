-- Persist structured reminder context so the email worker can render debt details.

ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS email_context JSONB;

DROP FUNCTION IF EXISTS public.get_email_notification_queue(UUID[], BOOLEAN);

CREATE OR REPLACE FUNCTION public.get_email_notification_queue(
  p_notification_ids UUID[] DEFAULT NULL,
  p_include_recent BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  notification_id   UUID,
  user_id           UUID,
  user_email        TEXT,
  user_name         TEXT,
  notification_type TEXT,
  title             TEXT,
  message           TEXT,
  link              TEXT,
  created_at        TIMESTAMPTZ,
  email_context     JSONB
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT
    n.id        AS notification_id,
    n.user_id,
    u.email     AS user_email,
    p.full_name AS user_name,
    n.type      AS notification_type,
    n.title,
    n.message,
    n.link,
    n.created_at,
    n.email_context
  FROM public.notifications n
  JOIN auth.users u ON u.id = n.user_id
  JOIN public.profiles p ON p.id = n.user_id
  LEFT JOIN public.user_settings us ON us.user_id = n.user_id
  WHERE n.email_sent_at IS NULL
    AND (p_notification_ids IS NULL OR n.id = ANY(p_notification_ids))
    AND (p_include_recent OR n.created_at < now() - interval '2 minutes')
    AND u.email IS NOT NULL
    AND u.email != ''
    AND (us.email_notifications IS NULL OR us.email_notifications = true)
  ORDER BY n.user_id, n.created_at
  LIMIT 200;
$$;

REVOKE ALL ON FUNCTION public.get_email_notification_queue(UUID[], BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_email_notification_queue(UUID[], BOOLEAN) TO service_role;

COMMENT ON FUNCTION public.get_email_notification_queue(UUID[], BOOLEAN) IS
  'Service-role email queue reader. Optional notification ids let admin-triggered reminders bypass the normal 2-minute batching delay. Reminder rows may include email_context for rich debt breakdown rendering.';

CREATE OR REPLACE FUNCTION public.admin_get_email_devtool_summary(
  p_limit INT DEFAULT 100
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_pending_queue_count BIGINT;
  v_debtors JSONB;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can view email devtool summary';
  END IF;

  SELECT COUNT(*)
  INTO v_pending_queue_count
  FROM public.notifications
  WHERE email_sent_at IS NULL;

  WITH user_splits AS (
    SELECT
      e.id AS expense_id,
      e.description,
      e.expense_date,
      e.paid_by_user_id,
      e.currency AS exp_currency,
      es.user_id AS split_user_id,
      es.pending_email AS split_pending_email,
      CASE
        WHEN es.is_settled = true AND COALESCE(es.settled_amount, 0) >= es.computed_amount THEN 0
        WHEN COALESCE(es.settled_amount, 0) > 0 THEN es.computed_amount - COALESCE(es.settled_amount, 0)
        ELSE es.computed_amount
      END AS remaining_amt
    FROM public.expenses e
    INNER JOIN public.expense_splits es ON e.id = es.expense_id
    WHERE (es.user_id IS NOT NULL OR es.pending_email IS NOT NULL)
      AND (es.user_id != e.paid_by_user_id OR es.user_id IS NULL)
      AND COALESCE(e.is_payment, false) = false
      AND e.expense_date <= CURRENT_DATE
  ),
  signed_debts AS (
    SELECT
      us.split_user_id AS user_id,
      us.paid_by_user_id::TEXT AS counterparty_key,
      us.exp_currency,
      us.remaining_amt AS signed_remaining
    FROM user_splits us
    WHERE us.split_user_id IS NOT NULL

    UNION ALL

    SELECT
      us.paid_by_user_id AS user_id,
      COALESCE(us.split_user_id::TEXT, us.split_pending_email) AS counterparty_key,
      us.exp_currency,
      -us.remaining_amt AS signed_remaining
    FROM user_splits us
  ),
  netted AS (
    SELECT
      sd.user_id,
      sd.counterparty_key,
      sd.exp_currency,
      ROUND(SUM(sd.signed_remaining)) AS net_remaining
    FROM signed_debts sd
    WHERE sd.user_id IS NOT NULL
      AND sd.counterparty_key IS NOT NULL
    GROUP BY sd.user_id, sd.counterparty_key, sd.exp_currency
    HAVING ROUND(SUM(sd.signed_remaining)) != 0
  ),
  transaction_rows AS (
    SELECT
      us.split_user_id AS user_id,
      us.paid_by_user_id::TEXT AS counterparty_key,
      us.exp_currency,
      us.expense_id,
      us.description,
      us.expense_date,
      us.remaining_amt,
      ROW_NUMBER() OVER (
        PARTITION BY us.split_user_id, us.paid_by_user_id, us.exp_currency
        ORDER BY us.expense_date DESC, us.expense_id
      ) AS rn,
      COUNT(*) OVER (
        PARTITION BY us.split_user_id, us.paid_by_user_id, us.exp_currency
      ) AS total_count
    FROM user_splits us
    INNER JOIN netted n
      ON n.user_id = us.split_user_id
     AND n.counterparty_key = us.paid_by_user_id::TEXT
     AND n.exp_currency = us.exp_currency
     AND n.net_remaining > 0
    WHERE us.split_user_id IS NOT NULL
      AND us.remaining_amt > 0
  ),
  transaction_breakdown AS (
    SELECT
      tr.user_id,
      tr.counterparty_key,
      tr.exp_currency,
      MAX(tr.total_count)::INT AS transaction_count,
      jsonb_agg(
        jsonb_build_object(
          'expense_id', tr.expense_id,
          'description', tr.description,
          'amount', tr.remaining_amt,
          'currency', tr.exp_currency,
          'expense_date', tr.expense_date
        )
        ORDER BY tr.expense_date DESC, tr.expense_id
      ) FILTER (WHERE tr.rn <= 8) AS transactions
    FROM transaction_rows tr
    GROUP BY tr.user_id, tr.counterparty_key, tr.exp_currency
  ),
  debtor_breakdown AS (
    SELECT
      n.user_id,
      jsonb_agg(
        jsonb_build_object(
          'counterparty_key', n.counterparty_key,
          'counterparty_name', COALESCE(cp.full_name, au.email, n.counterparty_key),
          'counterparty_email', au.email,
          'amount', ABS(n.net_remaining),
          'currency', n.exp_currency,
          'direction', 'user_owes_counterparty',
          'transaction_count', COALESCE(tb.transaction_count, 0),
          'transactions', COALESCE(tb.transactions, '[]'::JSONB)
        )
        ORDER BY ABS(n.net_remaining) DESC, COALESCE(cp.full_name, au.email, n.counterparty_key)
      ) AS debt_breakdown
    FROM netted n
    LEFT JOIN public.profiles cp
      ON cp.id::TEXT = n.counterparty_key
    LEFT JOIN auth.users au
      ON au.id::TEXT = n.counterparty_key
    LEFT JOIN transaction_breakdown tb
      ON tb.user_id = n.user_id
     AND tb.counterparty_key = n.counterparty_key
     AND tb.exp_currency = n.exp_currency
    WHERE n.net_remaining > 0
    GROUP BY n.user_id
  ),
  user_debts AS (
    SELECT
      p.id AS user_id,
      p.full_name,
      u.email,
      COALESCE(SUM(ABS(n.net_remaining)) FILTER (WHERE n.net_remaining > 0), 0)::NUMERIC(12,2) AS total_i_owe,
      (
        COALESCE(SUM(ABS(n.net_remaining)) FILTER (WHERE n.net_remaining < 0), 0)
        - COALESCE(SUM(ABS(n.net_remaining)) FILTER (WHERE n.net_remaining > 0), 0)
      )::NUMERIC(12,2) AS net_balance,
      COUNT(n.counterparty_key)::INT AS active_debt_relationships,
      COALESCE(db.debt_breakdown, '[]'::JSONB) AS debt_breakdown
    FROM public.profiles p
    LEFT JOIN auth.users u ON u.id = p.id
    LEFT JOIN netted n ON n.user_id = p.id
    LEFT JOIN debtor_breakdown db ON db.user_id = p.id
    GROUP BY p.id, p.full_name, u.email, db.debt_breakdown
  )
  SELECT COALESCE(jsonb_agg(to_jsonb(d) ORDER BY d.total_i_owe DESC), '[]'::JSONB)
  INTO v_debtors
  FROM (
    SELECT *
    FROM user_debts
    WHERE total_i_owe > 0
      AND email IS NOT NULL
      AND email != ''
    ORDER BY total_i_owe DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 100)
  ) d;

  RETURN jsonb_build_object(
    'pending_queue_count', COALESCE(v_pending_queue_count, 0),
    'debtors', COALESCE(v_debtors, '[]'::JSONB)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_email_devtool_summary(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_email_devtool_summary(INT) TO authenticated;

COMMENT ON FUNCTION public.admin_get_email_devtool_summary(INT) IS
  'Admin-only email devtool summary. Debtor rows include dashboard-equivalent totals, per-counterparty debt context, and recent transaction details for reminder emails.';
