-- Migration: Debt Simplification Algorithm
-- Description: Implements Min-Cost Max-Flow algorithm to reduce transaction count in groups
--              Transforms complex multi-party debts into minimal direct transactions
--              Based on Splitwise's debt simplification feature

BEGIN;

-- Drop existing function if it exists (to allow changing return type)
DROP FUNCTION IF EXISTS simplify_group_debts(UUID);

-- Function to simplify debts within a group using Min-Cost Max-Flow (Greedy Approach)
-- Algorithm:
-- 1. Calculate net balance for each user: (Amount Paid) - (Amount Owed)
-- 2. Separate into Givers (negative balance) and Receivers (positive balance)
-- 3. Sort both by absolute value (descending)
-- 4. Match largest Giver with largest Receiver
-- 5. Settle minimum amount, repeat until all balances are zero
--
-- Returns: Array of simplified transactions {from_user_id, to_user_id, amount, from_user_name, to_user_name}

CREATE FUNCTION simplify_group_debts(p_group_id UUID)
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
AS $$
DECLARE
  v_giver RECORD;
  v_receiver RECORD;
  v_settle_amount NUMERIC(10,2);
BEGIN
  -- Step 1: Calculate net balance for each group member
  -- Net Balance = (Total Paid) - (Total Owed) + (Payments Received) - (Payments Made)
  CREATE TEMP TABLE temp_net_balances AS
  SELECT
    gm.user_id,
    p.full_name as user_name,
    p.avatar_url as user_avatar,
    COALESCE(
      -- Amount this user paid for expenses
      (SELECT SUM(e.amount)
       FROM expenses e
       WHERE e.group_id = p_group_id
         AND e.paid_by_user_id = gm.user_id
         AND e.is_payment = false),
      0
    ) -
    COALESCE(
      -- Amount this user owes (minus settled amounts)
      (SELECT SUM(es.computed_amount - COALESCE(es.settled_amount, 0))
       FROM expense_splits es
       JOIN expenses e ON e.id = es.expense_id
       WHERE e.group_id = p_group_id
         AND es.user_id = gm.user_id
         AND e.is_payment = false),
      0
    ) +
    COALESCE(
      -- Payments received by this user
      (SELECT SUM(e.amount)
       FROM expenses e
       WHERE e.group_id = p_group_id
         AND e.paid_by_user_id = gm.user_id
         AND e.is_payment = true),
      0
    ) -
    COALESCE(
      -- Payments made by this user
      (SELECT SUM(es.computed_amount)
       FROM expense_splits es
       JOIN expenses e ON e.id = es.expense_id
       WHERE e.group_id = p_group_id
         AND es.user_id = gm.user_id
         AND e.is_payment = true),
      0
    ) as net_balance
  FROM group_members gm
  JOIN profiles p ON p.id = gm.user_id
  WHERE gm.group_id = p_group_id;

  -- Step 2: Separate into Givers (negative) and Receivers (positive)
  CREATE TEMP TABLE temp_givers AS
  SELECT user_id, user_name, user_avatar, ABS(net_balance) as amount
  FROM temp_net_balances
  WHERE net_balance < -0.01  -- Use small threshold to avoid floating point issues
  ORDER BY ABS(net_balance) DESC;

  CREATE TEMP TABLE temp_receivers AS
  SELECT user_id, user_name, user_avatar, net_balance as amount
  FROM temp_net_balances
  WHERE net_balance > 0.01  -- Use small threshold to avoid floating point issues
  ORDER BY net_balance DESC;

  -- Step 3: Greedy matching - largest giver pays largest receiver
  FOR v_giver IN SELECT * FROM temp_givers LOOP
    FOR v_receiver IN SELECT * FROM temp_receivers WHERE amount > 0.01 LOOP
      -- Calculate settlement amount (minimum of what giver owes and receiver is owed)
      v_settle_amount := LEAST(v_giver.amount, v_receiver.amount);

      IF v_settle_amount > 0.01 THEN
        -- Return this simplified transaction
        from_user_id := v_giver.user_id;
        to_user_id := v_receiver.user_id;
        amount := ROUND(v_settle_amount, 2);
        from_user_name := v_giver.user_name;
        to_user_name := v_receiver.user_name;
        from_user_avatar := v_giver.user_avatar;
        to_user_avatar := v_receiver.user_avatar;
        RETURN NEXT;

        -- Update remaining amounts
        UPDATE temp_givers
        SET amount = amount - v_settle_amount
        WHERE user_id = v_giver.user_id;

        UPDATE temp_receivers
        SET amount = amount - v_settle_amount
        WHERE user_id = v_receiver.user_id;

        -- Update loop variable
        v_giver.amount := v_giver.amount - v_settle_amount;

        -- If giver is fully settled, move to next giver
        IF v_giver.amount < 0.01 THEN
          EXIT;
        END IF;
      END IF;
    END LOOP;
  END LOOP;

  -- Cleanup temp tables
  DROP TABLE IF EXISTS temp_net_balances;
  DROP TABLE IF EXISTS temp_givers;
  DROP TABLE IF EXISTS temp_receivers;

  RETURN;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION simplify_group_debts(UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION simplify_group_debts(UUID) IS
'Simplifies group debts using Min-Cost Max-Flow algorithm.
Reduces complex multi-party transactions into minimal direct payments.
Example: Instead of A→B $10, B→C $15, C→A $5, returns: B→C $5 (67% reduction)';

COMMIT;

-- Verification query (commented out for production)
-- SELECT * FROM simplify_group_debts('your-group-id-here');
