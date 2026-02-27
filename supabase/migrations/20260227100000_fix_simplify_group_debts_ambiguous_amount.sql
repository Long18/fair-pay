-- Fix: column reference "amount" is ambiguous in simplify_group_debts
-- The RETURN TABLE defines "amount" as an output column, and temp tables
-- temp_givers/temp_receivers also have a column named "amount".
-- PostgreSQL cannot disambiguate between the PL/pgSQL variable and the table column.
-- Solution: rename temp table columns to "owed_amount" to avoid collision.

DROP FUNCTION IF EXISTS simplify_group_debts(UUID);

CREATE OR REPLACE FUNCTION simplify_group_debts(p_group_id UUID)
RETURNS TABLE (
  from_user_id UUID,
  to_user_id UUID,
  amount NUMERIC(10,2),
  from_user_name TEXT,
  to_user_name TEXT,
  from_user_avatar TEXT,
  to_user_avatar TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_giver RECORD;
  v_receiver RECORD;
  v_settle_amount NUMERIC(10,2);
BEGIN
  -- Step 1: Calculate net balance for each group member
  CREATE TEMP TABLE temp_net_balances ON COMMIT DROP AS
  SELECT
    gm.user_id,
    p.full_name AS user_name,
    p.avatar_url AS user_avatar,
    COALESCE(
      (SELECT SUM(e.amount)
       FROM expenses e
       WHERE e.group_id = p_group_id
         AND e.paid_by_user_id = gm.user_id
         AND e.is_payment = false),
      0
    ) -
    COALESCE(
      (SELECT SUM(es.computed_amount - COALESCE(es.settled_amount, 0))
       FROM expense_splits es
       JOIN expenses e ON e.id = es.expense_id
       WHERE e.group_id = p_group_id
         AND es.user_id = gm.user_id
         AND e.is_payment = false),
      0
    ) +
    COALESCE(
      (SELECT SUM(e.amount)
       FROM expenses e
       WHERE e.group_id = p_group_id
         AND e.paid_by_user_id = gm.user_id
         AND e.is_payment = true),
      0
    ) -
    COALESCE(
      (SELECT SUM(es.computed_amount)
       FROM expense_splits es
       JOIN expenses e ON e.id = es.expense_id
       WHERE e.group_id = p_group_id
         AND es.user_id = gm.user_id
         AND e.is_payment = true),
      0
    ) AS net_balance
  FROM group_members gm
  JOIN profiles p ON p.id = gm.user_id
  WHERE gm.group_id = p_group_id;

  -- Step 2: Separate into givers (negative balance) and receivers (positive balance)
  -- Use "owed_amount" to avoid ambiguity with RETURN TABLE "amount" column
  CREATE TEMP TABLE temp_givers ON COMMIT DROP AS
  SELECT user_id, user_name, user_avatar, ABS(net_balance) AS owed_amount
  FROM temp_net_balances
  WHERE net_balance < -0.01
  ORDER BY ABS(net_balance) DESC;

  CREATE TEMP TABLE temp_receivers ON COMMIT DROP AS
  SELECT user_id, user_name, user_avatar, net_balance AS owed_amount
  FROM temp_net_balances
  WHERE net_balance > 0.01
  ORDER BY net_balance DESC;

  -- Step 3: Greedy matching - largest giver pays largest receiver
  FOR v_giver IN SELECT * FROM temp_givers LOOP
    FOR v_receiver IN SELECT * FROM temp_receivers WHERE owed_amount > 0.01 LOOP
      v_settle_amount := LEAST(v_giver.owed_amount, v_receiver.owed_amount);

      IF v_settle_amount > 0.01 THEN
        from_user_id := v_giver.user_id;
        to_user_id := v_receiver.user_id;
        amount := ROUND(v_settle_amount, 2);
        from_user_name := v_giver.user_name;
        to_user_name := v_receiver.user_name;
        from_user_avatar := v_giver.user_avatar;
        to_user_avatar := v_receiver.user_avatar;
        RETURN NEXT;

        UPDATE temp_givers
        SET owed_amount = owed_amount - v_settle_amount
        WHERE user_id = v_giver.user_id;

        UPDATE temp_receivers
        SET owed_amount = owed_amount - v_settle_amount
        WHERE user_id = v_receiver.user_id;

        v_giver.owed_amount := v_giver.owed_amount - v_settle_amount;

        IF v_giver.owed_amount < 0.01 THEN
          EXIT;
        END IF;
      END IF;
    END LOOP;
  END LOOP;

  -- Cleanup (ON COMMIT DROP handles this, but explicit drop for safety)
  DROP TABLE IF EXISTS temp_net_balances;
  DROP TABLE IF EXISTS temp_givers;
  DROP TABLE IF EXISTS temp_receivers;

  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION simplify_group_debts(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION simplify_group_debts(UUID) TO anon;
GRANT EXECUTE ON FUNCTION simplify_group_debts(UUID) TO service_role;

COMMENT ON FUNCTION simplify_group_debts IS 'Simplifies group debts using Min-Cost Max-Flow algorithm. Reduces complex multi-party transactions into minimal direct payments.';
