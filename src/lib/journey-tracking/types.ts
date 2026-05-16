import type { AttributionContext } from "@/lib/utm";

export type JourneyEventName =
  | "page_view"
  | "nav_click"
  | "cta_click"
  | "form_step_view"
  | "form_submit"
  | "form_success"
  | "form_error"
  | "auth_login"
  | "auth_register"
  | "expense_created"
  | "payment_created"
  | "group_created"
  | "invite_sent"
  | "invite_accepted"
  | "settlement_completed"
  | "profile_viewed_from_shared_link"
  | "share_link_generated"
  | "share_button_clicked"
  | "share_copy_link_clicked"
  | "share_native_sheet_opened"
  | "share_completed"
  | "share_failed"
  // Auth flow
  | "auth_login_started"
  | "auth_login_failed"
  | "auth_signup_started"
  | "auth_signup_failed"
  // Expense flow
  | "expense_detail_opened"
  | "expense_edit_button_clicked"
  | "expense_delete_button_clicked"
  | "expense_delete_success"
  | "expense_delete_failed"
  | "expense_settle_button_clicked"
  | "expense_settle_success"
  | "expense_settle_failed"
  | "expense_create_button_clicked"
  | "expense_form_started"
  | "expense_participants_selected"
  | "expense_split_method_selected"
  | "expense_form_submitted"
  | "expense_create_success"
  | "expense_create_failed"
  | "expense_edit_submitted"
  | "expense_edit_success"
  | "expense_edit_failed"
  // Debt flow
  | "debt_detail_opened"
  | "debt_settle_button_clicked"
  | "debt_settle_submitted"
  | "debt_settle_success"
  | "debt_settle_failed"
  | "payment_options_opened"
  | "payment_method_selected"
  | "payment_qr_opened"
  // Group flow
  | "group_detail_opened"
  | "group_create_button_clicked"
  | "group_form_started"
  | "group_form_submitted"
  | "group_create_success"
  | "group_create_failed"
  | "group_edit_submitted"
  | "group_edit_success"
  | "group_edit_failed"
  | "group_member_invite_clicked"
  | "group_member_invite_success"
  | "group_member_invite_failed"
  | "group_leave_clicked"
  | "group_leave_success"
  | "group_leave_failed"
  | "group_share_clicked"
  // Friend flow
  | "friend_detail_opened"
  | "friend_remove_clicked"
  | "friend_remove_success"
  | "friend_remove_failed"
  | "friend_share_clicked"
  // Profile flow
  | "profile_opened"
  | "profile_avatar_clicked"
  | "profile_edit_clicked"
  | "profile_update_submitted"
  | "profile_update_success"
  | "profile_update_failed"
  // Settings flow
  | "settings_opened"
  | "settings_bank_save_submitted"
  | "settings_bank_save_success"
  | "settings_bank_save_failed"
  | "settings_payment_save_submitted"
  | "settings_payment_save_success"
  | "settings_payment_save_failed"
  // Report flow
  | "report_generated"
  | "report_exported"
  // Dashboard flow
  | "dashboard_tab_changed"
  | "dashboard_balance_card_clicked"
  | "dashboard_activity_item_clicked"
  | "dashboard_fab_clicked"
  // Navigation
  | "nav_back_clicked"
  // UI interactions
  | "modal_opened"
  | "modal_closed"
  | "sheet_opened"
  | "sheet_closed"
  | "filter_applied"
  | "sort_applied"
  | "search_used"
  | "tab_changed";

export interface TrackEventInput {
  event_name: JourneyEventName;
  event_category: string;
  page_path: string;
  target_type?: string;
  target_key?: string;
  flow_name?: string;
  step_name?: string;
  referrer_path?: string | null;
  properties?: Record<string, unknown>;
  occurred_at?: string;
}

export interface JourneySessionContext {
  id: string;
  anonymousId: string;
  startedAt: string;
  landingPath: string;
  landingReferrer: string | null;
  entryLink: string;
  locale: string | null;
  deviceType: string | null;
}

export interface TrackingSessionPayload {
  id: string;
  anonymous_id: string;
  started_at: string;
  landing_path: string;
  landing_referrer: string | null;
  entry_link: string;
  locale: string | null;
  device_type: string | null;
}

export interface TrackingRequestPayload {
  session: TrackingSessionPayload;
  events: TrackEventInput[];
  access_token?: string | null;
  attribution?: AttributionContext | null;
}

export interface TrackedElementPayload {
  eventName: JourneyEventName;
  eventCategory: string;
  targetType: string;
  targetKey: string;
  flowName?: string;
  stepName?: string;
  properties?: Record<string, unknown>;
}
