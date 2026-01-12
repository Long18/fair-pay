-- ========================================
-- Verification Script: Confirm Debt State Restoration
-- Purpose: Verify that debt states have been correctly restored
-- Run after: restore_debt_states.sql
-- ========================================

-- Step 1: Check current debt states for specific users mentioned in issue
SELECT 
  'SPECIFIC_USERS_CURRENT_STATE' as check_type,
  p.full_name,
  p.email,
  COALESCE(
    SUM(CASE 
      WHEN debts.i_owe_them THEN debts.amount 
      ELSE -debts.amount 
    END), 
    0
  ) as net_debt_amount,
  COUNT(debts.counterparty_id) as debt_relationships
FROM profiles p
LEFT JOIN get_user_debts_aggregated() debts ON p.id = debts.counterparty_id
WHERE p.full_name IN ('Vũ Hoàng Mai', 'Phạm Phúc Thịnh', 'Dương Lê Công Thuần')
GROUP BY p.id, p.full_name, p.email
ORDER BY p.full_name;

-- Step 2: Expected vs Actual debt comparison
WITH expected_debts AS (
  SELECT 'Vũ Hoàng Mai' as name, 95000 as expected_debt
  UNION ALL
  SELECT 'Phạm Phúc Thịnh' as name, 5000 as expected_debt
  UNION ALL
  SELECT 'Dương Lê Công Thuần' as name, 418531 as expected_debt
),
actual_debts AS (
  SELECT 
    p.full_name as name,
    COALESCE(
      SUM(CASE 
        WHEN debts.i_owe_them THEN debts.amount 
        ELSE -debts.amount 
      END), 
      0
    ) as actual_debt
  FROM profiles p
  LEFT JOIN get_user_debts_aggregated() debts ON p.id = debts.counterparty_id
  WHERE p.full_name IN ('Vũ Hoàng Mai', 'Phạm Phúc Thịnh', 'Dương Lê Công Thuần')
  GROUP BY p.full_name
)
SELECT 
  'DEBT_COMPARISON' as check_type,
  e.name,
  e.expected_debt,
  COALESCE(a.actual_debt, 0) as actual_debt,
  (COALESCE(a.actual_debt, 0) - e.expected_debt) as difference,
  CASE 
    WHEN ABS(COALESCE(a.actual_debt, 0) - e.expected_debt) < 1 THEN 'CORRECT'
    ELSE 'NEEDS_ADJUSTMENT'
  END as status
FROM expected_debts e
LEFT JOIN actual_debts a ON e.name = a.name
ORDER BY e.name;

-- Step 3: Check for any remaining settle_all_with_person events
SELECT 
  'REMAINING_SETTLE_ALL_EVENTS' as check_type,
  COUNT(*) as event_count,
  MIN(created_at) as earliest_event,
  MAX(created_at) as latest_event
FROM payment_events
WHERE event_type = 'settle_all_with_person'
  AND created_at >= NOW() - INTERVAL '4 hours';

-- Step 4: Check settlement status of splits in the last 2 hours
SELECT 
  'SETTLEMENT_STATUS_SUMMARY' as check_type,
  COUNT(*) as total_splits,
  COUNT(CASE WHEN is_settled = true THEN 1 END) as settled_splits,
  COUNT(CASE WHEN is_settled = false THEN 1 END) as unsettled_splits,
  SUM(CASE WHEN is_settled = true THEN settled_amount ELSE 0 END) as total_settled_amount
FROM expense_splits
WHERE settled_at >= NOW() - INTERVAL '2 hours' OR settled_at IS NULL;

-- Step 5: Audit trail verification
SELECT 
  'AUDIT_TRAIL_CHECK' as check_type,
  action_type,
  COUNT(*) as count,
  MIN(timestamp) as earliest,
  MAX(timestamp) as latest
FROM audit_trail
WHERE timestamp >= NOW() - INTERVAL '4 hours'
GROUP BY action_type
ORDER BY latest DESC;

-- Step 6: Overall system health check
SELECT 
  'SYSTEM_HEALTH_CHECK' as check_type,
  COUNT(DISTINCT p.id) as total_users_with_debts,
  COUNT(*) as total_debt_relationships,
  SUM(ABS(debts.amount)) as total_debt_volume,
  AVG(ABS(debts.amount)) as average_debt_amount
FROM get_user_debts_aggregated() debts
JOIN profiles p ON debts.counterparty_id = p.id;

-- Step 7: Check for any data inconsistencies
SELECT 
  'DATA_CONSISTENCY_CHECK' as check_type,
  es.id as split_id,
  es.computed_amount,
  es.settled_amount,
  es.is_settled,
  CASE 
    WHEN es.is_settled = true AND COALESCE(es.settled_amount, 0) = 0 THEN 'INCONSISTENT: Marked settled but no amount'
    WHEN es.is_settled = false AND COALESCE(es.settled_amount, 0) > 0 THEN 'INCONSISTENT: Has settled amount but not marked settled'
    WHEN es.settled_amount > es.computed_amount THEN 'INCONSISTENT: Settled more than computed'
    ELSE 'CONSISTENT'
  END as consistency_status
FROM expense_splits es
WHERE es.settled_at >= NOW() - INTERVAL '4 hours' 
   OR (es.is_settled = true AND es.settled_at IS NULL)
HAVING consistency_status != 'CONSISTENT';

-- Step 8: Final verification summary
SELECT 
  'RESTORATION_SUMMARY' as summary_type,
  NOW() as verification_timestamp,
  'Debt state restoration verification completed' as message,
  jsonb_build_object(
    'verification_time', NOW(),
    'scope', 'Last 4 hours of activity',
    'focus_users', ARRAY['Vũ Hoàng Mai', 'Phạm Phúc Thịnh', 'Dương Lê Công Thuần']
  ) as metadata;