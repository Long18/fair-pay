-- Migration: Update get_user_activities to include involvement information
-- Created: 2026-01-09
-- Purpose: Add privacy controls and involvement flags to activities

DROP FUNCTION IF EXISTS get_user_activities(UUID, INTEGER, INTEGER);

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
    is_involved BOOLEAN, -- New field to indicate if user is directly involved
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
            -- User is involved if they are the payer or a split participant
            (e.paid_by_user_id = p_user_id OR es.user_id = p_user_id) AS is_involved,
            e.created_at
        FROM expenses e
        LEFT JOIN expense_splits es ON es.expense_id = e.id
        LEFT JOIN groups g ON e.group_id = g.id
        LEFT JOIN profiles p ON e.paid_by_user_id = p.id
        WHERE (es.user_id = p_user_id OR e.paid_by_user_id = p_user_id)
            AND NOT e.is_payment
            AND e.expense_date <= CURRENT_DATE -- Filter out future dates

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
            -- User is involved if they are the sender or receiver
            (pay.from_user = p_user_id OR pay.to_user = p_user_id) AS is_involved,
            pay.created_at
        FROM payments pay
        LEFT JOIN groups g ON pay.group_id = g.id
        LEFT JOIN profiles p_from ON pay.from_user = p_from.id
        LEFT JOIN profiles p_to ON pay.to_user = p_to.id
        WHERE (pay.from_user = p_user_id OR pay.to_user = p_user_id)
            AND pay.payment_date <= CURRENT_DATE -- Filter out future dates
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_activities(UUID, INTEGER, INTEGER) TO authenticated;
