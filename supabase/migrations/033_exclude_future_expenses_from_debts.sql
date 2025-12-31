-- Migration: Exclude Future-Dated Expenses from Debt Calculations
-- Description: Updates user_debts_summary and user_debts_history views to only include
--              expenses where expense_date <= CURRENT_DATE. This prevents recurring
--              expenses that are scheduled for the future from appearing in current balances.
--
-- Problem: Recurring expenses create future-dated expense records, which were being
--          included in debt calculations even though they haven't occurred yet.
--
-- Solution: Add expense_date filter to both debt calculation views.

BEGIN;

-- Drop and recreate user_debts_summary view with date filter
DROP VIEW IF EXISTS user_debts_summary CASCADE;

CREATE OR REPLACE VIEW user_debts_summary AS
SELECT
  es.user_id as owes_user,
  e.paid_by_user_id as owed_user,
  SUM(
    CASE
      -- If fully settled, debt is 0
      WHEN es.is_settled = true AND es.settled_amount >= es.computed_amount THEN 0
      -- If partially settled, subtract settled amount from computed amount
      WHEN es.settled_amount > 0 THEN es.computed_amount - es.settled_amount
      -- If not settled at all, use full computed amount
      ELSE es.computed_amount
    END
  ) as amount_owed
FROM expense_splits es
JOIN expenses e ON e.id = es.expense_id
WHERE e.is_payment = false
  AND es.user_id != e.paid_by_user_id
  AND e.expense_date <= CURRENT_DATE  -- NEW: Only include expenses that have occurred
  -- Only include splits with remaining debt
  AND (
    (es.is_settled = false) OR
    (es.is_settled = true AND es.settled_amount < es.computed_amount)
  )
GROUP BY es.user_id, e.paid_by_user_id
HAVING SUM(
  CASE
    WHEN es.is_settled = true AND es.settled_amount >= es.computed_amount THEN 0
    WHEN es.settled_amount > 0 THEN es.computed_amount - es.settled_amount
    ELSE es.computed_amount
  END
) > 0;

-- Drop and recreate user_debts_history view with date filter
DROP VIEW IF EXISTS user_debts_history CASCADE;

CREATE OR REPLACE VIEW user_debts_history AS
SELECT
  es.user_id as owes_user,
  e.paid_by_user_id as owed_user,
  SUM(es.computed_amount) as total_amount,
  SUM(COALESCE(es.settled_amount, 0)) as settled_amount,
  SUM(
    CASE
      -- If fully settled, remaining debt is 0
      WHEN es.is_settled = true AND es.settled_amount >= es.computed_amount THEN 0
      -- If partially settled, subtract settled amount
      WHEN es.settled_amount > 0 THEN es.computed_amount - es.settled_amount
      -- If not settled, use full amount
      ELSE es.computed_amount
    END
  ) as remaining_amount,
  COUNT(DISTINCT e.id) as transaction_count,
  MAX(e.expense_date) as last_transaction_date
FROM expense_splits es
JOIN expenses e ON e.id = es.expense_id
WHERE e.is_payment = false
  AND es.user_id != e.paid_by_user_id
  AND e.expense_date <= CURRENT_DATE  -- NEW: Only include expenses that have occurred
GROUP BY es.user_id, e.paid_by_user_id
HAVING SUM(es.computed_amount) > 0;  -- Only show if there was ever a debt

COMMENT ON VIEW user_debts_summary IS 'Active debts summary excluding future-dated expenses';
COMMENT ON VIEW user_debts_history IS 'Historical debts including settled debts, excluding future-dated expenses';

COMMIT;

