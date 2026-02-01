-- Migration: Add optional date range parameters to balance functions
-- Created: 2026-02-01
-- Purpose: Allow filtering balances and aggregated debts by date range.
--          When p_start_date / p_end_date are NULL the functions return
--          all-time results (identical to previous behaviour).  When supplied
--          only expenses whose expense_date falls within [start, end] are
--          included in the calculation.
--
-- Backward compatibility: both parameters default to NULL.  Existing callers
-- that omit the date arguments continue to work unchanged.
--
-- Note: Neither function queries the payments table for outstanding-debt
-- calculation (payments reduce debts via settled_amount on expense_splits).
-- Therefore date filtering is applied solely to expense_date.

-- ============================================================
-- 1. get_user_balance
-- ============================================================
-- Must DROP first: changing the parameter list creates a new overload,
-- and the old signature would remain alongside it.
DROP FUNCTION IF EXISTS public.get_user_balance(UUID);

CREATE OR REPLACE FUNCTION public.get_user_balance(
    p_user_id   UUID,
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date   TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
    total_owed_to_me NUMERIC,
    total_i_owe      NUMERIC,
    net_balance      NUMERIC
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    WITH expense_debts AS (
        -- Aggregate outstanding debts per counterparty.
        -- Only unsettled or partially-settled splits are included.
        -- Date range filter: when NULL the original "all-time up to today"
        -- logic is preserved; when provided, only expenses within
        -- [p_start_date, p_end_date] are considered.
        SELECT
            CASE
                WHEN es.user_id = p_user_id THEN e.paid_by_user_id
                ELSE es.user_id
            END AS counterparty_id,
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
            ) AS net_amount
        FROM public.expense_splits es
        JOIN public.expenses e ON es.expense_id = e.id
        WHERE (es.user_id = p_user_id OR e.paid_by_user_id = p_user_id)
            AND NOT e.is_payment
            AND es.user_id != e.paid_by_user_id          -- Exclude self-payments
            -- Date upper-bound: when no date range is given, fall back to
            -- excluding future expenses (original behaviour).
            AND (
                CASE
                    WHEN p_start_date IS NULL AND p_end_date IS NULL
                        THEN e.expense_date <= CURRENT_DATE
                    ELSE TRUE
                END
            )
            -- Date range lower-bound (inclusive)
            AND (p_start_date IS NULL OR e.expense_date >= p_start_date::DATE)
            -- Date range upper-bound (inclusive)
            AND (p_end_date   IS NULL OR e.expense_date <= p_end_date::DATE)
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
        HAVING SUM(ed.net_amount) != 0                       -- Only non-zero balances
    )
    SELECT
        -- total_owed_to_me: negative net_amount means others owe the user
        COALESCE(SUM(CASE WHEN agg.net_amount < 0 THEN ABS(agg.net_amount) ELSE 0 END), 0)::NUMERIC,
        -- total_i_owe: positive net_amount means the user owes others
        COALESCE(SUM(CASE WHEN agg.net_amount > 0 THEN agg.net_amount ELSE 0 END), 0)::NUMERIC,
        -- net_balance: total_owed_to_me - total_i_owe
        COALESCE(SUM(-agg.net_amount), 0)::NUMERIC
    FROM aggregated agg;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_balance(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

-- ============================================================
-- 2. get_user_debts_aggregated
-- ============================================================
DROP FUNCTION IF EXISTS get_user_debts_aggregated(UUID);

CREATE OR REPLACE FUNCTION get_user_debts_aggregated(
    p_user_id    UUID,
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date   TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
    counterparty_id   UUID,
    counterparty_name TEXT,
    amount            NUMERIC,
    currency          TEXT,
    i_owe_them        BOOLEAN
)
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH expense_debts AS (
        -- Same settlement logic as before; grouped by counterparty + currency.
        -- Date range filter mirrors the logic in get_user_balance above.
        SELECT
            CASE
                WHEN es.user_id = p_user_id THEN e.paid_by_user_id
                ELSE es.user_id
            END AS counterparty_id,
            COALESCE(e.currency, 'USD') AS currency,
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
            ) AS net_amount
        FROM expense_splits es
        JOIN expenses e ON es.expense_id = e.id
        WHERE (es.user_id = p_user_id OR e.paid_by_user_id = p_user_id)
            AND NOT e.is_payment
            AND es.user_id != e.paid_by_user_id
            -- When no date range given, preserve original "exclude future" guard
            AND (
                CASE
                    WHEN p_start_date IS NULL AND p_end_date IS NULL
                        THEN e.expense_date <= CURRENT_DATE
                    ELSE TRUE
                END
            )
            -- Date range lower-bound (inclusive)
            AND (p_start_date IS NULL OR e.expense_date >= p_start_date::DATE)
            -- Date range upper-bound (inclusive)
            AND (p_end_date   IS NULL OR e.expense_date <= p_end_date::DATE)
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
    -- Payments are settlement transactions, not outstanding debts.
    -- They are excluded from this function (unchanged from previous version).
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
        p.full_name      AS counterparty_name,
        ABS(agg.net_amount) AS amount,
        agg.currency,
        (agg.net_amount > 0) AS i_owe_them
    FROM aggregated agg
    JOIN profiles p ON p.id = agg.counterparty_id
    ORDER BY agg.currency, ABS(agg.net_amount) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_debts_aggregated(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
