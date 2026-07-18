-- Migration: Allow editing recurring expenses (amount + schedule)
-- Enables group admins / friendship participants to update template amount
-- and schedule fields. Past instances stay unchanged; future cycles use the
-- updated template.

-- ========================================
-- SECTION 1: Broaden recurring_expenses RLS
-- Group members can view; creator / group admin / friendship participant can
-- update & delete (needed for pause/resume/delete and schedule edits).
-- ========================================

DROP POLICY IF EXISTS "Users can view recurring expenses for their expenses"
  ON recurring_expenses;

CREATE POLICY "Users can view recurring expenses for their expenses"
  ON recurring_expenses FOR SELECT
  TO authenticated
  USING (
    template_expense_id IN (
      SELECT e.id
      FROM expenses e
      WHERE e.created_by = auth.uid()
         OR is_admin()
         OR (
           e.group_id IS NOT NULL
           AND EXISTS (
             SELECT 1 FROM group_members gm
             WHERE gm.group_id = e.group_id
               AND gm.user_id = auth.uid()
           )
         )
         OR (
           e.friendship_id IS NOT NULL
           AND EXISTS (
             SELECT 1 FROM friendships f
             WHERE f.id = e.friendship_id
               AND (f.user_a = auth.uid() OR f.user_b = auth.uid())
           )
         )
    )
  );

DROP POLICY IF EXISTS "Users can update their recurring expenses"
  ON recurring_expenses;

CREATE POLICY "Users can update their recurring expenses"
  ON recurring_expenses FOR UPDATE
  TO authenticated
  USING (
    template_expense_id IN (
      SELECT e.id
      FROM expenses e
      WHERE e.created_by = auth.uid()
         OR is_admin()
         OR (
           e.group_id IS NOT NULL
           AND EXISTS (
             SELECT 1 FROM group_members gm
             WHERE gm.group_id = e.group_id
               AND gm.user_id = auth.uid()
               AND gm.role = 'admin'
           )
         )
         OR (
           e.friendship_id IS NOT NULL
           AND EXISTS (
             SELECT 1 FROM friendships f
             WHERE f.id = e.friendship_id
               AND (f.user_a = auth.uid() OR f.user_b = auth.uid())
           )
         )
    )
  )
  WITH CHECK (
    template_expense_id IN (
      SELECT e.id
      FROM expenses e
      WHERE e.created_by = auth.uid()
         OR is_admin()
         OR (
           e.group_id IS NOT NULL
           AND EXISTS (
             SELECT 1 FROM group_members gm
             WHERE gm.group_id = e.group_id
               AND gm.user_id = auth.uid()
               AND gm.role = 'admin'
           )
         )
         OR (
           e.friendship_id IS NOT NULL
           AND EXISTS (
             SELECT 1 FROM friendships f
             WHERE f.id = e.friendship_id
               AND (f.user_a = auth.uid() OR f.user_b = auth.uid())
           )
         )
    )
  );

DROP POLICY IF EXISTS "Users can delete their recurring expenses"
  ON recurring_expenses;

CREATE POLICY "Users can delete their recurring expenses"
  ON recurring_expenses FOR DELETE
  TO authenticated
  USING (
    template_expense_id IN (
      SELECT e.id
      FROM expenses e
      WHERE e.created_by = auth.uid()
         OR is_admin()
         OR (
           e.group_id IS NOT NULL
           AND EXISTS (
             SELECT 1 FROM group_members gm
             WHERE gm.group_id = e.group_id
               AND gm.user_id = auth.uid()
               AND gm.role = 'admin'
           )
         )
         OR (
           e.friendship_id IS NOT NULL
           AND EXISTS (
             SELECT 1 FROM friendships f
             WHERE f.id = e.friendship_id
               AND (f.user_a = auth.uid() OR f.user_b = auth.uid())
           )
         )
    )
  );

-- ========================================
-- SECTION 2: Atomic update RPC
-- Updates template amount/description (with split recalc) + schedule fields.
-- SECURITY DEFINER so group admins can update templates they did not create.
-- ========================================

