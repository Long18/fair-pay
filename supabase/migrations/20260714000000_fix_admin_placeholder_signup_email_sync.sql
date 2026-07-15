-- Fix: admin-created placeholder profiles could not complete Sign Up.
--
-- Root cause: `handle_new_user()` (added in 20260509043631) predates the
-- `user_emails` table and its `sync_profile_primary_email()` trigger (added in
-- 20260603074613). When an admin pre-creates a placeholder profile,
-- `admin_create_profile` inserts a `profiles` row, which fires the sync trigger
-- and creates a `user_emails` row holding that email. Later, when the real
-- person signs up, `handle_new_user()` claims the placeholder by inserting a
-- NEW `profiles` row with the SAME email *before* it repoints the dependent
-- foreign keys (including `user_emails`). That insert re-fires the sync trigger,
-- which finds the placeholder's `user_emails` row still holding the email under
-- a different `user_id` and raises 'Email is already attached to another
-- profile'. The exception aborts the `auth.users` insert, so Sign Up fails with
-- a database error and the user is never linked to their pre-created data.
--
-- Fix: give `sync_profile_primary_email()` a transaction-local suppression guard
-- (`fairpay.skip_email_sync`) so `handle_new_user()` can perform its controlled
-- profile surgery without the trigger interfering, and have `handle_new_user()`
-- maintain the primary `user_emails` row explicitly instead of relying on the
-- trigger side effect. The existing FK-repointing loop already migrates any
-- `user_emails` rows (including admin-added secondary emails) from the
-- placeholder to the real auth user, so nothing is lost.

BEGIN;

-- 1. Make the primary-email sync trigger suppressible during controlled
--    maintenance (e.g. signup reconciliation), without changing normal behavior.
CREATE OR REPLACE FUNCTION public.sync_profile_primary_email()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_email TEXT;
BEGIN
  -- Allow trusted callers (handle_new_user, other maintenance) to manage
  -- user_emails explicitly and skip the trigger's own bookkeeping.
  IF COALESCE(current_setting('fairpay.skip_email_sync', TRUE), 'off') = 'on' THEN
    RETURN NEW;
  END IF;

  IF NEW.email IS NULL OR BTRIM(NEW.email) = '' THEN
    RETURN NEW;
  END IF;

  v_email := LOWER(BTRIM(NEW.email));

  IF v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.user_emails ue
    WHERE ue.normalized_email = v_email
      AND ue.user_id <> NEW.id
  ) THEN
    RAISE EXCEPTION 'Email is already attached to another profile';
  END IF;

  UPDATE public.user_emails
  SET is_primary = FALSE,
      updated_at = NOW()
  WHERE user_id = NEW.id
    AND normalized_email <> v_email
    AND is_primary = TRUE;

  INSERT INTO public.user_emails (
    user_id,
    email,
    is_primary,
    receives_notifications,
    is_verified,
    source,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    v_email,
    TRUE,
    TRUE,
    TRUE,
    'profile',
    NOW(),
    NOW()
  )
  ON CONFLICT (normalized_email)
  DO UPDATE SET
    email = EXCLUDED.email,
    is_primary = TRUE,
    receives_notifications = TRUE,
    is_verified = public.user_emails.is_verified OR EXCLUDED.is_verified,
    updated_at = NOW();

  RETURN NEW;
END;
$fn$;

-- 2. Redefine handle_new_user to suppress the sync trigger during its surgery
--    and maintain the primary user_emails row itself. All existing behavior
--    (placeholder claim by email, friendships remap, generic FK repoint,
--    user_settings seed, pending email split claim) is preserved.
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

  -- Manage user_emails explicitly below; keep the profiles email-sync trigger
  -- from firing mid-surgery (it would collide with the placeholder's email row
  -- before the FK repoint moves it onto the new auth user).
  PERFORM set_config('fairpay.skip_email_sync', 'on', TRUE);

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

  -- Ensure exactly one primary user_emails row for the auth user, matching the
  -- profile's primary email. Any placeholder user_emails rows were already
  -- repointed to NEW.id by the FK loop above; this reconciles the primary flag
  -- and covers profiles that had no user_emails row yet.
  UPDATE public.user_emails
  SET is_primary = FALSE,
      updated_at = NOW()
  WHERE user_id = NEW.id
    AND normalized_email <> v_email
    AND is_primary = TRUE;

  INSERT INTO public.user_emails (
    user_id,
    email,
    is_primary,
    receives_notifications,
    is_verified,
    source,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    v_email,
    TRUE,
    TRUE,
    NEW.email_confirmed_at IS NOT NULL,
    'auth',
    COALESCE(NEW.created_at, NOW()),
    NOW()
  )
  ON CONFLICT (normalized_email)
  DO UPDATE SET
    user_id = NEW.id,
    is_primary = TRUE,
    receives_notifications = TRUE,
    is_verified = public.user_emails.is_verified OR EXCLUDED.is_verified,
    updated_at = NOW()
  -- Never steal an email already owned by a different profile (e.g. merged
  -- secondary). Only reclaim rows already pointing at NEW.id or the claimed
  -- placeholder (old_profile_id), which the FK loop above already repointed.
  WHERE public.user_emails.user_id IN (NEW.id, COALESCE(old_profile_id, NEW.id));

  IF NOT EXISTS (
    SELECT 1 FROM public.user_emails ue
    WHERE ue.normalized_email = v_email AND ue.user_id = NEW.id
  ) THEN
    RAISE EXCEPTION
      'Email is already linked to an existing account. Sign in with your primary email instead.';
  END IF;

  PERFORM set_config('fairpay.skip_email_sync', 'off', TRUE);

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
  'Handles auth signup. Claims placeholder profiles by email, migrates references (incl. user_emails) to the real auth user id, and maintains the primary user_emails row directly (suppressing sync_profile_primary_email during the claim to avoid a self-collision).';

COMMIT;
