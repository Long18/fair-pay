-- Polar Pro billing: extend subscriptions for Polar IDs + status.
-- Only service_role (Edge Functions / admin SQL) may insert/update rows.
-- Authenticated clients retain SELECT on their own row; admins may SELECT all.

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS polar_customer_id text,
  ADD COLUMN IF NOT EXISTS polar_subscription_id text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

COMMENT ON COLUMN public.subscriptions.polar_customer_id IS
  'Polar customer id; written only by service_role (polar-webhook).';
COMMENT ON COLUMN public.subscriptions.polar_subscription_id IS
  'Polar subscription id; written only by service_role (polar-webhook).';
COMMENT ON COLUMN public.subscriptions.status IS
  'Billing status: inactive | active | past_due | canceled | revoked. service_role only.';
COMMENT ON TABLE public.subscriptions IS
  'User plan entitlements. Clients may SELECT own row; inserts/updates are service_role only (Polar webhook / ops SQL).';

DROP POLICY IF EXISTS "Users can insert own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update own subscription" ON public.subscriptions;

-- Keep existing: "Users can read own subscription" (SELECT for auth.uid() = user_id)

DROP POLICY IF EXISTS "Admins can read all subscriptions" ON public.subscriptions;
CREATE POLICY "Admins can read all subscriptions"
  ON public.subscriptions
  FOR SELECT
  USING (public.is_admin() OR public.is_staff());
