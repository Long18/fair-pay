-- Add a capability-oriented moderator tier without turning moderators into
-- broad mini-admins.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. System roles + reusable role helpers
-- ---------------------------------------------------------------------------

ALTER TABLE public.user_roles
  DROP CONSTRAINT IF EXISTS user_roles_role_check;

ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_role_check
  CHECK (role IN ('admin', 'moderator', 'user'));

CREATE OR REPLACE FUNCTION public.user_has_role(
  p_user_id UUID,
  p_role TEXT
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
STABLE
AS $fn$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = p_user_id
      AND ur.role = p_role
  );
END;
$fn$;

CREATE OR REPLACE FUNCTION public.has_role(p_role TEXT)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
STABLE
AS $fn$
BEGIN
  RETURN public.user_has_role(auth.uid(), p_role);
END;
$fn$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
STABLE
AS $fn$
BEGIN
  RETURN public.has_role('admin');
END;
$fn$;

CREATE OR REPLACE FUNCTION public.is_moderator()
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
STABLE
AS $fn$
BEGIN
  RETURN public.has_role('moderator');
END;
$fn$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
STABLE
AS $fn$
BEGIN
  RETURN public.is_admin() OR public.is_moderator();
END;
$fn$;

REVOKE ALL ON FUNCTION public.user_has_role(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_role(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_moderator() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_has_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_moderator() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;

COMMENT ON FUNCTION public.user_has_role(UUID, TEXT) IS
  'Security-definer helper for role checks against arbitrary users.';
COMMENT ON FUNCTION public.has_role(TEXT) IS
  'Returns whether the authenticated user has the requested system role.';
COMMENT ON FUNCTION public.is_moderator() IS
  'Returns whether the authenticated user has the moderator system role.';
COMMENT ON FUNCTION public.is_staff() IS
  'Returns whether the authenticated user is admin or moderator.';

-- ---------------------------------------------------------------------------
-- 2. Admin-managed role validators
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_update_user_role(
  p_user_id UUID,
  p_new_role TEXT
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $fn$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only administrators can change user roles';
  END IF;

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot change your own role';
  END IF;

  IF p_new_role NOT IN ('admin', 'moderator', 'user') THEN
    RAISE EXCEPTION 'Invalid role: must be admin, moderator, or user';
  END IF;

  INSERT INTO public.user_roles (user_id, role, created_at, updated_at)
  VALUES (p_user_id, p_new_role, NOW(), NOW())
  ON CONFLICT (user_id)
  DO UPDATE SET role = EXCLUDED.role, updated_at = NOW();

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'new_role', p_new_role
  );
END;
$fn$;

COMMENT ON FUNCTION public.admin_update_user_role(UUID, TEXT) IS
  'Admin-only: Update a user role (admin/moderator/user). SECURITY DEFINER to bypass user_roles RLS recursion.';

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

  IF v_role NOT IN ('admin', 'moderator', 'user') THEN
    RAISE EXCEPTION 'Invalid role: must be admin, moderator, or user';
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

COMMENT ON FUNCTION public.admin_create_profile(TEXT, TEXT, TEXT, TEXT) IS
  'Admin-only: create or update a display-only placeholder profile with admin/moderator/user role support.';

-- ---------------------------------------------------------------------------
-- 3. Moderator-safe People RPCs
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_moderator_users()
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
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Only staff can list users';
  END IF;

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
  ORDER BY p.created_at DESC;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.moderator_update_profile_basic(
  p_user_id UUID,
  p_full_name TEXT,
  p_avatar_url TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_full_name TEXT;
  v_avatar_url TEXT;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Only staff can update profile basics';
  END IF;

  v_full_name := NULLIF(BTRIM(p_full_name), '');
  v_avatar_url := NULLIF(BTRIM(p_avatar_url), '');

  IF v_full_name IS NULL THEN
    RAISE EXCEPTION 'Full name is required';
  END IF;

  RETURN QUERY
  UPDATE public.profiles p
  SET
    full_name = v_full_name,
    avatar_url = v_avatar_url,
    updated_at = NOW()
  WHERE p.id = p_user_id
  RETURNING p.id, p.full_name, p.avatar_url, p.updated_at;
END;
$fn$;

REVOKE ALL ON FUNCTION public.get_moderator_users() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.moderator_update_profile_basic(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_moderator_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.moderator_update_profile_basic(UUID, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION public.get_moderator_users() IS
  'Staff-safe user list without journey-tracking fields.';
COMMENT ON FUNCTION public.moderator_update_profile_basic(UUID, TEXT, TEXT) IS
  'Staff-safe limited profile update surface for full_name and avatar_url only.';

-- ---------------------------------------------------------------------------
-- 4. Sanitized overview access
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_total_users       BIGINT;
  v_total_groups      BIGINT;
  v_total_expenses    BIGINT;
  v_total_payments    BIGINT;
  v_active_7d         BIGINT;
  v_prev_users        BIGINT;
  v_prev_groups       BIGINT;
  v_prev_expenses     BIGINT;
  v_prev_payments     BIGINT;
  v_prev_active_7d    BIGINT;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Only staff can view admin stats';
  END IF;

  SELECT COUNT(*) INTO v_total_users FROM public.profiles;
  SELECT COUNT(*) INTO v_total_groups FROM public.groups;
  SELECT COUNT(*) INTO v_total_expenses FROM public.expenses;
  SELECT COUNT(*) INTO v_total_payments FROM public.payments;
  SELECT COUNT(DISTINCT paid_by_user_id) INTO v_active_7d
    FROM public.expenses WHERE created_at >= NOW() - INTERVAL '7 days';

  SELECT COUNT(*) INTO v_prev_users
    FROM public.profiles WHERE created_at < NOW() - INTERVAL '30 days';
  SELECT COUNT(*) INTO v_prev_groups
    FROM public.groups WHERE created_at < NOW() - INTERVAL '30 days';
  SELECT COUNT(*) INTO v_prev_expenses
    FROM public.expenses
    WHERE created_at >= NOW() - INTERVAL '60 days'
      AND created_at < NOW() - INTERVAL '30 days';
  SELECT COUNT(*) INTO v_prev_payments
    FROM public.payments
    WHERE created_at >= NOW() - INTERVAL '60 days'
      AND created_at < NOW() - INTERVAL '30 days';
  SELECT COUNT(DISTINCT paid_by_user_id) INTO v_prev_active_7d
    FROM public.expenses
    WHERE created_at >= NOW() - INTERVAL '14 days'
      AND created_at < NOW() - INTERVAL '7 days';

  RETURN jsonb_build_object(
    'total_users',      v_total_users,
    'total_groups',     v_total_groups,
    'total_expenses',   v_total_expenses,
    'total_payments',   v_total_payments,
    'active_users_7d',  v_active_7d,
    'prev_total_users', v_prev_users,
    'prev_total_groups', v_prev_groups,
    'prev_expenses_30d', v_prev_expenses,
    'prev_payments_30d', v_prev_payments,
    'prev_active_7d',   v_prev_active_7d,
    'curr_expenses_30d', (SELECT COUNT(*) FROM public.expenses WHERE created_at >= NOW() - INTERVAL '30 days'),
    'curr_payments_30d', (SELECT COUNT(*) FROM public.payments WHERE created_at >= NOW() - INTERVAL '30 days')
  );
END;
$fn$;

COMMENT ON FUNCTION public.get_admin_stats() IS
  'Returns aggregate statistics for the admin/staff overview. Staff only; tracking detail remains admin-only.';

-- ---------------------------------------------------------------------------
-- 5. Moderator-safe Groups visibility
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.group_hidden_from_moderator(p_group_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
STABLE
AS $fn$
DECLARE
  v_hidden BOOLEAN;
BEGIN
  SELECT COALESCE(g.is_archived, false)
         AND public.user_has_role(g.archived_by, 'admin')
  INTO v_hidden
  FROM public.groups g
  WHERE g.id = p_group_id;

  RETURN COALESCE(v_hidden, false);
END;
$fn$;

REVOKE ALL ON FUNCTION public.group_hidden_from_moderator(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.group_hidden_from_moderator(UUID) TO authenticated;

DROP POLICY IF EXISTS "Admins can view all groups" ON public.groups;
CREATE POLICY "Admins can view all groups"
  ON public.groups FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Moderators can view visible groups" ON public.groups;
CREATE POLICY "Moderators can view visible groups"
  ON public.groups FOR SELECT
  TO authenticated
  USING (public.is_moderator() AND NOT public.group_hidden_from_moderator(id));

DROP POLICY IF EXISTS "Moderators cannot view admin archived groups" ON public.groups;
CREATE POLICY "Moderators cannot view admin archived groups"
  ON public.groups AS RESTRICTIVE FOR SELECT
  TO authenticated
  USING (NOT public.is_moderator() OR NOT public.group_hidden_from_moderator(id));

DROP POLICY IF EXISTS "Admins can view all group members" ON public.group_members;
CREATE POLICY "Admins can view all group members"
  ON public.group_members FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Moderators can view visible group members" ON public.group_members;
CREATE POLICY "Moderators can view visible group members"
  ON public.group_members FOR SELECT
  TO authenticated
  USING (public.is_moderator() AND NOT public.group_hidden_from_moderator(group_id));

DROP POLICY IF EXISTS "Moderators cannot view members of admin archived groups" ON public.group_members;
CREATE POLICY "Moderators cannot view members of admin archived groups"
  ON public.group_members AS RESTRICTIVE FOR SELECT
  TO authenticated
  USING (NOT public.is_moderator() OR NOT public.group_hidden_from_moderator(group_id));

-- ---------------------------------------------------------------------------
-- 6. Moderator-safe Transactions
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Admins can view all expenses" ON public.expenses;
CREATE POLICY "Admins can view all expenses"
  ON public.expenses FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Moderators can view own expenses" ON public.expenses;
CREATE POLICY "Moderators can view own expenses"
  ON public.expenses FOR SELECT
  TO authenticated
  USING (public.is_moderator() AND created_by = auth.uid());

DROP POLICY IF EXISTS "Moderators can create own expenses" ON public.expenses;
CREATE POLICY "Moderators can create own expenses"
  ON public.expenses FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_moderator()
    AND created_by = auth.uid()
    AND (
      context_type <> 'group'
      OR NOT public.group_hidden_from_moderator(group_id)
    )
  );

DROP POLICY IF EXISTS "Expense creator can delete" ON public.expenses;
CREATE POLICY "Expense creator can delete"
  ON public.expenses FOR DELETE
  TO authenticated
  USING (
    public.is_admin()
    OR (created_by = auth.uid() AND NOT public.is_moderator())
  );

DROP POLICY IF EXISTS "Moderators cannot move expenses into admin archived groups" ON public.expenses;
CREATE POLICY "Moderators cannot move expenses into admin archived groups"
  ON public.expenses AS RESTRICTIVE FOR UPDATE
  TO authenticated
  USING (NOT public.is_moderator() OR created_by = auth.uid())
  WITH CHECK (
    NOT public.is_moderator()
    OR context_type <> 'group'
    OR NOT public.group_hidden_from_moderator(group_id)
  );

DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;
CREATE POLICY "Admins can view all payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Moderators can view own payments" ON public.payments;
CREATE POLICY "Moderators can view own payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (public.is_moderator() AND created_by = auth.uid());

DROP POLICY IF EXISTS "Staff can create own payments" ON public.payments;
CREATE POLICY "Staff can create own payments"
  ON public.payments FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_staff()
    AND created_by = auth.uid()
    AND (
      NOT public.is_moderator()
      OR context_type <> 'group'
      OR NOT public.group_hidden_from_moderator(group_id)
    )
  );

DROP POLICY IF EXISTS "Payment creator can update" ON public.payments;
CREATE POLICY "Payment creator can update"
  ON public.payments FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() OR public.is_admin())
  WITH CHECK (created_by = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Payment creator can delete" ON public.payments;
CREATE POLICY "Payment creator can delete"
  ON public.payments FOR DELETE
  TO authenticated
  USING (
    public.is_admin()
    OR (created_by = auth.uid() AND NOT public.is_moderator())
  );

DROP POLICY IF EXISTS "Moderators cannot move payments into admin archived groups" ON public.payments;
CREATE POLICY "Moderators cannot move payments into admin archived groups"
  ON public.payments AS RESTRICTIVE FOR UPDATE
  TO authenticated
  USING (NOT public.is_moderator() OR created_by = auth.uid())
  WITH CHECK (
    NOT public.is_moderator()
    OR context_type <> 'group'
    OR NOT public.group_hidden_from_moderator(group_id)
  );

-- ---------------------------------------------------------------------------
-- 7. Moderator-managed reaction catalog
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Admins can manage reaction types" ON public.reaction_types;
CREATE POLICY "Staff can manage reaction types"
  ON public.reaction_types FOR ALL
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- ---------------------------------------------------------------------------
-- 8. Moderator payout recipient resolution (Bank/VietQR only)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.resolve_expense_payout_user_id(p_expense_id UUID)
RETURNS UUID
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
STABLE
AS $fn$
DECLARE
  v_created_by UUID;
  v_paid_by UUID;
BEGIN
  SELECT e.created_by, e.paid_by_user_id
  INTO v_created_by, v_paid_by
  FROM public.expenses e
  WHERE e.id = p_expense_id;

  IF public.user_has_role(v_created_by, 'moderator') THEN
    RETURN v_created_by;
  END IF;

  RETURN v_paid_by;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.get_expense_payout_recipient(p_expense_id UUID)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  avatar_url TEXT,
  uses_moderator_payout BOOLEAN
)
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_expense RECORD;
  v_user_id UUID;
BEGIN
  SELECT e.*
  INTO v_expense
  FROM public.expenses e
  WHERE e.id = p_expense_id;

  IF v_expense.id IS NULL THEN
    RAISE EXCEPTION 'Expense not found';
  END IF;

  IF NOT (
    public.is_staff()
    OR (
      v_expense.context_type = 'group'
      AND EXISTS (
        SELECT 1
        FROM public.group_members gm
        WHERE gm.group_id = v_expense.group_id
          AND gm.user_id = auth.uid()
      )
    )
    OR (
      v_expense.context_type = 'friend'
      AND EXISTS (
        SELECT 1
        FROM public.friendships f
        WHERE f.id = v_expense.friendship_id
          AND (f.user_a = auth.uid() OR f.user_b = auth.uid())
          AND f.status = 'accepted'
      )
    )
  ) THEN
    RAISE EXCEPTION 'Not allowed to resolve payout recipient';
  END IF;

  v_user_id := public.resolve_expense_payout_user_id(p_expense_id);

  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.avatar_url,
    public.user_has_role(v_expense.created_by, 'moderator')
  FROM public.profiles p
  WHERE p.id = v_user_id;
END;
$fn$;

REVOKE ALL ON FUNCTION public.resolve_expense_payout_user_id(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_expense_payout_recipient(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_expense_payout_user_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_expense_payout_recipient(UUID) TO authenticated;

COMMENT ON FUNCTION public.resolve_expense_payout_user_id(UUID) IS
  'Returns moderator creator for moderator-created expenses, otherwise the original payer.';
COMMENT ON FUNCTION public.get_expense_payout_recipient(UUID) IS
  'Returns the Bank/VietQR payout recipient for an accessible expense.';

DROP POLICY IF EXISTS "Users can view payee settings in their expense splits" ON public.user_settings;
CREATE POLICY "Users can view payee settings in their expense splits"
  ON public.user_settings FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR user_id IN (
      SELECT public.resolve_expense_payout_user_id(e.id)
      FROM public.expenses e
      WHERE
        (
          e.paid_by_user_id = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM public.expense_splits es2
            WHERE es2.expense_id = e.id
              AND es2.user_id = auth.uid()
          )
        )
    )
  );

COMMIT;
