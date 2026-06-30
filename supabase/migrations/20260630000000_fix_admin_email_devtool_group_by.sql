-- Fix admin_get_email_devtool_summary: GROUP BY JSONB crash + add emails array
--
-- Root cause of 500: user_debts CTE had `db.debt_breakdown, gb.group_breakdown`
-- (JSONB) in GROUP BY. PostgreSQL has no btree equality operator for JSONB so
-- this raises "could not identify an equality operator" at runtime.
-- Fix: aggregate numeric debt totals in a separate one-row-per-user CTE, then
-- join JSONB summaries without GROUP BY/MAX on JSONB values.
--
-- Missing feature: add per-debtor `emails` array from public.user_emails so the
-- DevTool can show/select recipient addresses beyond the single profiles.email.

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
      e.group_id,
      g.name AS group_name,
      g.avatar_url AS group_avatar_url,
      e.paid_by_user_id,
      payer.full_name AS payer_name,
      payer.email AS payer_profile_email,
      payer_auth.email AS payer_auth_email,
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
    LEFT JOIN public.groups g ON g.id = e.group_id
    LEFT JOIN public.profiles payer ON payer.id = e.paid_by_user_id
    LEFT JOIN auth.users payer_auth ON payer_auth.id = e.paid_by_user_id
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
          'counterparty_email', COALESCE(cp.email, au.email),
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
  grouped_transaction_rows AS (
    SELECT
      us.split_user_id AS user_id,
      us.group_id,
      COALESCE(us.group_name, 'Direct / Ngoài group') AS group_name,
      us.group_avatar_url,
      us.exp_currency,
      us.paid_by_user_id::TEXT AS counterparty_key,
      COALESCE(us.payer_name, us.payer_profile_email, us.payer_auth_email, us.paid_by_user_id::TEXT) AS counterparty_name,
      COALESCE(us.payer_profile_email, us.payer_auth_email) AS counterparty_email,
      us.expense_id,
      us.description,
      us.expense_date,
      us.remaining_amt,
      ROW_NUMBER() OVER (
        PARTITION BY
          us.split_user_id,
          us.group_id,
          us.exp_currency,
          us.paid_by_user_id
        ORDER BY us.expense_date DESC, us.expense_id
      ) AS rn,
      COUNT(*) OVER (
        PARTITION BY
          us.split_user_id,
          us.group_id,
          us.exp_currency,
          us.paid_by_user_id
      ) AS transaction_count
    FROM user_splits us
    WHERE us.split_user_id IS NOT NULL
      AND us.remaining_amt > 0
  ),
  grouped_counterparty_rows AS (
    SELECT
      gtr.user_id,
      gtr.group_id,
      gtr.group_name,
      gtr.group_avatar_url,
      gtr.exp_currency,
      gtr.counterparty_key,
      gtr.counterparty_name,
      gtr.counterparty_email,
      SUM(gtr.remaining_amt) AS amount,
      MAX(gtr.transaction_count)::INT AS transaction_count,
      jsonb_agg(
        jsonb_build_object(
          'expense_id', gtr.expense_id,
          'description', gtr.description,
          'amount', gtr.remaining_amt,
          'currency', gtr.exp_currency,
          'expense_date', gtr.expense_date
        )
        ORDER BY gtr.expense_date DESC, gtr.expense_id
      ) FILTER (WHERE gtr.rn <= 8) AS transactions
    FROM grouped_transaction_rows gtr
    GROUP BY
      gtr.user_id,
      gtr.group_id,
      gtr.group_name,
      gtr.group_avatar_url,
      gtr.exp_currency,
      gtr.counterparty_key,
      gtr.counterparty_name,
      gtr.counterparty_email
  ),
  grouped_counterparties AS (
    SELECT
      gcr.user_id,
      gcr.group_id,
      gcr.group_name,
      gcr.group_avatar_url,
      gcr.exp_currency,
      SUM(gcr.amount) AS subtotal_amount,
      jsonb_agg(
        jsonb_build_object(
          'counterparty_key', gcr.counterparty_key,
          'counterparty_name', gcr.counterparty_name,
          'counterparty_email', gcr.counterparty_email,
          'amount', gcr.amount,
          'currency', gcr.exp_currency,
          'transaction_count', gcr.transaction_count,
          'transactions', COALESCE(gcr.transactions, '[]'::JSONB)
        )
        ORDER BY gcr.amount DESC, gcr.counterparty_name
      ) AS counterparties
    FROM grouped_counterparty_rows gcr
    GROUP BY
      gcr.user_id,
      gcr.group_id,
      gcr.group_name,
      gcr.group_avatar_url,
      gcr.exp_currency
  ),
  group_breakdown AS (
    SELECT
      gc.user_id,
      jsonb_agg(
        jsonb_build_object(
          'group_id', gc.group_id,
          'group_name', gc.group_name,
          'group_avatar_url', gc.group_avatar_url,
          'subtotal_amount', gc.subtotal_amount,
          'currency', gc.exp_currency,
          'counterparties', gc.counterparties
        )
        ORDER BY gc.subtotal_amount DESC, gc.group_name
      ) AS group_breakdown
    FROM grouped_counterparties gc
    GROUP BY gc.user_id
  ),
  user_emails_agg AS (
    -- Aggregate per-user emails from user_emails table for the recipient picker.
    SELECT
      ue.user_id,
      jsonb_agg(
        jsonb_build_object(
          'id', ue.id,
          'email', ue.email,
          'is_primary', ue.is_primary,
          'receives_notifications', ue.receives_notifications,
          'is_verified', ue.is_verified
        )
        ORDER BY ue.is_primary DESC, ue.created_at ASC
      ) AS emails
    FROM public.user_emails ue
    WHERE ue.receives_notifications = TRUE
       OR ue.is_primary = TRUE
    GROUP BY ue.user_id
  ),
  debt_totals AS (
    SELECT
      n.user_id,
      COALESCE(SUM(ABS(n.net_remaining)) FILTER (WHERE n.net_remaining > 0), 0)::NUMERIC(12,2) AS total_i_owe,
      (
        COALESCE(SUM(ABS(n.net_remaining)) FILTER (WHERE n.net_remaining < 0), 0)
        - COALESCE(SUM(ABS(n.net_remaining)) FILTER (WHERE n.net_remaining > 0), 0)
      )::NUMERIC(12,2) AS net_balance,
      COUNT(n.counterparty_key)::INT AS active_debt_relationships
    FROM netted n
    GROUP BY n.user_id
  ),
  user_debts AS (
    SELECT
      p.id AS user_id,
      p.full_name,
      p.avatar_url,
      COALESCE(NULLIF(p.email, ''), u.email) AS email,
      (u.id IS NOT NULL) AS has_auth_account,
      COALESCE(dt.total_i_owe, 0)::NUMERIC(12,2) AS total_i_owe,
      COALESCE(dt.net_balance, 0)::NUMERIC(12,2) AS net_balance,
      COALESCE(dt.active_debt_relationships, 0)::INT AS active_debt_relationships,
      COALESCE(db.debt_breakdown, '[]'::JSONB) AS debt_breakdown,
      COALESCE(gb.group_breakdown, '[]'::JSONB) AS group_breakdown,
      COALESCE(ea.emails, '[]'::JSONB) AS emails
    FROM public.profiles p
    LEFT JOIN auth.users u ON u.id = p.id
    LEFT JOIN debt_totals dt ON dt.user_id = p.id
    LEFT JOIN debtor_breakdown db ON db.user_id = p.id
    LEFT JOIN group_breakdown gb ON gb.user_id = p.id
    LEFT JOIN user_emails_agg ea ON ea.user_id = p.id
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
  'Admin-only email devtool summary. FIXED: JSONB columns removed from grouped debt aggregation (was causing btree comparison errors at runtime). Added per-debtor emails array from user_emails table for the recipient picker.';
