-- ========================================
-- Admin friendships RLS + auto-create on group join
-- ========================================
-- Problem:
-- 1. Admin People UI inserts accepted friendships for other users after
--    creating a profile / linking friends. INSERT RLS only allowed
--    (user_a|user_b = auth.uid()) AND status = 'pending', so admin
--    inserts returned 403.
-- 2. UPDATE/DELETE already allow is_admin(); SELECT/INSERT did not.
-- 3. auto_create_friendships_from_group lived in baseline.sql only and
--    was never applied on production, so joining a group did not create
--    accepted friendships between members.
--
-- Fix:
-- - Allow admins to SELECT/INSERT friendships (parity with UPDATE/DELETE).
-- - Install SECURITY DEFINER trigger that auto-accepts friendships when
--   a user is added to a group.

-- ---------------------------------------------------------------------------
-- 1. Admin RLS for friendships
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view all friendships" ON public.friendships;
CREATE POLICY "Admins can view all friendships"
  ON public.friendships
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can create friendships" ON public.friendships;
CREATE POLICY "Admins can create friendships"
  ON public.friendships
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- 2. Auto-create accepted friendships when a member joins a group
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auto_create_friendships_from_group()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  v_member RECORD;
  v_user_a UUID;
  v_user_b UUID;
BEGIN
  FOR v_member IN
    SELECT user_id
    FROM public.group_members
    WHERE group_id = NEW.group_id AND user_id != NEW.user_id
  LOOP
    v_user_a := LEAST(NEW.user_id, v_member.user_id);
    v_user_b := GREATEST(NEW.user_id, v_member.user_id);

    IF NOT EXISTS (
      SELECT 1
      FROM public.friendships
      WHERE user_a = v_user_a AND user_b = v_user_b
    ) THEN
      INSERT INTO public.friendships (user_a, user_b, status, created_by)
      VALUES (v_user_a, v_user_b, 'accepted', NEW.user_id);
    ELSE
      UPDATE public.friendships
      SET status = 'accepted', updated_at = NOW()
      WHERE user_a = v_user_a
        AND user_b = v_user_b
        AND status != 'accepted';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_create_friendships ON public.group_members;
CREATE TRIGGER trigger_auto_create_friendships
  AFTER INSERT ON public.group_members
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_friendships_from_group();

COMMENT ON FUNCTION public.auto_create_friendships_from_group() IS
  'Automatically creates accepted friendships between users when they join the same group. Maintains user_a < user_b constraint and upgrades existing non-accepted friendships.';

REVOKE ALL ON FUNCTION public.auto_create_friendships_from_group() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auto_create_friendships_from_group() TO authenticated;
