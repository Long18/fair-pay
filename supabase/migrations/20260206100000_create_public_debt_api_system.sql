-- Public Debt API System
-- Allows users to share their debt data via public secret tokens

-- 1. Create API secrets table
CREATE TABLE IF NOT EXISTS public.api_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  secret_token TEXT NOT NULL UNIQUE,
  label TEXT, -- e.g., "Mobile App", "External Service"
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ, -- NULL = never expires
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies for api_secrets
ALTER TABLE public.api_secrets ENABLE ROW LEVEL SECURITY;

-- Users can only see their own API secrets
CREATE POLICY "Users can view own API secrets" ON public.api_secrets
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = created_by);

-- Users can create API secrets (inserting will auto-set created_by)
CREATE POLICY "Users can create API secrets" ON public.api_secrets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own API secrets
CREATE POLICY "Users can update own API secrets" ON public.api_secrets
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own API secrets
CREATE POLICY "Users can delete own API secrets" ON public.api_secrets
  FOR DELETE USING (auth.uid() = user_id);

-- 2. Create indexes for performance
CREATE INDEX idx_api_secrets_user_id ON public.api_secrets(user_id);
CREATE INDEX idx_api_secrets_token ON public.api_secrets(secret_token) WHERE is_active = true;
CREATE INDEX idx_api_secrets_expires_at ON public.api_secrets(expires_at) WHERE is_active = true;

-- 3. Create function to get comprehensive debt data with secret validation
CREATE OR REPLACE FUNCTION public.get_user_debt_by_secret(
  p_user_id UUID,
  p_secret_token TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  error_message TEXT,
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  total_owed_to_me NUMERIC,
  total_i_owe NUMERIC,
  net_balance NUMERIC,
  currency TEXT,
  debts_by_person JSONB,
  debts_by_group JSONB,
  settlement_summary JSONB
) AS $$
DECLARE
  v_secret_record RECORD;
  v_balance RECORD;
  v_debts_person JSONB;
  v_debts_group JSONB;
  v_settlement JSONB;
BEGIN
  -- Validate secret token exists, is active, and not expired
  SELECT * INTO v_secret_record
  FROM public.api_secrets
  WHERE user_id = p_user_id
    AND secret_token = p_secret_token
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW());

  IF v_secret_record IS NULL THEN
    RETURN QUERY SELECT 
      false,
      'Invalid or expired API secret',
      NULL::UUID,
      NULL::TEXT,
      NULL::TEXT,
      NULL::NUMERIC,
      NULL::NUMERIC,
      NULL::NUMERIC,
      NULL::TEXT,
      NULL::JSONB,
      NULL::JSONB,
      NULL::JSONB;
    RETURN;
  END IF;

  -- Update last_used_at
  UPDATE public.api_secrets
  SET last_used_at = NOW()
  WHERE id = v_secret_record.id;

  -- Get user basic info
  -- Get balance data (without RLS by using function as anon user would)
  SELECT * INTO v_balance
  FROM public.get_user_balance(p_user_id);

  -- Get debts by person with settlement details
  SELECT JSONB_AGG(JSONB_BUILD_OBJECT(
    'counterparty_id', counterparty_id,
    'counterparty_name', counterparty_name,
    'amount', amount,
    'currency', currency,
    'i_owe_them', i_owe_them,
    'total_amount', total_amount,
    'settled_amount', settled_amount,
    'remaining_amount', remaining_amount,
    'transaction_count', transaction_count,
    'last_transaction_date', last_transaction_date
  ))
  INTO v_debts_person
  FROM public.get_user_debts_history(p_user_id);

  -- Get debts by group
  SELECT JSONB_AGG(JSONB_BUILD_OBJECT(
    'group_id', g.id,
    'group_name', g.name,
    'group_avatar_url', g.avatar_url,
    'total_owed_to_me', COALESCE(SUM(CASE WHEN i_owe_them = false THEN remaining_amount ELSE 0 END), 0),
    'total_i_owe', COALESCE(SUM(CASE WHEN i_owe_them = true THEN remaining_amount ELSE 0 END), 0),
    'net_balance', COALESCE(
      SUM(CASE WHEN i_owe_them = false THEN remaining_amount ELSE -remaining_amount END),
      0
    ),
    'debts_in_group', JSONB_AGG(JSONB_BUILD_OBJECT(
      'counterparty_id', counterparty_id,
      'counterparty_name', counterparty_name,
      'amount', remaining_amount,
      'currency', currency,
      'i_owe_them', i_owe_them
    ))
  ) ORDER BY g.name)
  INTO v_debts_group
  FROM public.get_user_debts_history(p_user_id) hist
  LEFT JOIN public.friendships f ON (
    (f.user_a = p_user_id AND f.user_b = hist.counterparty_id) OR
    (f.user_b = p_user_id AND f.user_a = hist.counterparty_id)
  )
  LEFT JOIN public.expense_splits es ON es.user_id = hist.counterparty_id
  LEFT JOIN public.expenses e ON e.id = es.expense_id
  LEFT JOIN public.groups g ON g.id = e.group_id
  WHERE e.group_id IS NOT NULL
  GROUP BY g.id, g.name, g.avatar_url;

  -- Get settlement summary
  SELECT JSONB_BUILD_OBJECT(
    'total_expenses', COUNT(DISTINCT e.id),
    'total_settled_splits', COUNT(DISTINCT CASE WHEN es.is_settled THEN es.id END),
    'total_unsettled_splits', COUNT(DISTINCT CASE WHEN NOT es.is_settled THEN es.id END),
    'total_settled_amount', COALESCE(SUM(CASE WHEN es.is_settled THEN es.settled_amount ELSE 0 END), 0),
    'total_unsettled_amount', COALESCE(SUM(CASE WHEN NOT es.is_settled THEN es.computed_amount - COALESCE(es.settled_amount, 0) ELSE 0 END), 0)
  )
  INTO v_settlement
  FROM public.expenses e
  LEFT JOIN public.expense_splits es ON es.expense_id = e.id
  WHERE e.paid_by_user_id = p_user_id
    AND e.is_payment = false
    AND e.expense_date <= CURRENT_DATE;

  -- Return success with all data
  RETURN QUERY
  SELECT 
    true,
    NULL::TEXT,
    p_user_id,
    (SELECT full_name FROM public.profiles WHERE id = p_user_id),
    (SELECT email FROM auth.users WHERE id = p_user_id),
    v_balance.total_owed_to_me,
    v_balance.total_i_owe,
    v_balance.net_balance,
    'USD'::TEXT, -- Default currency, can be parameterized later
    COALESCE(v_debts_person, '[]'::JSONB),
    COALESCE(v_debts_group, '[]'::JSONB),
    v_settlement;

