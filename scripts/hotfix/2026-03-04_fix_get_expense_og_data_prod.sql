-- Hotfix: Fix OG RPC return-type mismatch causing /api/og/expense to show "Expense not found"
-- Date: 2026-03-04
-- Safe to run multiple times.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_expense_og_data(p_expense_id UUID)
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
  FROM public.expenses e
  LEFT JOIN public.profiles p ON p.id = e.paid_by_user_id
  LEFT JOIN LATERAL (
    SELECT att.storage_path, att.mime_type
    FROM public.attachments att
    WHERE att.expense_id = e.id
      AND att.mime_type LIKE 'image/%'
    ORDER BY att.created_at ASC
    LIMIT 1
  ) a ON true
  WHERE e.id = p_expense_id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_expense_og_data(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_expense_og_data(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_expense_og_data(UUID) TO service_role;

COMMENT ON FUNCTION public.get_expense_og_data(UUID) IS
  'Returns expense data for OG image generation. Explicit casts prevent runtime return-type mismatch.';

COMMIT;

-- Optional smoke test (replace UUID if needed):
-- SELECT id, description, amount, currency, category, expense_date
-- FROM public.get_expense_og_data('0b5b1be4-8f79-4b63-bbdc-7c1c111d50f1'::UUID);
