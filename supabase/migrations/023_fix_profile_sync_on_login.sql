-- Fix: Handle existing profiles when user logs in after production data pull
-- When production data is pulled, profiles exist but auth.users is empty
-- When user logs in, new auth user is created but profile with same email already exists
-- This migration updates handle_new_user() to handle this case

-- Drop existing trigger temporarily
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Update the function to handle existing profiles
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  old_profile_id UUID;
  old_full_name TEXT;
  old_avatar_url TEXT;
  old_created_at TIMESTAMPTZ;
  old_email TEXT;
  temp_email TEXT;
BEGIN
  -- #region agent log H8
  RAISE NOTICE '[AGENT_LOG] handle_new_user START: NEW.id=%, NEW.email=%', NEW.id, NEW.email;
  -- #endregion

  -- Temporarily disable RLS for this operation
  SET LOCAL row_security = off;

  -- Check if profile with this email already exists (from production data pull)
  SELECT id, email INTO old_profile_id, old_email
  FROM public.profiles
  WHERE email = NEW.email
  FOR UPDATE; -- Lock the row to prevent concurrent modifications

  -- #region agent log H8
  RAISE NOTICE '[AGENT_LOG] After SELECT: old_profile_id=%, old_email=%', old_profile_id, old_email;
  -- #endregion

  IF old_profile_id IS NOT NULL AND old_profile_id != NEW.id THEN
    -- #region agent log H8,H9
    RAISE NOTICE '[AGENT_LOG] Profile migration path: old_id=%, new_id=%', old_profile_id, NEW.id;
    -- #endregion

    -- Profile exists with different ID - need to migrate to new ID
    -- Store old profile data BEFORE any changes
    SELECT full_name, avatar_url, created_at
    INTO old_full_name, old_avatar_url, old_created_at
    FROM public.profiles
    WHERE id = old_profile_id;

    -- Temporarily change old profile email to avoid conflict
    temp_email := old_email || '.old.' || old_profile_id::text;
    UPDATE public.profiles
    SET email = temp_email
    WHERE id = old_profile_id;

    -- Create new profile with the original email
    INSERT INTO public.profiles (id, email, full_name, avatar_url, created_at, updated_at)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(old_full_name, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))),
      old_avatar_url,
      COALESCE(old_created_at, NOW()),
      NOW()
    );

    -- #region agent log H8,H9
    RAISE NOTICE '[AGENT_LOG] Before FK updates: old_id=%, new_id=%', old_profile_id, NEW.id;
    -- #endregion

    -- Update FK references (except friendships which needs special handling)
    UPDATE expenses SET paid_by_user_id = NEW.id WHERE paid_by_user_id = old_profile_id;
    UPDATE expenses SET created_by = NEW.id WHERE created_by = old_profile_id;
    UPDATE expense_splits SET user_id = NEW.id WHERE user_id = old_profile_id;
    UPDATE payments SET from_user = NEW.id WHERE from_user = old_profile_id;
    UPDATE payments SET to_user = NEW.id WHERE to_user = old_profile_id;
    UPDATE payments SET created_by = NEW.id WHERE created_by = old_profile_id;
    UPDATE groups SET created_by = NEW.id WHERE created_by = old_profile_id;
    UPDATE group_members SET user_id = NEW.id WHERE user_id = old_profile_id;
    UPDATE attachments SET uploaded_by = NEW.id WHERE uploaded_by = old_profile_id;
    UPDATE notifications SET user_id = NEW.id WHERE user_id = old_profile_id;
    UPDATE user_settings SET user_id = NEW.id WHERE user_id = old_profile_id;
    UPDATE audit_logs SET user_id = NEW.id WHERE user_id = old_profile_id;
    UPDATE user_roles SET user_id = NEW.id WHERE user_id = old_profile_id;

    -- #region agent log H8,H9
    RAISE NOTICE '[AGENT_LOG] Before friendships updates';
    -- #endregion

    -- Handle friendships specially to maintain ordered_users constraint
    -- Update and swap if needed to maintain user_a < user_b
    UPDATE friendships
    SET
      user_a = CASE
        WHEN user_a = old_profile_id THEN
          CASE WHEN NEW.id < user_b THEN NEW.id ELSE user_b END
        ELSE user_a
      END,
      user_b = CASE
        WHEN user_a = old_profile_id THEN
          CASE WHEN NEW.id < user_b THEN user_b ELSE NEW.id END
        ELSE NEW.id
      END,
      created_by = CASE WHEN created_by = old_profile_id THEN NEW.id ELSE created_by END
    WHERE user_a = old_profile_id OR user_b = old_profile_id;

    -- #region agent log H8,H9
    RAISE NOTICE '[AGENT_LOG] After friendships updates, before DELETE old profile';
    -- #endregion

    -- Now safe to delete old profile
    DELETE FROM public.profiles WHERE id = old_profile_id;

    -- #region agent log H8,H9
    RAISE NOTICE '[AGENT_LOG] After DELETE old profile';
    -- #endregion
  ELSE
    -- #region agent log H8
    RAISE NOTICE '[AGENT_LOG] New profile path: old_profile_id=%, NEW.id=%', old_profile_id, NEW.id;
    -- #endregion

    -- No existing profile or ID matches - insert new profile
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- #region agent log H8,H9
  RAISE NOTICE '[AGENT_LOG] handle_new_user END: SUCCESS';
  -- #endregion

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- #region agent log H8,H9
    RAISE NOTICE '[AGENT_LOG] handle_new_user EXCEPTION: %, %', SQLERRM, SQLSTATE;
    -- #endregion
    RAISE;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Add comment
COMMENT ON FUNCTION handle_new_user() IS
  'Handles new user creation. If profile with same email exists (from production data), migrates by: 1) Temporarily changing old profile email, 2) Creating new profile, 3) Updating all FK references (with special handling for friendships ordered_users constraint), 4) Deleting old profile. Preserves all related data.';
