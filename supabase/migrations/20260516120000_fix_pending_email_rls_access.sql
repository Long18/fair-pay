-- Fix: allow claimed accounts to access expense_splits where they appear as
-- pending_email participants (user_id is NULL for pre-claim invites).
--
-- Root cause: expense_splits rows for email-invited users have user_id = NULL.
-- The RLS short-circuit `user_id = auth.uid()` evaluates NULL = uid → NULL
-- (not TRUE), so the row is invisible. auth_user_can_access_expense() also
-- only checks user_id, missing the pending_email path.
--
-- Fix: add a pending_email → auth.users email lookup in both places.

BEGIN;

-- ---------------------------------------------------------------------------
-- Update helper: add pending_email match alongside user_id match
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.auth_user_can_access_expense(p_expense_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    COALESCE(
      (
        SELECT paid_by_user_id = auth.uid() OR public.is_admin()
        FROM public.expenses
        WHERE id = p_expense_id
      ),
      false
    )
    OR EXISTS (
      SELECT 1
      FROM public.expense_splits
      WHERE expense_id = p_expense_id
        AND user_id = auth.uid()
    )
    OR EXISTS (
      -- Claimed account accessing a split that was added by their email
      -- before they registered (user_id is NULL on those rows)
      SELECT 1
      FROM public.expense_splits es
      JOIN auth.users u ON u.email = es.pending_email
      WHERE es.expense_id = p_expense_id
        AND u.id = auth.uid()
    );
$$;

-- ---------------------------------------------------------------------------
-- Rebuild expense_splits policy: extend short-circuit to cover pending_email
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Can view splits for accessible expenses" ON public.expense_splits;
CREATE POLICY "Can view splits for accessible expenses"
  ON public.expense_splits
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()                              -- own split (registered at add-time)
    OR pending_email = (                              -- own split (added by email pre-claim)
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    OR public.auth_user_can_access_expense(expense_id) -- shared expense participant
    OR public.is_admin()
  );

COMMIT;
