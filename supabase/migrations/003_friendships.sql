-- Migration: 005_friendships.sql
-- Description: Create friendships table for 1-on-1 friend connections and expenses
-- Date: 2025-12-25
-- Dependencies: 001_profiles.sql

-- Create friendships table
CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_a UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT different_users CHECK (user_a != user_b),
  CONSTRAINT ordered_users CHECK (user_a < user_b)
);

-- Create indexes for better query performance
CREATE INDEX idx_friendships_user_a ON friendships(user_a);
CREATE INDEX idx_friendships_user_b ON friendships(user_b);
CREATE INDEX idx_friendships_status ON friendships(status);

-- Enable Row Level Security
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- ========================================
-- RLS Policies for friendships
-- ========================================

-- SELECT: Users can view friendships they're part of
CREATE POLICY "Users can view their friendships"
  ON friendships
  FOR SELECT
  TO authenticated
  USING (
    user_a = auth.uid() OR user_b = auth.uid()
  );

-- INSERT: Users can create friendship requests
CREATE POLICY "Users can create friendships"
  ON friendships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Must be one of the users
    (user_a = auth.uid() OR user_b = auth.uid())
    AND
    -- created_by must be authenticated user
    created_by = auth.uid()
    AND
    -- Initial status must be pending
    status = 'pending'
  );

-- UPDATE: Users can update friendships they're part of
CREATE POLICY "Users can update their friendships"
  ON friendships
  FOR UPDATE
  TO authenticated
  USING (
    user_a = auth.uid() OR user_b = auth.uid()
  )
  WITH CHECK (
    user_a = auth.uid() OR user_b = auth.uid()
  );

-- DELETE: Users can delete friendships they're part of
CREATE POLICY "Users can delete their friendships"
  ON friendships
  FOR DELETE
  TO authenticated
  USING (
    user_a = auth.uid() OR user_b = auth.uid()
  );

-- ========================================
-- Helper Functions
-- ========================================

-- Function to get friendship between two users (bidirectional)
CREATE OR REPLACE FUNCTION get_friendship(user_id_1 UUID, user_id_2 UUID)
RETURNS UUID AS $$
  SELECT id FROM friendships
  WHERE (user_a = LEAST(user_id_1, user_id_2) AND user_b = GREATEST(user_id_1, user_id_2))
    OR (user_a = LEAST(user_id_2, user_id_1) AND user_b = GREATEST(user_id_2, user_id_1))
  LIMIT 1;
$$ LANGUAGE SQL STABLE;

-- Function to check if two users are friends
CREATE OR REPLACE FUNCTION are_friends(user_id_1 UUID, user_id_2 UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM friendships
    WHERE ((user_a = user_id_1 AND user_b = user_id_2) OR (user_a = user_id_2 AND user_b = user_id_1))
      AND status = 'accepted'
  );
$$ LANGUAGE SQL STABLE;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_friendships_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER friendships_updated_at
  BEFORE UPDATE ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION update_friendships_updated_at();

-- Comments for documentation
COMMENT ON TABLE friendships IS '1-on-1 friend connections between users';
COMMENT ON COLUMN friendships.user_a IS 'First user in friendship (always < user_b for consistency)';
COMMENT ON COLUMN friendships.user_b IS 'Second user in friendship (always > user_a for consistency)';
COMMENT ON COLUMN friendships.status IS 'pending: awaiting acceptance, accepted: active friends, rejected: declined request';
COMMENT ON COLUMN friendships.created_by IS 'User who initiated the friendship request';

