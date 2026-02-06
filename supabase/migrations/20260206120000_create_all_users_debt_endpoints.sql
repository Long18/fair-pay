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
  SELECT
    p.id as user_id,
    p.full_name,
    COALESCE(
      SUM(CASE
        WHEN dh.i_owe_them = false THEN dh.remaining_amount
        ELSE -dh.remaining_amount
      END),
      0
    )::NUMERIC(12,2) as net_balance,
    COUNT(*) OVER () as total_count
  FROM public.profiles p
  LEFT JOIN public.user_debts_summary dh ON p.id = dh.user_id
  GROUP BY p.id, p.full_name
  HAVING COALESCE(
    SUM(CASE
      WHEN dh.i_owe_them = false THEN dh.remaining_amount
      ELSE -dh.remaining_amount
    END),
    0
  ) != 0
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
DECLARE
  v_admin_check BOOLEAN;
  v_total_count BIGINT;
BEGIN
  -- Admin check
  v_admin_check := is_admin();
  IF NOT v_admin_check THEN
    RAISE EXCEPTION 'Only admins can view all user debts';
  END IF;

  -- Get total count
  SELECT COUNT(DISTINCT p.id) INTO v_total_count
  FROM profiles p
  LEFT JOIN user_debts_summary uds ON p.id = uds.user_id
  GROUP BY p.id
  HAVING COALESCE(
    SUM(CASE WHEN uds.i_owe_them = false THEN uds.remaining_amount ELSE -uds.remaining_amount END),
    0
  ) != 0;

  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    u.email,
    COALESCE(bal.total_owed_to_me, 0)::NUMERIC(12,2),
    COALESCE(bal.total_i_owe, 0)::NUMERIC(12,2),
    COALESCE(bal.net_balance, 0)::NUMERIC(12,2),
    COUNT(DISTINCT dh.counterparty_id)::INT,
    COALESCE(
      JSONB_AGG(DISTINCT JSONB_BUILD_OBJECT(
        'counterparty_id', dh.counterparty_id,
        'counterparty_name', dh.counterparty_name,
        'remaining_amount', dh.remaining_amount,
        'i_owe_them', dh.i_owe_them
      )) FILTER (WHERE dh.counterparty_id IS NOT NULL),
      '[]'::JSONB
    ),
    COALESCE(
      JSONB_AGG(DISTINCT JSONB_BUILD_OBJECT(
        'group_id', g.id,
        'group_name', g.name
      )) FILTER (WHERE g.id IS NOT NULL),
      '[]'::JSONB
    ),
    v_total_count
  FROM profiles p
  LEFT JOIN auth.users u ON p.id = u.id
  LEFT JOIN (
    SELECT user_id, total_owed_to_me, total_i_owe, net_balance
    FROM get_user_balance(p.id)
  ) bal ON true
  LEFT JOIN user_debts_history(p.id) dh ON true
  LEFT JOIN expense_splits es ON es.user_id = dh.counterparty_id
  LEFT JOIN expenses e ON e.id = es.expense_id
  LEFT JOIN groups g ON g.id = e.group_id
  WHERE COALESCE(bal.net_balance, 0) != 0
  GROUP BY p.id, p.full_name, u.email, bal.total_owed_to_me, bal.total_i_owe, bal.net_balance
  ORDER BY net_balance DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant execute to authenticated users (admin check inside function)
GRANT EXECUTE ON FUNCTION public.get_all_users_debt_detailed(INT, INT) TO authenticated;
