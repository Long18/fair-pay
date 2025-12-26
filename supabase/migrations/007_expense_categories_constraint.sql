-- Migration: Add Expense Categories Constraint
-- Purpose: Enforce valid expense categories at database level, synced with frontend
-- Date: 2025-12-27
-- Reference: src/modules/expenses/lib/categories.ts

-- ========================================
-- Part 1: Create Categories Enum Type
-- ========================================

-- Create enum type for expense categories
-- These match exactly with frontend categories in src/modules/expenses/lib/categories.ts
CREATE TYPE expense_category AS ENUM (
  'Food & Drink',
  'Transportation',
  'Accommodation',
  'Entertainment',
  'Shopping',
  'Utilities',
  'Healthcare',
  'Education',
  'Other'
);

-- ========================================
-- Part 2: Migrate Existing Data
-- ========================================

-- First, check and normalize any existing invalid categories to 'Other'
-- This ensures no data loss during migration
UPDATE expenses
SET category = 'Other'
WHERE category IS NOT NULL
  AND category NOT IN (
    'Food & Drink',
    'Transportation',
    'Accommodation',
    'Entertainment',
    'Shopping',
    'Utilities',
    'Healthcare',
    'Education',
    'Other'
  );

-- ========================================
-- Part 3: Alter Table to Use Enum
-- ========================================

-- Change category column to use the enum type
-- NULL is still allowed (for uncategorized expenses)
ALTER TABLE expenses
  ALTER COLUMN category TYPE expense_category
  USING category::expense_category;

-- ========================================
-- Part 4: Add Index for Performance
-- ========================================

-- Add index on category for better query performance in reports
CREATE INDEX IF NOT EXISTS idx_expenses_category
  ON expenses(category)
  WHERE category IS NOT NULL;

-- Add composite index for category + date (common in reports)
CREATE INDEX IF NOT EXISTS idx_expenses_category_date
  ON expenses(category, expense_date DESC)
  WHERE category IS NOT NULL;

-- ========================================
-- Part 5: Create Helper Function
-- ========================================

-- Function to get all valid expense categories
CREATE OR REPLACE FUNCTION get_expense_categories()
RETURNS TABLE (category_name TEXT)
LANGUAGE SQL
STABLE
AS $$
  SELECT unnest(enum_range(NULL::expense_category))::TEXT;
$$;

GRANT EXECUTE ON FUNCTION get_expense_categories() TO authenticated;
GRANT EXECUTE ON FUNCTION get_expense_categories() TO anon;

-- ========================================
-- Part 6: Create Categories View
-- ========================================

-- Create a view for category statistics
CREATE OR REPLACE VIEW expense_category_stats AS
SELECT
  category,
  COUNT(*) as expense_count,
  SUM(amount) as total_amount,
  AVG(amount) as avg_amount,
  MIN(expense_date) as first_expense_date,
  MAX(expense_date) as last_expense_date
FROM expenses
WHERE category IS NOT NULL
  AND is_payment = false
GROUP BY category;

-- Grant access to the view
GRANT SELECT ON expense_category_stats TO authenticated;

-- ========================================
-- Comments for Documentation
-- ========================================

COMMENT ON TYPE expense_category IS
  'Valid expense categories synchronized with frontend (src/modules/expenses/lib/categories.ts)';

COMMENT ON COLUMN expenses.category IS
  'Expense category - must be one of the predefined categories or NULL for uncategorized';

COMMENT ON FUNCTION get_expense_categories() IS
  'Returns list of all valid expense categories';

COMMENT ON VIEW expense_category_stats IS
  'Aggregated statistics for each expense category';
