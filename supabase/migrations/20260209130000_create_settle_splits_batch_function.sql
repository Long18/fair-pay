-- Migration: Create batch settle splits function
-- Date: 2026-02-09
-- Fix: useSettleSplits hook was not setting settled_amount, causing dashboard balance mismatch

CREATE OR REPLACE FUNCTION public.settle_splits_batch(
  p_split_ids UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated INTEGER := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  UPDATE expense_splits
  SET
    is_settled = true,
    settled_amount = computed_amount,
    settled_at = NOW()
  WHERE id = ANY(p_split_ids)
    AND (is_settled = false OR COALESCE(settled_amount, 0) < computed_amount - 0.01);

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'splits_updated', v_updated
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.settle_splits_batch(UUID[]) TO authenticated;

COMMENT ON FUNCTION public.settle_splits_batch(UUID[]) IS
  'Batch settle splits by IDs. Sets settled_amount = computed_amount for each split.';
