-- Harden get_login_account_status for option-1 merge (identity transfer):
-- 1. Read-only (no ban side effects on every auth check)
-- 2. Detect leftover JWTs for deleted source auth.users
-- 3. Detect sessions whose uid appears as merge source

BEGIN;

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
  v_auth_exists BOOLEAN := FALSE;
  v_merge_target UUID;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'reason', 'unauthenticated');
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_uid) THEN
    RETURN jsonb_build_object('ok', TRUE, 'has_profile', TRUE);
  END IF;

  SELECT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = v_uid)
  INTO v_auth_exists;

  -- Leftover access token after source auth.users was deleted in merge
  IF NOT v_auth_exists THEN
    SELECT pmt.target_user_id
    INTO v_merge_target
    FROM public.profile_merge_transactions pmt
    WHERE pmt.source_user_id = v_uid
    ORDER BY pmt.merged_at DESC
    LIMIT 1;

    IF v_merge_target IS NOT NULL THEN
      SELECT p.email INTO v_primary
      FROM public.profiles p
      WHERE p.id = v_merge_target;

      RETURN jsonb_build_object(
        'ok', FALSE,
        'reason', 'merged_into_other_account',
        'canonical_user_id', v_merge_target,
        'primary_email', v_primary
      );
    END IF;

    RETURN jsonb_build_object(
      'ok', FALSE,
      'reason', 'auth_user_missing',
      'has_profile', FALSE
    );
  END IF;

  SELECT lower(btrim(u.email))
  INTO v_email
  FROM auth.users u
  WHERE u.id = v_uid;

  IF v_email IS NULL OR v_email = '' THEN
    -- Live auth but no profile and no email — incomplete account, not a merge
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

  -- Read-only: do not ban here (merge path claims/transfers instead)
  RETURN jsonb_build_object(
    'ok', FALSE,
    'reason', 'merged_into_other_account',
    'canonical_user_id', v_owner,
    'primary_email', v_primary
  );
END;
$fn$;

COMMENT ON FUNCTION public.get_login_account_status() IS
  'Read-only session check: live profile, merged leftover JWT, or incomplete signup. No ban side effects.';

GRANT EXECUTE ON FUNCTION public.get_login_account_status() TO authenticated;

COMMIT;
