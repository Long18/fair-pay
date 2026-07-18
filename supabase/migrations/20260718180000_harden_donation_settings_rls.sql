-- React Doctor: donation_settings INSERT/UPDATE were WITH CHECK (true).
-- Reads stay public; writes restricted to admins (widget config is global).

DROP POLICY IF EXISTS "Authenticated users can insert donation settings"
  ON public.donation_settings;
DROP POLICY IF EXISTS "Authenticated users can update donation settings"
  ON public.donation_settings;

CREATE POLICY "Admins can insert donation settings"
  ON public.donation_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update donation settings"
  ON public.donation_settings
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
