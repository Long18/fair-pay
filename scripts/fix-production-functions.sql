-- Fix Production Database Functions
-- Date: 2026-01-08
-- Purpose: Fix ambiguous column references and missing functions

-- =============================================
-- 1. Fix get_user_balances function
-- =============================================
DROP FUNCTION IF EXISTS get_user_balances(UUID) CASCADE;

CREATE OR REPLACE FUNCTION get_user_balances(p_user_id UUID)
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
            END AS balance_counterparty_id,
            e.currency AS balance_currency,
            CASE
                WHEN es.user_id = p_user_id AND e.paid_by_user_id != p_user_id THEN es.computed_amount
                WHEN es.user_id != p_user_id AND e.paid_by_user_id = p_user_id THEN -es.computed_amount
                ELSE 0
            END AS balance_amount
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
                WHEN pay.from_user = p_user_id THEN pay.to_user
                ELSE pay.from_user
            END AS balance_counterparty_id,
            pay.currency AS balance_currency,
            CASE
                WHEN pay.from_user = p_user_id THEN pay.amount
                ELSE -pay.amount
            END AS balance_amount
        FROM payments pay
        WHERE (pay.from_user = p_user_id OR pay.to_user = p_user_id)
    ),
    all_balances AS (
        SELECT balance_counterparty_id, balance_currency, balance_amount FROM expense_balances
        UNION ALL
        SELECT balance_counterparty_id, balance_currency, balance_amount FROM payment_balances
    ),
    aggregated AS (
        SELECT
            ab.balance_counterparty_id,
            ab.balance_currency,
            SUM(ab.balance_amount) AS net_amount
        FROM all_balances ab
        WHERE ab.balance_counterparty_id != p_user_id
        GROUP BY ab.balance_counterparty_id, ab.balance_currency
        HAVING SUM(ab.balance_amount) != 0
    )
    SELECT
        a.balance_counterparty_id AS counterparty_id,
        p.full_name AS counterparty_name,
        ABS(a.net_amount) AS amount,
        a.balance_currency AS currency,
        a.net_amount > 0 AS i_owe_them
    FROM aggregated a
    JOIN profiles p ON a.balance_counterparty_id = p.id
    ORDER BY a.balance_currency, ABS(a.net_amount) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_balances(UUID) TO authenticated;

-- =============================================
-- 2. Create get_user_debts_aggregated function
-- =============================================
DROP FUNCTION IF EXISTS get_user_debts_aggregated(UUID) CASCADE;

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
    SELECT * FROM get_user_balances(p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_debts_aggregated(UUID) TO authenticated;

-- =============================================
-- 3. Create get_user_debts_history function
-- =============================================
DROP FUNCTION IF EXISTS get_user_debts_history(UUID) CASCADE;

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
        -- Get all expense transactions (including settled)
        SELECT
            CASE
                WHEN es.user_id = p_user_id THEN e.paid_by_user_id
                ELSE es.user_id
            END AS balance_counterparty_id,
            e.currency AS balance_currency,
            CASE
                WHEN es.user_id = p_user_id AND e.paid_by_user_id != p_user_id THEN es.computed_amount
                WHEN es.user_id != p_user_id AND e.paid_by_user_id = p_user_id THEN -es.computed_amount
                ELSE 0
            END AS balance_amount,
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
                WHEN pay.from_user = p_user_id THEN pay.to_user
                ELSE pay.from_user
            END AS balance_counterparty_id,
            pay.currency AS balance_currency,
            CASE
                WHEN pay.from_user = p_user_id THEN pay.amount
                ELSE -pay.amount
            END AS balance_amount,
            TRUE AS is_settled, -- Payments are considered settled
            pay.created_at
        FROM payments pay
        WHERE (pay.from_user = p_user_id OR pay.to_user = p_user_id)
    ),
    aggregated AS (
        SELECT
            at.balance_counterparty_id,
            at.balance_currency,
            SUM(CASE WHEN NOT at.is_settled THEN at.balance_amount ELSE 0 END) AS current_balance,
            SUM(ABS(at.balance_amount)) AS total_amount,
            SUM(CASE WHEN at.is_settled THEN ABS(at.balance_amount) ELSE 0 END) AS settled_amount,
            COUNT(*) AS transaction_count,
            MAX(at.created_at) AS last_transaction_date
        FROM all_transactions at
        WHERE at.balance_counterparty_id != p_user_id
        GROUP BY at.balance_counterparty_id, at.balance_currency
    )
    SELECT
        a.balance_counterparty_id AS counterparty_id,
        p.full_name AS counterparty_name,
        ABS(a.current_balance) AS amount,
        a.balance_currency AS currency,
        a.current_balance > 0 AS i_owe_them,
        a.total_amount,
        a.settled_amount,
        ABS(a.current_balance) AS remaining_amount,
        a.transaction_count::INTEGER,
        a.last_transaction_date
    FROM aggregated a
    JOIN profiles p ON a.balance_counterparty_id = p.id
    WHERE a.total_amount > 0  -- Include all transactions even if fully settled
    ORDER BY a.balance_currency, a.last_transaction_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_debts_history(UUID) TO authenticated;

