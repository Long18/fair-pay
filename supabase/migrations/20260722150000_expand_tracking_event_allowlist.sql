-- Expand user_tracking_events allowlist to match FairPay analytics taxonomy (P0–P3).

ALTER TABLE public.user_tracking_events
  DROP CONSTRAINT IF EXISTS user_tracking_events_name_check;

ALTER TABLE public.user_tracking_events
  ADD CONSTRAINT user_tracking_events_name_check CHECK (
    event_name IN (
      'page_view',
      'session_started',
      'nav_click',
      'nav_back_clicked',
      'cta_click',
      'form_step_view',
      'form_submit',
      'form_success',
      'form_error',
      'form_validation_error',
      'auth_login',
      'auth_register',
      'auth_login_started',
      'auth_login_submitted',
      'auth_login_success',
      'auth_login_failed',
      'auth_signup_started',
      'auth_signup_success',
      'auth_signup_failed',
      'expense_created',
      'payment_created',
      'group_created',
      'invite_sent',
      'invite_accepted',
      'settlement_completed',
      'profile_viewed_from_shared_link',
      'share_link_generated',
      'share_button_clicked',
      'share_copy_link_clicked',
      'share_native_sheet_opened',
      'share_completed',
      'share_failed',
      'share_method_selected',
      'expense_detail_opened',
      'expense_create_button_clicked',
      'expense_form_started',
      'expense_participants_selected',
      'expense_split_method_selected',
      'expense_form_submitted',
      'expense_create_success',
      'expense_create_failed',
      'expense_edit_button_clicked',
      'expense_edit_submitted',
      'expense_edit_success',
      'expense_edit_failed',
      'expense_delete_button_clicked',
      'expense_delete_success',
      'expense_delete_failed',
      'expense_settle_button_clicked',
      'expense_settle_all_button_clicked',
      'expense_settle_success',
      'expense_settle_failed',
      'expense_filter_applied',
      'expense_search_submitted',
      'debt_detail_opened',
      'debt_settle_button_clicked',
      'debt_settle_submitted',
      'debt_settle_success',
      'debt_settle_failed',
      'payment_options_opened',
      'payment_method_selected',
      'payment_qr_opened',
      'group_detail_opened',
      'group_create_button_clicked',
      'group_form_started',
      'group_form_submitted',
      'group_create_success',
      'group_create_failed',
      'group_edit_clicked',
      'group_edit_submitted',
      'group_edit_success',
      'group_edit_failed',
      'group_member_invite_clicked',
      'group_member_invite_success',
      'group_member_invite_failed',
      'group_leave_clicked',
      'group_leave_success',
      'group_leave_failed',
      'group_share_clicked',
      'friend_detail_opened',
      'friend_remove_clicked',
      'friend_remove_success',
      'friend_remove_failed',
      'friend_share_clicked',
      'profile_opened',
      'profile_avatar_clicked',
      'profile_edit_clicked',
      'profile_update_submitted',
      'profile_update_success',
      'profile_update_failed',
      'settings_opened',
      'settings_bank_save_submitted',
      'settings_bank_save_success',
      'settings_bank_save_failed',
      'settings_payment_save_submitted',
      'settings_payment_save_success',
      'settings_payment_save_failed',
      'report_generated',
      'report_exported',
      'dashboard_tab_changed',
      'dashboard_balance_card_clicked',
      'dashboard_activity_item_clicked',
      'dashboard_fab_clicked',
      'activity_filter_changed',
      'onboarding_checklist_viewed',
      'onboarding_step_completed',
      'onboarding_checklist_skipped',
      'onboarding_checklist_dismissed',
      'pricing_page_viewed',
      'billing_checkout_started',
      'billing_checkout_success',
      'billing_checkout_failed',
      'billing_portal_opened',
      'referral_link_copied',
      'referral_signup_attributed',
      'ai_chat_opened',
      'ai_chat_message_sent',
      'ai_chat_tool_preview_shown',
      'ai_chat_preview_confirmed',
      'ai_chat_preview_dismissed',
      'modal_opened',
      'modal_closed',
      'sheet_opened',
      'sheet_closed',
      'filter_applied',
      'sort_applied',
      'search_used',
      'tab_changed',
      'error_boundary_caught',
      'api_error'
    )
  );

-- Activation funnel: use user_tracking_events (real writer) instead of user_journey_events.

CREATE OR REPLACE FUNCTION public.admin_get_activation_funnel(
  p_cohort_days INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_cohort_days INTEGER := GREATEST(1, LEAST(COALESCE(p_cohort_days, 30), 365));
  v_cohort_start TIMESTAMPTZ := now() - make_interval(days => v_cohort_days);
  v_signups BIGINT;
  v_first_expense BIGINT;
  v_active_7d BIGINT;
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT public.is_staff() THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'STAFF_REQUIRED';
  END IF;

  WITH cohort AS (
    SELECT p.id AS user_id, p.created_at AS signed_up_at
    FROM public.profiles p
    WHERE p.created_at >= v_cohort_start
  ),
  first_expense AS (
    SELECT DISTINCT c.user_id
    FROM cohort c
    JOIN public.expenses e
      ON e.created_by = c.user_id
     AND e.is_payment = false
     AND e.created_at >= c.signed_up_at
  ),
  active_7d AS (
    SELECT DISTINCT c.user_id
    FROM cohort c
    WHERE EXISTS (
      SELECT 1
      FROM public.user_tracking_events ute
      WHERE ute.user_id = c.user_id
        AND ute.occurred_at >= c.signed_up_at
        AND ute.occurred_at < c.signed_up_at + interval '7 days'
    )
    OR EXISTS (
      SELECT 1
      FROM public.expenses e
      WHERE e.created_by = c.user_id
        AND e.is_payment = false
        AND e.created_at >= c.signed_up_at
        AND e.created_at < c.signed_up_at + interval '7 days'
    )
  )
  SELECT
    (SELECT COUNT(*) FROM cohort),
    (SELECT COUNT(*) FROM first_expense),
    (SELECT COUNT(*) FROM active_7d)
  INTO v_signups, v_first_expense, v_active_7d;

  RETURN jsonb_build_object(
    'cohort_days', v_cohort_days,
    'signups', v_signups,
    'first_expense', v_first_expense,
    'active_7d', v_active_7d,
    'signup_to_expense_rate', CASE
      WHEN v_signups = 0 THEN 0
      ELSE ROUND(100.0 * v_first_expense / v_signups, 1)
    END,
    'signup_to_active_rate', CASE
      WHEN v_signups = 0 THEN 0
      ELSE ROUND(100.0 * v_active_7d / v_signups, 1)
    END,
    'expense_to_active_rate', CASE
      WHEN v_first_expense = 0 THEN 0
      ELSE ROUND(100.0 * v_active_7d / v_first_expense, 1)
    END
  );
END;
$$;

COMMENT ON FUNCTION public.admin_get_activation_funnel(INTEGER) IS
  'Staff-only activation cohort: signups → first expense → active within 7d (tracking events or expenses).';
