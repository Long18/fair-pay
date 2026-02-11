-- Migration: Create claim_pending_email_splits function and integrate with handle_new_user trigger
-- Date: 2026-02-11
-- Purpose: Auto-sync pending email participants when they register
-- Flow: User registers → auth.users INSERT → handle_new_user() → creates profile → claims pending splits

BEGIN;

-- =============================================
-- 1. Create standalone claim function
-- =============================================
CREATE OR REPLACE FUNCTION claim_pending_email_splits(
  p_user_id UUID,
  p_email TEXT
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  v_claimed_count INTEGER := 0;
  v_email TEXT;
  v_claimed_ids UUID[] := ARRAY[]::UUID[];
BEGIN
  -- Normalize email to lowercase
  v_email := LOWER(TRIM(p_email));

  -- Skip if email is empty
  IF v_email IS NULL OR v_email = '' THEN
    RETURN jsonb_build_object(
      'success', true,
      'claimed_count', 0,
      'email', v_email,
      'user_id', p_user_id,
      'message', 'No email provided'
    );
  END IF;

  -- Claim all pending splits for this email, capturing the IDs of claimed rows
  -- This UPDATE is safe because:
  --   Before: user_id = NULL, pending_email = 'x@y.com', is_claimed = FALSE
  --   After:  user_id = UUID, pending_email = NULL, is_claimed = TRUE
  --   All CHECK constraints remain satisfied
  WITH claimed AS (
    UPDATE expense_splits
    SET
      user_id = p_user_id,
      pending_email = NULL,
      is_claimed = TRUE
    WHERE pending_email = v_email
      AND user_id IS NULL
    RETURNING id
  )
  SELECT array_agg(id), count(*) INTO v_claimed_ids, v_claimed_count FROM claimed;

  -- Auto-settle ONLY freshly claimed splits where the new user is also the payer
  -- (edge case: someone added their own email before registering)
  -- Scoped to v_claimed_ids to avoid touching pre-existing splits
  IF v_claimed_count > 0 THEN
    UPDATE expense_splits es
    SET
      is_settled = TRUE,
      settled_amount = es.computed_amount,
      settled_at = NOW()
    FROM expenses e
    WHERE es.expense_id = e.id
      AND es.id = ANY(v_claimed_ids)
      AND e.paid_by_user_id = p_user_id
      AND es.is_settled = FALSE;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'claimed_count', COALESCE(v_claimed_count, 0),
    'email', v_email,
    'user_id', p_user_id
  );
END;
$$;

COMMENT ON FUNCTION claim_pending_email_splits(UUID, TEXT) IS
  'Claims all pending expense_splits that match the given email address.
   Converts pending_email splits to user_id-based splits.
   Called automatically when a new user registers via handle_new_user trigger.
   Not directly callable by authenticated users (trigger-only).';

-- No GRANT to authenticated — this function is trigger-only (called from handle_new_user)
-- Preventing direct calls avoids privilege escalation (any user claiming any email's splits)
REVOKE ALL ON FUNCTION claim_pending_email_splits(UUID, TEXT) FROM PUBLIC;

-- =============================================
-- 2. Update handle_new_user to call claim function
-- =============================================
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
  v_claim_result JSONB;
BEGIN
  -- Temporarily disable RLS for this operation
  SET LOCAL row_security = off;

  -- Check if profile with this email already exists (from production data pull)
  SELECT id, email INTO old_profile_id, old_email
  FROM public.profiles
  WHERE email = NEW.email
  FOR UPDATE;

  IF old_profile_id IS NOT NULL AND old_profile_id != NEW.id THEN
    -- Profile exists with different ID - migrate to new ID
    SELECT full_name, avatar_url, created_at
    INTO old_full_name, old_avatar_url, old_created_at
    FROM public.profiles
    WHERE id = old_profile_id;

    -- Temporarily change old profile email to avoid conflict
    temp_email := old_email || '.old.' || old_profile_id::text;
    UPDATE public.profiles SET email = temp_email WHERE id = old_profile_id;

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

    -- Update FK references
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

    -- Handle friendships with ordered_users constraint
    UPDATE friendships
    SET
      user_a = CASE
        WHEN user_a = old_profile_id THEN CASE WHEN NEW.id < user_b THEN NEW.id ELSE user_b END
        ELSE user_a
      END,
      user_b = CASE
        WHEN user_a = old_profile_id THEN CASE WHEN NEW.id < user_b THEN user_b ELSE NEW.id END
        ELSE NEW.id
      END,
      created_by = CASE WHEN created_by = old_profile_id THEN NEW.id ELSE created_by END
    WHERE user_a = old_profile_id OR user_b = old_profile_id;

    -- Delete old profile
    DELETE FROM public.profiles WHERE id = old_profile_id;
  ELSE
    -- No existing profile - insert new profile
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- ✅ NEW: Claim any pending email splits for this user's email
  -- This converts pending_email-based splits to user_id-based splits
  -- Must run AFTER profile creation so FK constraint (user_id → profiles.id) is satisfied
  -- Wrapped in exception handler: registration must succeed even if claim fails
  BEGIN
    v_claim_result := claim_pending_email_splits(NEW.id, NEW.email);

    IF (v_claim_result->>'claimed_count')::int > 0 THEN
      RAISE NOTICE 'Claimed % pending email split(s) for user % (%)',
        v_claim_result->>'claimed_count', NEW.id, NEW.email;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'claim_pending_email_splits failed for user % (%): %', NEW.id, NEW.email, SQLERRM;
    -- Do not re-raise; user registration must not be blocked by claim failure
  END;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION handle_new_user() IS
  'Handles new user creation. If profile with same email exists (from production data), migrates by updating all FK references and deleting old profile. Preserves all related data. Also claims any pending email-based expense splits for auto-sync.';

COMMIT;
