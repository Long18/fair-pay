-- Create donation_settings table
CREATE TABLE IF NOT EXISTS public.donation_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled boolean NOT NULL DEFAULT false,
  avatar_image_url text,
  qr_code_image_url text,
  cta_text jsonb DEFAULT '{"en": "Support us", "vi": "Ủng hộ chúng tôi"}'::jsonb,
  donate_message jsonb DEFAULT '{"en": "Thank you for your support!", "vi": "Cảm ơn bạn đã ủng hộ!"}'::jsonb,
  bank_info jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_donation_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER donation_settings_updated_at
  BEFORE UPDATE ON public.donation_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_donation_settings_updated_at();

-- Enable RLS
ALTER TABLE public.donation_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone authenticated can read donation settings
CREATE POLICY "Authenticated users can read donation settings"
  ON public.donation_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Only authenticated users can insert (first-time setup)
-- In production, you may want to restrict this to admins only
CREATE POLICY "Authenticated users can insert donation settings"
  ON public.donation_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Only authenticated users can update
-- In production, you may want to restrict this to admins only
CREATE POLICY "Authenticated users can update donation settings"
  ON public.donation_settings
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default settings (only if table is empty)
INSERT INTO public.donation_settings (is_enabled, cta_text, donate_message)
VALUES (
  false,
  '{"en": "Support FairPay", "vi": "Ủng hộ FairPay"}'::jsonb,
  '{"en": "Thank you for supporting FairPay! Your donation helps us keep the service free and ad-free.", "vi": "Cảm ơn bạn đã ủng hộ FairPay! Sự đóng góp của bạn giúp chúng tôi duy trì dịch vụ miễn phí và không quảng cáo."}'::jsonb
)
ON CONFLICT DO NOTHING;

-- Create storage bucket for donation images (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('donation-images', 'donation-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for donation images
CREATE POLICY "Public can view donation images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'donation-images');

CREATE POLICY "Authenticated users can upload donation images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'donation-images');

CREATE POLICY "Authenticated users can update donation images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'donation-images')
  WITH CHECK (bucket_id = 'donation-images');

CREATE POLICY "Authenticated users can delete donation images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'donation-images');
