-- ========================================
-- Migration: Admin accept friendship RPC
-- Allows admin to accept pending friendship requests
-- ========================================

CREATE OR REPLACE FUNCTION admin_accept_friendship(p_friendship_id UUID)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  v_friendship RECORD;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can accept friendships';
  END IF;

  SELECT * INTO v_friendship FROM friendships WHERE id = p_friendship_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Friendship not found';
  END IF;

  IF v_friendship.status = 'accepted' THEN
    RAISE EXCEPTION 'Friendship is already accepted';
  END IF;

  UPDATE friendships
  SET status = 'accepted', updated_at = NOW()
  WHERE id = p_friendship_id;

  RETURN jsonb_build_object(
    'success', true,
    'friendship_id', p_friendship_id,
    'old_status', v_friendship.status,
    'new_status', 'accepted'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION admin_accept_friendship(UUID) TO authenticated;

COMMENT ON FUNCTION admin_accept_friendship(UUID) IS 'Admin-only: Accept a pending friendship request bypassing RLS.';
