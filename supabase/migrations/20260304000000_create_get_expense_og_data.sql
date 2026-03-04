-- Migration: Create get_expense_og_data function for OG image generation
-- Problem: OG image API uses anon key but expenses table RLS requires authenticated user
-- Solution: SECURITY DEFINER function bypasses RLS, returns only data needed for OG image

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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.description,
    e.amount,
    e.currency,
    e.category,
    e.expense_date,
    p.full_name AS payer_name,
    a.storage_path AS receipt_storage_path,
    a.mime_type AS receipt_mime_type
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
  WHERE e.id = p_expense_id;
END;
$$;

-- Grant execute to anon (OG image API uses anon key)
GRANT EXECUTE ON FUNCTION get_expense_og_data(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_expense_og_data(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_expense_og_data(UUID) TO service_role;

COMMENT ON FUNCTION get_expense_og_data(UUID) IS
  'Returns expense data needed for OG image generation. SECURITY DEFINER bypasses RLS so anon API calls can fetch expense info for link previews.';
