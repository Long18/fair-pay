-- ========================================
-- Restoration Script: Restore Correct Debt States
-- Purpose: Revert incorrect settlements from settle_all_debts_with_person function
-- WARNING: Run analysis script first to identify affected operations
-- ========================================

-- IMPORTANT: This script should be customized based on analysis results
-- Replace the placeholder values with actual data from the analysis

-- Step 1: Backup current state before restoration
CREATE TEMP TABLE settlement_backup AS
SELECT 
  es.id,
  es.expense_id,
  es.user_id,
  es.computed_amount,
  es.settled_amount,
  es.is_settled,
  es.settled_at,
  NOW() as backup_timestamp
FROM expense_splits es
WHERE es.settled_at >= NOW() - INTERVAL '2 hours'
  AND es.is_settled = true;

-- Step 2: Identify splits that need to be reverted
-- (These would be splits that were incorrectly settled by the buggy function)
WITH incorrect_settlements AS (
  SELECT DISTINCT pe.split_id
  FROM payment_events pe
  WHERE pe.event_type = 'settle_all_with_person'
    AND pe.created_at >= NOW() - INTERVAL '2 hours'
    -- Add additional filters based on analysis results
    -- Example: AND pe.actor_user_id != pe.from_user_id (if actor wasn't involved in the debt)
)
SELECT 
  'SPLITS_TO_REVERT' as operation_type,
  es.id as split_id,
  es.expense_id,
  es.user_id,
  es.computed_amount,
  es.settled_amount,
  p_user.full_name as user_name,
  p_payer.full_name as payer_name,
  e.description as expense_description
FROM expense_splits es
JOIN incorrect_settlements inc ON es.id = inc.split_id
JOIN expenses e ON es.expense_id = e.id
LEFT JOIN profiles p_user ON es.user_id = p_user.id
LEFT JOIN profiles p_payer ON e.paid_by_user_id = p_payer.id;

-- Step 3: Revert incorrect settlements
-- UNCOMMENT AND CUSTOMIZE BASED ON ANALYSIS RESULTS

/*
-- Example reversion for specific splits (replace with actual split IDs)
UPDATE expense_splits 
SET 
  is_settled = false,
  settled_amount = 0,
  settled_at = NULL
WHERE id IN (
  -- Add specific split IDs that need to be reverted
  -- 'split-id-1',
  -- 'split-id-2'
);

-- Remove incorrect payment events
DELETE FROM payment_events 
WHERE event_type = 'settle_all_with_person'
  AND created_at >= NOW() - INTERVAL '2 hours'
  AND split_id IN (
    -- Add specific split IDs that were incorrectly settled
    -- 'split-id-1',
    -- 'split-id-2'
  );

-- Remove incorrect audit trail entries
DELETE FROM audit_trail 
WHERE action_type = 'settle_all_with_person'
  AND timestamp >= NOW() - INTERVAL '2 hours';
*/

-- Step 4: Restore specific user debt states (based on original issue)
-- UNCOMMENT AND CUSTOMIZE BASED ON REQUIRED DEBT AMOUNTS

/*
-- Example: Restore Vũ Hoàng Mai to 95,000đ debt
-- This would require identifying which specific splits should be unsettled
-- to achieve the target debt amount

-- Example: Restore Phạm Phúc Thịnh to 5,000đ debt
-- This would require identifying which specific splits should be unsettled
-- to achieve the target debt amount

-- Example: Restore Dương Lê Công Thuần to 418,531đ debt (currently showing 48,000đ)
-- This would require identifying which specific splits should be unsettled
-- to achieve the target debt amount
*/

-- Step 5: Verification queries (run after restoration)
SELECT 
  'POST_RESTORATION_VERIFICATION' as check_type,
  p.full_name,
  COALESCE(SUM(CASE WHEN debts.i_owe_them THEN debts.amount ELSE -debts.amount END), 0) as net_debt
FROM profiles p
LEFT JOIN get_user_debts_aggregated() debts ON p.id = debts.counterparty_id
WHERE p.full_name IN ('Vũ Hoàng Mai', 'Phạm Phúc Thịnh', 'Dương Lê Công Thuần')
GROUP BY p.id, p.full_name
ORDER BY p.full_name;

-- Step 6: Log restoration operation
INSERT INTO audit_trail (
  actor,
  timestamp,
  action_type,
  entity_id,
  entity_type,
  metadata
) VALUES (
  auth.uid(),
  NOW(),
  'debt_state_restoration',
  NULL,
  'system',
  jsonb_build_object(
    'reason', 'Restore debt states after incorrect settle_all_debts_with_person operations',
    'timeframe', 'Last 2 hours',
    'restoration_timestamp', NOW()
  )
);