-- Phase 5 MVP: Public API webhook endpoint registrations (storage only).
-- Delivery worker / HTTP CRUD under /v1/webhooks are TBD.
-- See docs/features/phase5-scale.md.

CREATE TABLE IF NOT EXISTS public.public_api_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT public_api_webhooks_url_not_blank CHECK (length(btrim(url)) > 0),
  CONSTRAINT public_api_webhooks_secret_not_blank CHECK (length(btrim(secret)) > 0)
);

COMMENT ON TABLE public.public_api_webhooks IS
  'Outbound webhook endpoint registrations for the Public / Agent API. Storage stub only; delivery TBD.';

COMMENT ON COLUMN public.public_api_webhooks.events IS
  'Event type filters (e.g. expense.created). Empty array means no events matched until configured.';

COMMENT ON COLUMN public.public_api_webhooks.secret IS
  'HMAC signing secret for delivery payloads (delivery worker TBD).';

CREATE INDEX IF NOT EXISTS idx_public_api_webhooks_user_id
  ON public.public_api_webhooks (user_id);

CREATE INDEX IF NOT EXISTS idx_public_api_webhooks_user_active
  ON public.public_api_webhooks (user_id, active)
  WHERE active = true;

ALTER TABLE public.public_api_webhooks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own public_api_webhooks"
  ON public.public_api_webhooks;
CREATE POLICY "Users can manage own public_api_webhooks"
  ON public.public_api_webhooks
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

REVOKE ALL ON public.public_api_webhooks FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.public_api_webhooks TO authenticated;
GRANT ALL ON public.public_api_webhooks TO service_role;
