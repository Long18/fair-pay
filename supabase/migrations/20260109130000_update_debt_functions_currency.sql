-- Migration: Update existing debt functions to include currency
-- Created: 2026-01-09
-- Purpose: Add currency field to existing debt aggregation functions
-- IMPORTANT: Restores original logic using user_debts_summary view to maintain
-- correct settlement filtering (partial settlements, future expenses exclusion)

-- Drop and recreate get_user_debts_aggregated with currency support
DROP FUNCTION IF EXISTS get_user_debts_aggregated(UUID);

CREATE OR REPLACE FUNCTION get_user_debts_aggregated(p_user_id UUID)
RETURNS TABLE (
    counterparty_id UUID,
    counterparty_name TEXT,
    amount NUMERIC,
    currency TEXT,
    i_owe_them BOOLEAN
)
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH expense_debts AS (
        -- Use same logic as user_debts_summary view but group by currency
        SELECT
            CASE
                WHEN es.user_id = p_user_id THEN e.paid_by_user_id
                ELSE es.user_id
            END as counterparty_id,
            COALESCE(e.currency, 'USD') as currency,
            SUM(
                CASE
                    WHEN es.user_id = p_user_id AND e.paid_by_user_id != p_user_id THEN
                        CASE
                            WHEN es.is_settled = true AND es.settled_amount >= es.computed_amount THEN 0
                            WHEN es.settled_amount > 0 THEN es.computed_amount - es.settled_amount
                            ELSE es.computed_amount
                        END
                    WHEN es.user_id != p_user_id AND e.paid_by_user_id = p_user_id THEN
                        -CASE
                            WHEN es.is_settled = true AND es.settled_amount >= es.computed_amount THEN 0
                            WHEN es.settled_amount > 0 THEN es.computed_amount - es.settled_amount
                            ELSE es.computed_amount
                        END
                    ELSE 0
                END
            ) as net_amount
        FROM expense_splits es
        JOIN expenses e ON es.expense_id = e.id
        WHERE (es.user_id = p_user_id OR e.paid_by_user_id = p_user_id)
            AND NOT e.is_payment
            AND es.user_id != e.paid_by_user_id
            AND e.expense_date <= CURRENT_DATE  -- Exclude future expenses
            AND (
                (es.is_settled = false) OR
                (es.is_settled = true AND es.settled_amount < es.computed_amount)
            )
        GROUP BY
            CASE
                WHEN es.user_id = p_user_id THEN e.paid_by_user_id
                ELSE es.user_id
            END,
            COALESCE(e.currency, 'USD')
        HAVING SUM(
            CASE
                WHEN es.user_id = p_user_id AND e.paid_by_user_id != p_user_id THEN
                    CASE
                        WHEN es.is_settled = true AND es.settled_amount >= es.computed_amount THEN 0
                        WHEN es.settled_amount > 0 THEN es.computed_amount - es.settled_amount
                        ELSE es.computed_amount
                    END
                WHEN es.user_id != p_user_id AND e.paid_by_user_id = p_user_id THEN
                    CASE
                        WHEN es.is_settled = true AND es.settled_amount >= es.computed_amount THEN 0
                        WHEN es.settled_amount > 0 THEN es.computed_amount - es.settled_amount
                        ELSE es.computed_amount
                    END
                ELSE 0
            END
        ) != 0
    ),
    -- Note: Payments are settlement transactions, not outstanding debts
    -- They should NOT be included in get_user_debts_aggregated
    -- Payments reduce debts but are not debts themselves
    all_debts AS (
        SELECT ed.counterparty_id, ed.currency, ed.net_amount FROM expense_debts ed
    ),
    aggregated AS (
        SELECT
            ad.counterparty_id,
            ad.currency,
            SUM(ad.net_amount) AS net_amount
        FROM all_debts ad
        WHERE ad.counterparty_id IS DISTINCT FROM p_user_id
        GROUP BY ad.counterparty_id, ad.currency
        HAVING SUM(ad.net_amount) != 0
    )
    SELECT
        agg.counterparty_id,
        p.full_name AS counterparty_name,
        ABS(agg.net_amount) AS amount,
        agg.currency,
        (agg.net_amount > 0) AS i_owe_them
    FROM aggregated agg
    JOIN profiles p ON p.id = agg.counterparty_id
    ORDER BY agg.currency, ABS(agg.net_amount) DESC;
END;
$$;

-- Drop and recreate get_user_debts_history with currency support
DROP FUNCTION IF EXISTS get_user_debts_history(UUID);

