-- Migration: Fix Balance Calculations to Consider Settlement Status
-- Description: Updates the user_debts_summary view to subtract settled_amount from computed_amount
--              This ensures dashboard balances reflect partial and full settlements correctly

BEGIN;

-- Drop and recreate the user_debts_summary view to include settlement logic
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

-- The get_user_debts_aggregated function already uses this view,
-- so it will automatically benefit from the updated logic

COMMIT;

-- Verification query (commented out for production)
-- SELECT * FROM user_debts_summary LIMIT 10;

