-- Add archive feature to groups
-- Admin/creator can archive a group
-- Archived groups: regular members can only see balances and members, cannot view/add expenses

-- 1. Add is_archived column to groups table
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false NOT NULL;

-- 2. Add index for filtering archived groups
CREATE INDEX IF NOT EXISTS idx_groups_is_archived ON public.groups(is_archived);

-- 3. Add archived_at timestamp for tracking when group was archived
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- 4. Add archived_by to track who archived the group
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.groups.is_archived IS 'Whether the group is archived. Archived groups restrict member access to view-only balances.';
COMMENT ON COLUMN public.groups.archived_at IS 'Timestamp when the group was archived.';
COMMENT ON COLUMN public.groups.archived_by IS 'User who archived the group.';
