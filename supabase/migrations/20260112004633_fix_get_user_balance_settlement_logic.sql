-- Fix get_user_balance to use the same settlement logic as get_user_debts_aggregated
-- The old function didn't account for is_settled and settled_amount properly
-- This caused inconsistency between Dashboard balance summary and Balances page detail

DROP FUNCTION IF EXISTS public.get_user_balance(UUID);

CREATE OR REPLACE FUNCTION public.get_user_balance(p_user_id UUID)
RETURNS TABLE (
    total_owed_to_me NUMERIC,
    total_i_owe NUMERIC,
    net_balance NUMERIC
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    -- Calculate totals by aggregating from the same logic as get_user_debts_aggregated
    -- This ensures consistency between the balance summary and the detailed debt list
    RETURN QUERY
    WITH expense_debts AS (
        -- Get debts from expenses where user is involved
        -- Only include unsettled or partially settled debts
        SELECT
            CASE
                WHEN es.user_id = p_user_id THEN e.paid_by_user_id
                ELSE es.user_id
            END as counterparty_id,
            SUM(
                CASE
                    -- User owes someone (user has a split, someone else paid)
                    WHEN es.user_id = p_user_id AND e.paid_by_user_id != p_user_id THEN
                        CASE
                            WHEN es.is_settled = true AND es.settled_amount >= es.computed_amount THEN 0
                            WHEN es.settled_amount > 0 THEN es.computed_amount - es.settled_amount
                            ELSE es.computed_amount
                        END
                    -- Someone owes user (user paid, someone else has a split)
                    WHEN es.user_id != p_user_id AND e.paid_by_user_id = p_user_id THEN
                        -CASE
                            WHEN es.is_settled = true AND es.settled_amount >= es.computed_amount THEN 0
                            WHEN es.settled_amount > 0 THEN es.computed_amount - es.settled_amount
                            ELSE es.computed_amount
                        END
                    ELSE 0
                END
            ) as net_amount
        FROM public.expense_splits es
        JOIN public.expenses e ON es.expense_id = e.id
        WHERE (es.user_id = p_user_id OR e.paid_by_user_id = p_user_id)
            AND NOT e.is_payment
            AND es.user_id != e.paid_by_user_id  -- Exclude self-payments
            AND e.expense_date <= CURRENT_DATE  -- Exclude future expenses
            AND (
                (es.is_settled = false) OR
                (es.is_settled = true AND es.settled_amount < es.computed_amount)
            )
        GROUP BY
            CASE
                WHEN es.user_id = p_user_id THEN e.paid_by_user_id
                ELSE es.user_id
            END
    ),
    aggregated AS (
        SELECT
            ed.counterparty_id,
            SUM(ed.net_amount) AS net_amount
        FROM expense_debts ed
        WHERE ed.counterparty_id IS DISTINCT FROM p_user_id  -- Exclude self
        GROUP BY ed.counterparty_id
        HAVING SUM(ed.net_amount) != 0  -- Only return non-zero balances
    )
    SELECT
        -- total_owed_to_me: sum of amounts where net_amount < 0 (negative means others owe user)
        COALESCE(SUM(CASE WHEN agg.net_amount < 0 THEN ABS(agg.net_amount) ELSE 0 END), 0)::NUMERIC,
        -- total_i_owe: sum of amounts where net_amount > 0 (positive means user owes others)
        COALESCE(SUM(CASE WHEN agg.net_amount > 0 THEN agg.net_amount ELSE 0 END), 0)::NUMERIC,
        -- net_balance: total_owed_to_me - total_i_owe
        COALESCE(SUM(-agg.net_amount), 0)::NUMERIC
    FROM aggregated agg;
END;
$$;
