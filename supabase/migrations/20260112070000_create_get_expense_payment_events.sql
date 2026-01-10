-- Migration: Create get_expense_payment_events function
-- Created: 2026-01-12
-- Purpose: Efficient read path for fetching payment events for Activity List display
--
-- Related: Task 1.10 - Create payment/settlement events data pipeline
-- Requirements: 1.1 (Activity child rows need real data)

-- =============================================
-- Create get_expense_payment_events function
-- =============================================
CREATE OR REPLACE FUNCTION get_expense_payment_events(
  p_expense_id UUID
)
RETURNS TABLE (
  id UUID,
  event_type TEXT,
  from_user_id UUID,
  from_user_name TEXT,
  from_user_avatar TEXT,
  to_user_id UUID,
  to_user_name TEXT,
  to_user_avatar TEXT,
  amount DECIMAL,
  currency TEXT,
  method TEXT,
  actor_user_id UUID,
  actor_user_name TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  -- Permission check: User must be involved in the expense
  IF NOT EXISTS (
    SELECT 1 FROM expenses e
    WHERE e.id = p_expense_id
    AND (
      e.paid_by_user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM expense_splits es
        WHERE es.expense_id = e.id
        AND es.user_id = auth.uid()
      )
      OR (e.context_type = 'group' AND EXISTS (
        SELECT 1 FROM group_members gm
        WHERE gm.group_id = e.group_id
        AND gm.user_id = auth.uid()
      ))
      OR (e.context_type = 'friend' AND EXISTS (
        SELECT 1 FROM friendships f
        WHERE f.id = e.friendship_id
        AND (f.user_a = auth.uid() OR f.user_b = auth.uid())
      ))
    )
  ) THEN
    RAISE EXCEPTION 'Permission denied: You are not involved in this expense';
  END IF;

  -- Return payment events with user details
  RETURN QUERY
  SELECT 
    pe.id,
    pe.event_type,
    pe.from_user_id,
    from_user.full_name AS from_user_name,
    from_user.avatar_url AS from_user_avatar,
    pe.to_user_id,
    to_user.full_name AS to_user_name,
    to_user.avatar_url AS to_user_avatar,
    pe.amount,
    pe.currency,
    pe.method,
    pe.actor_user_id,
    actor_user.full_name AS actor_user_name,
    pe.metadata,
    pe.created_at
  FROM payment_events pe
  INNER JOIN profiles from_user ON from_user.id = pe.from_user_id
  INNER JOIN profiles to_user ON to_user.id = pe.to_user_id
  INNER JOIN profiles actor_user ON actor_user.id = pe.actor_user_id
  WHERE pe.expense_id = p_expense_id
  ORDER BY pe.created_at ASC;  -- Child events sorted chronologically
END;
$$;

COMMENT ON FUNCTION get_expense_payment_events(UUID) IS 
'Fetch all payment events for an expense with user details. Used for Activity List child rows.
Returns events sorted chronologically (oldest first). Includes from/to/actor user names and avatars.
Permission check ensures user is involved in the expense.';

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_expense_payment_events(UUID) TO authenticated;

-- =============================================
-- Create helper function for batch fetching (optional optimization)
-- =============================================
CREATE OR REPLACE FUNCTION get_expenses_with_payment_events(
  p_expense_ids UUID[]
)
RETURNS TABLE (
  expense_id UUID,
  payment_events JSONB
)
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  -- Return aggregated payment events per expense
  RETURN QUERY
  SELECT 
    pe.expense_id,
    jsonb_agg(
      jsonb_build_object(
        'id', pe.id,
        'event_type', pe.event_type,
        'from_user_id', pe.from_user_id,
        'from_user_name', from_user.full_name,
        'from_user_avatar', from_user.avatar_url,
        'to_user_id', pe.to_user_id,
        'to_user_name', to_user.full_name,
        'to_user_avatar', to_user.avatar_url,
        'amount', pe.amount,
        'currency', pe.currency,
        'method', pe.method,
        'actor_user_id', pe.actor_user_id,
        'actor_user_name', actor_user.full_name,
        'metadata', pe.metadata,
        'created_at', pe.created_at
      ) ORDER BY pe.created_at ASC
    ) AS payment_events
  FROM payment_events pe
  INNER JOIN profiles from_user ON from_user.id = pe.from_user_id
  INNER JOIN profiles to_user ON to_user.id = pe.to_user_id
  INNER JOIN profiles actor_user ON actor_user.id = pe.actor_user_id
  WHERE pe.expense_id = ANY(p_expense_ids)
  -- Permission check: Only return events for expenses user is involved in
  AND EXISTS (
    SELECT 1 FROM expenses e
    WHERE e.id = pe.expense_id
    AND (
      e.paid_by_user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM expense_splits es
        WHERE es.expense_id = e.id
        AND es.user_id = auth.uid()
      )
      OR (e.context_type = 'group' AND EXISTS (
        SELECT 1 FROM group_members gm
        WHERE gm.group_id = e.group_id
        AND gm.user_id = auth.uid()
      ))
      OR (e.context_type = 'friend' AND EXISTS (
        SELECT 1 FROM friendships f
        WHERE f.id = e.friendship_id
        AND (f.user_a = auth.uid() OR f.user_b = auth.uid())
      ))
    )
  )
  GROUP BY pe.expense_id;
END;
$$;

COMMENT ON FUNCTION get_expenses_with_payment_events(UUID[]) IS 
'Batch fetch payment events for multiple expenses. Returns aggregated JSONB array per expense.
Optimized for Activity List rendering with many expenses. Permission check ensures user is involved.';

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_expenses_with_payment_events(UUID[]) TO authenticated;
