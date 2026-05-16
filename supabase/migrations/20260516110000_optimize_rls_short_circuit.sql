-- Perf fix: short-circuit RLS policies on expense_splits and expenses
-- Root cause of "Fetch failed loading: HEAD" timeouts:
--   The expense_splits HEAD count check (user_id = auth.uid()) was calling
--   auth_user_can_access_expense() for EVERY row — O(n) function invocations,
--   each querying two tables via SECURITY DEFINER. For users with many splits
--   this exceeded Supabase's request timeout.
--
-- Fix: add a direct column check as the first OR condition so PostgreSQL
-- short-circuits before calling the function. Own splits and own expenses are
-- always accessible without any cross-table lookup.

BEGIN;

DROP POLICY IF EXISTS "Can view splits for accessible expenses" ON public.expense_splits;
CREATE POLICY "Can view splits for accessible expenses"
  ON public.expense_splits
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()                              -- own split: zero function calls
    OR public.auth_user_can_access_expense(expense_id) -- others' splits in shared expenses
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Participants can view expenses" ON public.expenses;
CREATE POLICY "Participants can view expenses"
  ON public.expenses
  FOR SELECT
  TO authenticated
  USING (
    paid_by_user_id = auth.uid()              -- own paid expense: zero function calls
    OR public.auth_user_can_access_expense(id) -- participant in someone else's expense
    OR public.is_admin()
  );

COMMIT;
