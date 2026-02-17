-- ============================================================
-- Migration: Auto-upsert reaction_type for arbitrary emoji
-- Purpose: Allow users to react with any emoji from picker
--          by auto-creating reaction_type if not exists
-- ============================================================

-- Function: upsert an emoji reaction type and return its ID
-- Uses SECURITY DEFINER to bypass RLS (only admin can INSERT directly)
DROP FUNCTION IF EXISTS upsert_emoji_reaction_type(TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION upsert_emoji_reaction_type(
  p_emoji_mart_id TEXT,
  p_native_emoji TEXT,
  p_label TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_reaction_type_id UUID;
  v_code TEXT;
  v_max_sort INTEGER;
BEGIN
  -- Must be authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Try find by emoji_mart_id first
  IF p_emoji_mart_id IS NOT NULL AND p_emoji_mart_id != '' THEN
    SELECT id INTO v_reaction_type_id
    FROM reaction_types
    WHERE emoji_mart_id = p_emoji_mart_id AND is_active = true;

    IF v_reaction_type_id IS NOT NULL THEN
      RETURN v_reaction_type_id;
    END IF;
  END IF;

  -- Try find by native emoji character
  IF p_native_emoji IS NOT NULL AND p_native_emoji != '' THEN
    SELECT id INTO v_reaction_type_id
    FROM reaction_types
    WHERE emoji = p_native_emoji AND is_active = true;

    IF v_reaction_type_id IS NOT NULL THEN
      -- Also update emoji_mart_id if missing
      IF p_emoji_mart_id IS NOT NULL AND p_emoji_mart_id != '' THEN
        UPDATE reaction_types
        SET emoji_mart_id = p_emoji_mart_id
        WHERE id = v_reaction_type_id AND (emoji_mart_id IS NULL OR emoji_mart_id = '');
      END IF;
      RETURN v_reaction_type_id;
    END IF;
  END IF;

  -- Not found — create new reaction_type
  v_code := COALESCE(NULLIF(p_emoji_mart_id, ''), 'emoji_' || encode(gen_random_bytes(4), 'hex'));

  -- Check code uniqueness, append random suffix if needed
  IF EXISTS (SELECT 1 FROM reaction_types WHERE code = v_code) THEN
    v_code := v_code || '_' || encode(gen_random_bytes(3), 'hex');
  END IF;

  SELECT COALESCE(MAX(sort_order), 0) INTO v_max_sort FROM reaction_types;

  INSERT INTO reaction_types (code, emoji, emoji_mart_id, media_type, label, is_active, sort_order, created_by)
  VALUES (v_code, p_native_emoji, NULLIF(p_emoji_mart_id, ''), 'emoji', COALESCE(NULLIF(p_label, ''), v_code), true, v_max_sort + 1, v_user_id)
  RETURNING id INTO v_reaction_type_id;

  RETURN v_reaction_type_id;
END;
$$;

GRANT EXECUTE ON FUNCTION upsert_emoji_reaction_type(TEXT, TEXT, TEXT) TO authenticated;
