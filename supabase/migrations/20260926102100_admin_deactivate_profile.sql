-- Deactivated profiles: keep identity, friendships, and group membership;
-- purge transactional / activity data to reduce storage.

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deactivated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.profiles.deactivated_at IS
  'When set, the profile is archived: login blocked and activity data purged; friendships and group membership remain.';

COMMENT ON COLUMN public.profiles.deactivated_by IS
  'Admin who deactivated this profile (if via admin_deactivate_profile).';

CREATE INDEX IF NOT EXISTS idx_profiles_deactivated_at
  ON public.profiles (deactivated_at)
  WHERE deactivated_at IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Purge helper (admin-only caller)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.purge_profile_activity_data(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $fn$
DECLARE
  v_expense_ids UUID[];
  v_counts JSONB := '{}'::JSONB;
  v_n BIGINT;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required';
  END IF;

  SET LOCAL row_security = off;

  SELECT COALESCE(array_agg(DISTINCT e.id), '{}'::UUID[])
  INTO v_expense_ids
  FROM public.expenses e
  WHERE e.paid_by_user_id = p_user_id
     OR e.created_by = p_user_id
     OR EXISTS (
       SELECT 1
       FROM public.expense_splits es
       WHERE es.expense_id = e.id
         AND es.user_id = p_user_id
     )
     OR (
       e.context_type = 'friend'
       AND e.friendship_id IN (
         SELECT f.id
         FROM public.friendships f
         WHERE f.user_a = p_user_id
            OR f.user_b = p_user_id
       )
     );

  -- AI chat
  DELETE FROM public.ai_chat_conversations WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('ai_chat_conversations', v_n);

  -- Journey / tracking
  DELETE FROM public.user_tracking_events WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('user_tracking_events', v_n);

  DELETE FROM public.user_tracking_sessions s
  WHERE s.user_id = p_user_id
    AND NOT EXISTS (
      SELECT 1 FROM public.user_tracking_events e WHERE e.session_id = s.id
    );
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('user_tracking_sessions', v_n);

  -- Notifications & attribution
  DELETE FROM public.notifications WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('notifications', v_n);

  DELETE FROM public.user_attributions WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('user_attributions', v_n);

  DELETE FROM public.friend_suggestion_dismissals WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('friend_suggestion_dismissals', v_n);

  DELETE FROM public.group_join_requests
  WHERE user_id = p_user_id OR reviewed_by = p_user_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('group_join_requests', v_n);

  DELETE FROM public.api_secrets WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('api_secrets', v_n);

  DELETE FROM public.balance_history WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('balance_history', v_n);

  DELETE FROM public.member_prepaid_balances WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('member_prepaid_balances', v_n);

  DELETE FROM public.prepaid_consumption_log WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('prepaid_consumption_log', v_n);

  DELETE FROM public.recurring_prepaid_payments
  WHERE created_by = p_user_id
     OR paid_by_user_id = p_user_id
     OR user_id = p_user_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('recurring_prepaid_payments', v_n);

  DELETE FROM public.momo_payment_requests WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('momo_payment_requests', v_n);

  DELETE FROM public.sepay_payment_orders
  WHERE payer_user_id = p_user_id OR payee_user_id = p_user_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('sepay_payment_orders', v_n);

  -- Payment ledger (before expenses)
  DELETE FROM public.payment_events
  WHERE actor_user_id = p_user_id
     OR from_user_id = p_user_id
     OR to_user_id = p_user_id
     OR (array_length(v_expense_ids, 1) > 0 AND expense_id = ANY (v_expense_ids));
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('payment_events', v_n);

  DELETE FROM public.payments
  WHERE from_user = p_user_id
     OR to_user = p_user_id
     OR created_by = p_user_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('payments', v_n);

  -- expense_reactions use target_type/target_id (see fix migration if this block errors)
  IF COALESCE(array_length(v_expense_ids, 1), 0) > 0 THEN
    DELETE FROM public.expense_reactions er
    WHERE er.user_id = p_user_id
       OR (er.target_type = 'expense' AND er.target_id = ANY (v_expense_ids))
       OR (
         er.target_type = 'comment'
         AND er.target_id IN (
           SELECT ec.id FROM public.expense_comments ec
           WHERE ec.user_id = p_user_id OR ec.expense_id = ANY (v_expense_ids)
         )
       );

    DELETE FROM public.comment_mentions cm
    WHERE cm.mentioned_user_id = p_user_id
       OR cm.comment_id IN (
         SELECT ec.id FROM public.expense_comments ec
         WHERE ec.user_id = p_user_id OR ec.expense_id = ANY (v_expense_ids)
       );

    DELETE FROM public.attachments
    WHERE uploaded_by = p_user_id
       OR expense_id = ANY (v_expense_ids);

    DELETE FROM public.expense_comments
    WHERE user_id = p_user_id
       OR expense_id = ANY (v_expense_ids);

    DELETE FROM public.expense_splits WHERE expense_id = ANY (v_expense_ids);
    DELETE FROM public.expenses WHERE id = ANY (v_expense_ids);
    GET DIAGNOSTICS v_n = ROW_COUNT;
    v_counts := v_counts || jsonb_build_object('expenses', v_n);
  ELSE
    DELETE FROM public.expense_reactions WHERE user_id = p_user_id;
    DELETE FROM public.comment_mentions WHERE mentioned_user_id = p_user_id;
    DELETE FROM public.expense_comments WHERE user_id = p_user_id;
    v_counts := v_counts || jsonb_build_object('expenses', 0);
  END IF;

  DELETE FROM public.audit_logs WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('audit_logs', v_n);

  DELETE FROM public.audit_trail WHERE actor = p_user_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('audit_trail', v_n);

  RETURN v_counts;
END;
$fn$;

COMMENT ON FUNCTION public.purge_profile_activity_data(UUID) IS
  'Deletes transactional and activity data for a user. Keeps profile, user_emails, friendships, group_members. Admin-only via wrapper RPCs.';

REVOKE ALL ON FUNCTION public.purge_profile_activity_data(UUID) FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- Deactivate / reactivate
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_deactivate_profile(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $fn$
DECLARE
  v_actor UUID := auth.uid();
  v_purge JSONB;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only administrators can deactivate profiles';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required';
  END IF;

  IF v_actor IS NOT NULL AND v_actor = p_user_id THEN
    RAISE EXCEPTION 'You cannot deactivate your own account';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = p_user_id) THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = p_user_id AND p.deactivated_at IS NOT NULL
  ) THEN
    RETURN jsonb_build_object(
      'success', TRUE,
      'noop', TRUE,
      'user_id', p_user_id,
      'deactivated_at', (SELECT p.deactivated_at FROM public.profiles p WHERE p.id = p_user_id)
    );
  END IF;

  SET LOCAL row_security = off;

  v_purge := public.purge_profile_activity_data(p_user_id);

  UPDATE public.profiles
  SET
    deactivated_at = NOW(),
    deactivated_by = v_actor,
    updated_at = NOW()
  WHERE id = p_user_id;

  UPDATE auth.users u
  SET
    banned_until = TIMESTAMPTZ '9999-12-31 23:59:59+00',
    updated_at = NOW()
  WHERE u.id = p_user_id
    AND (u.banned_until IS NULL OR u.banned_until < NOW());

  RETURN jsonb_build_object(
    'success', TRUE,
    'user_id', p_user_id,
    'purged', v_purge
  );
