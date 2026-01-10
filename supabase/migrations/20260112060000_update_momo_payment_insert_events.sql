-- Migration: Update verify_momo_payment to insert payment events
-- Created: 2026-01-12
-- Purpose: Automatically create payment_events records when MoMo payments are confirmed
--
-- Related: Task 1.10 - Create payment/settlement events data pipeline
-- Requirements: 1.1 (Activity child rows need real data)

-- =============================================
-- Update verify_momo_payment function
-- =============================================
CREATE OR REPLACE FUNCTION verify_momo_payment(
    p_reference_code TEXT,
    p_tran_id TEXT,
    p_amount DECIMAL,
    p_webhook_data JSONB DEFAULT NULL
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
    v_payment_request momo_payment_requests%ROWTYPE;
    v_expense_split expense_splits%ROWTYPE;
    v_expense expenses%ROWTYPE;
    v_event_id UUID;
    v_result JSONB;
BEGIN
    -- Find the payment request
    SELECT * INTO v_payment_request
    FROM momo_payment_requests
    WHERE reference_code = p_reference_code
    AND status = 'pending'
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Payment request not found or already processed'
        );
    END IF;

    -- Verify amount matches
    IF v_payment_request.amount != p_amount THEN
        -- Update status to failed
        UPDATE momo_payment_requests
        SET status = 'failed',
            momo_tran_id = p_tran_id,
            raw_webhook_data = p_webhook_data,
            updated_at = NOW()
        WHERE id = v_payment_request.id;

        RETURN jsonb_build_object(
            'success', false,
            'error', 'Amount mismatch'
        );
    END IF;

    -- Update payment request status
    UPDATE momo_payment_requests
    SET status = 'verified',
        verified_at = NOW(),
        momo_tran_id = p_tran_id,
        raw_webhook_data = p_webhook_data,
        updated_at = NOW()
    WHERE id = v_payment_request.id;

    -- Update expense split as settled
    UPDATE expense_splits
    SET is_settled = TRUE,
        settled_amount = p_amount,
        settled_at = NOW()
    WHERE id = v_payment_request.expense_split_id;

    -- Get updated split for return
    SELECT * INTO v_expense_split
    FROM expense_splits
    WHERE id = v_payment_request.expense_split_id;

    -- Get expense for payment event
    SELECT * INTO v_expense
    FROM expenses
    WHERE id = v_expense_split.expense_id;

    -- Insert payment event record
    INSERT INTO payment_events (
        expense_id,
        split_id,
        event_type,
        from_user_id,
        to_user_id,
        amount,
        currency,
        method,
        actor_user_id,
        metadata,
        created_at
    ) VALUES (
        v_expense.id,
        v_expense_split.id,
        'momo_payment',
        v_expense_split.user_id,            -- from: the person who paid
        v_expense.paid_by_user_id,          -- to: the person who originally paid
        p_amount,
        v_payment_request.currency,
        'momo',
        v_payment_request.user_id,          -- actor: user who initiated payment
        jsonb_build_object(
            'momo_tran_id', p_tran_id,
            'reference_code', p_reference_code,
            'payment_request_id', v_payment_request.id,
            'receiver_phone', v_payment_request.receiver_phone
        ),
        NOW()
    ) RETURNING id INTO v_event_id;

    RETURN jsonb_build_object(
        'success', true,
        'payment_request_id', v_payment_request.id,
        'expense_split_id', v_expense_split.id,
        'settled_amount', v_expense_split.settled_amount,
        'event_id', v_event_id
    );
END;
$$;

COMMENT ON FUNCTION verify_momo_payment(TEXT, TEXT, DECIMAL, JSONB) IS 
'Verify MoMo payment and update expense split. Called by webhook handler when payment is confirmed.
Automatically creates a payment_event record for Activity List display.';

-- Grant permissions (already granted in original migration, but ensure it's set)
GRANT EXECUTE ON FUNCTION verify_momo_payment(TEXT, TEXT, DECIMAL, JSONB) TO authenticated;
