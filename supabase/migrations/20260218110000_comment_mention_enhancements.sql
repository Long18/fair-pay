-- Migration: Comment @mention enhancements + Audit triggers + Admin reaction management
-- Date: 2026-02-18
-- Purpose: Add @all/@here mention support, audit logging for comment/reaction tables

-- ============================================================
-- 1. AUDIT TRIGGERS for comment & reaction tables
-- ============================================================

DROP TRIGGER IF EXISTS audit_expense_comments ON expense_comments;
CREATE TRIGGER audit_expense_comments
  AFTER INSERT OR UPDATE OR DELETE ON expense_comments
  FOR EACH ROW EXECUTE FUNCTION create_audit_log();

DROP TRIGGER IF EXISTS audit_expense_reactions ON expense_reactions;
CREATE TRIGGER audit_expense_reactions
  AFTER INSERT OR UPDATE OR DELETE ON expense_reactions
  FOR EACH ROW EXECUTE FUNCTION create_audit_log();

DROP TRIGGER IF EXISTS audit_comment_mentions ON comment_mentions;
CREATE TRIGGER audit_comment_mentions
  AFTER INSERT OR UPDATE OR DELETE ON comment_mentions
  FOR EACH ROW EXECUTE FUNCTION create_audit_log();

DROP TRIGGER IF EXISTS audit_reaction_types ON reaction_types;
CREATE TRIGGER audit_reaction_types
  AFTER INSERT OR UPDATE OR DELETE ON reaction_types
  FOR EACH ROW EXECUTE FUNCTION create_audit_log();

-- ============================================================
-- 2. UPDATE add_expense_comment to support @all / @here
--    Sentinel UUIDs:
--    - '00000000-0000-0000-0000-000000000001' = @all (all expense participants)
--    - '00000000-0000-0000-0000-000000000002' = @here (all commenters)
-- ============================================================

