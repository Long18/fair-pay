-- Migration: Enable Public Read Access to Groups and Profiles
-- Purpose: Allow public access to view group and profile information for activity feed
-- Date: 2025-12-26

-- Enable public SELECT on groups table
CREATE POLICY IF NOT EXISTS "Public can view all groups"
  ON groups FOR SELECT
  USING (true);

-- Enable public SELECT on profiles table  
CREATE POLICY IF NOT EXISTS "Public can view all profiles"
  ON profiles FOR SELECT
  USING (true);

-- Note: This only opens up READ access
-- INSERT, UPDATE, DELETE policies remain authenticated-only for security

