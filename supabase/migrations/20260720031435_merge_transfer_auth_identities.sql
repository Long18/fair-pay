-- Option 1: after profile merge, secondary Google/email must authenticate as
-- the canonical target auth.users row — not as a banned orphan.
--
-- Approach: move auth.identities from source/orphan auth users onto the
-- target, then delete those auth users (profile already remapped/deleted).
-- GoTrue has no admin "remap session" API; JWT sub must be the target id.
--
-- Never use Postgres infinity for banned_until (GoTrue *time.Time scan).

BEGIN;

-- ─────────────────────────────────────────────────────────────────────
-- Transfer all identities from one auth user onto another, then delete
-- the source auth user. Safe when source profile is already gone.
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.transfer_auth_identities_to_user(
  p_from_user_id UUID,
  p_to_user_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $fn$
DECLARE
  v_moved INT := 0;
  r RECORD;
BEGIN
  IF p_from_user_id IS NULL
     OR p_to_user_id IS NULL
     OR p_from_user_id = p_to_user_id THEN
    RETURN 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p_to_user_id) THEN
    RAISE EXCEPTION 'Target auth user % not found', p_to_user_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p_from_user_id) THEN
    RETURN 0;
  END IF;

  -- Refuse to delete an auth user that still owns a live profile (wrong call order)
  IF EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = p_from_user_id) THEN
    RAISE EXCEPTION
      'Refusing to transfer/delete auth % while profiles row still exists',
      p_from_user_id;
  END IF;

  FOR r IN
    SELECT i.id, i.provider, i.provider_id
    FROM auth.identities i
    WHERE i.user_id = p_from_user_id
  LOOP
    IF EXISTS (
      SELECT 1
      FROM auth.identities i2
      WHERE i2.user_id = p_to_user_id
        AND i2.provider = r.provider
        AND i2.provider_id = r.provider_id
    ) THEN
      DELETE FROM auth.identities WHERE id = r.id;
    ELSE
      UPDATE auth.identities
      SET user_id = p_to_user_id,
          updated_at = NOW()
      WHERE id = r.id;
      v_moved := v_moved + 1;
    END IF;
  END LOOP;

  DELETE FROM auth.sessions WHERE user_id = p_from_user_id;
  DELETE FROM auth.refresh_tokens WHERE user_id = p_from_user_id::text;
  DELETE FROM auth.mfa_factors WHERE user_id = p_from_user_id;
  DELETE FROM auth.one_time_tokens WHERE user_id = p_from_user_id;

  -- Free unique email before delete
  UPDATE auth.users
  SET
    email = lower(COALESCE(nullif(btrim(email), ''), 'unknown'))
            || '.merged.' || id::text,
    updated_at = NOW()
  WHERE id = p_from_user_id;

  DELETE FROM auth.users WHERE id = p_from_user_id;

  RETURN v_moved;
END;
$fn$;

COMMENT ON FUNCTION public.transfer_auth_identities_to_user(UUID, UUID) IS
  'Move auth.identities from p_from onto p_to, then delete p_from auth user. Source profile must already be gone. Used by merge so secondary Google signs in as canonical user.';

REVOKE ALL ON FUNCTION public.transfer_auth_identities_to_user(UUID, UUID)
  FROM PUBLIC, anon, authenticated;

-- Claim every auth user matching emails (except target) onto target.
CREATE OR REPLACE FUNCTION public.claim_auth_users_for_emails(
  p_emails TEXT[],
  p_except_user_id UUID,
  p_target_user_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $fn$
DECLARE
  v_norm TEXT[];
  v_uid UUID;
  v_total INT := 0;
BEGIN
  IF p_target_user_id IS NULL THEN
    RAISE EXCEPTION 'p_target_user_id is required';
  END IF;

  SELECT COALESCE(array_agg(DISTINCT lower(btrim(e))), '{}')
  INTO v_norm
  FROM unnest(COALESCE(p_emails, '{}'::text[])) AS e
  WHERE nullif(btrim(e), '') IS NOT NULL;

  IF COALESCE(array_length(v_norm, 1), 0) = 0 THEN
    RETURN 0;
  END IF;

  FOR v_uid IN
    SELECT DISTINCT u.id
    FROM auth.users u
    WHERE u.id IS DISTINCT FROM p_target_user_id
      AND (p_except_user_id IS NULL OR u.id IS DISTINCT FROM p_except_user_id)
      AND (
        lower(u.email) = ANY (v_norm)
        OR EXISTS (
          SELECT 1
          FROM auth.identities i
          WHERE i.user_id = u.id
            AND lower(COALESCE(i.email, i.identity_data->>'email', '')) = ANY (v_norm)
        )
      )
  LOOP
    -- Skip if this auth uid still has a different live profile (should not happen post-merge)
    IF EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = v_uid AND p.id IS DISTINCT FROM p_target_user_id
    ) THEN
      CONTINUE;
    END IF;

    v_total := v_total + public.transfer_auth_identities_to_user(v_uid, p_target_user_id);
  END LOOP;

  RETURN v_total;
END;
$fn$;

COMMENT ON FUNCTION public.claim_auth_users_for_emails(TEXT[], UUID, UUID) IS
  'Transfer+delete auth users whose email/identity matches p_emails onto p_target_user_id (except listed ids). Replaces ban-on-merge for option-1 login.';

REVOKE ALL ON FUNCTION public.claim_auth_users_for_emails(TEXT[], UUID, UUID)
  FROM PUBLIC, anon, authenticated;

-- Keep ban helper for emergency leftovers, but document it is not the merge happy path.
COMMENT ON FUNCTION public.ban_auth_users_for_emails(TEXT[], UUID) IS
  'Legacy emergency ban. Prefer claim_auth_users_for_emails / transfer_auth_identities_to_user so secondary emails land on the canonical account.';

COMMIT;