END;
$fn$;

CREATE OR REPLACE FUNCTION public.admin_reactivate_profile(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $fn$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only administrators can reactivate profiles';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = p_user_id) THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  SET LOCAL row_security = off;

  UPDATE public.profiles
  SET
    deactivated_at = NULL,
    deactivated_by = NULL,
    updated_at = NOW()
  WHERE id = p_user_id;

  UPDATE auth.users u
  SET
    banned_until = NULL,
    updated_at = NOW()
  WHERE u.id = p_user_id
    AND u.banned_until = TIMESTAMPTZ '9999-12-31 23:59:59+00';

  RETURN jsonb_build_object('success', TRUE, 'user_id', p_user_id);
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.admin_deactivate_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reactivate_profile(UUID) TO authenticated;

COMMENT ON FUNCTION public.admin_deactivate_profile(UUID) IS
  'Archive a profile: purge expenses/payments/notifications/tracking, keep friendships and group membership, block auth login.';

COMMENT ON FUNCTION public.admin_reactivate_profile(UUID) IS
  'Clear deactivated_at and lift deactivation auth ban. Does not restore purged data.';

-- ---------------------------------------------------------------------------
-- get_admin_users: expose deactivated_at
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.get_admin_users();

CREATE FUNCTION public.get_admin_users()
RETURNS TABLE (
  id                       UUID,
  full_name                TEXT,
  email                    TEXT,
  emails                   JSONB,
  avatar_url               TEXT,
  role                     TEXT,
  created_at               TIMESTAMPTZ,
  journey_tracking_ignored BOOLEAN,
  has_auth_account         BOOLEAN,
  deactivated_at           TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public, auth, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can list users';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.email,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id',                    ue.id,
            'email',                 ue.email,
            'is_primary',            ue.is_primary,
            'receives_notifications', ue.receives_notifications,
            'is_verified',           ue.is_verified,
            'source',                ue.source
          )
          ORDER BY ue.is_primary DESC, ue.created_at ASC
        )
        FROM public.user_emails ue
        WHERE ue.user_id = p.id
      ),
      '[]'::JSONB
    ) AS emails,
    p.avatar_url,
    COALESCE(ur.role, 'user') AS role,
    p.created_at,
    (utiu.user_id IS NOT NULL)   AS journey_tracking_ignored,
    (u.id IS NOT NULL)           AS has_auth_account,
    p.deactivated_at
  FROM public.profiles p
  LEFT JOIN public.user_roles ur ON ur.user_id = p.id
  LEFT JOIN public.user_tracking_ignored_users utiu ON utiu.user_id = p.id
  LEFT JOIN auth.users u ON u.id = p.id
  ORDER BY p.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_users() TO authenticated;

-- ---------------------------------------------------------------------------
-- Login guard for deactivated accounts
-- ---------------------------------------------------------------------------

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
  v_deactivated_at TIMESTAMPTZ;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'reason', 'unauthenticated');
  END IF;

  SELECT p.deactivated_at
  INTO v_deactivated_at
  FROM public.profiles p
  WHERE p.id = v_uid;

  IF v_deactivated_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'ok', FALSE,
      'reason', 'account_deactivated',
      'has_profile', TRUE,
      'deactivated_at', v_deactivated_at
    );
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_uid) THEN
    RETURN jsonb_build_object('ok', TRUE, 'has_profile', TRUE);
  END IF;

  SELECT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = v_uid)
  INTO v_auth_exists;

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

  RETURN jsonb_build_object(
    'ok', FALSE,
    'reason', 'merged_into_other_account',
    'canonical_user_id', v_owner,
    'primary_email', v_primary
  );
END;
$fn$;

COMMENT ON FUNCTION public.get_login_account_status() IS
  'Read-only session check: live profile, deactivated account, merged leftover JWT, or incomplete signup.';

GRANT EXECUTE ON FUNCTION public.get_login_account_status() TO authenticated;

COMMIT;