CREATE OR REPLACE FUNCTION get_user_debts_history(p_user_id UUID)
RETURNS TABLE (
    counterparty_id UUID,
    counterparty_name TEXT,
    amount NUMERIC,
    currency TEXT,
    i_owe_them BOOLEAN,
    total_amount NUMERIC,
    settled_amount NUMERIC,
    remaining_amount NUMERIC,
    transaction_count INTEGER,
    last_transaction_date TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH expense_history AS (
        -- Use same logic as user_debts_history view but group by currency
        SELECT
            es.user_id as owes_user,
            e.paid_by_user_id as owed_user,
            COALESCE(e.currency, 'USD') as currency,
            SUM(es.computed_amount) as total_amount,
            SUM(COALESCE(es.settled_amount, 0)) as settled_amount,
            SUM(
                CASE
                    WHEN es.is_settled = true AND es.settled_amount >= es.computed_amount THEN 0
                    WHEN es.settled_amount > 0 THEN es.computed_amount - es.settled_amount
                    ELSE es.computed_amount
                END
            ) as remaining_amount,
            COUNT(DISTINCT e.id) as transaction_count,
            MAX(e.expense_date) as last_transaction_date
        FROM expense_splits es
        JOIN expenses e ON es.expense_id = e.id
        WHERE (es.user_id = p_user_id OR e.paid_by_user_id = p_user_id)
            AND NOT e.is_payment
            AND es.user_id != e.paid_by_user_id
            AND e.expense_date <= CURRENT_DATE  -- Exclude future expenses
        GROUP BY es.user_id, e.paid_by_user_id, COALESCE(e.currency, 'USD')
        HAVING SUM(es.computed_amount) > 0
    ),
    payment_history AS (
        -- Get payment transactions
        SELECT
            p.from_user as owes_user,
            p.to_user as owed_user,
            COALESCE(p.currency, 'USD') as currency,
            SUM(p.amount) as total_amount,
            SUM(p.amount) as settled_amount,  -- Payments are always settled
            0 as remaining_amount,
            COUNT(*) as transaction_count,
            MAX(p.payment_date) as last_transaction_date
        FROM payments p
        WHERE (p.from_user = p_user_id OR p.to_user = p_user_id)
        GROUP BY p.from_user, p.to_user, COALESCE(p.currency, 'USD')
    ),
    all_history AS (
        SELECT
            eh.owes_user,
            eh.owed_user,
            eh.currency,
            eh.total_amount,
            eh.settled_amount,
            eh.remaining_amount,
            eh.transaction_count,
            eh.last_transaction_date::TIMESTAMPTZ as last_transaction_date
        FROM expense_history eh
        UNION ALL
        SELECT
            ph.owes_user,
            ph.owed_user,
            ph.currency,
            ph.total_amount,
            ph.settled_amount,
            ph.remaining_amount,
            ph.transaction_count,
            ph.last_transaction_date::TIMESTAMPTZ
        FROM payment_history ph
    ),
    debt_calculations AS (
        SELECT
            CASE
                WHEN ah.owes_user = p_user_id THEN ah.owed_user
                WHEN ah.owed_user = p_user_id THEN ah.owes_user
                ELSE NULL
            END as other_user_id,
            ah.currency,
            CASE
                WHEN ah.owes_user = p_user_id THEN ah.total_amount
                WHEN ah.owed_user = p_user_id THEN -ah.total_amount
                ELSE 0
            END as signed_total_amount,
            CASE
                WHEN ah.owes_user = p_user_id THEN ah.settled_amount
                WHEN ah.owed_user = p_user_id THEN -ah.settled_amount
                ELSE 0
            END as signed_settled_amount,
            CASE
                WHEN ah.owes_user = p_user_id THEN ah.remaining_amount
                WHEN ah.owed_user = p_user_id THEN -ah.remaining_amount
                ELSE 0
            END as signed_remaining_amount,
            ah.transaction_count,
            ah.last_transaction_date
        FROM all_history ah
        WHERE (ah.owes_user = p_user_id OR ah.owed_user = p_user_id)
    ),
    aggregated AS (
        SELECT
            dc.other_user_id as counterparty_id,
            dc.currency,
            SUM(ABS(dc.signed_total_amount)) as total_amount,
            SUM(ABS(dc.signed_settled_amount)) as settled_amount,
            SUM(ABS(dc.signed_remaining_amount)) as remaining_amount,
            SUM(dc.transaction_count)::INTEGER as transaction_count,
            MAX(dc.last_transaction_date) as last_transaction_date,
            SUM(dc.signed_remaining_amount) as net_remaining_amount
        FROM debt_calculations dc
        WHERE dc.other_user_id IS NOT NULL
        GROUP BY dc.other_user_id, dc.currency
    )
    SELECT
        agg.counterparty_id,
        p.full_name AS counterparty_name,
        ABS(agg.net_remaining_amount) AS amount,
        agg.currency,
        (agg.net_remaining_amount > 0) AS i_owe_them,
        agg.total_amount,
        agg.settled_amount,
        ABS(agg.net_remaining_amount) AS remaining_amount,
        agg.transaction_count,
        agg.last_transaction_date
    FROM aggregated agg
    JOIN profiles p ON p.id = agg.counterparty_id
    ORDER BY
        agg.currency,
        CASE WHEN agg.net_remaining_amount != 0 THEN 0 ELSE 1 END,
        ABS(agg.net_remaining_amount) DESC,
        agg.last_transaction_date DESC NULLS LAST;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_debts_aggregated(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_debts_history(UUID) TO authenticated;
