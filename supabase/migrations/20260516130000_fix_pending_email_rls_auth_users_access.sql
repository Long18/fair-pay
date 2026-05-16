-- Fix: the previous migration used (SELECT email FROM auth.users WHERE id = auth.uid())
-- inside the RLS USING clause. The `authenticated` role cannot query auth.users directly,
-- causing a 403 on all expense_splits requests.
--
-- Fix: use auth.email() JWT helper (runs without a table scan, no auth.users permission needed).
-- The SECURITY DEFINER function already has access to auth.users, so that path stays as-is.

BEGIN;

DROP POLICY IF EXISTS "Can view splits for accessible expenses" ON public.expense_splits;
CREATE POLICY "Can view splits for accessible expenses"
  ON public.expense_splits
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()                              -- own split (registered at add-time)
    OR pending_email = auth.email()                   -- own split (added by email pre-claim)
    OR public.auth_user_can_access_expense(expense_id) -- shared expense participant
    OR public.is_admin()
  );

COMMIT;
