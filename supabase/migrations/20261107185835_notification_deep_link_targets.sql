-- Align notification deep links with in-app routes (Connections hub, profile, expense anchors, join requests).

-- Friend request → Connections friends tab (incoming requests section)
CREATE OR REPLACE FUNCTION public.notify_friend_request()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_recipient_id UUID;
  v_requester_id UUID;
  v_requester_name TEXT;
  v_notify_enabled BOOLEAN;
BEGIN
  IF NEW.status != 'pending' THEN
    RETURN NEW;
  END IF;

  v_requester_id := NEW.created_by;

  IF NEW.user_a = v_requester_id THEN
    v_recipient_id := NEW.user_b;
  ELSE
    v_recipient_id := NEW.user_a;
  END IF;

  SELECT full_name INTO v_requester_name
  FROM profiles WHERE id = v_requester_id;

  SELECT COALESCE(notify_on_friend_request, TRUE) INTO v_notify_enabled
  FROM user_settings WHERE user_id = v_recipient_id;

  IF v_notify_enabled = FALSE THEN
    RETURN NEW;
  END IF;

  BEGIN
    INSERT INTO notifications (
      user_id, actor_id, type, title, message, link, related_id, is_read, created_at
    ) VALUES (
      v_recipient_id,
      v_requester_id,
      'friend_request',
      COALESCE(v_requester_name, 'Someone') || ' sent you a friend request',
      'Accept or reject this request on the Friends page',
      '/connections?tab=friends&section=requests',
      NEW.id,
      FALSE,
      NOW()
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_friend_request failed for user %: %', v_recipient_id, SQLERRM;
  END;

  RETURN NEW;
END;
$fn$;

-- Friend accepted → accepter's profile
CREATE OR REPLACE FUNCTION public.notify_friend_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_accepter_id UUID;
  v_accepter_name TEXT;
  v_requester_id UUID;
BEGIN
  IF OLD.status != 'pending' OR NEW.status != 'accepted' THEN
    RETURN NEW;
  END IF;

  IF NEW.created_by = NEW.user_a THEN
    v_accepter_id := NEW.user_b;
    v_requester_id := NEW.user_a;
  ELSE
    v_accepter_id := NEW.user_a;
    v_requester_id := NEW.user_b;
  END IF;

  SELECT full_name INTO v_accepter_name
  FROM profiles WHERE id = v_accepter_id;

  IF NOT should_send_notification(v_requester_id, 'friend_request') THEN
    RETURN NEW;
  END IF;

  BEGIN
    INSERT INTO notifications (user_id, actor_id, type, title, message, link, related_id, is_read, created_at)
    VALUES (
      v_requester_id,
      v_accepter_id,
      'friend_accepted',
      'Friend Request Accepted',
      COALESCE(v_accepter_name, 'Someone') || ' accepted your friend request',
      '/profile/' || v_accepter_id::text,
      NEW.id,
      FALSE,
      NOW()
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_friend_accepted failed for user %: %', v_requester_id, SQLERRM;
  END;

  RETURN NEW;
END;
$fn$;

-- Group join request → group page join-request panel (admin)
CREATE OR REPLACE FUNCTION public.notify_admins_on_join_request()
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
  IF NEW.status <> 'pending' THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(full_name, email, 'Someone') INTO v_requester_name
  FROM profiles WHERE id = NEW.user_id;

  SELECT name INTO v_group_name
  FROM groups WHERE id = NEW.group_id;

  FOR v_admin IN
    SELECT user_id FROM group_members
    WHERE group_id = NEW.group_id AND role = 'admin'
  LOOP
    IF should_send_notification(v_admin.user_id, 'group_invite') THEN
      BEGIN
        INSERT INTO notifications (user_id, actor_id, type, title, message, link, related_id, is_read, created_at)
        VALUES (
          v_admin.user_id,
          NEW.user_id,
          'group_join_request',
          'New Join Request',
          v_requester_name || ' wants to join ' || COALESCE(v_group_name, 'a group'),
          '/groups/show/' || NEW.group_id::text || '#group-join-requests',
          NEW.group_id,
          FALSE,
          NOW()
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'notify_admins_on_join_request failed for admin %: %', v_admin.user_id, SQLERRM;
      END;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Expense added → store expense id on related_id for clients
CREATE OR REPLACE FUNCTION public.notify_expense_added()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_expense RECORD;
  v_creator_name TEXT;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT e.id, e.description, e.amount, e.currency, e.created_by, e.is_payment
  INTO v_expense
  FROM expenses e
  WHERE e.id = NEW.expense_id;

  IF v_expense IS NULL OR v_expense.is_payment THEN
    RETURN NEW;
  END IF;

  IF NEW.user_id = v_expense.created_by THEN
    RETURN NEW;
  END IF;

  IF NOT should_send_notification(NEW.user_id, 'expense_added') THEN
    RETURN NEW;
  END IF;

  SELECT full_name INTO v_creator_name
  FROM profiles WHERE id = v_expense.created_by;

  BEGIN
    INSERT INTO notifications (
      user_id, actor_id, type, title, message, link, related_id, is_read, created_at
    ) VALUES (
      NEW.user_id,
      v_expense.created_by,
      'expense_added',
      'New Expense Added',
      COALESCE(v_creator_name, 'Someone') || ' added "' || COALESCE(v_expense.description, 'an expense') || '" - ' ||
        to_char(v_expense.amount, 'FM999,999,999') || ' ' || v_expense.currency ||
        '. You owe ' || to_char(COALESCE(NEW.computed_amount, 0), 'FM999,999,999') || ' ' || v_expense.currency,
      '/expenses/show/' || v_expense.id::text,
      v_expense.id,
      FALSE,
      NOW()
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_expense_added failed for user %: %', NEW.user_id, SQLERRM;
  END;

  RETURN NEW;
END;
$fn$;

GRANT ALL ON FUNCTION public.notify_friend_request() TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.notify_friend_accepted() TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.notify_admins_on_join_request() TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.notify_expense_added() TO anon, authenticated, service_role;