CREATE OR REPLACE FUNCTION public.update_recurring_expense(
  p_recurring_expense_id UUID,
  p_amount NUMERIC DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_frequency TEXT DEFAULT NULL,
  p_interval INTEGER DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_clear_end_date BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_recurring RECORD;
  v_template RECORD;
  v_can_manage BOOLEAN := FALSE;
  v_old_amount NUMERIC;
  v_new_amount NUMERIC;
  v_split_count INTEGER;
  v_base_share NUMERIC;
  v_remainder NUMERIC;
  v_method TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_recurring
  FROM recurring_expenses
  WHERE id = p_recurring_expense_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Recurring expense not found');
  END IF;

  SELECT * INTO v_template
  FROM expenses
  WHERE id = v_recurring.template_expense_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Template expense not found');
  END IF;

  -- Permission: creator, platform admin, group admin, or friendship participant
  v_can_manage := (
    v_template.created_by = auth.uid()
    OR is_admin()
    OR (
      v_template.group_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM group_members gm
        WHERE gm.group_id = v_template.group_id
          AND gm.user_id = auth.uid()
          AND gm.role = 'admin'
      )
    )
    OR (
      v_template.friendship_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM friendships f
        WHERE f.id = v_template.friendship_id
          AND (f.user_a = auth.uid() OR f.user_b = auth.uid())
      )
    )
  );

  IF NOT v_can_manage THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
  END IF;

  -- Validate optional inputs
  IF p_amount IS NOT NULL AND p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must be positive');
  END IF;

  IF p_interval IS NOT NULL AND p_interval < 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Interval must be at least 1');
  END IF;

  IF p_frequency IS NOT NULL AND p_frequency NOT IN (
    'daily', 'weekly', 'bi_weekly', 'monthly', 'quarterly', 'yearly', 'custom'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid frequency');
  END IF;

  IF p_description IS NOT NULL AND btrim(p_description) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Description cannot be empty');
  END IF;

  -- Update template description / amount
  v_old_amount := v_template.amount;
  v_new_amount := COALESCE(p_amount, v_template.amount);

  IF p_amount IS NOT NULL OR p_description IS NOT NULL THEN
    UPDATE expenses
    SET
      amount = v_new_amount,
      description = COALESCE(NULLIF(btrim(p_description), ''), description),
      updated_at = NOW()
    WHERE id = v_template.id;
  END IF;

  -- Recalculate template splits when amount changes
  IF p_amount IS NOT NULL AND p_amount <> v_old_amount THEN
    SELECT COUNT(*), MIN(split_method)
    INTO v_split_count, v_method
    FROM expense_splits
    WHERE expense_id = v_template.id;

    IF v_split_count > 0 THEN
      IF v_method = 'equal' THEN
        -- Integer-friendly equal split with remainder on first rows
        v_base_share := FLOOR(v_new_amount / v_split_count);
        v_remainder := v_new_amount - (v_base_share * v_split_count);

        WITH ordered AS (
          SELECT
            id,
            ROW_NUMBER() OVER (ORDER BY created_at, id) AS rn
          FROM expense_splits
          WHERE expense_id = v_template.id
        )
        UPDATE expense_splits es
        SET
          computed_amount = v_base_share + CASE WHEN o.rn <= v_remainder THEN 1 ELSE 0 END,
          split_value = 1
        FROM ordered o
        WHERE es.id = o.id;

      ELSIF v_method = 'percentage' THEN
        UPDATE expense_splits
        SET computed_amount = ROUND(v_new_amount * split_value / 100.0, 2)
        WHERE expense_id = v_template.id;

      ELSE
        -- exact (and any other): scale proportionally; last split absorbs remainder
        IF v_old_amount > 0 THEN
          WITH ordered AS (
            SELECT
              id,
              computed_amount,
              ROW_NUMBER() OVER (ORDER BY created_at, id) AS rn,
              COUNT(*) OVER () AS cnt
            FROM expense_splits
            WHERE expense_id = v_template.id
          ),
          scaled AS (
            SELECT
              id,
              rn,
              cnt,
              CASE
                WHEN rn < cnt THEN ROUND(computed_amount * v_new_amount / v_old_amount, 2)
                ELSE NULL
              END AS new_amount
            FROM ordered
          ),
          with_last AS (
            SELECT
              s.id,
              COALESCE(
                s.new_amount,
                v_new_amount - COALESCE((
                  SELECT SUM(s2.new_amount) FROM scaled s2 WHERE s2.new_amount IS NOT NULL
                ), 0)
              ) AS new_amount
            FROM scaled s
          )
          UPDATE expense_splits es
          SET
            computed_amount = w.new_amount,
            split_value = w.new_amount
          FROM with_last w
          WHERE es.id = w.id;
        END IF;
      END IF;
    END IF;
  END IF;

  -- Update schedule fields
  UPDATE recurring_expenses
  SET
    frequency = COALESCE(p_frequency, frequency),
    interval = COALESCE(p_interval, interval),
    end_date = CASE
      WHEN p_clear_end_date THEN NULL
      WHEN p_end_date IS NOT NULL THEN p_end_date
      ELSE end_date
    END,
    updated_at = NOW()
  WHERE id = p_recurring_expense_id;

  RETURN jsonb_build_object(
    'success', true,
    'recurring_id', p_recurring_expense_id,
    'template_id', v_template.id,
    'amount', v_new_amount
  );
END;
$fn$;

COMMENT ON FUNCTION public.update_recurring_expense IS
  'Update recurring template (amount/description + splits) and schedule. Allowed for creator, group admin, friendship participant, or platform admin. Past instances are unchanged.';

REVOKE ALL ON FUNCTION public.update_recurring_expense(UUID, NUMERIC, TEXT, TEXT, INTEGER, DATE, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_recurring_expense(UUID, NUMERIC, TEXT, TEXT, INTEGER, DATE, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_recurring_expense(UUID, NUMERIC, TEXT, TEXT, INTEGER, DATE, BOOLEAN) TO service_role;
