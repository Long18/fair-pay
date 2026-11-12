-- Pay2S OAuth integration
-- Lets a user link their Pay2S account (OAuth2 + PKCE) so FairPay receives
-- incoming bank transactions via webhook and can SUGGEST payment matches.
-- Confirm / settle stays in the FairPay UI; nothing here settles automatically.
--
-- Tokens never live in user_settings JSONB. Secrets are encrypted at the Edge
-- Function layer (AES-GCM) and stored in tables reachable by service_role only.

-- ---------------------------------------------------------------------------
-- pay2s_connections: one row per user, client-readable status only
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pay2s_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'expired', 'revoked', 'error')),
  scope TEXT NOT NULL DEFAULT '',
  bank_id TEXT,
  bank_label TEXT,
  webhook_id TEXT,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  connection_expires_at TIMESTAMPTZ,
  last_event_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pay2s_connections_user_unique UNIQUE (user_id)
);

ALTER TABLE public.pay2s_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pay2s_connections_select_own ON public.pay2s_connections;
CREATE POLICY pay2s_connections_select_own ON public.pay2s_connections
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS pay2s_connections_service_all ON public.pay2s_connections;
CREATE POLICY pay2s_connections_service_all ON public.pay2s_connections
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- pay2s_connection_secrets: encrypted tokens + webhook signing secret
-- RLS enabled with NO policies for anon/authenticated => service_role only.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pay2s_connection_secrets (
  connection_id UUID PRIMARY KEY REFERENCES public.pay2s_connections(id) ON DELETE CASCADE,
  access_token_enc TEXT,
  refresh_token_enc TEXT,
  access_expires_at TIMESTAMPTZ,
  refresh_expires_at TIMESTAMPTZ,
  webhook_signing_secret_enc TEXT,
  refresh_lease_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pay2s_connection_secrets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pay2s_connection_secrets FROM anon, authenticated;
GRANT ALL ON public.pay2s_connection_secrets TO service_role;

-- ---------------------------------------------------------------------------
-- pay2s_oauth_states: short-lived state + PKCE verifier (service_role only)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pay2s_oauth_states (
  state_hash TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_verifier_enc TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pay2s_oauth_states ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pay2s_oauth_states FROM anon, authenticated;
GRANT ALL ON public.pay2s_oauth_states TO service_role;

CREATE INDEX IF NOT EXISTS idx_pay2s_oauth_states_expires_at
  ON public.pay2s_oauth_states (expires_at);

-- ---------------------------------------------------------------------------
-- pay2s_bank_transactions: incoming/outgoing transactions from the webhook
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pay2s_bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES public.pay2s_connections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pay2s_tx_id TEXT NOT NULL,
  gateway TEXT,
  account_number TEXT,
  amount NUMERIC(18, 2) NOT NULL,
  content TEXT,
  direction TEXT NOT NULL CHECK (direction IN ('IN', 'OUT')),
  tx_time TIMESTAMPTZ,
  payment_code TEXT,
  match_status TEXT NOT NULL DEFAULT 'unmatched'
    CHECK (match_status IN ('unmatched', 'suggested', 'dismissed')),
  matched_source_type TEXT,
  matched_source_id UUID,
  raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pay2s_bank_transactions_unique UNIQUE (connection_id, pay2s_tx_id)
);

ALTER TABLE public.pay2s_bank_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pay2s_bank_transactions_select_own ON public.pay2s_bank_transactions;
CREATE POLICY pay2s_bank_transactions_select_own ON public.pay2s_bank_transactions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS pay2s_bank_transactions_service_all ON public.pay2s_bank_transactions;
CREATE POLICY pay2s_bank_transactions_service_all ON public.pay2s_bank_transactions
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_pay2s_bank_transactions_user_time
  ON public.pay2s_bank_transactions (user_id, tx_time DESC);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pay2s_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pay2s_connections_updated_at ON public.pay2s_connections;
CREATE TRIGGER trg_pay2s_connections_updated_at
  BEFORE UPDATE ON public.pay2s_connections
  FOR EACH ROW EXECUTE FUNCTION public.pay2s_touch_updated_at();

DROP TRIGGER IF EXISTS trg_pay2s_connection_secrets_updated_at ON public.pay2s_connection_secrets;
CREATE TRIGGER trg_pay2s_connection_secrets_updated_at
  BEFORE UPDATE ON public.pay2s_connection_secrets
  FOR EACH ROW EXECUTE FUNCTION public.pay2s_touch_updated_at();

-- ---------------------------------------------------------------------------
-- RPC: owner dismisses a suggested/unmatched transaction (no settlement)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dismiss_pay2s_transaction(p_transaction_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.pay2s_bank_transactions
     SET match_status = 'dismissed'
   WHERE id = p_transaction_id
     AND user_id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.dismiss_pay2s_transaction(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dismiss_pay2s_transaction(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- RPC: serialize token refresh per connection (refresh tokens rotate; reuse
-- revokes the connection). Edge functions call this inside their refresh flow
-- and hold the lock for the transaction of the RPC only, so the function
-- returns whether the caller acquired the refresh lease.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pay2s_try_acquire_refresh_lease(
  p_connection_id UUID,
  p_lease_seconds INTEGER DEFAULT 30
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_rows INTEGER;
BEGIN
  UPDATE public.pay2s_connection_secrets
     SET refresh_lease_until = now() + make_interval(secs => p_lease_seconds)
   WHERE connection_id = p_connection_id
     AND (refresh_lease_until IS NULL OR refresh_lease_until < now());
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.pay2s_try_acquire_refresh_lease(UUID, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pay2s_try_acquire_refresh_lease(UUID, INTEGER) TO service_role;
