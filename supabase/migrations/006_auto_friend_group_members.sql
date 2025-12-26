-- Migration: Auto-Create Friendships for Group Members
-- Purpose: Automatically create accepted friendships when users join the same group
-- Date: 2025-12-27
-- Reference: docs/54-Group-Based-Auto-Friending.md

-- ========================================
-- Function: Auto-create friendships when user joins a group
-- ========================================

CREATE OR REPLACE FUNCTION auto_create_friendships_from_group()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  v_member RECORD;
  v_user_a UUID;
  v_user_b UUID;
BEGIN
  -- Loop through all existing members of the group (excluding the new member)
  FOR v_member IN
    SELECT user_id
    FROM group_members
    WHERE group_id = NEW.group_id
      AND user_id != NEW.user_id
  LOOP
    -- Determine user_a and user_b (maintain user_a < user_b constraint)
    v_user_a := LEAST(NEW.user_id, v_member.user_id);
    v_user_b := GREATEST(NEW.user_id, v_member.user_id);

    -- Check if friendship already exists
    IF NOT EXISTS (
      SELECT 1 FROM friendships
      WHERE user_a = v_user_a
        AND user_b = v_user_b
    ) THEN
      -- Create new friendship with accepted status
      INSERT INTO friendships (user_a, user_b, status, created_by)
      VALUES (v_user_a, v_user_b, 'accepted', NEW.user_id)
      ON CONFLICT DO NOTHING; -- Safety: prevent any duplicate insertion
    ELSE
      -- If friendship exists but is pending or rejected, update to accepted
      UPDATE friendships
      SET status = 'accepted',
          updated_at = NOW()
      WHERE user_a = v_user_a
        AND user_b = v_user_b
        AND status != 'accepted';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- ========================================
-- Trigger: Auto-create friendships on group member insert
-- ========================================

DROP TRIGGER IF EXISTS trigger_auto_create_friendships ON group_members;

CREATE TRIGGER trigger_auto_create_friendships
  AFTER INSERT ON group_members
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_friendships_from_group();

-- ========================================
-- Comments for documentation
-- ========================================

COMMENT ON FUNCTION auto_create_friendships_from_group() IS
  'Automatically creates accepted friendships between users when they join the same group. '
  'Maintains user_a < user_b constraint and handles existing friendships by updating status to accepted.';

COMMENT ON TRIGGER trigger_auto_create_friendships ON group_members IS
  'Triggers automatic friendship creation when a user is added to a group';
