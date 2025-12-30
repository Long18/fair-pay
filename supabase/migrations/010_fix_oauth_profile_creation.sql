-- Fix: Add missing INSERT policy for profiles table
-- This allows the handle_new_user() trigger to create profiles for OAuth users

-- Drop existing trigger temporarily
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Add INSERT policy for profiles (missing from original schema)
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Also allow service role to insert (for the trigger function)
-- The trigger runs as SECURITY DEFINER, but RLS still applies
-- We need to explicitly disable RLS in the function

-- Update the function to disable RLS during INSERT
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  -- Temporarily disable RLS for this INSERT
  SET LOCAL row_security = off;

  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );

  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Add comment
COMMENT ON POLICY "Users can insert their own profile" ON profiles IS
  'Allows users to create their own profile. The handle_new_user() trigger also bypasses RLS using SET LOCAL row_security = off';

