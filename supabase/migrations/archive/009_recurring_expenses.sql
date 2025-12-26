-- Create recurring_expenses table
CREATE TABLE recurring_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reference to template expense (contains amount, description, category, splits)
  template_expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,

  -- Recurrence configuration
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'bi_weekly', 'monthly', 'quarterly', 'yearly', 'custom')),
  "interval" INT NOT NULL DEFAULT 1 CHECK ("interval" > 0),  -- e.g., every 2 months

  -- Date management
  start_date DATE NOT NULL,
  end_date DATE,  -- NULL means indefinite
  next_occurrence DATE NOT NULL,
  last_created_at TIMESTAMPTZ,  -- Track last expense creation

  -- Status and settings
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notify_before_days INT DEFAULT 1 CHECK (notify_before_days >= 0),

  -- Context (group or friendship)
  context_type TEXT NOT NULL CHECK (context_type IN ('group', 'friend')),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  friendship_id UUID REFERENCES friendships(id) ON DELETE CASCADE,

  -- Metadata
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure only one context is set
  CONSTRAINT check_single_context CHECK (
    (context_type = 'group' AND group_id IS NOT NULL AND friendship_id IS NULL) OR
    (context_type = 'friend' AND friendship_id IS NOT NULL AND group_id IS NULL)
  )
);

-- Add indexes for performance
CREATE INDEX idx_recurring_expenses_template ON recurring_expenses(template_expense_id);
CREATE INDEX idx_recurring_expenses_group ON recurring_expenses(group_id) WHERE group_id IS NOT NULL;
CREATE INDEX idx_recurring_expenses_friendship ON recurring_expenses(friendship_id) WHERE friendship_id IS NOT NULL;
CREATE INDEX idx_recurring_expenses_next_occurrence ON recurring_expenses(next_occurrence) WHERE is_active = TRUE;
CREATE INDEX idx_recurring_expenses_created_by ON recurring_expenses(created_by);

-- Enable Row Level Security
ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view recurring expenses they participate in (via group or friendship)
CREATE POLICY "Users can view recurring expenses they participate in"
  ON recurring_expenses
  FOR SELECT
  USING (
    -- For group context
    (context_type = 'group' AND EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = recurring_expenses.group_id
      AND group_members.user_id = auth.uid()
    ))
    OR
    -- For friendship context
    (context_type = 'friend' AND EXISTS (
      SELECT 1 FROM friendships
      WHERE friendships.id = recurring_expenses.friendship_id
      AND (friendships.user_a = auth.uid() OR friendships.user_b = auth.uid())
      AND friendships.status = 'accepted'
    ))
  );

-- RLS Policy: Only creator can insert recurring expenses
CREATE POLICY "Only creator can insert recurring expenses"
  ON recurring_expenses
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND
    -- Must be participant of the context
    (
      (context_type = 'group' AND EXISTS (
        SELECT 1 FROM group_members
        WHERE group_members.group_id = recurring_expenses.group_id
        AND group_members.user_id = auth.uid()
      ))
      OR
      (context_type = 'friend' AND EXISTS (
        SELECT 1 FROM friendships
        WHERE friendships.id = recurring_expenses.friendship_id
        AND (friendships.user_a = auth.uid() OR friendships.user_b = auth.uid())
        AND friendships.status = 'accepted'
      ))
    )
  );

-- RLS Policy: Only creator can update recurring expenses
CREATE POLICY "Only creator can update recurring expenses"
  ON recurring_expenses
  FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- RLS Policy: Only creator can delete recurring expenses
CREATE POLICY "Only creator can delete recurring expenses"
  ON recurring_expenses
  FOR DELETE
  USING (created_by = auth.uid());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_recurring_expenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_recurring_expenses_updated_at
  BEFORE UPDATE ON recurring_expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_recurring_expenses_updated_at();

-- Function to calculate next occurrence date
CREATE OR REPLACE FUNCTION calculate_next_occurrence(
  p_current_date DATE,
  p_frequency TEXT,
  p_interval_value INT
)
RETURNS DATE AS $$
BEGIN
  CASE p_frequency
    WHEN 'weekly' THEN
      RETURN p_current_date + (p_interval_value * INTERVAL '1 week');
    WHEN 'bi_weekly' THEN
      RETURN p_current_date + (p_interval_value * INTERVAL '2 weeks');
    WHEN 'monthly' THEN
      RETURN p_current_date + (p_interval_value * INTERVAL '1 month');
    WHEN 'quarterly' THEN
      RETURN p_current_date + (p_interval_value * INTERVAL '3 months');
    WHEN 'yearly' THEN
      RETURN p_current_date + (p_interval_value * INTERVAL '1 year');
    WHEN 'custom' THEN
      RETURN p_current_date + (p_interval_value * INTERVAL '1 day');
    ELSE
      RETURN p_current_date + INTERVAL '1 month';
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get active recurring expenses due for creation
CREATE OR REPLACE FUNCTION get_due_recurring_expenses()
RETURNS TABLE (
  id UUID,
  template_expense_id UUID,
  frequency TEXT,
  interval_value INT,
  next_occurrence DATE,
  context_type TEXT,
  group_id UUID,
  friendship_id UUID,
  created_by UUID
) AS $$
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
    re.created_by
  FROM recurring_expenses re
  WHERE re.is_active = TRUE
    AND re.next_occurrence <= CURRENT_DATE
    AND (re.end_date IS NULL OR re.end_date >= CURRENT_DATE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on helper functions
GRANT EXECUTE ON FUNCTION calculate_next_occurrence(DATE, TEXT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_due_recurring_expenses() TO service_role;

COMMENT ON TABLE recurring_expenses IS 'Stores recurring expense templates and scheduling information';
COMMENT ON COLUMN recurring_expenses.template_expense_id IS 'References the expense that serves as a template';
COMMENT ON COLUMN recurring_expenses.frequency IS 'How often the expense recurs: weekly, bi_weekly, monthly, quarterly, yearly, custom';
COMMENT ON COLUMN recurring_expenses.interval IS 'Multiplier for frequency (e.g., every 2 months)';
COMMENT ON COLUMN recurring_expenses.next_occurrence IS 'Date when the next expense should be created';
COMMENT ON COLUMN recurring_expenses.is_active IS 'Whether the recurring expense is currently active';
COMMENT ON COLUMN recurring_expenses.notify_before_days IS 'Days before occurrence to send notification (0 = day of)';
