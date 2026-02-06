-- Migration: Fix "function max(uuid) does not exist" error in get_all_users_debt_detailed
-- Date: 2026-02-06
-- Problem: Navigation causes database error due to invalid column references in person_debts CTE
-- Root cause: Referencing non-existent columns in user_debts_summary view (id, currency)
-- Solution: Remove invalid references and properly handle NULL checks and aggregations

-- Drop the problematic function
DROP FUNCTION IF EXISTS public.get_all_users_debt_detailed(INT, INT) CASCADE;

-- Recreate with fixed logic
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
  person_debts AS (
    -- For each user, get their individual debt relationships with other users
    -- FIXED: Only join to user_debts_summary when we have valid debt data (not NULL)
    -- FIXED: Don't reference non-existent columns (id, currency) from user_debts_summary
    SELECT
      ud.id as user_id,
      JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'counterparty_id', CASE
            WHEN uds.owed_user = ud.id THEN uds.owes_user
            ELSE uds.owed_user
          END,
          'counterparty_name', CASE
            WHEN uds.owed_user = ud.id THEN COALESCE(counterparty_owes.full_name, 'Unknown User')
            ELSE COALESCE(counterparty_lends.full_name, 'Unknown User')
          END,
          'remaining_amount', uds.amount_owed,
          'currency', 'USD',
          'i_owe_them', (uds.owes_user = ud.id)
        ) ORDER BY uds.amount_owed DESC
      ) as debts_by_person
    FROM user_debts ud
    LEFT JOIN user_debts_summary uds ON (uds.owed_user = ud.id OR uds.owes_user = ud.id)
    LEFT JOIN profiles counterparty_owes ON uds.owes_user = counterparty_owes.id
    LEFT JOIN profiles counterparty_lends ON uds.owed_user = counterparty_lends.id
    WHERE uds.owed_user IS NOT NULL OR uds.owes_user IS NOT NULL
    GROUP BY ud.id
  ),
  group_debts AS (
    -- For each user, get groups where they have outstanding debts
    SELECT
      ud.id as user_id,
      JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'group_id', g.id,
          'group_name', g.name
        ) ORDER BY g.name
      ) FILTER (WHERE g.id IS NOT NULL) as debts_by_group
    FROM user_debts ud
    LEFT JOIN expenses e ON (
      e.paid_by_user_id = ud.id
      OR EXISTS (
        SELECT 1 FROM expense_splits es
        WHERE es.expense_id = e.id AND es.user_id = ud.id
      )
    )
    LEFT JOIN groups g ON e.group_id = g.id
    WHERE g.id IS NOT NULL AND COALESCE(e.is_payment, false) = false
    GROUP BY ud.id
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
    COALESCE(pd.debts_by_person, '[]'::JSONB) as debts_by_person,
    COALESCE(gd.debts_by_group, '[]'::JSONB) as debts_by_group,
    tu.cnt
  FROM user_debts ud
  LEFT JOIN person_debts pd ON ud.id = pd.user_id
  LEFT JOIN group_debts gd ON ud.id = gd.user_id
  CROSS JOIN total_users tu
  ORDER BY ud.net_balance DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.get_all_users_debt_detailed(INT, INT) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.get_all_users_debt_detailed(INT, INT) IS 'Get detailed debt breakdown for all users (admin only). Returns per-person debts and group involvement with pagination. Fixed: removed invalid references to non-existent columns in user_debts_summary view.';
