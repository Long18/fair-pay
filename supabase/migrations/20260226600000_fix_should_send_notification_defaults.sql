-- =============================================
-- Fix should_send_notification() for normal users
--
-- Root Cause:
-- 1. Users without a user_settings row get COALESCE(NULL, FALSE) = FALSE
--    → All notifications silently blocked for users who never visited settings
-- 2. email_notifications toggle gates ALL notifications (including in-app/realtime)
--    → Should only affect email delivery, not in-app notifications
--
-- Fix:
-- 1. Default to TRUE when no user_settings row exists
-- 2. Remove email_notifications gate from in-app notification check
-- 3. Auto-create user_settings row in handle_new_user()
-- =============================================

-- ============================================================
-- 1. Fix should_send_notification to default TRUE for missing rows
-- ============================================================
CREATE OR REPLACE FUNCTION "public"."should_send_notification"("p_user_id" "uuid", "p_notification_type" "text")
RETURNS boolean
LANGUAGE "plpgsql"
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_settings RECORD;
BEGIN
  SELECT
    notifications_enabled,
    notify_on_expense_added,
    notify_on_payment_received,
    notify_on_friend_request,
    notify_on_group_invite
  INTO v_settings
  FROM user_settings
  WHERE user_id = p_user_id;

  -- No settings row → user never configured preferences → default to TRUE
  IF NOT FOUND THEN
    RETURN TRUE;
  END IF;

  -- Master toggle off → block all
  IF NOT COALESCE(v_settings.notifications_enabled, TRUE) THEN
    RETURN FALSE;
  END IF;

  -- Check per-type preference (default TRUE if column is NULL)
  RETURN CASE
    WHEN p_notification_type = 'expense_added' THEN COALESCE(v_settings.notify_on_expense_added, TRUE)
    WHEN p_notification_type = 'payment_received' THEN COALESCE(v_settings.notify_on_payment_received, TRUE)
    WHEN p_notification_type = 'friend_request' THEN COALESCE(v_settings.notify_on_friend_request, TRUE)
    WHEN p_notification_type = 'group_invite' THEN COALESCE(v_settings.notify_on_group_invite, TRUE)
    ELSE TRUE
  END;
END;
$fn$;

ALTER FUNCTION "public"."should_send_notification"("p_user_id" "uuid", "p_notification_type" "text") OWNER TO "postgres";

COMMENT ON FUNCTION "public"."should_send_notification"("p_user_id" "uuid", "p_notification_type" "text")
IS 'Check if user should receive an in-app notification based on their preferences. Returns TRUE by default if user has no settings row. email_notifications toggle is NOT checked here (only affects email delivery).';

GRANT ALL ON FUNCTION "public"."should_send_notification"("p_user_id" "uuid", "p_notification_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."should_send_notification"("p_user_id" "uuid", "p_notification_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."should_send_notification"("p_user_id" "uuid", "p_notification_type" "text") TO "service_role";


-- ============================================================
-- 2. Fix log_table_changes() to handle tables without 'id' column
--    user_settings uses 'user_id' as PK, causing NEW.id to crash
-- ============================================================
CREATE OR REPLACE FUNCTION log_table_changes()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_user_id UUID;
  v_old JSONB;
  v_new JSONB;
  v_record_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD);
    v_new := NULL;
    -- Try 'id' first, fall back to 'user_id' for tables like user_settings
    v_record_id := COALESCE(
      (v_old->>'id')::UUID,
      (v_old->>'user_id')::UUID
    );
  ELSIF TG_OP = 'INSERT' THEN
    v_old := NULL;
    v_new := to_jsonb(NEW);
    v_record_id := COALESCE(
      (v_new->>'id')::UUID,
      (v_new->>'user_id')::UUID
    );
  ELSIF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_record_id := COALESCE(
      (v_new->>'id')::UUID,
      (v_new->>'user_id')::UUID
    );
  END IF;

  INSERT INTO audit_logs (table_name, record_id, operation, old_data, new_data, user_id, created_at)
  VALUES (TG_TABLE_NAME, v_record_id, TG_OP, v_old, v_new, v_user_id, NOW());

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$fn$;

-- ============================================================
-- 3. Update handle_new_user to auto-create user_settings row
--    so new users have explicit defaults from the start
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $fn$
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

  -- Auto-create user_settings with defaults so notifications work immediately
  INSERT INTO user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Claim any pending email splits for this user's email
  BEGIN
    v_claim_result := claim_pending_email_splits(NEW.id, NEW.email);

    IF (v_claim_result->>'claimed_count')::int > 0 THEN
      RAISE NOTICE 'Claimed % pending email split(s) for user % (%)',
        v_claim_result->>'claimed_count', NEW.id, NEW.email;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'claim_pending_email_splits failed for user % (%): %', NEW.id, NEW.email, SQLERRM;
  END;

  RETURN NEW;
END;
$fn$;

COMMENT ON FUNCTION handle_new_user() IS
  'Handles new user creation. Migrates existing profiles if email matches. Creates default user_settings row. Claims pending email splits.';

-- ============================================================
-- 4. Backfill: create user_settings for existing users who lack one
--    This fixes notifications for all current users immediately
-- ============================================================
INSERT INTO user_settings (user_id)
SELECT p.id
FROM profiles p
LEFT JOIN user_settings us ON us.user_id = p.id
WHERE us.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;