DROP FUNCTION IF EXISTS add_expense_comment(UUID, TEXT, UUID, UUID[]);
CREATE OR REPLACE FUNCTION add_expense_comment(
  p_expense_id UUID,
  p_content TEXT,
  p_parent_id UUID DEFAULT NULL,
  p_mentioned_user_ids UUID[] DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_comment_id UUID;
  v_user_id UUID := auth.uid();
  v_expense RECORD;
  v_result JSONB;
  v_resolved_ids UUID[];
  v_all_sentinel UUID := '00000000-0000-0000-0000-000000000001';
  v_here_sentinel UUID := '00000000-0000-0000-0000-000000000002';
  v_has_all BOOLEAN := false;
  v_has_here BOOLEAN := false;
  v_participant_ids UUID[];
  v_commenter_ids UUID[];
BEGIN
  -- Verify caller is participant
  SELECT e.id, e.description, e.context_type, e.group_id, e.friendship_id
  INTO v_expense
  FROM expenses e
  LEFT JOIN group_members gm ON e.context_type = 'group' AND e.group_id = gm.group_id AND gm.user_id = v_user_id
  LEFT JOIN friendships f ON e.context_type = 'friend' AND e.friendship_id = f.id AND (f.user_a = v_user_id OR f.user_b = v_user_id)
  WHERE e.id = p_expense_id AND (gm.id IS NOT NULL OR f.id IS NOT NULL);

  IF v_expense.id IS NULL AND NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized to comment on this expense';
  END IF;

  -- Enforce 1-level threading
  IF p_parent_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM expense_comments WHERE id = p_parent_id AND parent_id IS NOT NULL) THEN
      RAISE EXCEPTION 'Cannot reply to a reply. Only 1-level threading is supported.';
    END IF;
  END IF;

  -- Check for sentinel UUIDs
  v_has_all := v_all_sentinel = ANY(p_mentioned_user_ids);
  v_has_here := v_here_sentinel = ANY(p_mentioned_user_ids);

  -- Resolve @all → all expense participants (payer + split users)
  IF v_has_all THEN
    SELECT ARRAY(
      SELECT DISTINCT uid FROM (
        SELECT e.paid_by AS uid FROM expenses e WHERE e.id = p_expense_id
        UNION
        SELECT es.user_id AS uid FROM expense_splits es WHERE es.expense_id = p_expense_id
      ) sub
      WHERE uid != v_user_id
    ) INTO v_participant_ids;
  ELSE
    v_participant_ids := '{}';
  END IF;

  -- Resolve @here → all users who have commented on this expense
  IF v_has_here THEN
    SELECT ARRAY(
      SELECT DISTINCT ec.user_id
      FROM expense_comments ec
      WHERE ec.expense_id = p_expense_id AND ec.user_id != v_user_id
    ) INTO v_commenter_ids;
  ELSE
    v_commenter_ids := '{}';
  END IF;

  -- Build resolved mention list: sentinels expanded + direct mentions (excluding sentinels)
  SELECT ARRAY(
    SELECT DISTINCT uid FROM (
      SELECT unnest(v_participant_ids) AS uid
      UNION
      SELECT unnest(v_commenter_ids) AS uid
      UNION
      SELECT unnest(
        ARRAY(SELECT unnest(p_mentioned_user_ids) EXCEPT SELECT v_all_sentinel EXCEPT SELECT v_here_sentinel)
      ) AS uid
    ) sub
    WHERE uid != v_user_id
  ) INTO v_resolved_ids;

  -- Insert comment
  INSERT INTO expense_comments (expense_id, user_id, parent_id, content)
  VALUES (p_expense_id, v_user_id, p_parent_id, p_content)
  RETURNING id INTO v_comment_id;

  -- Insert mentions with resolved IDs
  IF array_length(v_resolved_ids, 1) > 0 THEN
    INSERT INTO comment_mentions (comment_id, mentioned_user_id)
    SELECT v_comment_id, unnest(v_resolved_ids)
    ON CONFLICT (comment_id, mentioned_user_id) DO NOTHING;
  END IF;

  -- Build result
  SELECT jsonb_build_object(
    'id', ec.id,
    'expense_id', ec.expense_id,
    'user_id', ec.user_id,
    'parent_id', ec.parent_id,
    'content', ec.content,
    'is_edited', ec.is_edited,
    'created_at', ec.created_at,
    'user', jsonb_build_object(
      'id', p.id,
      'full_name', p.full_name,
      'avatar_url', p.avatar_url
    )
  ) INTO v_result
  FROM expense_comments ec
  JOIN profiles p ON ec.user_id = p.id
  WHERE ec.id = v_comment_id;

  -- Create notifications for all resolved mentions
  IF array_length(v_resolved_ids, 1) > 0 THEN
    INSERT INTO notifications (user_id, type, title, message, link, related_id)
    SELECT
      uid,
      'comment_mention',
      'You were mentioned in a comment',
      (SELECT full_name FROM profiles WHERE id = v_user_id) || ' mentioned you on "' || v_expense.description || '"',
      '/expenses/show/' || p_expense_id,
      v_comment_id
    FROM unnest(v_resolved_ids) AS uid
    WHERE uid != v_user_id;
  END IF;

  -- Notify parent comment author on reply
  IF p_parent_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, link, related_id)
    SELECT
      ec.user_id,
      'comment_reply',
      'Someone replied to your comment',
      (SELECT full_name FROM profiles WHERE id = v_user_id) || ' replied to your comment on "' || v_expense.description || '"',
      '/expenses/show/' || p_expense_id,
      v_comment_id
    FROM expense_comments ec
    WHERE ec.id = p_parent_id AND ec.user_id != v_user_id;
  END IF;

  RETURN v_result;
END;
$fn$;

-- ============================================================
-- 3. GRANT EXECUTE for updated function
-- ============================================================
GRANT EXECUTE ON FUNCTION add_expense_comment(UUID, TEXT, UUID, UUID[]) TO authenticated;
