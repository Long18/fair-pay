-- People you may know: mutual-friend suggestions + dismissals

BEGIN;

CREATE TABLE IF NOT EXISTS public.friend_suggestion_dismissals (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  suggested_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dismissed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, suggested_user_id),
  CONSTRAINT friend_suggestion_dismissals_distinct
    CHECK (user_id <> suggested_user_id)
);

CREATE INDEX IF NOT EXISTS friend_suggestion_dismissals_user_idx
  ON public.friend_suggestion_dismissals (user_id);

ALTER TABLE public.friend_suggestion_dismissals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS friend_suggestion_dismissals_select_own
  ON public.friend_suggestion_dismissals;
CREATE POLICY friend_suggestion_dismissals_select_own
  ON public.friend_suggestion_dismissals
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS friend_suggestion_dismissals_insert_own
  ON public.friend_suggestion_dismissals;
CREATE POLICY friend_suggestion_dismissals_insert_own
  ON public.friend_suggestion_dismissals
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS friend_suggestion_dismissals_delete_own
  ON public.friend_suggestion_dismissals;
CREATE POLICY friend_suggestion_dismissals_delete_own
  ON public.friend_suggestion_dismissals
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

COMMENT ON TABLE public.friend_suggestion_dismissals IS
  'Users the current user has dismissed from people-you-may-know suggestions.';

CREATE OR REPLACE FUNCTION public.get_people_you_may_know(
  p_limit INT DEFAULT 20
)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  avatar_url TEXT,
  mutual_count INT
)
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
STABLE
AS $fn$
DECLARE
  v_uid UUID := auth.uid();
  v_limit INT := GREATEST(1, LEAST(COALESCE(p_limit, 20), 50));
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  WITH my_friends AS (
    SELECT CASE
      WHEN f.user_a = v_uid THEN f.user_b
      ELSE f.user_a
    END AS friend_id
    FROM public.friendships f
    WHERE f.status = 'accepted'
      AND (f.user_a = v_uid OR f.user_b = v_uid)
  ),
  already_connected AS (
    SELECT CASE
      WHEN f.user_a = v_uid THEN f.user_b
      ELSE f.user_a
    END AS other_id
    FROM public.friendships f
    WHERE f.user_a = v_uid OR f.user_b = v_uid
  ),
  candidates AS (
    SELECT
      CASE
        WHEN f.user_a = mf.friend_id THEN f.user_b
        ELSE f.user_a
      END AS candidate_id,
      COUNT(DISTINCT mf.friend_id)::INT AS mutual_count
    FROM public.friendships f
    JOIN my_friends mf
      ON f.user_a = mf.friend_id OR f.user_b = mf.friend_id
    WHERE f.status = 'accepted'
    GROUP BY 1
  )
  SELECT
    p.id AS user_id,
    p.full_name,
    p.avatar_url,
    c.mutual_count
  FROM candidates c
  JOIN public.profiles p ON p.id = c.candidate_id
  WHERE c.candidate_id <> v_uid
    AND c.candidate_id NOT IN (SELECT ac.other_id FROM already_connected ac)
    AND NOT EXISTS (
      SELECT 1
      FROM public.friend_suggestion_dismissals d
      WHERE d.user_id = v_uid
        AND d.suggested_user_id = c.candidate_id
    )
  ORDER BY c.mutual_count DESC, p.full_name ASC
  LIMIT v_limit;
END;
$fn$;

REVOKE ALL ON FUNCTION public.get_people_you_may_know(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_people_you_may_know(INT) TO authenticated;

COMMENT ON FUNCTION public.get_people_you_may_know(INT) IS
  'Returns friends-of-friends ranked by mutual accepted friend count, excluding existing connections and dismissals.';

COMMIT;
