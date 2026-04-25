-- Add per-counterparty debt context to the admin email devtool summary.
-- The reminder UI/email needs this to explain who the recipient owes.

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
          'direction', 'user_owes_counterparty'
        )
        ORDER BY ABS(n.net_remaining) DESC, COALESCE(cp.full_name, au.email, n.counterparty_key)
      ) AS debt_breakdown
    FROM netted n
    LEFT JOIN public.profiles cp
      ON cp.id::TEXT = n.counterparty_key
    LEFT JOIN auth.users au
      ON au.id::TEXT = n.counterparty_key
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
  'Admin-only email devtool summary. Debtor rows include dashboard-equivalent totals and per-counterparty debt context for reminder emails.';
