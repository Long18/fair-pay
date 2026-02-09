-- Migration: Create public who-owes-who function
-- Date: 2026-02-09
-- Purpose: Expose individual debt relationships (A owes B $X) for public API
-- Uses existing user_debts_summary view which already handles settlement logic

CREATE OR REPLACE FUNCTION public.get_who_owes_who(
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  from_user_id UUID,
  from_user_name TEXT,
  to_user_id UUID,
  to_user_name TEXT,
  amount NUMERIC(12,2),
  total_count BIGINT
)
LANGUAGE sql
STABLE
AS $$
  WITH debt_pairs AS (
    SELECT
      uds.owes_user,
      p_from.full_name AS from_name,
      uds.owed_user,
      p_to.full_name AS to_name,
      uds.amount_owed
    FROM user_debts_summary uds
    JOIN profiles p_from ON p_from.id = uds.owes_user
    JOIN profiles p_to ON p_to.id = uds.owed_user
    WHERE uds.amount_owed > 0
  )
  SELECT
    dp.owes_user AS from_user_id,
    dp.from_name AS from_user_name,
    dp.owed_user AS to_user_id,
    dp.to_name AS to_user_name,
    dp.amount_owed::NUMERIC(12,2) AS amount,
    COUNT(*) OVER () AS total_count
  FROM debt_pairs dp
  ORDER BY dp.amount_owed DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

-- Public access (same as all-users-summary)
GRANT EXECUTE ON FUNCTION public.get_who_owes_who(INT, INT) TO anon, authenticated;

COMMENT ON FUNCTION public.get_who_owes_who(INT, INT) IS
  'Get all active debt pairs (who owes who and how much). Public endpoint, sorted by amount descending.';
