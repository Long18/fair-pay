-- ========================================
-- Migration: Create Audit Trail Table
-- Purpose: Track settlement operations audit trail for "Settle All" and other bulk operations
-- Requirements: 7.5 (Settle All audit)
-- ========================================

-- Create audit_trail table for settlement operations
-- This is separate from audit_logs (generic change tracking) and focuses on settlement operations
CREATE TABLE IF NOT EXISTS audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  action_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_audit_trail_actor ON audit_trail(actor, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_trail_entity ON audit_trail(entity_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_trail_timestamp ON audit_trail(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_trail_action_type ON audit_trail(action_type, timestamp DESC);

-- Enable Row Level Security
ALTER TABLE audit_trail ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only admins can view audit trail
CREATE POLICY "Admins can view all audit trail records"
  ON audit_trail FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Grant permissions
GRANT SELECT ON audit_trail TO authenticated;

-- Add table comment for documentation
COMMENT ON TABLE audit_trail IS 'Audit trail for settlement operations (Settle All, bulk settlements). Tracks actor, timestamp, action type, and metadata for compliance and debugging.';
COMMENT ON COLUMN audit_trail.actor IS 'User ID who performed the action';
COMMENT ON COLUMN audit_trail.timestamp IS 'When the action was performed';
COMMENT ON COLUMN audit_trail.action_type IS 'Type of action (e.g., manual_settle_all, bulk_settle)';
COMMENT ON COLUMN audit_trail.entity_id IS 'ID of the primary entity affected (e.g., expense_id)';
COMMENT ON COLUMN audit_trail.entity_type IS 'Type of entity (e.g., expense, group)';
COMMENT ON COLUMN audit_trail.metadata IS 'Additional structured data (splitsUpdated, splitIds, totalAmount, etc.)';
