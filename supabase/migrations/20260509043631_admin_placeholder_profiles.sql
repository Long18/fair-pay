-- Allow admins to create display-only placeholder profiles before a real
-- Supabase Auth user exists. When the real user signs up later,
-- handle_new_user() migrates references to the auth user id and replaces
-- placeholder profile details with auth metadata.

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_id_fkey;

ALTER TABLE public.profiles
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
CREATE POLICY "Admins can insert profiles"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE
  TO authenticated
  USING ((SELECT public.is_admin()));

CREATE OR REPLACE FUNCTION public.admin_create_profile(
  p_full_name TEXT,
  p_email TEXT,
  p_role TEXT DEFAULT 'user',
  p_avatar_url TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  role TEXT,
  created_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_profile_id UUID;
  v_full_name TEXT;
  v_email TEXT;
  v_role TEXT;
  v_avatar_url TEXT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only administrators can create users';
  END IF;

  v_full_name := NULLIF(BTRIM(p_full_name), '');
  v_email := LOWER(NULLIF(BTRIM(p_email), ''));
  v_role := COALESCE(NULLIF(BTRIM(p_role), ''), 'user');
  v_avatar_url := NULLIF(BTRIM(p_avatar_url), '');

  IF v_full_name IS NULL THEN
    RAISE EXCEPTION 'Full name is required';
  END IF;

  IF v_email IS NULL OR v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'A valid email is required';
  END IF;

  IF v_role NOT IN ('admin', 'user') THEN
    RAISE EXCEPTION 'Invalid role: must be admin or user';
  END IF;

  SELECT p.id
  INTO v_profile_id
  FROM public.profiles p
  WHERE LOWER(p.email) = v_email
  ORDER BY (p.email = v_email) DESC, p.created_at ASC
  LIMIT 1
  FOR UPDATE;

  IF v_profile_id IS NULL THEN
    INSERT INTO public.profiles (email, full_name, avatar_url)
    VALUES (v_email, v_full_name, v_avatar_url)
    RETURNING public.profiles.id INTO v_profile_id;
  ELSE
    UPDATE public.profiles
    SET
      email = v_email,
      full_name = v_full_name,
      avatar_url = COALESCE(v_avatar_url, public.profiles.avatar_url),
      updated_at = NOW()
    WHERE public.profiles.id = v_profile_id;
  END IF;

  INSERT INTO public.user_roles (user_id, role, created_at, updated_at)
  VALUES (v_profile_id, v_role, NOW(), NOW())
  ON CONFLICT (user_id)
  DO UPDATE SET role = EXCLUDED.role, updated_at = NOW();

  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.email,
    p.avatar_url,
    COALESCE(ur.role, 'user') AS role,
    p.created_at
  FROM public.profiles p
  LEFT JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE p.id = v_profile_id;
END;
$fn$;

REVOKE ALL ON FUNCTION public.admin_create_profile(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_create_profile(TEXT, TEXT, TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_create_profile(TEXT, TEXT, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION public.admin_create_profile(TEXT, TEXT, TEXT, TEXT) IS
  'Admin-only: create or update a display-only placeholder profile. Real auth signup later claims the email and overwrites placeholder details.';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $fn$
DECLARE
  old_profile_id UUID;
  v_email TEXT;
  v_full_name TEXT;
  v_avatar_url TEXT;
  v_claim_result JSONB;
  fk RECORD;
BEGIN
  SET LOCAL row_security = off;

  v_email := LOWER(BTRIM(NEW.email));
  v_full_name := COALESCE(
    NULLIF(BTRIM(COALESCE(NEW.raw_user_meta_data, '{}'::jsonb)->>'full_name'), ''),
    NULLIF(BTRIM(COALESCE(NEW.raw_user_meta_data, '{}'::jsonb)->>'name'), ''),
    NULLIF(BTRIM(COALESCE(NEW.raw_user_meta_data, '{}'::jsonb)->>'user_name'), ''),
    split_part(v_email, '@', 1),
    'User'
  );
  v_avatar_url := COALESCE(
    NULLIF(BTRIM(COALESCE(NEW.raw_user_meta_data, '{}'::jsonb)->>'avatar_url'), ''),
    NULLIF(BTRIM(COALESCE(NEW.raw_user_meta_data, '{}'::jsonb)->>'picture'), '')
  );

  SELECT p.id
  INTO old_profile_id
  FROM public.profiles p
  WHERE LOWER(p.email) = v_email
  ORDER BY (p.id = NEW.id) DESC, p.created_at ASC
  LIMIT 1
  FOR UPDATE;

  IF old_profile_id IS NOT NULL AND old_profile_id != NEW.id THEN
    UPDATE public.profiles
    SET email = v_email || '.old.' || old_profile_id::text,
        updated_at = NOW()
    WHERE id = old_profile_id;

    INSERT INTO public.profiles (id, email, full_name, avatar_url, created_at, updated_at)
    VALUES (
      NEW.id,
      v_email,
      v_full_name,
      v_avatar_url,
      COALESCE(NEW.created_at, NOW()),
      NOW()
    )
    ON CONFLICT (id)
    DO UPDATE SET
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      avatar_url = EXCLUDED.avatar_url,
      updated_at = NOW();

    UPDATE public.friendships
    SET
      user_a = CASE
        WHEN user_a = old_profile_id THEN CASE WHEN NEW.id < user_b THEN NEW.id ELSE user_b END
        WHEN user_b = old_profile_id THEN CASE WHEN user_a < NEW.id THEN user_a ELSE NEW.id END
        ELSE user_a
      END,
      user_b = CASE
        WHEN user_a = old_profile_id THEN CASE WHEN NEW.id < user_b THEN user_b ELSE NEW.id END
        WHEN user_b = old_profile_id THEN CASE WHEN user_a < NEW.id THEN NEW.id ELSE user_a END
        ELSE user_b
      END,
      created_by = CASE WHEN created_by = old_profile_id THEN NEW.id ELSE created_by END
    WHERE user_a = old_profile_id
       OR user_b = old_profile_id
       OR created_by = old_profile_id;

    FOR fk IN
      SELECT
        kcu.table_schema,
        kcu.table_name,
        kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
      JOIN information_schema.referential_constraints rc
        ON rc.constraint_name = tc.constraint_name
       AND rc.constraint_schema = tc.constraint_schema
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = rc.unique_constraint_name
       AND ccu.constraint_schema = rc.unique_constraint_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_schema = 'public'
        AND ccu.table_name = 'profiles'
        AND ccu.column_name = 'id'
        AND NOT (
          kcu.table_schema = 'public'
          AND kcu.table_name = 'friendships'
          AND kcu.column_name IN ('user_a', 'user_b')
        )
    LOOP
      EXECUTE format(
        'UPDATE %I.%I SET %I = $1 WHERE %I = $2',
        fk.table_schema,
        fk.table_name,
        fk.column_name,
        fk.column_name
      )
      USING NEW.id, old_profile_id;
    END LOOP;

    DELETE FROM public.profiles WHERE id = old_profile_id;
  ELSE
    INSERT INTO public.profiles (id, email, full_name, avatar_url, created_at, updated_at)
    VALUES (
      NEW.id,
      v_email,
      v_full_name,
      v_avatar_url,
      COALESCE(NEW.created_at, NOW()),
      NOW()
    )
    ON CONFLICT (id)
    DO UPDATE SET
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      avatar_url = EXCLUDED.avatar_url,
      updated_at = NOW();
  END IF;

  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  BEGIN
    v_claim_result := public.claim_pending_email_splits(NEW.id, v_email);

    IF (v_claim_result->>'claimed_count')::int > 0 THEN
      RAISE NOTICE 'Claimed % pending email split(s) for user % (%)',
        v_claim_result->>'claimed_count', NEW.id, v_email;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'claim_pending_email_splits failed for user % (%): %', NEW.id, v_email, SQLERRM;
  END;

  RETURN NEW;
END;
$fn$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Handles auth signup. Claims placeholder profiles by email, migrates references to the real auth user id, and overwrites placeholder details from auth metadata.';

CREATE OR REPLACE FUNCTION public.handle_deleted_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $fn$
BEGIN
  SET LOCAL row_security = off;

  DELETE FROM public.profiles
  WHERE id = OLD.id;

  RETURN OLD;
END;
$fn$;

DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;

CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_deleted_user();

COMMENT ON FUNCTION public.handle_deleted_user() IS
  'Preserves auth.users -> profiles cascade behavior after profiles can also contain placeholder rows.';
