-- ========================================
-- Migration: Create Audit Trail RPC Functions
-- Purpose: Add write_audit_trail() and read_audit_trail() functions for settlement audit tracking
-- Requirements: 7.5 (Settle All audit)
-- ========================================

-- =============================================
-- 1. write_audit_trail() - Insert audit records
-- =============================================
CREATE OR REPLACE FUNCTION write_audit_trail(
  p_action_type TEXT,
  p_entity_id UUID,
  p_entity_type TEXT,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  v_actor UUID;
  v_audit_id UUID;
BEGIN
  -- Get current user (actor)
  v_actor := auth.uid();
  
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to write audit trail';
  END IF;
  
  -- Validate required parameters
  IF p_action_type IS NULL OR p_action_type = '' THEN
    RAISE EXCEPTION 'action_type is required';
  END IF;
  
  IF p_entity_id IS NULL THEN
    RAISE EXCEPTION 'entity_id is required';
  END IF;
  
  IF p_entity_type IS NULL OR p_entity_type = '' THEN
    RAISE EXCEPTION 'entity_type is required';
  END IF;
  
  -- Insert audit trail record
  INSERT INTO audit_trail (
    actor,
    timestamp,
    action_type,
    entity_id,
    entity_type,
    metadata
  ) VALUES (
    v_actor,
    NOW(),
    p_action_type,
    p_entity_id,
    p_entity_type,
    p_metadata
  )
  RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$;

COMMENT ON FUNCTION write_audit_trail(TEXT, UUID, TEXT, JSONB) IS 
'Insert an audit trail record for settlement operations. Auto-populates actor (current user) and timestamp. Returns the created audit record ID.';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION write_audit_trail(TEXT, UUID, TEXT, JSONB) TO authenticated;

-- =============================================
-- 2. read_audit_trail() - Query audit records with filtering
-- =============================================
CREATE OR REPLACE FUNCTION read_audit_trail(
  p_entity_id UUID DEFAULT NULL,
  p_action_type TEXT DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  actor UUID,
  actor_name TEXT,
  actor_email TEXT,
  timestamp TIMESTAMPTZ,
  action_type TEXT,
  entity_id UUID,
  entity_type TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only admins can read audit trail
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can read audit trail';
  END IF;
  
  -- Validate pagination parameters
  IF p_limit < 1 OR p_limit > 100 THEN
    RAISE EXCEPTION 'limit must be between 1 and 100';
  END IF;
  
  IF p_offset < 0 THEN
    RAISE EXCEPTION 'offset must be non-negative';
  END IF;
  
  -- Return filtered audit records with actor details
  RETURN QUERY
  SELECT
    at.id AS id,
    at.actor AS actor,
    p.full_name AS actor_name,
    p.email AS actor_email,
    at.timestamp AS timestamp,
    at.action_type AS action_type,
    at.entity_id AS entity_id,
    at.entity_type AS entity_type,
    at.metadata AS metadata,
    at.created_at AS created_at
  FROM audit_trail at
  LEFT JOIN profiles p ON p.id = at.actor
  WHERE
    (p_entity_id IS NULL OR at.entity_id = p_entity_id)
    AND (p_action_type IS NULL OR at.action_type = p_action_type)
    AND (p_start_date IS NULL OR at.timestamp >= p_start_date)
    AND (p_end_date IS NULL OR at.timestamp <= p_end_date)
  ORDER BY at.timestamp DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION read_audit_trail(UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, INTEGER) IS 
'Query audit trail records with optional filtering by entity_id, action_type, and date range. Supports pagination. Admin-only access.';

-- Grant execute permission to authenticated users (admin check is inside function)
GRANT EXECUTE ON FUNCTION read_audit_trail(UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, INTEGER) TO authenticated;
