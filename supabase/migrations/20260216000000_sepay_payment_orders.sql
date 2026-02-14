-- SePay Payment Orders
-- Tracks SePay checkout orders for QR payment integration.
-- Each order maps to a debt or expense source for reconciliation.

-- 1. Add sepay_config JSONB to user_settings
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS sepay_config JSONB;

COMMENT ON COLUMN user_settings.sepay_config IS 'SePay Payment Gateway config: {merchant_id, secret_key, environment}';

-- 2. Create sepay_payment_orders table
CREATE TABLE IF NOT EXISTS sepay_payment_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_invoice_number TEXT NOT NULL UNIQUE,
  source_type TEXT NOT NULL CHECK (source_type IN ('DEBT', 'EXPENSE')),
  source_id TEXT NOT NULL,
  payer_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  payee_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'VND',
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'FAILED', 'CANCELLED', 'EXPIRED')),
  sepay_checkout_url TEXT,
  custom_data TEXT,
  webhook_payload JSONB,
  webhook_processed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 minutes'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sepay_orders_payer ON sepay_payment_orders(payer_user_id);
CREATE INDEX IF NOT EXISTS idx_sepay_orders_payee ON sepay_payment_orders(payee_user_id);
CREATE INDEX IF NOT EXISTS idx_sepay_orders_source ON sepay_payment_orders(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_sepay_orders_status ON sepay_payment_orders(status);
CREATE INDEX IF NOT EXISTS idx_sepay_orders_invoice ON sepay_payment_orders(order_invoice_number);

-- Updated_at trigger
CREATE TRIGGER update_sepay_payment_orders_updated_at
  BEFORE UPDATE ON sepay_payment_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 3. RLS Policies
ALTER TABLE sepay_payment_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payment orders"
  ON sepay_payment_orders FOR SELECT
  TO authenticated
  USING (payer_user_id = auth.uid() OR payee_user_id = auth.uid());

CREATE POLICY "Users can create own payment orders"
  ON sepay_payment_orders FOR INSERT
  TO authenticated
  WITH CHECK (payer_user_id = auth.uid());

CREATE POLICY "System can update payment orders"
  ON sepay_payment_orders FOR UPDATE
  TO authenticated
  USING (payer_user_id = auth.uid() OR payee_user_id = auth.uid());

-- Allow service_role (edge functions) full access
CREATE POLICY "Service role full access"
  ON sepay_payment_orders FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 4. Allow users to read payee's sepay_config (for checking if SePay is configured)
-- This extends the existing RLS on user_settings
CREATE POLICY "Users can view payee sepay config"
  ON user_settings FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM expense_splits es
      JOIN expenses e ON e.id = es.expense_id
      WHERE e.paid_by_user_id = user_settings.user_id
        AND es.user_id = auth.uid()
        AND es.is_settled = false
    )
  );

-- Admin policy for sepay_payment_orders
CREATE POLICY "Admin full access to payment orders"
  ON sepay_payment_orders FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

COMMENT ON TABLE sepay_payment_orders IS 'SePay payment gateway order tracking for QR payments';
