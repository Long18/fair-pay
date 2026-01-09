-- Fix get_user_debts_public to show debts like get_user_debts_aggregated
-- Date: 2026-01-11
-- Purpose: Make unauthenticated users see the same debt structure as authenticated users
--          Select one active user and show only their actual outstanding debts

-- =============================================
-- Update get_user_debts_public function
-- =============================================
DROP FUNCTION IF EXISTS get_user_debts_public() CASCADE;

CREATE OR REPLACE FUNCTION get_user_debts_public()
RETURNS TABLE (
    counterparty_id UUID,
    counterparty_name TEXT,
    amount NUMERIC,
    currency TEXT,
    i_owe_them BOOLEAN,
    is_real_data BOOLEAN
) AS $$
DECLARE
    v_sample_user_id UUID;
BEGIN
    -- Find a user with recent activity who has outstanding debts
    SELECT es.user_id INTO v_sample_user_id
    FROM expense_splits es
    JOIN expenses e ON es.expense_id = e.id
    WHERE NOT es.is_settled
        AND e.created_at > CURRENT_DATE - INTERVAL '30 days'
        AND es.user_id != e.paid_by_user_id
        AND e.expense_date <= CURRENT_DATE
    ORDER BY e.created_at DESC
    LIMIT 1;

    -- If no active user found, return empty
    IF v_sample_user_id IS NULL THEN
        RETURN;
    END IF;

    -- Use the same logic as get_user_debts_aggregated for consistency
    RETURN QUERY
    WITH expense_debts AS (
        -- Get debts from expenses where sample user is involved
        -- Only include unsettled or partially settled debts
        SELECT
            CASE
                WHEN es.user_id = v_sample_user_id THEN e.paid_by_user_id
                ELSE es.user_id
            END as counterparty_id,
            COALESCE(e.currency, 'VND') as currency,
            SUM(
                CASE
                    WHEN es.user_id = v_sample_user_id AND e.paid_by_user_id != v_sample_user_id THEN
                        CASE
                            WHEN es.is_settled = true AND es.settled_amount >= es.computed_amount THEN 0
                            WHEN es.settled_amount > 0 THEN es.computed_amount - es.settled_amount
                            ELSE es.computed_amount
                        END
                    WHEN es.user_id != v_sample_user_id AND e.paid_by_user_id = v_sample_user_id THEN
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
        WHERE (es.user_id = v_sample_user_id OR e.paid_by_user_id = v_sample_user_id)
            AND NOT e.is_payment
            AND es.user_id != e.paid_by_user_id  -- Exclude self-payments
            AND e.expense_date <= CURRENT_DATE  -- Exclude future expenses
            AND (
                (es.is_settled = false) OR
                (es.is_settled = true AND es.settled_amount < es.computed_amount)
            )
        GROUP BY
            CASE
                WHEN es.user_id = v_sample_user_id THEN e.paid_by_user_id
                ELSE es.user_id
            END,
            COALESCE(e.currency, 'VND')
        HAVING SUM(
            CASE
                WHEN es.user_id = v_sample_user_id AND e.paid_by_user_id != v_sample_user_id THEN
                    CASE
                        WHEN es.is_settled = true AND es.settled_amount >= es.computed_amount THEN 0
                        WHEN es.settled_amount > 0 THEN es.computed_amount - es.settled_amount
                        ELSE es.computed_amount
                    END
                WHEN es.user_id != v_sample_user_id AND e.paid_by_user_id = v_sample_user_id THEN
                    CASE
                        WHEN es.is_settled = true AND es.settled_amount >= es.computed_amount THEN 0
                        WHEN es.settled_amount > 0 THEN es.computed_amount - es.settled_amount
                        ELSE es.computed_amount
                    END
                ELSE 0
            END
        ) != 0
    ),
    all_debts AS (
        SELECT ed.counterparty_id, ed.currency, ed.net_amount FROM expense_debts ed
    ),
    aggregated AS (
        SELECT
            ad.counterparty_id,
            ad.currency,
            SUM(ad.net_amount) AS net_amount
        FROM all_debts ad
        WHERE ad.counterparty_id IS DISTINCT FROM v_sample_user_id  -- Exclude self
        GROUP BY ad.counterparty_id, ad.currency
        HAVING SUM(ad.net_amount) != 0  -- Only return non-zero balances
    )
    SELECT
        agg.counterparty_id,
        p.full_name AS counterparty_name,
        ABS(agg.net_amount) AS amount,
        agg.currency,
        (agg.net_amount > 0) AS i_owe_them,
        TRUE AS is_real_data
    FROM aggregated agg
    INNER JOIN profiles p ON p.id = agg.counterparty_id
    WHERE agg.counterparty_id IS NOT NULL
    ORDER BY agg.currency, ABS(agg.net_amount) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_debts_public() TO anon, authenticated;
