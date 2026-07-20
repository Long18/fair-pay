-- Fix GoTrue login server_error after profile merge bans.
--
-- Root cause: merge RPCs set auth.users.banned_until = 'infinity'.
-- GoTrue scans banned_until into *time.Time; Postgres infinity arrives as
-- string "infinity" and fails with:
--   sql: Scan error on column index 1, name "banned_until": unsupported Scan,
--   storing driver.Value type string into type *time.Time
--
-- Fix: use a finite far-future timestamptz GoTrue can scan, repair existing
-- infinity rows, and rewrite ban helpers / login status check.
-- admin_merge_profiles is updated in the follow-up migration.

BEGIN;

-- Repair existing bad bans (immediate login fix for already-merged accounts)
UPDATE auth.users
SET banned_until = TIMESTAMPTZ '9999-12-31 23:59:59+00',
    updated_at = NOW()
WHERE banned_until = 'infinity'
   OR banned_until = '-infinity';

CREATE OR REPLACE FUNCTION public.ban_auth_users_for_emails(
  p_emails TEXT[],
  p_except_user_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $fn$
DECLARE
  v_norm TEXT[];
  v_count INT := 0;
BEGIN
  SELECT COALESCE(array_agg(DISTINCT lower(btrim(e))), '{}')
  INTO v_norm
  FROM unnest(COALESCE(p_emails, '{}'::text[])) AS e
  WHERE nullif(btrim(e), '') IS NOT NULL;

  IF COALESCE(array_length(v_norm, 1), 0) = 0 THEN
    RETURN 0;
  END IF;

  UPDATE auth.users u
  SET banned_until = TIMESTAMPTZ '9999-12-31 23:59:59+00',
      updated_at = NOW()
  WHERE (p_except_user_id IS NULL OR u.id IS DISTINCT FROM p_except_user_id)
    AND (u.banned_until IS NULL OR u.banned_until < NOW())
    AND (
      lower(u.email) = ANY (v_norm)
      OR EXISTS (
        SELECT 1
        FROM auth.identities i
        WHERE i.user_id = u.id
          AND lower(COALESCE(i.identity_data->>'email', '')) = ANY (v_norm)
      )
    );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$fn$;

COMMENT ON FUNCTION public.ban_auth_users_for_emails(TEXT[], UUID) IS
  'Ban auth.users whose email or identity email is in p_emails, except p_except_user_id. Uses finite far-future banned_until (GoTrue cannot scan Postgres infinity).';

REVOKE ALL ON FUNCTION public.ban_auth_users_for_emails(TEXT[], UUID)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_login_account_status()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $fn$
DECLARE
  v_uid UUID := auth.uid();
  v_email TEXT;
  v_owner UUID;
  v_primary TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'reason', 'unauthenticated');
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_uid) THEN
    RETURN jsonb_build_object('ok', TRUE, 'has_profile', TRUE);
  END IF;

  SELECT lower(btrim(u.email))
  INTO v_email
  FROM auth.users u
  WHERE u.id = v_uid;

  IF v_email IS NULL OR v_email = '' THEN
    RETURN jsonb_build_object('ok', TRUE, 'has_profile', FALSE);
  END IF;

  SELECT ue.user_id
  INTO v_owner
  FROM public.user_emails ue
  WHERE ue.normalized_email = v_email
  LIMIT 1;

  IF v_owner IS NULL OR v_owner = v_uid THEN
    RETURN jsonb_build_object('ok', TRUE, 'has_profile', FALSE);
  END IF;

  SELECT p.email
  INTO v_primary
  FROM public.profiles p
  WHERE p.id = v_owner;

  UPDATE auth.users
  SET banned_until = TIMESTAMPTZ '9999-12-31 23:59:59+00',
      updated_at = NOW()
  WHERE id = v_uid
    AND (banned_until IS NULL OR banned_until < NOW());

  RETURN jsonb_build_object(
    'ok', FALSE,
    'reason', 'merged_into_other_account',
    'canonical_user_id', v_owner,
    'primary_email', v_primary
  );
END;
$fn$;

COMMENT ON FUNCTION public.get_login_account_status() IS
  'Returns whether the current auth session maps to a live profile, or was merged into another account.';

GRANT EXECUTE ON FUNCTION public.get_login_account_status() TO authenticated;

COMMIT;
