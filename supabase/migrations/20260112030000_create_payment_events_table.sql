-- Migration: Create payment_events table for Activity List child rows
-- Created: 2026-01-12
-- Purpose: Track all payment/settlement events for display in Activity List
--
-- This table provides a unified view of all payment and settlement events:
-- - Manual settlements via settle_split()
-- - Bulk settlements via settle_all_splits()
-- - MoMo payment confirmations
-- - Banking payment confirmations
--
-- Related: Task 1.10 - Create payment/settlement events data pipeline
-- Requirements: 1.1 (Activity child rows need real data)

-- =============================================
-- Create payment_events table
-- =============================================
CREATE TABLE IF NOT EXISTS payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link to expense for efficient Activity List queries
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  
  -- Link to specific split (nullable for settle_all events)
  split_id UUID REFERENCES expense_splits(id) ON DELETE CASCADE,
  
  -- Event classification
  event_type TEXT NOT NULL CHECK (event_type IN (
    'manual_settle',      -- Manual settlement via settle_split()
    'momo_payment',       -- MoMo payment confirmation
    'banking_payment',    -- Banking payment confirmation
    'settle_all'          -- Bulk settlement via settle_all_splits()
  )),
  
  -- Payment flow (who paid whom)
  from_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Amount details
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'VND',
  
  -- Settlement method
  method TEXT NOT NULL CHECK (method IN ('manual', 'momo', 'banking')),
  
  -- Actor who triggered the event (may differ from from_user_id)
  actor_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Additional structured data (e.g., transaction IDs, reference codes)
  metadata JSONB,
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Validation: from and to users must be different
  CONSTRAINT different_users CHECK (from_user_id != to_user_id)
);

-- =============================================
-- Create indexes for efficient querying
-- =============================================

-- Primary query pattern: Get all events for an expense, sorted by time
CREATE INDEX IF NOT EXISTS idx_payment_events_expense_created 
  ON payment_events(expense_id, created_at DESC);

-- Query by split (for individual split history)
CREATE INDEX IF NOT EXISTS idx_payment_events_split_id 
  ON payment_events(split_id) 
  WHERE split_id IS NOT NULL;

-- Query by user (for user activity history)
CREATE INDEX IF NOT EXISTS idx_payment_events_from_user 
  ON payment_events(from_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_events_to_user 
  ON payment_events(to_user_id, created_at DESC);

-- Query by event type (for analytics)
CREATE INDEX IF NOT EXISTS idx_payment_events_type 
  ON payment_events(event_type, created_at DESC);

-- =============================================
-- Enable Row Level Security
-- =============================================
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;

-- Users can view payment events for expenses they're involved in
DROP POLICY IF EXISTS "payment_events_read_policy" ON payment_events;
CREATE POLICY "payment_events_read_policy" ON payment_events
  FOR SELECT TO authenticated
  USING (
    -- User is involved in the expense (either as payer or participant)
    EXISTS (
      SELECT 1 FROM expenses e
      WHERE e.id = payment_events.expense_id
      AND (
        e.paid_by_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM expense_splits es
          WHERE es.expense_id = e.id
          AND es.user_id = auth.uid()
        )
      )
    )
    -- OR user is in the same group/friendship context
    OR EXISTS (
      SELECT 1 FROM expenses e
      WHERE e.id = payment_events.expense_id
      AND (
        (e.context_type = 'group' AND EXISTS (
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
  );

-- Only system functions can insert payment events (not direct user inserts)
-- This is enforced by not creating an INSERT policy
-- RPC functions will use SECURITY DEFINER to bypass RLS

-- =============================================
-- Add comments for documentation
-- =============================================
COMMENT ON TABLE payment_events IS 
'Unified log of all payment and settlement events for Activity List display. 
Populated automatically by settle_split(), settle_all_splits(), and payment integration functions.';

COMMENT ON COLUMN payment_events.event_type IS 
'Type of event: manual_settle (settle_split), momo_payment (MoMo confirmation), 
banking_payment (banking confirmation), settle_all (bulk settlement)';

COMMENT ON COLUMN payment_events.method IS 
'Settlement method: manual (marked as settled), momo (MoMo payment), banking (bank transfer)';

COMMENT ON COLUMN payment_events.actor_user_id IS 
'User who triggered the event. May differ from from_user_id (e.g., admin settling on behalf of user)';

COMMENT ON COLUMN payment_events.metadata IS 
'Additional structured data: transaction IDs, reference codes, split counts for settle_all, etc.';
