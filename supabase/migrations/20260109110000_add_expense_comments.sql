-- Migration: Add comment field to expenses table
-- Date: 2026-01-09
-- Purpose: Allow users to add optional comments/notes to expenses for additional context

DO $$
BEGIN
  -- Only add column if expenses table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'expenses') THEN
    -- Add comment column to expenses table
    ALTER TABLE expenses ADD COLUMN IF NOT EXISTS comment TEXT NULL;

    -- Create index for better query performance when filtering by comment existence
    CREATE INDEX IF NOT EXISTS idx_expenses_comment_exists ON expenses(id) WHERE comment IS NOT NULL;

    -- Add comment
    COMMENT ON COLUMN expenses.comment IS 'Optional comment/note field for additional expense details and context';
  END IF;
END $$;
