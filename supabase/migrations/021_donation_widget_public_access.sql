-- Allow anonymous (non-authenticated) users to read donation settings
-- This enables the donation widget to be visible to all users, including those not logged in

-- Drop the old authenticated-only policy
DROP POLICY IF EXISTS "Authenticated users can read donation settings" ON public.donation_settings;

-- Create new policy that allows everyone (authenticated and anonymous) to read
CREATE POLICY "Anyone can read donation settings"
  ON public.donation_settings
  FOR SELECT
  TO public
  USING (true);
