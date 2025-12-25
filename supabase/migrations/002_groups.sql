-- Migration: 002_groups.sql
-- Description: Create groups and group_members tables with RLS policies
-- Date: 2025-12-25
-- Dependencies: 001_profiles.sql

-- Create groups table
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add trigger for updated_at on groups
CREATE TRIGGER update_groups_updated_at
  BEFORE UPDATE ON groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create group_members table
CREATE TABLE group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(group_id, user_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_groups_created_by ON groups(created_by);
CREATE INDEX idx_group_members_group_id ON group_members(group_id);
CREATE INDEX idx_group_members_user_id ON group_members(user_id);

-- Enable Row Level Security
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- ========================================
-- RLS Policies for groups
-- ========================================

-- SELECT: Split into two policies to avoid infinite recursion during trigger execution
-- Policy: Users can view groups they created OR are members of
-- Split into two non-overlapping policies to avoid recursion
CREATE POLICY "View own created groups"
  ON groups
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

-- This policy uses a SECURITY DEFINER function to avoid recursion
CREATE OR REPLACE FUNCTION user_is_group_member(group_uuid UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM group_members
    WHERE group_id = group_uuid
      AND user_id = auth.uid()
  );
END;
$$;

CREATE POLICY "View member groups"
  ON groups
  FOR SELECT
  TO authenticated
  USING (user_is_group_member(id));

-- INSERT: Authenticated users can create groups
CREATE POLICY "Authenticated users can create groups"
  ON groups
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- UPDATE: Group admins can update groups
CREATE POLICY "Group admins can update groups"
  ON groups
  FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT group_id
      FROM group_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    id IN (
      SELECT group_id
      FROM group_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- DELETE: Group creator can delete groups
CREATE POLICY "Group creator can delete groups"
  ON groups
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- ========================================
-- RLS Policies for group_members
-- ========================================

-- SELECT: Users can view group_members records for groups they created
-- This policy is intentionally simple to avoid recursion
-- Members will be able to see other members through the groups table join
CREATE POLICY "Group creators can view members"
  ON group_members
  FOR SELECT
  TO authenticated
  USING (
    group_id IN (
      SELECT id
      FROM groups
      WHERE created_by = auth.uid()
    )
  );

-- SELECT: Users can view their own group_members record
CREATE POLICY "Users can view own membership"
  ON group_members
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
  );

-- INSERT: Group creators can add members
-- Note: The trigger function uses SECURITY DEFINER to bypass this policy
CREATE POLICY "Group creators can add members"
  ON group_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    group_id IN (
      SELECT id
      FROM groups
      WHERE created_by = auth.uid()
    )
  );

-- DELETE: Users can remove themselves OR group creators can remove members
CREATE POLICY "Users can leave or creators can remove members"
  ON group_members
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid() -- User can remove themselves
    OR
    group_id IN ( -- Or user is the group creator
      SELECT id
      FROM groups
      WHERE created_by = auth.uid()
    )
  );

-- ========================================
-- Trigger: Auto-add creator as admin
-- ========================================

-- Function to add group creator as admin member
-- SECURITY DEFINER makes this run with postgres role privileges, bypassing RLS
CREATE OR REPLACE FUNCTION add_creator_as_admin()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  -- Explicitly disable RLS for this operation
  SET LOCAL row_security = off;

  INSERT INTO group_members (group_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'admin');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_group_created
  AFTER INSERT ON groups
  FOR EACH ROW
  EXECUTE FUNCTION add_creator_as_admin();

-- Comments for documentation
COMMENT ON TABLE groups IS 'Groups for organizing shared expenses';
COMMENT ON COLUMN groups.id IS 'Primary key';
COMMENT ON COLUMN groups.name IS 'Group display name';
COMMENT ON COLUMN groups.description IS 'Optional group description';
COMMENT ON COLUMN groups.created_by IS 'User who created the group';

COMMENT ON TABLE group_members IS 'Many-to-many relationship between groups and users';
COMMENT ON COLUMN group_members.role IS 'User role in group: admin or member';
COMMENT ON COLUMN group_members.joined_at IS 'When user joined the group';
