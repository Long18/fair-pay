/**
 * Canonical allowlist for journey tracking events persisted via track-client-event.
 * Keep in sync with supabase/functions/_shared/allowed-tracking-events.ts and DB constraint.
 */
export const ALLOWED_TRACKING_EVENT_NAMES = [
  // Session & navigation
  "page_view",
  "session_started",
  "nav_click",
  "nav_back_clicked",
  "cta_click",
  // Form funnel
  "form_step_view",
  "form_submit",
  "form_success",
  "form_error",
  "form_validation_error",
  // Auth
  "auth_login",
  "auth_register",
  "auth_login_started",
  "auth_login_submitted",
  "auth_login_success",
  "auth_login_failed",
  "auth_signup_started",
  "auth_signup_success",
  "auth_signup_failed",
  // Core entities
  "expense_created",
  "payment_created",
  "group_created",
  "invite_sent",
  "invite_accepted",
  "settlement_completed",
  "profile_viewed_from_shared_link",
  // Share
  "share_link_generated",
  "share_button_clicked",
  "share_copy_link_clicked",
  "share_native_sheet_opened",
  "share_completed",
  "share_failed",
  "share_method_selected",
  // Expense flow
  "expense_detail_opened",
  "expense_create_button_clicked",
  "expense_form_started",
  "expense_participants_selected",
  "expense_split_method_selected",
  "expense_form_submitted",
  "expense_create_success",
  "expense_create_failed",
  "expense_edit_button_clicked",
  "expense_edit_submitted",
  "expense_edit_success",
  "expense_edit_failed",
  "expense_delete_button_clicked",
  "expense_delete_success",
  "expense_delete_failed",
  "expense_settle_button_clicked",
  "expense_settle_all_button_clicked",
  "expense_settle_success",
  "expense_settle_failed",
  "expense_filter_applied",
  "expense_search_submitted",
  // Debt & payment flow
  "debt_detail_opened",
  "debt_settle_button_clicked",
  "debt_settle_submitted",
  "debt_settle_success",
  "debt_settle_failed",
  "payment_options_opened",
  "payment_method_selected",
  "payment_qr_opened",
  // Group flow
  "group_detail_opened",
  "group_create_button_clicked",
  "group_form_started",
  "group_form_submitted",
  "group_create_success",
  "group_create_failed",
  "group_edit_clicked",
  "group_edit_submitted",
  "group_edit_success",
  "group_edit_failed",
  "group_member_invite_clicked",
  "group_member_invite_success",
  "group_member_invite_failed",
  "group_leave_clicked",
  "group_leave_success",
  "group_leave_failed",
  "group_share_clicked",
  // Friend flow
  "friend_detail_opened",
  "friend_remove_clicked",
  "friend_remove_success",
  "friend_remove_failed",
  "friend_share_clicked",
  // Profile & settings
  "profile_opened",
  "profile_avatar_clicked",
  "profile_edit_clicked",
  "profile_update_submitted",
  "profile_update_success",
  "profile_update_failed",
  "settings_opened",
  "settings_bank_save_submitted",
  "settings_bank_save_success",
  "settings_bank_save_failed",
  "settings_payment_save_submitted",
  "settings_payment_save_success",
  "settings_payment_save_failed",
  // Reports
  "report_generated",
  "report_exported",
  // Dashboard
  "dashboard_tab_changed",
  "dashboard_balance_card_clicked",
  "dashboard_activity_item_clicked",
  "dashboard_fab_clicked",
  "activity_filter_changed",
  // Onboarding
  "onboarding_checklist_viewed",
  "onboarding_step_completed",
  "onboarding_checklist_skipped",
  "onboarding_checklist_dismissed",
  // Billing
  "pricing_page_viewed",
  "billing_checkout_started",
  "billing_checkout_success",
  "billing_checkout_failed",
  "billing_portal_opened",
  // Referral
  "referral_link_copied",
  "referral_signup_attributed",
  // AI chat
  "ai_chat_opened",
  "ai_chat_message_sent",
  "ai_chat_tool_preview_shown",
  "ai_chat_preview_confirmed",
  "ai_chat_preview_dismissed",
  // UI interactions
  "modal_opened",
  "modal_closed",
  "sheet_opened",
  "sheet_closed",
  "filter_applied",
  "sort_applied",
  "search_used",
  "tab_changed",
  // Errors
  "error_boundary_caught",
  "api_error",
] as const;

export type AllowedTrackingEventName = (typeof ALLOWED_TRACKING_EVENT_NAMES)[number];

export const ALLOWED_TRACKING_EVENT_SET = new Set<string>(ALLOWED_TRACKING_EVENT_NAMES);

export function isAllowedTrackingEventName(eventName: string): eventName is AllowedTrackingEventName {
  return ALLOWED_TRACKING_EVENT_SET.has(eventName);
}
