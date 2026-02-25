-- ========================================
-- Group Join Requests & Member Count Function
-- ========================================

-- SECTION 1: Function to get member count for any group (bypasses RLS)
CREATE OR REPLACE FUNCTION get_group_member_count(p_group_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  SET LOCAL row_security = off;
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM group_members
    WHERE group_id = p_group_id
  );
END;
$$;

-- SECTION 2: Function to get all groups with member counts
CREATE OR REPLACE FUNCTION get_all_groups_with_member_counts()
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  avatar_url TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  simplify_debts BOOLEAN,
  is_archived BOOLEAN,
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  member_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  SET LOCAL row_security = off;
  RETURN QUERY
    SELECT
      g.id,
      g.name,
      g.description,
      g.avatar_url,
      g.created_by,
      g.created_at,
      g.updated_at,
      g.simplify_debts,
      g.is_archived,
      g.archived_at,
      g.archived_by,
      (SELECT COUNT(*)::INTEGER FROM group_members gm WHERE gm.group_id = g.id) AS member_count
    FROM groups g
    ORDER BY g.created_at DESC;
END;
$$;

-- SECTION 3: Create group_join_requests table
CREATE TABLE IF NOT EXISTS group_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  message TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id, status)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_group_join_requests_group_id ON group_join_requests(group_id);
CREATE INDEX IF NOT EXISTS idx_group_join_requests_user_id ON group_join_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_group_join_requests_status ON group_join_requests(status);

-- Updated_at trigger
CREATE OR REPLACE TRIGGER update_group_join_requests_updated_at
  BEFORE UPDATE ON group_join_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- SECTION 4: RLS Policies for group_join_requests
ALTER TABLE group_join_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
DROP POLICY IF EXISTS "Users can view own join requests" ON group_join_requests;
CREATE POLICY "Users can view own join requests"
  ON group_join_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Group admins can view requests for their groups
DROP POLICY IF EXISTS "Group admins can view group join requests" ON group_join_requests;
CREATE POLICY "Group admins can view group join requests"
  ON group_join_requests FOR SELECT
  TO authenticated
  USING (
    group_id IN (
      SELECT gm.group_id FROM group_members gm
      WHERE gm.user_id = auth.uid() AND gm.role = 'admin'
    )
  );

-- Users can create join requests
DROP POLICY IF EXISTS "Users can create join requests" ON group_join_requests;
CREATE POLICY "Users can create join requests"
  ON group_join_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_join_requests.group_id
      AND gm.user_id = auth.uid()
    )
  );

-- Users can cancel their own pending requests
DROP POLICY IF EXISTS "Users can delete own pending requests" ON group_join_requests;
CREATE POLICY "Users can delete own pending requests"
  ON group_join_requests FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() AND status = 'pending');

-- Group admins can update requests (approve/reject)
DROP POLICY IF EXISTS "Group admins can update join requests" ON group_join_requests;
CREATE POLICY "Group admins can update join requests"
  ON group_join_requests FOR UPDATE
  TO authenticated
  USING (
    group_id IN (
      SELECT gm.group_id FROM group_members gm
      WHERE gm.user_id = auth.uid() AND gm.role = 'admin'
    )
  )
  WITH CHECK (
    group_id IN (
      SELECT gm.group_id FROM group_members gm
      WHERE gm.user_id = auth.uid() AND gm.role = 'admin'
    )
  );

-- SECTION 5: Function to approve a join request (adds member + updates request)
CREATE OR REPLACE FUNCTION approve_join_request(p_request_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_request RECORD;
  v_is_admin BOOLEAN;
BEGIN
  -- Get the request
  SELECT * INTO v_request FROM group_join_requests WHERE id = p_request_id AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Join request not found or already processed';
  END IF;

  -- Check if current user is admin of the group
  SELECT EXISTS(
    SELECT 1 FROM group_members
    WHERE group_id = v_request.group_id AND user_id = auth.uid() AND role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only group admins can approve join requests';
  END IF;

  -- Add user as member
  INSERT INTO group_members (group_id, user_id, role)
  VALUES (v_request.group_id, v_request.user_id, 'member')
  ON CONFLICT (group_id, user_id) DO NOTHING;

  -- Update request status
  UPDATE group_join_requests
  SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = p_request_id;

  -- Create notification for the requester
  INSERT INTO notifications (user_id, type, title, message, link)
  VALUES (
    v_request.user_id,
    'group_join_approved',
    'Join Request Approved',
    'Your request to join the group has been approved.',
    '/groups/show/' || v_request.group_id
  );
END;
$$;

-- SECTION 6: Function to reject a join request
CREATE OR REPLACE FUNCTION reject_join_request(p_request_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_request RECORD;
  v_is_admin BOOLEAN;
BEGIN
  SELECT * INTO v_request FROM group_join_requests WHERE id = p_request_id AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Join request not found or already processed';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM group_members
    WHERE group_id = v_request.group_id AND user_id = auth.uid() AND role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only group admins can reject join requests';
  END IF;

  UPDATE group_join_requests
  SET status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = p_request_id;

  INSERT INTO notifications (user_id, type, title, message, link)
  VALUES (
    v_request.user_id,
    'group_join_rejected',
    'Join Request Declined',
    'Your request to join the group was declined.',
    '/connections?tab=groups'
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_group_member_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_groups_with_member_counts() TO authenticated;
GRANT EXECUTE ON FUNCTION approve_join_request(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION reject_join_request(UUID) TO authenticated;
