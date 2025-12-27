-- Migration: Add avatar_url to aggregated debts functions
-- Purpose: Display user avatars in Dashboard balances table

-- Update get_user_debts_aggregated to include avatar_url
CREATE OR REPLACE FUNCTION get_user_debts_aggregated(p_user_id UUID DEFAULT auth.uid())
RETURNS TABLE (
  counterparty_id UUID,
  counterparty_name TEXT,
  counterparty_avatar_url TEXT,
  amount NUMERIC,
  i_owe_them BOOLEAN
)
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH debt_calculations AS (
    SELECT
      CASE
        WHEN owes_user = p_user_id THEN owed_user
        WHEN owed_user = p_user_id THEN owes_user
        ELSE NULL
      END as other_user_id,
      CASE
        WHEN owes_user = p_user_id THEN amount_owed
        WHEN owed_user = p_user_id THEN -amount_owed
        ELSE 0
      END as signed_amount
    FROM user_debts_summary
    WHERE owes_user = p_user_id OR owed_user = p_user_id
  )
  SELECT
    dc.other_user_id,
    p.full_name,
    p.avatar_url,
    SUM(dc.signed_amount) as total_amount,
    SUM(dc.signed_amount) > 0 as i_owe_them_flag
  FROM debt_calculations dc
  INNER JOIN profiles p ON p.id = dc.other_user_id
  WHERE dc.other_user_id IS NOT NULL
  GROUP BY dc.other_user_id, p.full_name, p.avatar_url
  HAVING SUM(dc.signed_amount) != 0
  ORDER BY ABS(SUM(dc.signed_amount)) DESC;
END;
$$;

-- Update get_public_demo_debts to include avatar_url
CREATE OR REPLACE FUNCTION get_public_demo_debts()
RETURNS TABLE (
  counterparty_id UUID,
  counterparty_name TEXT,
  counterparty_avatar_url TEXT,
  amount NUMERIC,
  i_owe_them BOOLEAN,
  owed_to_name TEXT,
  owed_to_id UUID
)
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  v_demo_user_id UUID;
BEGIN
  -- Find user with most debts for demo purposes
  SELECT p.id INTO v_demo_user_id
  FROM profiles p
  INNER JOIN user_debts_summary uds ON (uds.owes_user = p.id OR uds.owed_user = p.id)
  GROUP BY p.id
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  -- If no user found, return empty
  IF v_demo_user_id IS NULL THEN
    RETURN;
  END IF;

  -- Return debts for that user
  RETURN QUERY
  WITH debt_calculations AS (
    SELECT
      CASE
        WHEN owes_user = v_demo_user_id THEN owed_user
        WHEN owed_user = v_demo_user_id THEN owes_user
        ELSE NULL
      END as other_user_id,
      CASE
        WHEN owes_user = v_demo_user_id THEN amount_owed
        WHEN owed_user = v_demo_user_id THEN -amount_owed
        ELSE 0
      END as signed_amount
    FROM user_debts_summary
    WHERE owes_user = v_demo_user_id OR owed_user = v_demo_user_id
  ),
  demo_user_name AS (
    SELECT full_name FROM profiles WHERE id = v_demo_user_id
  )
  SELECT
    dc.other_user_id,
    p.full_name as counterparty_name,
    p.avatar_url as counterparty_avatar_url,
    SUM(dc.signed_amount) as total_amount,
    SUM(dc.signed_amount) > 0 as i_owe_them_flag,
    dun.full_name as owed_to_name,
    v_demo_user_id as owed_to_id
  FROM debt_calculations dc
  INNER JOIN profiles p ON p.id = dc.other_user_id
  CROSS JOIN demo_user_name dun
  WHERE dc.other_user_id IS NOT NULL
  GROUP BY dc.other_user_id, p.full_name, p.avatar_url, dun.full_name
  HAVING SUM(dc.signed_amount) != 0
  ORDER BY ABS(SUM(dc.signed_amount)) DESC;
END;
$$;

-- Ensure permissions are set
GRANT EXECUTE ON FUNCTION get_user_debts_aggregated(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_public_demo_debts() TO anon, authenticated;
