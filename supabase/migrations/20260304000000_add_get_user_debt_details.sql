-- Migration: Add get_user_debt_details function
-- Date: 2026-03-04
-- Purpose: Returns individual expense-level debt breakdown between current user and a counterparty.
--          Used by AI chat and API to answer "what do I owe X for?" with full detail.

DROP FUNCTION IF EXISTS get_user_debt_details(UUID, UUID) CASCADE;

CREATE OR REPLACE FUNCTION get_user_debt_details(
  p_user_id UUID,
  p_counterparty_id UUID
)
RETURNS TABLE (
  expense_id UUID,
  description TEXT,
  category TEXT,
  expense_date DATE,
  currency TEXT,
  total_amount NUMERIC,
  split_amount NUMERIC,
  settled_amount NUMERIC,
  remaining_amount NUMERIC,
  is_settled BOOLEAN,
  i_owe_them BOOLEAN,
  paid_by_user_id UUID,
  paid_by_name TEXT,
  context_type TEXT,
  group_id UUID,
  group_name TEXT,
  friendship_id UUID,
  created_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $fn$
BEGIN
  RETURN QUERY
  SELECT
    e.id AS expense_id,
    e.description,
    e.category,
    e.expense_date,
    COALESCE(e.currency, 'VND') AS currency,
    e.amount AS total_amount,
    es.computed_amount AS split_amount,
    COALESCE(es.settled_amount, 0) AS settled_amount,
    CASE
      WHEN es.is_settled = true AND COALESCE(es.settled_amount, 0) >= es.computed_amount THEN 0::NUMERIC
      WHEN COALESCE(es.settled_amount, 0) > 0 THEN es.computed_amount - COALESCE(es.settled_amount, 0)
      ELSE es.computed_amount
    END AS remaining_amount,
    CASE
      WHEN es.is_settled = true AND COALESCE(es.settled_amount, 0) >= es.computed_amount THEN true
      ELSE false
    END AS is_settled,
    -- i_owe_them: true if current user is the one who owes (split user), false if current user paid
    (es.user_id = p_user_id) AS i_owe_them,
    e.paid_by_user_id,
    payer.full_name AS paid_by_name,
    e.context_type,
    e.group_id,
    g.name AS group_name,
    e.friendship_id,
    e.created_at
  FROM expenses e
  INNER JOIN expense_splits es ON e.id = es.expense_id
  LEFT JOIN profiles payer ON payer.id = e.paid_by_user_id
  LEFT JOIN groups g ON g.id = e.group_id
  WHERE
    COALESCE(e.is_payment, false) = false
    AND e.expense_date <= CURRENT_DATE
    AND es.user_id != e.paid_by_user_id
    -- Filter: only debts between p_user_id and p_counterparty_id
    AND (
      (e.paid_by_user_id = p_user_id AND es.user_id = p_counterparty_id)
      OR
      (e.paid_by_user_id = p_counterparty_id AND es.user_id = p_user_id)
    )
  ORDER BY e.expense_date DESC, e.created_at DESC;
END;
$fn$;

GRANT EXECUTE ON FUNCTION get_user_debt_details(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION get_user_debt_details(UUID, UUID) IS
  'Get detailed expense-level debt breakdown between two users. Returns each individual expense with description, date, amounts, settlement status, and context (group/friend). Used by AI chat get_debt_details tool.';
