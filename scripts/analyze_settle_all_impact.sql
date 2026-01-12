-- ========================================
-- Analysis Script: Comprehensive Settle All Impact Analysis
-- Purpose: Identify ALL users affected by settle_all_debts_with_person function
-- Time Range: Last 2 hours (adjustable)
-- ========================================

-- Step 1: Find all settle_all_with_person operations
SELECT 
  'SETTLE_ALL_OPERATIONS' as analysis_type,
  pe.created_at,
  pe.event_type,
  pe.from_user_id,
  pe.to_user_id,
  pe.amount,
  pe.currency,
  pe.actor_user_id,
  pe.metadata,
  p_from.full_name as from_user_name,
  p_to.full_name as to_user_name,
  p_actor.full_name as actor_name,
  es.expense_id,
  es.id as split_id,
  e.description as expense_description,
  e.amount as expense_total
FROM payment_events pe
LEFT JOIN profiles p_from ON pe.from_user_id = p_from.id
LEFT JOIN profiles p_to ON pe.to_user_id = p_to.id  
LEFT JOIN profiles p_actor ON pe.actor_user_id = p_actor.id
LEFT JOIN expense_splits es ON pe.split_id = es.id
LEFT JOIN expenses e ON pe.expense_id = e.id
WHERE pe.event_type = 'settle_all_with_person'
  AND pe.created_at >= NOW() - INTERVAL '2 hours'
ORDER BY pe.created_at DESC;

-- Step 2: Find all manual_settle operations in the same timeframe
SELECT 
  'MANUAL_SETTLE_OPERATIONS' as analysis_type,
  pe.created_at,
  pe.event_type,
  pe.from_user_id,
  pe.to_user_id,
  pe.amount,
  pe.currency,
  pe.actor_user_id,
  pe.metadata,
  p_from.full_name as from_user_name,
  p_to.full_name as to_user_name,
  p_actor.full_name as actor_name,
  es.expense_id,
  es.id as split_id,
  e.description as expense_description,
  e.amount as expense_total
FROM payment_events pe
LEFT JOIN profiles p_from ON pe.from_user_id = p_from.id
LEFT JOIN profiles p_to ON pe.to_user_id = p_to.id  
LEFT JOIN profiles p_actor ON pe.actor_user_id = p_actor.id
LEFT JOIN expense_splits es ON pe.split_id = es.id
LEFT JOIN expenses e ON pe.expense_id = e.id
WHERE pe.event_type = 'manual_settle'
  AND pe.created_at >= NOW() - INTERVAL '2 hours'
ORDER BY pe.created_at DESC;

-- Step 3: Find all expense_splits that were settled in the last 2 hours
SELECT 
  'RECENTLY_SETTLED_SPLITS' as analysis_type,
  es.id as split_id,
  es.expense_id,
  es.user_id,
  es.computed_amount,
  es.settled_amount,
  es.settled_at,
  es.is_settled,
  e.description as expense_description,
  e.paid_by_user_id,
  e.amount as expense_total,
  p_user.full_name as split_user_name,
  p_payer.full_name as payer_name
FROM expense_splits es
JOIN expenses e ON es.expense_id = e.id
LEFT JOIN profiles p_user ON es.user_id = p_user.id
LEFT JOIN profiles p_payer ON e.paid_by_user_id = p_payer.id
WHERE es.settled_at >= NOW() - INTERVAL '2 hours'
  AND es.is_settled = true
ORDER BY es.settled_at DESC;

-- Step 4: Current debt states for all users (to understand impact)
SELECT 
  'CURRENT_DEBT_STATES' as analysis_type,
  counterparty_id,
  counterparty_name,
  amount,
  currency,
  i_owe_them,
  CASE 
    WHEN i_owe_them THEN 'I owe them'
    ELSE 'They owe me'
  END as debt_direction
FROM get_user_debts_aggregated()
ORDER BY ABS(amount) DESC;

-- Step 5: Audit trail for settle_all operations
SELECT 
  'AUDIT_TRAIL' as analysis_type,
  at.id,
  at.actor,
  p.full_name as actor_name,
  at.timestamp,
  at.action_type,
  at.entity_id,
  at.entity_type,
  at.metadata,
  at.created_at
FROM audit_trail at
LEFT JOIN profiles p ON at.actor = p.id
WHERE at.action_type = 'settle_all_with_person'
  AND at.timestamp >= NOW() - INTERVAL '2 hours'
ORDER BY at.timestamp DESC;

-- Step 6: Summary of affected users
SELECT 
  'AFFECTED_USERS_SUMMARY' as analysis_type,
  COUNT(DISTINCT pe.from_user_id) as unique_from_users,
  COUNT(DISTINCT pe.to_user_id) as unique_to_users,
  COUNT(DISTINCT pe.actor_user_id) as unique_actors,
  COUNT(*) as total_events,
  SUM(pe.amount) as total_amount_settled,
  MIN(pe.created_at) as earliest_event,
  MAX(pe.created_at) as latest_event
FROM payment_events pe
WHERE pe.event_type IN ('settle_all_with_person', 'manual_settle')
  AND pe.created_at >= NOW() - INTERVAL '2 hours';

-- Step 7: Identify specific users mentioned in the original issue
SELECT 
  'SPECIFIC_USERS_CHECK' as analysis_type,
  p.id,
  p.full_name,
  p.email,
  COALESCE(debts.total_debt, 0) as current_total_debt
FROM profiles p
LEFT JOIN (
  SELECT 
    counterparty_id,
    SUM(CASE WHEN i_owe_them THEN amount ELSE -amount END) as total_debt
  FROM get_user_debts_aggregated()
  GROUP BY counterparty_id
) debts ON p.id = debts.counterparty_id
WHERE p.full_name IN ('Vũ Hoàng Mai', 'Phạm Phúc Thịnh', 'Dương Lê Công Thuần')
ORDER BY p.full_name;