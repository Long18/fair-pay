-- MoMo manual QR: payer reports "I have paid" → payee gets inbox notification to confirm receipt.

CREATE TABLE IF NOT EXISTS public.momo_manual_payment_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_split_id UUID REFERENCES public.expense_splits(id) ON DELETE CASCADE,
  expense_id UUID REFERENCES public.expenses(id) ON DELETE CASCADE,
  payer_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  payee_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'VND',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'cancelled', 'acknowledged')),
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT momo_manual_claim_different_users CHECK (payer_user_id <> payee_user_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_momo_manual_claims_pending_split
  ON public.momo_manual_payment_claims (expense_split_id, payer_user_id)
  WHERE status = 'pending' AND expense_split_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_momo_manual_claims_pending_debt
  ON public.momo_manual_payment_claims (payer_user_id, payee_user_id)
  WHERE status = 'pending' AND expense_split_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_momo_manual_claims_payee_status
  ON public.momo_manual_payment_claims (payee_user_id, status, created_at DESC);

ALTER TABLE public.momo_manual_payment_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS momo_manual_claims_select_involved ON public.momo_manual_payment_claims;
CREATE POLICY momo_manual_claims_select_involved ON public.momo_manual_payment_claims
  FOR SELECT TO authenticated
  USING (payer_user_id = auth.uid() OR payee_user_id = auth.uid() OR is_admin());

CREATE OR REPLACE FUNCTION public.update_momo_manual_claims_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_momo_manual_claims_updated_at ON public.momo_manual_payment_claims;
CREATE TRIGGER update_momo_manual_claims_updated_at
  BEFORE UPDATE ON public.momo_manual_payment_claims
  FOR EACH ROW
  EXECUTE FUNCTION public.update_momo_manual_claims_updated_at();

CREATE OR REPLACE FUNCTION public.report_momo_manual_payment_claim(
  p_payee_id UUID,
  p_amount NUMERIC,
  p_expense_split_id UUID DEFAULT NULL,
  p_expense_id UUID DEFAULT NULL,
  p_currency TEXT DEFAULT 'VND'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_payer_id UUID;
  v_split RECORD;
  v_expense RECORD;
  v_claim_id UUID;
  v_existing_id UUID;
  v_payer_name TEXT;
  v_link TEXT;
  v_related_id UUID;
  v_title TEXT := 'MoMo payment awaiting confirmation';
  v_message TEXT;
BEGIN
  v_payer_id := auth.uid();
  IF v_payer_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  IF p_payee_id IS NULL OR p_payee_id = v_payer_id THEN
    RAISE EXCEPTION 'Invalid payee';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  IF p_expense_split_id IS NOT NULL THEN
    SELECT es.*, e.paid_by_user_id, e.group_id, e.currency AS expense_currency
    INTO v_split
    FROM expense_splits es
    JOIN expenses e ON e.id = es.expense_id
    WHERE es.id = p_expense_split_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Expense split not found';
    END IF;

    IF v_split.user_id IS DISTINCT FROM v_payer_id THEN
      RAISE EXCEPTION 'You can only report payment for your own split';
    END IF;

    IF COALESCE(v_split.is_settled, FALSE)
       AND COALESCE(v_split.settled_amount, 0) >= v_split.computed_amount - 0.01 THEN
      RAISE EXCEPTION 'This split is already settled';
    END IF;

    IF p_payee_id <> v_split.paid_by_user_id THEN
      RAISE EXCEPTION 'Payee does not match expense payer';
    END IF;

    p_expense_id := COALESCE(p_expense_id, v_split.expense_id);
    p_currency := COALESCE(NULLIF(TRIM(p_currency), ''), v_split.expense_currency, 'VND');

    SELECT id INTO v_existing_id
    FROM momo_manual_payment_claims
    WHERE expense_split_id = p_expense_split_id
      AND payer_user_id = v_payer_id
      AND status = 'pending'
    LIMIT 1;
  ELSE
    IF NOT EXISTS (
      SELECT 1
      FROM friendships f
      WHERE f.status = 'accepted'
        AND (
          (f.user_a_id = v_payer_id AND f.user_b_id = p_payee_id)
          OR (f.user_b_id = v_payer_id AND f.user_a_id = p_payee_id)
        )
    ) THEN
      RAISE EXCEPTION 'No accepted friendship with this payee';
    END IF;

    SELECT id INTO v_existing_id
    FROM momo_manual_payment_claims
    WHERE expense_split_id IS NULL
      AND payer_user_id = v_payer_id
      AND payee_user_id = p_payee_id
      AND status = 'pending'
    LIMIT 1;
  END IF;

  IF v_existing_id IS NOT NULL THEN
    UPDATE momo_manual_payment_claims
    SET amount = p_amount,
        currency = COALESCE(NULLIF(TRIM(p_currency), ''), currency),
        updated_at = NOW()
    WHERE id = v_existing_id;

    RETURN jsonb_build_object(
      'success', true,
      'claim_id', v_existing_id,
      'already_pending', true,
      'notification_sent', false
    );
  END IF;

  INSERT INTO momo_manual_payment_claims (
    expense_split_id,
    expense_id,
    payer_user_id,
    payee_user_id,
    amount,
    currency,
    status
  )
  VALUES (
    p_expense_split_id,
    p_expense_id,
    v_payer_id,
    p_payee_id,
    p_amount,
    COALESCE(NULLIF(TRIM(p_currency), ''), 'VND'),
    'pending'
  )
  RETURNING id INTO v_claim_id;

  SELECT full_name INTO v_payer_name FROM profiles WHERE id = v_payer_id;

  IF p_expense_id IS NOT NULL THEN
    v_link := '/expenses/show/' || p_expense_id::TEXT;
    v_related_id := p_expense_id;
  ELSE
    v_link := '/debts/' || v_payer_id::TEXT;
    v_related_id := v_claim_id;
  END IF;

  v_message :=
    COALESCE(v_payer_name, 'Someone')
    || ' says they paid you '
    || to_char(p_amount, 'FM999,999,999')
    || ' '
    || COALESCE(NULLIF(TRIM(p_currency), ''), 'VND')
    || ' via MoMo. Please confirm in FairPay.';

  IF should_send_notification(p_payee_id, 'payment_received') THEN
    INSERT INTO notifications (user_id, actor_id, type, title, message, link, related_id, is_read, created_at)
    VALUES (
      p_payee_id,
      v_payer_id,
      'payment_pending_confirmation',
      v_title,
      v_message,
      v_link,
      v_related_id,
      FALSE,
      NOW()
    );

    UPDATE momo_manual_payment_claims
    SET notified_at = NOW()
    WHERE id = v_claim_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'claim_id', v_claim_id,
    'already_pending', false,
    'notification_sent', true
  );
END;
$$;

COMMENT ON FUNCTION public.report_momo_manual_payment_claim(UUID, NUMERIC, UUID, UUID, TEXT) IS
  'Payer reports MoMo manual QR transfer; notifies payee to confirm receipt (no auto-settle).';

GRANT EXECUTE ON FUNCTION public.report_momo_manual_payment_claim(UUID, NUMERIC, UUID, UUID, TEXT) TO authenticated;