-- =============================================
-- 3. Fix get_user_activities function
-- =============================================
DROP FUNCTION IF EXISTS get_user_activities(UUID, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_user_activities(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_user_activities(UUID) CASCADE;

CREATE OR REPLACE FUNCTION get_user_activities(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 10,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    type TEXT,
    description TEXT,
    total_amount NUMERIC,
    user_share NUMERIC,
    currency TEXT,
    date TIMESTAMPTZ,
    group_name TEXT,
    group_id UUID,
    paid_by_user_id UUID,
    paid_by_name TEXT,
    is_lender BOOLEAN,
    is_borrower BOOLEAN,
    is_payment BOOLEAN,
    is_involved BOOLEAN,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    WITH activities AS (
        -- Get expense activities
        SELECT
            e.id,
            'expense'::TEXT AS type,
            e.description AS description,
            e.amount AS total_amount,
            es.computed_amount AS user_share,
            COALESCE(e.currency, 'USD') AS currency,
            e.expense_date::TIMESTAMPTZ AS date,
            g.name AS group_name,
            g.id AS group_id,
            e.paid_by_user_id,
            p.full_name AS paid_by_name,
            e.paid_by_user_id = p_user_id AS is_lender,
            es.user_id = p_user_id AND e.paid_by_user_id != p_user_id AS is_borrower,
            FALSE AS is_payment,
            (e.paid_by_user_id = p_user_id OR es.user_id = p_user_id) AS is_involved,
            e.created_at
        FROM expenses e
        LEFT JOIN expense_splits es ON es.expense_id = e.id
        LEFT JOIN groups g ON e.group_id = g.id
        LEFT JOIN profiles p ON e.paid_by_user_id = p.id
        WHERE (es.user_id = p_user_id OR e.paid_by_user_id = p_user_id)
            AND NOT e.is_payment
            AND e.expense_date <= CURRENT_DATE

        UNION ALL

        -- Get payment activities
        SELECT
            pay.id,
            'payment'::TEXT AS type,
            COALESCE(pay.note,
                CASE
                    WHEN pay.from_user = p_user_id
                    THEN 'Payment to ' || p_to.full_name
                    ELSE 'Payment from ' || p_from.full_name
                END) AS description,
            pay.amount AS total_amount,
            pay.amount AS user_share,
            COALESCE(pay.currency, 'USD') AS currency,
            pay.payment_date::TIMESTAMPTZ AS date,
            g.name AS group_name,
            g.id AS group_id,
            pay.from_user AS paid_by_user_id,
            p_from.full_name AS paid_by_name,
            pay.to_user = p_user_id AS is_lender,
            pay.from_user = p_user_id AS is_borrower,
            TRUE AS is_payment,
            (pay.from_user = p_user_id OR pay.to_user = p_user_id) AS is_involved,
            pay.created_at
        FROM payments pay
        LEFT JOIN groups g ON pay.group_id = g.id
        LEFT JOIN profiles p_from ON pay.from_user = p_from.id
        LEFT JOIN profiles p_to ON pay.to_user = p_to.id
        WHERE (pay.from_user = p_user_id OR pay.to_user = p_user_id)
            AND pay.payment_date <= CURRENT_DATE
    )
    SELECT
        a.id,
        a.type,
        a.description,
        a.total_amount,
        a.user_share,
        a.currency,
        a.date,
        a.group_name,
        a.group_id,
        a.paid_by_user_id,
        a.paid_by_name,
        a.is_lender,
        a.is_borrower,
        a.is_payment,
        a.is_involved,
        a.created_at
    FROM activities a
    ORDER BY a.date DESC, a.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_activities(UUID, INTEGER, INTEGER) TO authenticated;

-- =============================================
-- 4. Update migration history
-- =============================================
-- Mark the migrations as applied
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES
    ('20260109100000', '20260109100000_add_currency_to_debt_functions', ARRAY['-- Applied via fix-production-functions.sql']),
    ('20260109140000', '20260109140000_update_user_activities_privacy', ARRAY['-- Applied via fix-production-functions.sql'])
ON CONFLICT (version) DO NOTHING;

-- =============================================
-- 5. Create get_user_debts_public function
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
BEGIN
    RETURN QUERY
    -- Get real recent participants but hide amounts for privacy
    WITH recent_participants AS (
        -- Get recent expense participants from last 30 days
        SELECT DISTINCT
            CASE 
                WHEN es.user_id != e.paid_by_user_id THEN es.user_id
                ELSE e.paid_by_user_id
            END AS counterparty_id,
            e.currency,
            CASE
                WHEN es.user_id = e.paid_by_user_id THEN FALSE
                ELSE TRUE
            END AS i_owe_them,
            e.created_at
        FROM expenses e
        JOIN expense_splits es ON es.expense_id = e.id
        WHERE e.created_at > CURRENT_DATE - INTERVAL '30 days'
            AND NOT e.is_payment
        ORDER BY e.created_at DESC
        LIMIT 20
    ),
    unique_participants AS (
        SELECT DISTINCT ON (rp.counterparty_id)
            rp.counterparty_id,
            p.full_name AS counterparty_name,
            0::NUMERIC AS amount, -- Hide actual amounts for privacy
            COALESCE(rp.currency, 'VND') AS currency,
            rp.i_owe_them,
            TRUE AS is_real_data
        FROM recent_participants rp
        JOIN profiles p ON p.id = rp.counterparty_id
        WHERE rp.counterparty_id IS NOT NULL
    )
    SELECT 
        up.counterparty_id,
        up.counterparty_name,
        up.amount,
        up.currency,
        up.i_owe_them,
        up.is_real_data
    FROM unique_participants up
    WHERE up.counterparty_name IS NOT NULL
    LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_debts_public() TO anon, authenticated;

-- =============================================
-- 6. Create get_public_recent_activities function
-- =============================================
DROP FUNCTION IF EXISTS get_public_recent_activities(INTEGER, INTEGER) CASCADE;

CREATE OR REPLACE FUNCTION get_public_recent_activities(
    p_limit INTEGER DEFAULT 10,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    type TEXT,
    description TEXT,
    amount NUMERIC,
    currency TEXT,
    date DATE,
    group_id UUID,
    group_name TEXT,
    created_by_id UUID,
    created_by_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    -- Return demo activities for public/unauthorized users
    SELECT
        gen_random_uuid() AS id,
        'expense'::TEXT AS type,
        'Coffee Meeting'::TEXT AS description,
        50000::NUMERIC AS amount,
        'VND'::TEXT AS currency,
        (CURRENT_DATE - INTERVAL '1 day')::DATE AS date,
        NULL::UUID AS group_id,
        'Team Lunch'::TEXT AS group_name,
        '00000000-0000-0000-0000-000000000001'::UUID AS created_by_id,
        'Alice'::TEXT AS created_by_name
    UNION ALL
    SELECT
        gen_random_uuid(),
        'expense'::TEXT,
        'Lunch at Restaurant'::TEXT,
        150000::NUMERIC,
        'VND'::TEXT,
        (CURRENT_DATE - INTERVAL '2 days')::DATE,
        NULL::UUID,
        'Office Group'::TEXT,
        '00000000-0000-0000-0000-000000000002'::UUID,
        'Bob'::TEXT
    UNION ALL
    SELECT
        gen_random_uuid(),
        'payment'::TEXT,
        'Payment for lunch'::TEXT,
        75000::NUMERIC,
        'VND'::TEXT,
        (CURRENT_DATE - INTERVAL '3 days')::DATE,
        NULL::UUID,
        NULL::TEXT,
        '00000000-0000-0000-0000-000000000003'::UUID,
        'Charlie'::TEXT
    ORDER BY date DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_public_recent_activities(INTEGER, INTEGER) TO anon, authenticated;

-- =============================================
-- 6. Test the functions
-- =============================================
-- You can uncomment and run these to test:
-- SELECT * FROM get_user_debts_aggregated('9ac73f98-d6ff-54dd-8337-e96816e855c1'::uuid) LIMIT 5;
-- SELECT * FROM get_user_activities('9ac73f98-d6ff-54dd-8337-e96816e855c1'::uuid, 5, 0);
