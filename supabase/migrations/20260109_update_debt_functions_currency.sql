-- Migration: Update existing debt functions to include currency
-- Created: 2026-01-09
-- Purpose: Add currency field to existing debt aggregation functions

-- Drop and recreate get_user_debts_aggregated with currency support
DROP FUNCTION IF EXISTS get_user_debts_aggregated(UUID);

CREATE OR REPLACE FUNCTION get_user_debts_aggregated(p_user_id UUID)
RETURNS TABLE (
    counterparty_id UUID,
    counterparty_name TEXT,
    amount NUMERIC,
    currency TEXT,
    i_owe_them BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    WITH expense_balances AS (
        -- Get balances from expenses where user is involved
        SELECT 
            CASE 
                WHEN es.user_id = p_user_id THEN e.paid_by_user_id
                ELSE es.user_id
            END AS counterparty_id,
            COALESCE(e.currency, 'USD') as currency,
            CASE 
                WHEN es.user_id = p_user_id AND e.paid_by_user_id != p_user_id THEN es.computed_amount
                WHEN es.user_id != p_user_id AND e.paid_by_user_id = p_user_id THEN -es.computed_amount
                ELSE 0
            END AS amount
        FROM expense_splits es
        JOIN expenses e ON es.expense_id = e.id
        WHERE (es.user_id = p_user_id OR e.paid_by_user_id = p_user_id)
            AND NOT e.is_payment
            AND NOT es.is_settled
    ),
    payment_balances AS (
        -- Get balances from payments
        SELECT 
            CASE 
                WHEN p.from_user = p_user_id THEN p.to_user
                ELSE p.from_user
            END AS counterparty_id,
            COALESCE(p.currency, 'USD') as currency,
            CASE 
                WHEN p.from_user = p_user_id THEN p.amount
                ELSE -p.amount
            END AS amount
        FROM payments p
        WHERE (p.from_user = p_user_id OR p.to_user = p_user_id)
    ),
    all_balances AS (
        SELECT counterparty_id, currency, amount FROM expense_balances
        UNION ALL
        SELECT counterparty_id, currency, amount FROM payment_balances
    ),
    aggregated AS (
        SELECT 
            ab.counterparty_id,
            ab.currency,
            SUM(ab.amount) AS net_amount
        FROM all_balances ab
        WHERE ab.counterparty_id != p_user_id
        GROUP BY ab.counterparty_id, ab.currency
        HAVING SUM(ab.amount) != 0
    )
    SELECT 
        a.counterparty_id,
        p.full_name AS counterparty_name,
        ABS(a.net_amount) AS amount,
        a.currency,
        a.net_amount > 0 AS i_owe_them
    FROM aggregated a
    JOIN profiles p ON a.counterparty_id = p.id
    ORDER BY a.currency, ABS(a.net_amount) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
) AS $$
BEGIN
    RETURN QUERY
    WITH all_transactions AS (
        -- Get all expense transactions
        SELECT 
            CASE 
                WHEN es.user_id = p_user_id THEN e.paid_by_user_id
                ELSE es.user_id
            END AS counterparty_id,
            COALESCE(e.currency, 'USD') as currency,
            CASE 
                WHEN es.user_id = p_user_id AND e.paid_by_user_id != p_user_id THEN es.computed_amount
                WHEN es.user_id != p_user_id AND e.paid_by_user_id = p_user_id THEN -es.computed_amount
                ELSE 0
            END AS amount,
            es.is_settled,
            e.created_at
        FROM expense_splits es
        JOIN expenses e ON es.expense_id = e.id
        WHERE (es.user_id = p_user_id OR e.paid_by_user_id = p_user_id)
            AND NOT e.is_payment
        
        UNION ALL
        
        -- Get all payment transactions
        SELECT 
            CASE 
                WHEN p.from_user = p_user_id THEN p.to_user
                ELSE p.from_user
            END AS counterparty_id,
            COALESCE(p.currency, 'USD') as currency,
            CASE 
                WHEN p.from_user = p_user_id THEN p.amount
                ELSE -p.amount
            END AS amount,
            TRUE AS is_settled,
            p.created_at
        FROM payments p
        WHERE (p.from_user = p_user_id OR p.to_user = p_user_id)
    ),
    aggregated AS (
        SELECT 
            at.counterparty_id,
            at.currency,
            SUM(CASE WHEN NOT at.is_settled THEN at.amount ELSE 0 END) AS current_balance,
            SUM(ABS(at.amount)) AS total_amount,
            SUM(CASE WHEN at.is_settled THEN ABS(at.amount) ELSE 0 END) AS settled_amount,
            COUNT(*) AS transaction_count,
            MAX(at.created_at) AS last_transaction_date
        FROM all_transactions at
        WHERE at.counterparty_id != p_user_id
        GROUP BY at.counterparty_id, at.currency
    )
    SELECT 
        a.counterparty_id,
        p.full_name AS counterparty_name,
        ABS(a.current_balance) AS amount,
        a.currency,
        a.current_balance > 0 AS i_owe_them,
        a.total_amount,
        a.settled_amount,
        ABS(a.current_balance) AS remaining_amount,
        a.transaction_count::INTEGER,
        a.last_transaction_date
    FROM aggregated a
    JOIN profiles p ON a.counterparty_id = p.id
    ORDER BY a.currency, a.last_transaction_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_debts_aggregated(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_debts_history(UUID) TO authenticated;