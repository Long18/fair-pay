-- Fix purge_profile_activity_data: expense_reactions are polymorphic (target_type/target_id),
-- not expense_id. Also clear comment_mentions and prepaid logs tied to removed expenses.

BEGIN;

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
  v_has_expenses BOOLEAN := FALSE;
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

  v_has_expenses := COALESCE(array_length(v_expense_ids, 1), 0) > 0;

  DELETE FROM public.ai_chat_conversations WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('ai_chat_conversations', v_n);

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

  DELETE FROM public.prepaid_consumption_log
  WHERE user_id = p_user_id
     OR (v_has_expenses AND expense_instance_id = ANY (v_expense_ids));
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('prepaid_consumption_log', v_n);

  DELETE FROM public.recurring_prepaid_payments
  WHERE created_by = p_user_id
     OR paid_by_user_id = p_user_id
     OR user_id = p_user_id
     OR (v_has_expenses AND expense_id = ANY (v_expense_ids));
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('recurring_prepaid_payments', v_n);

  DELETE FROM public.momo_payment_requests WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('momo_payment_requests', v_n);

  DELETE FROM public.sepay_payment_orders
  WHERE payer_user_id = p_user_id OR payee_user_id = p_user_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('sepay_payment_orders', v_n);

  DELETE FROM public.payment_events
  WHERE actor_user_id = p_user_id
     OR from_user_id = p_user_id
     OR to_user_id = p_user_id
     OR (v_has_expenses AND expense_id = ANY (v_expense_ids));
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('payment_events', v_n);

  DELETE FROM public.payments
  WHERE from_user = p_user_id
     OR to_user = p_user_id
     OR created_by = p_user_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('payments', v_n);

  DELETE FROM public.expense_reactions er
  WHERE er.user_id = p_user_id
     OR (v_has_expenses AND er.target_type = 'expense' AND er.target_id = ANY (v_expense_ids))
     OR er.target_type = 'comment'
        AND er.target_id IN (
          SELECT ec.id
          FROM public.expense_comments ec
          WHERE ec.user_id = p_user_id
             OR (v_has_expenses AND ec.expense_id = ANY (v_expense_ids))
        );
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('expense_reactions', v_n);

  DELETE FROM public.comment_mentions cm
  WHERE cm.mentioned_user_id = p_user_id
     OR cm.comment_id IN (
       SELECT ec.id
       FROM public.expense_comments ec
       WHERE ec.user_id = p_user_id
          OR (v_has_expenses AND ec.expense_id = ANY (v_expense_ids))
     );
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('comment_mentions', v_n);

  IF v_has_expenses THEN
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
  'Deletes transactional and activity data for a user. Keeps profile, user_emails, friendships, group_members.';

COMMIT;
