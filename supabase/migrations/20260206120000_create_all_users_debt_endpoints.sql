-- Create all-users debt API endpoints
-- Provides public leaderboard and authenticated detailed views

-- 1. PUBLIC FUNCTION: Get summary of top debtors (no auth required)
CREATE OR REPLACE FUNCTION public.get_all_users_debt_summary(
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  net_balance NUMERIC(12,2),
  total_count BIGINT
)
LANGUAGE sql
STABLE
AS $$
  WITH user_balances AS (
    -- Calculate owed_to_me: sum where user is owed_user (paid_by)
    SELECT
      p.id,
      p.full_name,
      COALESCE(SUM(
        CASE
          WHEN owed_user = p.id THEN amount_owed
          WHEN owes_user = p.id THEN -amount_owed
          ELSE 0
        END
      ), 0) as net_balance
    FROM public.profiles p
    LEFT JOIN public.user_debts_summary uds ON (
      uds.owed_user = p.id OR uds.owes_user = p.id
    )
    GROUP BY p.id, p.full_name
    HAVING COALESCE(SUM(
      CASE
        WHEN owed_user = p.id THEN amount_owed
        WHEN owes_user = p.id THEN -amount_owed
        ELSE 0
      END
    ), 0) != 0
  )
  SELECT
    id as user_id,
    full_name,
    net_balance::NUMERIC(12,2),
    COUNT(*) OVER () as total_count
  FROM user_balances
  ORDER BY net_balance DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

-- Grant execute to public (no auth required)
GRANT EXECUTE ON FUNCTION public.get_all_users_debt_summary(INT, INT) TO anon, authenticated;

-- 2. AUTHENTICATED FUNCTION: Get detailed debt for all users (admin only)
CREATE OR REPLACE FUNCTION public.get_all_users_debt_detailed(
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  email TEXT,
  total_owed_to_me NUMERIC(12,2),
  total_i_owe NUMERIC(12,2),
  net_balance NUMERIC(12,2),
  active_debt_relationships INT,
  debts_by_person JSONB,
  debts_by_group JSONB,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admin check
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can view all user debts';
  END IF;

  RETURN QUERY
  WITH user_debts AS (
    SELECT
      p.id,
      p.full_name,
      u.email,
      COALESCE(SUM(CASE WHEN uds.owed_user = p.id THEN uds.amount_owed ELSE 0 END), 0)::NUMERIC(12,2) as total_owed_to_me,
      COALESCE(SUM(CASE WHEN uds.owes_user = p.id THEN uds.amount_owed ELSE 0 END), 0)::NUMERIC(12,2) as total_i_owe,
      COALESCE(
        SUM(CASE WHEN uds.owed_user = p.id THEN uds.amount_owed ELSE -uds.amount_owed END),
        0
      )::NUMERIC(12,2) as net_balance,
      COUNT(DISTINCT CASE WHEN uds.owed_user = p.id THEN uds.owes_user WHEN uds.owes_user = p.id THEN uds.owed_user END) as debt_relationships
    FROM profiles p
    LEFT JOIN auth.users u ON p.id = u.id
    LEFT JOIN user_debts_summary uds ON (uds.owed_user = p.id OR uds.owes_user = p.id)
    GROUP BY p.id, p.full_name, u.email
    HAVING COALESCE(
      SUM(CASE WHEN uds.owed_user = p.id THEN uds.amount_owed ELSE -uds.amount_owed END),
      0
    ) != 0
  ),
  total_users AS (
    SELECT COUNT(*) as cnt FROM user_debts
  )
  SELECT
    ud.id,
    ud.full_name,
    ud.email,
    ud.total_owed_to_me,
    ud.total_i_owe,
    ud.net_balance,
    ud.debt_relationships::INT,
    '[]'::JSONB,
    '[]'::JSONB,
    tu.cnt
  FROM user_debts ud
  CROSS JOIN total_users tu
  ORDER BY net_balance DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant execute to authenticated users (admin check inside function)
GRANT EXECUTE ON FUNCTION public.get_all_users_debt_detailed(INT, INT) TO authenticated;
