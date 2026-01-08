-- MoMo Payment Integration Tables
-- This migration adds support for MoMo payment integration

-- Create is_admin() function if it doesn't exist (needed for RLS policies)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only check if user_roles table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_roles') THEN
    RETURN EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    );
  END IF;
  RETURN FALSE;
END;
$$;

-- 1. Create momo_settings table for configuration
CREATE TABLE IF NOT EXISTS momo_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receiver_phone TEXT NOT NULL,
    receiver_name TEXT,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies for momo_settings
ALTER TABLE momo_settings ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can read settings
DROP POLICY IF EXISTS "momo_settings_read_policy" ON momo_settings;
CREATE POLICY "momo_settings_read_policy" ON momo_settings
    FOR SELECT TO authenticated
    USING (true);

-- Only admins can update settings (using is_admin() function to avoid RLS recursion)
DROP POLICY IF EXISTS "momo_settings_update_policy" ON momo_settings;
CREATE POLICY "momo_settings_update_policy" ON momo_settings
    FOR UPDATE TO authenticated
    USING (is_admin());

-- 2. Create momo_payment_requests table (FK constraints added later)
CREATE TABLE IF NOT EXISTS momo_payment_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_split_id UUID,
    user_id UUID,
    receiver_phone TEXT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    currency TEXT DEFAULT 'VND',
    reference_code TEXT UNIQUE NOT NULL,
    qr_url TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'failed', 'expired')),
    verified_at TIMESTAMPTZ,
    momo_tran_id TEXT,
    raw_webhook_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT amount_positive CHECK (amount > 0)
);

-- Add foreign key constraints if referenced tables exist
DO $$
BEGIN
  -- Add FK to expense_splits if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'expense_splits') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_schema = 'public'
      AND table_name = 'momo_payment_requests'
      AND constraint_name = 'momo_payment_requests_expense_split_id_fkey'
    ) THEN
      ALTER TABLE momo_payment_requests
      ADD CONSTRAINT momo_payment_requests_expense_split_id_fkey
      FOREIGN KEY (expense_split_id) REFERENCES expense_splits(id) ON DELETE CASCADE;
    END IF;
  END IF;

  -- Add FK to profiles if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_schema = 'public'
      AND table_name = 'momo_payment_requests'
      AND constraint_name = 'momo_payment_requests_user_id_fkey'
    ) THEN
      ALTER TABLE momo_payment_requests
      ADD CONSTRAINT momo_payment_requests_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_momo_payment_requests_user_id ON momo_payment_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_momo_payment_requests_expense_split_id ON momo_payment_requests(expense_split_id);
CREATE INDEX IF NOT EXISTS idx_momo_payment_requests_reference_code ON momo_payment_requests(reference_code);
CREATE INDEX IF NOT EXISTS idx_momo_payment_requests_status ON momo_payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_momo_payment_requests_created_at ON momo_payment_requests(created_at DESC);

-- Add RLS policies for momo_payment_requests
ALTER TABLE momo_payment_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own payment requests
DROP POLICY IF EXISTS "momo_payment_requests_read_own" ON momo_payment_requests;
CREATE POLICY "momo_payment_requests_read_own" ON momo_payment_requests
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Users can create their own payment requests
DROP POLICY IF EXISTS "momo_payment_requests_create_own" ON momo_payment_requests;
CREATE POLICY "momo_payment_requests_create_own" ON momo_payment_requests
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Users can update their own payment requests (for status changes)
DROP POLICY IF EXISTS "momo_payment_requests_update_own" ON momo_payment_requests;
CREATE POLICY "momo_payment_requests_update_own" ON momo_payment_requests
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid());

-- 3. Create momo_webhook_logs table for audit trail
CREATE TABLE IF NOT EXISTS momo_webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    phone TEXT,
    tran_id TEXT UNIQUE,
    amount DECIMAL(12, 2),
    comment TEXT,
    partner_id TEXT,
    partner_name TEXT,
    matched_request_id UUID,
    raw_payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add FK constraint for matched_request_id if momo_payment_requests exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'momo_payment_requests') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_schema = 'public'
      AND table_name = 'momo_webhook_logs'
      AND constraint_name = 'momo_webhook_logs_matched_request_id_fkey'
    ) THEN
      ALTER TABLE momo_webhook_logs
      ADD CONSTRAINT momo_webhook_logs_matched_request_id_fkey
      FOREIGN KEY (matched_request_id) REFERENCES momo_payment_requests(id);
    END IF;
  END IF;
END $$;

-- Add indexes for webhook logs
CREATE INDEX IF NOT EXISTS idx_momo_webhook_logs_tran_id ON momo_webhook_logs(tran_id);
CREATE INDEX IF NOT EXISTS idx_momo_webhook_logs_processed ON momo_webhook_logs(processed);
CREATE INDEX IF NOT EXISTS idx_momo_webhook_logs_created_at ON momo_webhook_logs(created_at DESC);

-- Add RLS policies for momo_webhook_logs
ALTER TABLE momo_webhook_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view webhook logs
DROP POLICY IF EXISTS "momo_webhook_logs_admin_only" ON momo_webhook_logs;
CREATE POLICY "momo_webhook_logs_admin_only" ON momo_webhook_logs
    FOR ALL TO authenticated
    USING (is_admin());

-- 4. Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_momo_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_momo_settings_updated_at ON momo_settings;
CREATE TRIGGER update_momo_settings_updated_at
    BEFORE UPDATE ON momo_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_momo_settings_updated_at();