END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Grant execute permission to anon and authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_debt_by_secret(UUID, TEXT) TO anon, authenticated;

-- 4. Create function to generate API secret for a user
CREATE OR REPLACE FUNCTION public.create_api_secret(
  p_label TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  secret_token TEXT,
  label TEXT,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
) AS $$
DECLARE
  v_token TEXT;
  v_new_secret RECORD;
BEGIN
  -- Generate a random token (16 random bytes = 32 hex chars)
  v_token := encode(gen_random_bytes(16), 'hex');

  -- Insert and return
  INSERT INTO public.api_secrets (
    user_id,
    secret_token,
    label,
    created_by,
    expires_at
  ) VALUES (
    auth.uid(),
    v_token,
    p_label,
    auth.uid(),
    NULL -- Never expires by default
  )
  RETURNING * INTO v_new_secret;

  RETURN QUERY
  SELECT 
    v_new_secret.id,
    v_new_secret.secret_token,
    v_new_secret.label,
    v_new_secret.created_at,
    v_new_secret.expires_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.create_api_secret(TEXT) TO authenticated;

-- 5. Create function to list API secrets
CREATE OR REPLACE FUNCTION public.list_api_secrets()
RETURNS TABLE (
  id UUID,
  label TEXT,
  is_active BOOLEAN,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    api_secrets.id,
    api_secrets.label,
    api_secrets.is_active,
    api_secrets.last_used_at,
    api_secrets.expires_at,
    api_secrets.created_at
  FROM public.api_secrets
  WHERE user_id = auth.uid()
  ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.list_api_secrets() TO authenticated;

-- 6. Create function to revoke API secret
CREATE OR REPLACE FUNCTION public.revoke_api_secret(
  p_secret_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_row_count INT;
BEGIN
  UPDATE public.api_secrets
  SET is_active = false
  WHERE id = p_secret_id
    AND user_id = auth.uid();

  GET DIAGNOSTICS v_row_count = ROW_COUNT;

  IF v_row_count = 0 THEN
    RETURN QUERY SELECT false, 'API secret not found or already revoked';
  ELSE
    RETURN QUERY SELECT true, 'API secret revoked successfully';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.revoke_api_secret(UUID) TO authenticated;
