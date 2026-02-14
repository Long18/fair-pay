-- Migration: Update get_due_recurring_expenses for Prepaid Support
-- Description: Add prepaid_until and end_date to the return type of get_due_recurring_expenses
-- Requirements: 3.1, 3.2, 3.3, 3.5

-- ========================================
-- Update get_due_recurring_expenses FUNCTION
-- Add prepaid_until and end_date to support prepaid period skipping
-- ========================================

-- Drop existing function first (return type changed — CREATE OR REPLACE cannot alter return type)
DROP FUNCTION IF EXISTS get_due_recurring_expenses();

CREATE OR REPLACE FUNCTION get_due_recurring_expenses()
RETURNS TABLE (
  id UUID,
  template_expense_id UUID,
  frequency TEXT,
  interval_value INTEGER,
  next_occurrence DATE,
  context_type TEXT,
  group_id UUID,
  friendship_id UUID,
  created_by UUID,
  prepaid_until DATE,
  end_date DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    re.id,
    re.template_expense_id,
    re.frequency,
    re.interval,
    re.next_occurrence,
    re.context_type,
    re.group_id,
    re.friendship_id,
    re.created_by,
    re.prepaid_until,
    re.end_date
  FROM recurring_expenses re
  WHERE re.is_active = TRUE
    AND re.next_occurrence <= CURRENT_DATE
    AND (re.end_date IS NULL OR re.end_date >= CURRENT_DATE);
END;
$$;

COMMENT ON FUNCTION get_due_recurring_expenses() IS 
'Get all recurring expenses that are due for processing.
Returns recurring expenses where:
  - is_active = TRUE
  - next_occurrence <= CURRENT_DATE
  - end_date is NULL or >= CURRENT_DATE
Includes prepaid_until and end_date for prepaid period handling.';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_due_recurring_expenses() TO authenticated;
GRANT EXECUTE ON FUNCTION get_due_recurring_expenses() TO service_role;
