-- Migration: Add avatar_url column to groups table
-- Description: Adds avatar_url column to support group profile images
-- Date: 2025-12-31

-- Add avatar_url column to groups table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'groups' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE groups ADD COLUMN avatar_url TEXT;
    RAISE NOTICE 'Added avatar_url column to groups table';
  ELSE
    RAISE NOTICE 'avatar_url column already exists in groups table';
  END IF;
END $$;