CREATE OR REPLACE FUNCTION update_momo_payment_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_momo_payment_requests_updated_at ON momo_payment_requests;
CREATE TRIGGER update_momo_payment_requests_updated_at
    BEFORE UPDATE ON momo_payment_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_momo_payment_requests_updated_at();

-- 5. Function to verify MoMo payment and update expense split (only create if expense_splits exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'expense_splits') THEN
    EXECUTE '
    CREATE OR REPLACE FUNCTION verify_momo_payment(
        p_reference_code TEXT,
        p_tran_id TEXT,
        p_amount DECIMAL,
        p_webhook_data JSONB DEFAULT NULL
    )
    RETURNS JSONB AS $func$
    DECLARE
        v_payment_request momo_payment_requests%ROWTYPE;
        v_expense_split expense_splits%ROWTYPE;
        v_result JSONB;
    BEGIN
        -- Find the payment request
        SELECT * INTO v_payment_request
        FROM momo_payment_requests
        WHERE reference_code = p_reference_code
        AND status = ''pending''
        FOR UPDATE;

        IF NOT FOUND THEN
            RETURN jsonb_build_object(
                ''success'', false,
                ''error'', ''Payment request not found or already processed''
            );
        END IF;

        -- Verify amount matches
        IF v_payment_request.amount != p_amount THEN
            -- Update status to failed
            UPDATE momo_payment_requests
            SET status = ''failed'',
                momo_tran_id = p_tran_id,
                raw_webhook_data = p_webhook_data,
                updated_at = NOW()
            WHERE id = v_payment_request.id;

            RETURN jsonb_build_object(
                ''success'', false,
                ''error'', ''Amount mismatch''
            );
        END IF;

        -- Update payment request status
        UPDATE momo_payment_requests
        SET status = ''verified'',
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

        RETURN jsonb_build_object(
            ''success'', true,
            ''payment_request_id'', v_payment_request.id,
            ''expense_split_id'', v_expense_split.id,
            ''settled_amount'', v_expense_split.settled_amount
        );
    END;
    $func$ LANGUAGE plpgsql SECURITY DEFINER';
  END IF;
END $$;

-- 6. Function to create MoMo payment request (only create if expense_splits exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'expense_splits') THEN
    -- Drop existing function first to avoid return type conflicts
    DROP FUNCTION IF EXISTS create_momo_payment_request(UUID, UUID, TEXT, DECIMAL);
    DROP FUNCTION IF EXISTS create_momo_payment_request(uuid, uuid, text, numeric);

    EXECUTE '
    CREATE OR REPLACE FUNCTION create_momo_payment_request(
        p_expense_split_id UUID,
        p_user_id UUID,
        p_receiver_phone TEXT,
        p_amount DECIMAL
    )
    RETURNS JSONB AS $func$
    DECLARE
        v_reference_code TEXT;
        v_payment_request_id UUID;
        v_expense_split expense_splits%ROWTYPE;
    BEGIN
        -- Verify expense split exists and belongs to user
        SELECT * INTO v_expense_split
        FROM expense_splits
        WHERE id = p_expense_split_id
        AND user_id = p_user_id
        AND is_settled = FALSE;

        IF NOT FOUND THEN
            RETURN jsonb_build_object(
                ''success'', false,
                ''error'', ''Expense split not found or already settled''
            );
        END IF;

        -- Check if there''s already a pending request
        IF EXISTS (
            SELECT 1 FROM momo_payment_requests
            WHERE expense_split_id = p_expense_split_id
            AND status = ''pending''
        ) THEN
            -- Return existing request
            SELECT jsonb_build_object(
                ''success'', true,
                ''id'', id,
                ''reference_code'', reference_code,
                ''qr_url'', qr_url,
                ''amount'', amount,
                ''status'', status
            ) INTO v_reference_code
            FROM momo_payment_requests
            WHERE expense_split_id = p_expense_split_id
            AND status = ''pending''
            LIMIT 1;

            RETURN v_reference_code::JSONB;
        END IF;

        -- Generate unique reference code (FP-splitId-random)
        v_reference_code := ''FP-'' || substring(p_expense_split_id::TEXT, 1, 8) || ''-'' || substring(gen_random_uuid()::TEXT, 1, 4);

        -- Create payment request
        INSERT INTO momo_payment_requests (
            expense_split_id,
            user_id,
            receiver_phone,
            amount,
            reference_code
        ) VALUES (
            p_expense_split_id,
            p_user_id,
            p_receiver_phone,
            p_amount,
            v_reference_code
        ) RETURNING id INTO v_payment_request_id;

        RETURN jsonb_build_object(
            ''success'', true,
            ''id'', v_payment_request_id,
            ''reference_code'', v_reference_code,
            ''amount'', p_amount,
            ''status'', ''pending''
        );
    END;
    $func$ LANGUAGE plpgsql SECURITY DEFINER';
  END IF;
END $$;

-- 7. Insert default MoMo settings (can be updated by admin)
INSERT INTO momo_settings (receiver_phone, receiver_name, enabled)
VALUES ('0918399443', 'FairPay', TRUE)
ON CONFLICT DO NOTHING;

-- 8. Grant necessary permissions
GRANT SELECT ON momo_settings TO authenticated;
GRANT ALL ON momo_payment_requests TO authenticated;

-- Grant execute permissions on functions if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'verify_momo_payment') THEN
    GRANT EXECUTE ON FUNCTION verify_momo_payment TO authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_momo_payment_request') THEN
    GRANT EXECUTE ON FUNCTION create_momo_payment_request TO authenticated;
  END IF;
END $$;

-- Enable realtime for payment requests (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND tablename = 'momo_payment_requests'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE momo_payment_requests;
    END IF;
END $$;
