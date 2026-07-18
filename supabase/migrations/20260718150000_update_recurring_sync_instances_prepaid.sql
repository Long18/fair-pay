-- Migration: When editing recurring amount, sync generated instances + prepaid
-- Past/current cycle expenses and prepaid balances/history scale with the new amount.

DROP FUNCTION IF EXISTS public.update_recurring_expense(UUID, NUMERIC, TEXT, TEXT, INTEGER, DATE, BOOLEAN);
DROP FUNCTION IF EXISTS public.update_recurring_expense(UUID, NUMERIC, TEXT, TEXT, INTEGER, DATE, BOOLEAN, BOOLEAN);

CREATE OR REPLACE FUNCTION public.update_recurring_expense(
  p_recurring_expense_id UUID,
  p_amount NUMERIC DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_frequency TEXT DEFAULT NULL,
  p_interval INTEGER DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_clear_end_date BOOLEAN DEFAULT FALSE,
  p_update_generated_instances BOOLEAN DEFAULT TRUE
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
  v_amount_ratio NUMERIC;
  v_split_count INTEGER;
  v_base_share NUMERIC;
  v_remainder NUMERIC;
  v_method TEXT;
  v_new_description TEXT;
  v_instances_updated INTEGER := 0;
  v_prepaid_balances_updated INTEGER := 0;
  v_prepaid_payments_updated INTEGER := 0;
  v_instance RECORD;
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

  v_old_amount := v_template.amount;
  v_new_amount := COALESCE(p_amount, v_template.amount);
  v_new_description := COALESCE(NULLIF(btrim(COALESCE(p_description, '')), ''), v_template.description);
  v_amount_ratio := CASE
    WHEN v_old_amount > 0 THEN v_new_amount / v_old_amount
    ELSE 1
  END;

  -- Update template
  IF p_amount IS NOT NULL OR p_description IS NOT NULL THEN
    UPDATE expenses
    SET
      amount = v_new_amount,
      description = v_new_description,
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
        v_base_share := FLOOR(v_new_amount / v_split_count);
        v_remainder := v_new_amount - (v_base_share * v_split_count);

        WITH ordered AS (
          SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS rn
          FROM expense_splits
          WHERE expense_id = v_template.id
        )
        UPDATE expense_splits es
        SET
          computed_amount = v_base_share + CASE WHEN o.rn <= v_remainder THEN 1 ELSE 0 END,
          split_value = 1,
          settled_amount = CASE
            WHEN es.is_settled AND es.settled_amount >= es.computed_amount
              THEN v_base_share + CASE WHEN o.rn <= v_remainder THEN 1 ELSE 0 END
            WHEN es.settled_amount > 0 AND es.computed_amount > 0
              THEN ROUND(es.settled_amount * v_amount_ratio, 2)
            ELSE es.settled_amount
          END
        FROM ordered o
        WHERE es.id = o.id;

      ELSIF v_method = 'percentage' THEN
        UPDATE expense_splits
        SET
          computed_amount = ROUND(v_new_amount * split_value / 100.0, 2),
          settled_amount = CASE
            WHEN is_settled AND settled_amount >= computed_amount
              THEN ROUND(v_new_amount * split_value / 100.0, 2)
            WHEN settled_amount > 0 AND computed_amount > 0
              THEN ROUND(settled_amount * v_amount_ratio, 2)
            ELSE settled_amount
          END
        WHERE expense_id = v_template.id;

      ELSIF v_old_amount > 0 THEN
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
          split_value = w.new_amount,
          settled_amount = CASE
            WHEN es.is_settled AND es.settled_amount >= es.computed_amount THEN w.new_amount
            WHEN es.settled_amount > 0 AND es.computed_amount > 0
              THEN ROUND(es.settled_amount * v_amount_ratio, 2)
            ELSE es.settled_amount
          END
        FROM with_last w
        WHERE es.id = w.id;
      END IF;
    END IF;
  END IF;

  -- Sync generated instances + splits when amount/description changes
  IF p_update_generated_instances
     AND (
       (p_amount IS NOT NULL AND p_amount <> v_old_amount)
       OR (p_description IS NOT NULL AND v_new_description <> v_template.description)
     )
  THEN
    UPDATE expenses
    SET
      amount = CASE
        WHEN p_amount IS NOT NULL AND p_amount <> v_old_amount THEN v_new_amount
        ELSE amount
      END,
      description = CASE
        WHEN p_description IS NOT NULL THEN v_new_description
        ELSE description
      END,
      updated_at = NOW()
    WHERE recurring_expense_id = p_recurring_expense_id;

    GET DIAGNOSTICS v_instances_updated = ROW_COUNT;

    IF p_amount IS NOT NULL AND p_amount <> v_old_amount AND v_old_amount > 0 THEN
      FOR v_instance IN
        SELECT id FROM expenses WHERE recurring_expense_id = p_recurring_expense_id
      LOOP
        SELECT COUNT(*), MIN(split_method)
        INTO v_split_count, v_method
        FROM expense_splits
        WHERE expense_id = v_instance.id;

        IF v_split_count = 0 THEN
          CONTINUE;
        END IF;

        IF v_method = 'equal' THEN
          v_base_share := FLOOR(v_new_amount / v_split_count);
          v_remainder := v_new_amount - (v_base_share * v_split_count);

          WITH ordered AS (
            SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS rn
            FROM expense_splits
            WHERE expense_id = v_instance.id
          )
          UPDATE expense_splits es
          SET
            computed_amount = v_base_share + CASE WHEN o.rn <= v_remainder THEN 1 ELSE 0 END,
            settled_amount = CASE
              WHEN es.is_settled AND es.settled_amount >= es.computed_amount
                THEN v_base_share + CASE WHEN o.rn <= v_remainder THEN 1 ELSE 0 END
              WHEN es.settled_amount > 0 AND es.computed_amount > 0
                THEN ROUND(es.settled_amount * v_amount_ratio, 2)
              ELSE es.settled_amount
            END
          FROM ordered o
          WHERE es.id = o.id;

        ELSIF v_method = 'percentage' THEN
          UPDATE expense_splits
          SET
            computed_amount = ROUND(v_new_amount * COALESCE(split_value, 0) / 100.0, 2),
            settled_amount = CASE
              WHEN is_settled AND settled_amount >= computed_amount
                THEN ROUND(v_new_amount * COALESCE(split_value, 0) / 100.0, 2)
              WHEN settled_amount > 0 AND computed_amount > 0
                THEN ROUND(settled_amount * v_amount_ratio, 2)
              ELSE settled_amount
            END
          WHERE expense_id = v_instance.id;

        ELSE
          UPDATE expense_splits
          SET
            computed_amount = ROUND(computed_amount * v_amount_ratio, 2),
            split_value = CASE
              WHEN split_value IS NOT NULL THEN ROUND(split_value * v_amount_ratio, 2)
              ELSE split_value
            END,
            settled_amount = CASE
              WHEN is_settled AND settled_amount >= computed_amount
                THEN ROUND(computed_amount * v_amount_ratio, 2)
              WHEN settled_amount > 0
                THEN ROUND(settled_amount * v_amount_ratio, 2)
              ELSE settled_amount
            END
          WHERE expense_id = v_instance.id;

          -- Fix rounding remainder on last exact split
          WITH ordered AS (
            SELECT
              id,
              ROW_NUMBER() OVER (ORDER BY created_at, id) AS rn,
              COUNT(*) OVER () AS cnt,
              SUM(computed_amount) OVER () AS total_amount
            FROM expense_splits
            WHERE expense_id = v_instance.id
          )
          UPDATE expense_splits es
          SET computed_amount = es.computed_amount + (v_new_amount - o.total_amount)
          FROM ordered o
          WHERE es.id = o.id AND o.rn = o.cnt;
        END IF;
      END LOOP;

      -- Prepaid balances: update monthly share; scale balance to preserve months remaining
      UPDATE member_prepaid_balances mpb
      SET
        monthly_share_amount = COALESCE((
          SELECT es.computed_amount
          FROM expense_splits es
          WHERE es.expense_id = v_recurring.template_expense_id
            AND es.user_id = mpb.user_id
        ), ROUND(mpb.monthly_share_amount * v_amount_ratio, 2)),
        balance_amount = ROUND(mpb.balance_amount * v_amount_ratio, 2),
        updated_at = NOW()
      WHERE mpb.recurring_expense_id = p_recurring_expense_id;

      GET DIAGNOSTICS v_prepaid_balances_updated = ROW_COUNT;

      -- Prepaid payment history amounts scale with price change
      UPDATE recurring_prepaid_payments
      SET amount = ROUND(amount * v_amount_ratio, 2)
      WHERE recurring_expense_id = p_recurring_expense_id;

      GET DIAGNOSTICS v_prepaid_payments_updated = ROW_COUNT;
    END IF;
  END IF;

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
    'amount', v_new_amount,
    'instances_updated', v_instances_updated,
    'prepaid_balances_updated', v_prepaid_balances_updated,
    'prepaid_payments_updated', v_prepaid_payments_updated
  );
END;
$fn$;

COMMENT ON FUNCTION public.update_recurring_expense(UUID, NUMERIC, TEXT, TEXT, INTEGER, DATE, BOOLEAN, BOOLEAN) IS
  'Update recurring template (amount/description + splits) and schedule. By default also syncs generated instances, splits, prepaid balances, and prepaid payment amounts. Allowed for creator, group admin, friendship participant, or platform admin.';

REVOKE ALL ON FUNCTION public.update_recurring_expense(UUID, NUMERIC, TEXT, TEXT, INTEGER, DATE, BOOLEAN, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_recurring_expense(UUID, NUMERIC, TEXT, TEXT, INTEGER, DATE, BOOLEAN, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_recurring_expense(UUID, NUMERIC, TEXT, TEXT, INTEGER, DATE, BOOLEAN, BOOLEAN) TO service_role;
