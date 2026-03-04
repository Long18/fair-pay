-- Migration: Fix get_expense_og_data runtime type mismatch
-- Issue: anon RPC call fails with "structure of query does not match function result type"
-- Cause: selected columns use enum/varchar/domain types that are stricter than RETURNS TABLE text columns
-- Fix: cast selected values explicitly to declared return types

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
  receipt_mime_type TEXT
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
    a.mime_type::TEXT AS receipt_mime_type
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
  WHERE e.id = p_expense_id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_expense_og_data(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_expense_og_data(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_expense_og_data(UUID) TO service_role;

COMMENT ON FUNCTION get_expense_og_data(UUID) IS
  'Returns expense data for OG image generation. Explicit casts prevent return type mismatch for anon RPC calls.';
