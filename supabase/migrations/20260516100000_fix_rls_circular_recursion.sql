-- Hotfix: break circular RLS recursion between expenses and expense_splits
-- Root cause: expenses policy queries expense_splits, and expense_splits policy
-- queries expenses — PostgreSQL applies RLS to sub-queries in policies, causing
-- infinite recursion (SQLSTATE 42P17).
--
-- Fix: introduce a SECURITY DEFINER helper that reads both tables bypassing RLS.
-- All three policies (expenses, expense_splits, payment_events) delegate to this
-- single function, so there is no cross-table policy evaluation.

BEGIN;

-- ---------------------------------------------------------------------------
-- Helper: checks whether the current authenticated user may access an expense.
-- SECURITY DEFINER runs as the function owner (postgres), bypassing RLS on the
-- tables it queries — this is the only safe way to break the cycle.
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
    );
$$;

-- ---------------------------------------------------------------------------
-- Rebuild policies using the helper (no cross-table RLS evaluation)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Participants can view expenses" ON public.expenses;
CREATE POLICY "Participants can view expenses"
  ON public.expenses
  FOR SELECT
  TO authenticated
  USING (public.auth_user_can_access_expense(id));

DROP POLICY IF EXISTS "Can view splits for accessible expenses" ON public.expense_splits;
CREATE POLICY "Can view splits for accessible expenses"
  ON public.expense_splits
  FOR SELECT
  TO authenticated
  USING (public.auth_user_can_access_expense(expense_id));

DROP POLICY IF EXISTS "payment_events_read_policy" ON public.payment_events;
CREATE POLICY "payment_events_read_policy"
  ON public.payment_events
  FOR SELECT
  TO authenticated
  USING (public.auth_user_can_access_expense(expense_id));

COMMIT;
