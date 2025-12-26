-- Rollback Migration: Remove Expense Categories Constraint
-- Purpose: Rollback the expense category enum constraint
-- Date: 2025-12-27
-- Rolls back: 007_expense_categories_constraint.sql

-- Drop the view
DROP VIEW IF EXISTS expense_category_stats;

-- Drop the helper function
DROP FUNCTION IF EXISTS get_expense_categories();

-- Drop the indexes
DROP INDEX IF EXISTS idx_expenses_category_date;
DROP INDEX IF EXISTS idx_expenses_category;

-- Change category column back to plain TEXT
ALTER TABLE expenses
  ALTER COLUMN category TYPE TEXT;

-- Drop the enum type
DROP TYPE IF EXISTS expense_category;

-- Note: This rollback preserves all existing category data
-- Categories will remain as TEXT values after rollback
