-- ========================================
-- Notify group admins when a join request is submitted
-- ========================================

-- Function triggered on INSERT into group_join_requests
CREATE OR REPLACE FUNCTION notify_admins_on_join_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin RECORD;
  v_requester_name TEXT;
  v_group_name TEXT;
BEGIN
  -- Only fire for new pending requests
  IF NEW.status <> 'pending' THEN
    RETURN NEW;
  END IF;

  -- Get requester name
  SELECT COALESCE(full_name, email, 'Someone') INTO v_requester_name
  FROM profiles WHERE id = NEW.user_id;

  -- Get group name
  SELECT name INTO v_group_name
  FROM groups WHERE id = NEW.group_id;

  -- Notify each admin of the group
  FOR v_admin IN
    SELECT user_id FROM group_members
    WHERE group_id = NEW.group_id AND role = 'admin'
  LOOP
    -- Check user notification preferences (reuse group_invite preference)
    IF should_send_notification(v_admin.user_id, 'group_invite') THEN
      INSERT INTO notifications (user_id, type, title, message, link, related_id)
      VALUES (
        v_admin.user_id,
        'group_join_request',
        'New Join Request',
        v_requester_name || ' wants to join ' || v_group_name,
        '/groups/show/' || NEW.group_id,
        NEW.group_id
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Trigger on insert
CREATE TRIGGER trg_notify_admins_on_join_request
  AFTER INSERT ON group_join_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_admins_on_join_request();
