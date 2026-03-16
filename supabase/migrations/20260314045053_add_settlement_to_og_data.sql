-- Migration: Add settlement status fields to get_expense_og_data
-- Purpose: OG preview images reflect per-expense settlement state
-- Adds: all_settled (BOOLEAN), latest_settled_at (TIMESTAMPTZ)
-- Note: DROP required because PG cannot change RETURNS TABLE columns via CREATE OR REPLACE

DROP FUNCTION IF EXISTS get_expense_og_data(UUID);

CREATE OR REPLACE FUNCTION get_expense_og_data(p_expense_id UUID)
RETURNS TABLE (
  id UUID,
  description TEXT,
  amount NUMERIC,
  currency TEXT,
  category TEXT,
  expense_date DATE,
  payer_name TEXT,
  receipt_storage_path TEXT,
  receipt_mime_type TEXT,
  all_settled BOOLEAN,
  latest_settled_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    e.id,
    e.description::TEXT,
    e.amount::NUMERIC,
    e.currency::TEXT,
    e.category::TEXT,
    e.expense_date::DATE,
    p.full_name::TEXT AS payer_name,
    a.storage_path::TEXT AS receipt_storage_path,
    a.mime_type::TEXT AS receipt_mime_type,
    COALESCE(s.all_settled, false) AS all_settled,
    s.latest_settled_at
  FROM expenses e
  LEFT JOIN profiles p ON p.id = e.paid_by_user_id
  LEFT JOIN LATERAL (
    SELECT att.storage_path, att.mime_type
    FROM attachments att
    WHERE att.expense_id = e.id
      AND att.mime_type LIKE 'image/%'
    ORDER BY att.created_at ASC
    LIMIT 1
  ) a ON true
  LEFT JOIN LATERAL (
    SELECT
      bool_and(es.is_settled) AS all_settled,
      MAX(es.settled_at) AS latest_settled_at
    FROM expense_splits es
    WHERE es.expense_id = e.id
  ) s ON true
  WHERE e.id = p_expense_id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_expense_og_data(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_expense_og_data(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_expense_og_data(UUID) TO service_role;

COMMENT ON FUNCTION get_expense_og_data(UUID) IS
  'Returns expense data for OG image generation including settlement status. Explicit casts prevent return type mismatch for anon RPC calls.';
