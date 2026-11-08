# Tracking allowlist audit

**Date:** 2026-11-08  
**Scope:** `ALLOWED_TRACKING_EVENT_NAMES` in [`src/lib/journey-tracking/allowed-events.ts`](../../src/lib/journey-tracking/allowed-events.ts) vs app instrumentation (`trackEvent` / `useTrackEvent` / `journeyTracking` / DOM `data-track-id`) vs [`TRACKING.md`](./TRACKING.md).

**Sources mirrored:** `supabase/functions/_shared/allowed-tracking-events.ts`, DB `user_tracking_events_name_check` (see migrations).

---

## Executive summary

| Metric | Count |
|--------|------:|
| Allowlisted journey event names | 138 |
| **Active** (canonical name emitted to journey) | ~107 |
| **Silent** (allowlisted, no `event_name` / `track()` in app) | ~29 |
| **Legacy-only** (Vercel `AnalyticsManager` / legacy `analytics.ts`, not journey) | 12 distinct emissions |
| **Doc-missing** (in allowlist, absent from TRACKING.md “Complete Event List”) | 46 |
| **Fired but not allowlisted** (journey drops in prod) | 3 names |

### Priority fix queue

| Priority | Item | Fix note |
|----------|------|----------|
| ~~P1~~ | `email_cta_landed` | **Fixed** — journey `trackEvent` in `EmailCtaLandingTracker.tsx`; allowlist + remote migration `expand_dashboard_pond_tracking_allowlist`. |
| ~~P1~~ | `settings_bank_momo_save_*` | **Fixed** — allowlisted; same migration. |
| **P2** | Other sim modes | Only `pond` tap + `soccer_goal` emit `dashboard_pond_interaction`; remaining 9 modes still interaction-blind (per TRACKING.md deferral). |
| **P2** | `dashboard_pond_sound_toggled` | Wired via `toggleModeSound` (non-pond sound modes) and `PondViewport` inline toggle (`mode: pond`). |
| **P2** | `error_boundary_caught` / `api_error` | [`ErrorTracker`](../../src/lib/analytics/trackers.ts) → Vercel only (`error_boundary_caught`, `error_api_error`). Bridge to `trackEvent('error_boundary_caught' \| 'api_error', …)` or drop from allowlist if journey not desired. |
| **P2** | `DashboardTracker.featureUsed` / `viewToggled` | Defined in trackers; **never called**. `balanceChecked` → `dashboard_balance_checked` (**not** allowlisted). Either map to canonical `dashboard_*` names or remove dead APIs. |
| **P3** | Group funnel canonical names | Create flow fires `form_step_view` / `form_submit` / `form_success` instead of `group_form_*` / `group_create_failed` ([`groups/pages/create.tsx`](../../src/modules/groups/pages/create.tsx)). Align names or document aliases. |
| **P3** | TRACKING.md funnel typos | Docs cite `expense_share_clicked` / `debt_share_clicked`; app uses `friend_share_clicked` / share helpers — update docs or add allowlist aliases. |

---

## Special focus

### `dashboard_*` (core dashboard)

| Event | Status | Evidence | Priority fix |
|-------|--------|----------|--------------|
| `dashboard_tab_changed` | active | [`src/pages/dashboard.tsx`](../../src/pages/dashboard.tsx) | — |
| `dashboard_balance_card_clicked` | active | [`src/components/dashboard/balance/balance-table-row-expandable.tsx`](../../src/components/dashboard/balance/balance-table-row-expandable.tsx) | — |
| `dashboard_activity_item_clicked` | active | [`src/components/dashboard/activity/activity-feed.tsx`](../../src/components/dashboard/activity/activity-feed.tsx) | — |
| `dashboard_fab_clicked` | active | [`src/components/dashboard/core/FloatingActionButton.tsx`](../../src/components/dashboard/core/FloatingActionButton.tsx) | — |
| `activity_filter_changed` | active | [`src/components/dashboard/activity/activity-filter-controls.tsx`](../../src/components/dashboard/activity/activity-filter-controls.tsx) | — |
| `dashboard_pond_impression` | active | [`src/components/pond-hero/DashboardSimSection.tsx`](../../src/components/pond-hero/DashboardSimSection.tsx) | — |
| `dashboard_pond_mode_changed` | active | `DashboardSimSection.selectMode` | — |
| `dashboard_pond_feed_toggled` | active | `DashboardSimSection.togglePondFeed` / `onPondFeedChange` | — |
| `dashboard_pond_session_end` | active | `DashboardSimSection.emitSessionEnd` | — |
| `dashboard_pond_sound_toggled` | active | `DashboardSimSection.toggleModeSound`, `DashboardPond` viewport toggle | — |
| `dashboard_pond_interaction` | partial | `use-pond-scene.ts`, `SoccerSim.tsx` | P2 — other sim modes |

**`DashboardTracker` (legacy `AnalyticsManager`):**

| Method | Vercel event name | On allowlist? | Called? |
|--------|-------------------|---------------|---------|
| `balanceChecked` | `dashboard_balance_checked` | No | Yes — [`dashboard.tsx`](../../src/pages/dashboard.tsx) L143 |
| `featureUsed` | `dashboard_feature_used` | No | Never |
| `viewToggled` | `dashboard_view_toggled` | No | Never |

### `email_cta_landed`

| Event | Status | Evidence | Priority fix |
|-------|--------|----------|--------------|
| `email_cta_landed` | **legacy-only** (not allowlisted) | [`EmailCtaLandingTracker.tsx`](../../src/components/analytics/EmailCtaLandingTracker.tsx), mounted in [`App.tsx`](../../src/App.tsx) | **P1** — add to allowlist; use journey/`trackEvent`; document in TRACKING.md |

Legacy shape: `analytics.track({ action: "email_cta_landed", category: "email", … })` → GA-style path only, not `track-client-event`.

### `ai_chat_*`

| Event | Status | Evidence | Priority fix |
|-------|--------|----------|--------------|
| `ai_chat_opened` | active | [`src/modules/ai-chat/AiChatContext.tsx`](../../src/modules/ai-chat/AiChatContext.tsx) | — |
| `ai_chat_message_sent` | active | [`src/modules/ai-chat/hooks/use-ai-chat.ts`](../../src/modules/ai-chat/hooks/use-ai-chat.ts) | — |
| `ai_chat_tool_preview_shown` | active | `use-ai-chat.ts` | — |
| `ai_chat_preview_confirmed` | active | `use-ai-chat.ts` | — |
| `ai_chat_preview_dismissed` | active | `use-ai-chat.ts` | — |

All five are on the allowlist but **missing** from TRACKING.md “Complete Event List” (doc-missing).

---

## Fired but not on allowlist (journey silent drop)

| Event | Status | Evidence | Priority fix |
|-------|--------|----------|--------------|
| `email_cta_landed` | legacy-only | `EmailCtaLandingTracker.tsx` | P1 |
| `settings_bank_momo_save_success` | silent (dropped) | `momo-bank-settings-form.tsx` | P1 — allowlist or rename |
| `settings_bank_momo_save_failed` | silent (dropped) | `momo-bank-settings-form.tsx` | P1 |
| `user_identified` / `user_cleared` | legacy-only | [`src/lib/analytics/providers/vercel.ts`](../../src/lib/analytics/providers/vercel.ts) | Optional — Vercel plumbing only |
| `dashboard_balance_checked` | legacy-only | `DashboardTracker` + `dashboard.tsx` | P2 — allowlist or map to existing `dashboard_*` |
| `auth_logout` | legacy-only | `AuthTracker.logout` in [`authProvider.ts`](../../src/authProvider.ts) | Low — not in allowlist by design? |

`trackEvent` warns in dev when the name is missing from the allowlist ([`src/lib/analytics/track.ts`](../../src/lib/analytics/track.ts) L81–87).

---

## Legacy-only emissions (`AnalyticsManager` → Vercel)

These use `category_action` formatting ([`manager.ts`](../../src/lib/analytics/manager.ts) L165–167) and do **not** call `journeyTracking` unless duplicated elsewhere.

| Vercel-style name | Allowlist name | Journey also fired? | Evidence |
|-------------------|----------------|---------------------|----------|
| `auth_login` | `auth_login` | Yes (auth forms + provider) | `AuthTracker`, `authProvider.ts`, sign-in form |
| `auth_register` | `auth_register` | Yes | `authProvider.ts`, sign-up form |
| `auth_logout` | — | No | `authProvider.ts` |
| `expense_created` | `expense_created` | Yes (duplicate) | `ExpenseTracker` + `expenses/pages/create.tsx` |
| `payment_recorded` | `payment_created` | Partial (`payment_created` journey) | `PaymentTracker` + payments create |
| `error_error_boundary_caught` → `error_boundary_caught` | `error_boundary_caught` | **No** | `error-boundary.tsx` |
| `error_api_error` → `error_api_error` | `api_error` | **No** (name mismatch) | `ErrorTracker.apiError` |
| `error_validation_error` | — | **No** | Unused `ErrorTracker.validationError` |
| `dashboard_balance_checked` | — | **No** | `dashboard.tsx` |

---

## TRACKING.md vs allowlist

### Documented in TRACKING.md but problematic

| Doc reference | Issue |
|---------------|--------|
| Share funnel: `expense_share_clicked` \| `debt_share_clicked` | Not on allowlist; code uses entity-specific `friend_share_clicked`, `group_share_clicked`, share helpers |
| `expense_form_started` | Doc says `journeyTracking.trackFormView`; implementation emits `expense_form_started` in [`expense-form.tsx`](../../src/modules/expenses/components/expense-form.tsx) (OK) but **also** `form_step_view` via `trackFormView` on create page |
| Group funnel `group_form_started` | Create page uses `trackFormView("group-create")` → `form_step_view`, not `group_form_started` |
| Pond events | Spec in TRACKING.md; partial implementation (see dashboard table) |

### On allowlist, not in TRACKING.md “Complete Event List” (doc-missing)

Includes: `session_started`, `nav_click`, `nav_back_clicked`, `cta_click`, `form_step_view`, `form_submit`, `form_success`, `form_error`, `form_validation_error`, `auth_login`, `auth_register`, `expense_created`, `payment_created`, `group_created`, `invite_sent`, `invite_accepted`, `settlement_completed`, `profile_viewed_from_shared_link`, all `share_copy_*` / `share_native_*`, `expense_participants_selected`, `expense_split_method_selected`, `expense_filter_applied`, `payment_momo_manual_*`, `activity_filter_changed`, onboarding (except viewed/dismissed in partial coverage), billing/referral block, all `ai_chat_*`, generic `modal_*` / `sheet_*` / `filter_applied` / `sort_applied` / `search_used` / `tab_changed`, `error_boundary_caught`, `api_error`, and core `dashboard_pond_*` (pond section exists but not in the short dashboard table).

---

## Full allowlist matrix

**Status legend**

- **active** — canonical `event_name` reaches `journeyTracking` / `trackEvent`
- **silent** — allowlisted, no production instrumentation found
- **legacy-only** — only `AnalyticsManager` / `analytics.ts` (see legacy table)
- **doc-missing** — not listed in TRACKING.md complete event tables (pond subsection may still document)

### Session & navigation

| Event | Status | Evidence | Priority fix |
|-------|--------|----------|--------------|
| `page_view` | active | `journey-tracking/manager.ts`, bridge | doc-missing |
| `session_started` | active | `journey-tracking/manager.ts` init | doc-missing |
| `nav_click` | active | DOM: `navbar.tsx`, `dashboard.tsx`; delegate in `manager.ts` | doc-missing |
| `nav_back_clicked` | silent | allowlist only | P3 — instrument back navigation or remove |
| `cta_click` | active | DOM + auth forms + FAB + pricing | doc-missing |

### Form funnel

| Event | Status | Evidence | Priority fix |
|-------|--------|----------|--------------|
| `form_step_view` | active | `trackFormView` (auth, expense, group, payment create) | doc-missing |
| `form_submit` | active | Auth, expense/group/payment create + DOM | doc-missing |
| `form_success` | active | Auth, expense/group/payment create | doc-missing |
| `form_error` | active | Auth, expense/group/payment create | doc-missing |
| `form_validation_error` | silent | allowlist only | P3 |

### Auth

| Event | Status | Evidence | Priority fix |
|-------|--------|----------|--------------|
| `auth_login` | active + legacy | `authProvider.ts`, sign-in form | — |
| `auth_register` | active + legacy | `authProvider.ts` | — |
| `auth_login_started` | active | `sign-in-form.tsx` | — |
| `auth_login_submitted` | active | `sign-in-form.tsx` | — |
| `auth_login_success` | active | `sign-in-form.tsx` | — |
| `auth_login_failed` | active | `sign-in-form.tsx` | — |
| `auth_signup_started` | active | `sign-up-form.tsx` | — |
| `auth_signup_success` | active | `sign-up-form.tsx` | — |
| `auth_signup_failed` | active | `sign-up-form.tsx` | — |

### Core entities

| Event | Status | Evidence | Priority fix |
|-------|--------|----------|--------------|
| `expense_created` | active + legacy | `expenses/pages/create.tsx` | doc-missing |
| `payment_created` | active | `payments/pages/create.tsx` | doc-missing |
| `group_created` | active | `groups/pages/create.tsx` | doc-missing |
| `invite_sent` | active | `add-member-modal.tsx`, `use-join-request.ts` | doc-missing |
| `invite_accepted` | active | `use-join-request.ts` | doc-missing |
| `settlement_completed` | active | `lib/settlement-events.ts` | doc-missing |
| `profile_viewed_from_shared_link` | active | `profile/pages/show-unified.tsx` | doc-missing |

### Share

| Event | Status | Evidence | Priority fix |
|-------|--------|----------|--------------|
| `share_link_generated` | active | `lib/share-tracking.ts` | — |
| `share_button_clicked` | active | `share-tracking.ts`, `ShareSheet.tsx` | — |
| `share_copy_link_clicked` | active | `share-tracking.ts` | doc-missing |
| `share_native_sheet_opened` | active | `share-tracking.ts` | doc-missing |
| `share_completed` | active | `share-tracking.ts`, `ShareSheet.tsx` | — |
| `share_failed` | active | `share-tracking.ts`, `ShareSheet.tsx` | — |
| `share_method_selected` | active | `ShareSheet.tsx` | — |

### Expense flow

| Event | Status | Evidence | Priority fix |
|-------|--------|----------|--------------|
| `expense_detail_opened` | active | `expenses/pages/show.tsx` | — |
| `expense_create_button_clicked` | silent | doc/example only | P2 — FAB uses `cta_click` + `dashboard_fab_clicked`; align docs or emit canonical name |
| `expense_form_started` | active | `expense-form.tsx` | — |
| `expense_participants_selected` | active | `expense-form.tsx` | doc-missing |
| `expense_split_method_selected` | active | `expense-form.tsx` | doc-missing |
| `expense_form_submitted` | active | `expenses/pages/create.tsx` | — |
| `expense_create_success` | active | `expenses/pages/create.tsx` | — |
| `expense_create_failed` | active | `expenses/pages/create.tsx` | — |
| `expense_edit_button_clicked` | active | `expenses/pages/show.tsx` | — |
| `expense_edit_submitted` | active | `expenses/pages/edit.tsx` | — |
| `expense_edit_success` | active | `expenses/pages/edit.tsx` | — |
| `expense_edit_failed` | active | `expenses/pages/edit.tsx` | — |
| `expense_delete_button_clicked` | active | `expenses/pages/show.tsx` | — |
| `expense_delete_success` | active | `expenses/pages/show.tsx` | — |
| `expense_delete_failed` | active | `expenses/pages/show.tsx` | — |
| `expense_settle_button_clicked` | active | `expenses/pages/show.tsx` | — |
| `expense_settle_all_button_clicked` | active | `expenses/pages/show.tsx` | — |
| `expense_settle_success` | active | `expenses/pages/show.tsx` | — |
| `expense_settle_failed` | active | `expenses/pages/show.tsx` | — |
| `expense_filter_applied` | active | `expense-list.tsx` (note: name is `expense_filter_applied`, not generic `filter_applied`) | doc-missing |
| `expense_search_submitted` | silent | allowlist only | P3 |

### Debt & payment

| Event | Status | Evidence | Priority fix |
|-------|--------|----------|--------------|
| `debt_detail_opened` | active | `person-debt-breakdown.tsx` | — |
| `debt_settle_button_clicked` | active | `person-debt-breakdown.tsx` | — |
| `debt_settle_submitted` | active | `quick-settlement-dialog.tsx` | — |
| `debt_settle_success` | active | `quick-settlement-dialog.tsx` | — |
| `debt_settle_failed` | active | `quick-settlement-dialog.tsx` | — |
| `payment_options_opened` | active | `quick-settlement-dialog.tsx` | — |
| `payment_method_selected` | active | `quick-settlement-dialog.tsx` | — |
| `payment_qr_opened` | active | `vietqr-payment-dialog.tsx` | doc-missing |
| `payment_momo_manual_opened` | active | `momo-manual-payment-dialog.tsx` | doc-missing |
| `payment_momo_manual_claimed` | active | `momo-manual-payment-dialog.tsx` | doc-missing |

### Group flow

| Event | Status | Evidence | Priority fix |
|-------|--------|----------|--------------|
| `group_detail_opened` | active | `groups/pages/show.tsx` | — |
| `group_create_button_clicked` | silent | allowlist only | P3 — use DOM `data-track-id` or explicit `track` on entry |
| `group_form_started` | silent | superseded by `form_step_view` on create | P3 — rename emission or doc |
| `group_form_submitted` | silent | create uses `form_submit` | P3 |
| `group_create_success` | active | `groups/pages/create.tsx` | — |
| `group_create_failed` | silent | failures use `form_error` | P3 |
| `group_edit_clicked` | active | `group-show-header.tsx` | — |
| `group_edit_submitted` | silent | — | P3 |
| `group_edit_success` | silent | — | P3 |
| `group_edit_failed` | silent | — | P3 |
| `group_member_invite_clicked` | active | group show header/panels | — |
| `group_member_invite_success` | active | `groups/pages/show.tsx` | — |
| `group_member_invite_failed` | silent | — | P3 |
| `group_leave_clicked` | silent | — | P3 |
| `group_leave_success` | silent | — | P3 |
| `group_leave_failed` | silent | — | P3 |
| `group_share_clicked` | active | `groups/pages/show.tsx` | — |

### Friend flow

| Event | Status | Evidence | Priority fix |
|-------|--------|----------|--------------|
| `friend_detail_opened` | active | `friends/pages/show.tsx` | — |
| `friend_remove_clicked` | active | `friends/pages/list.tsx` | — |
| `friend_remove_success` | active | `friends/pages/list.tsx` | — |
| `friend_remove_failed` | active | `friends/pages/list.tsx` | — |
| `friend_share_clicked` | active | `friends/pages/show.tsx` | — |

### Profile & settings

| Event | Status | Evidence | Priority fix |
|-------|--------|----------|--------------|
| `profile_opened` | active | `show-unified.tsx` | — |
| `profile_avatar_clicked` | active | `show-unified.tsx` | — |
| `profile_edit_clicked` | active | `show-unified.tsx` | — |
| `profile_update_submitted` | silent | success/fail tracked, not submit | P3 |
| `profile_update_success` | active | `show-unified.tsx` | — |
| `profile_update_failed` | active | `show-unified.tsx` | — |
| `settings_opened` | active | `settings/pages/settings.tsx` | — |
| `settings_bank_save_submitted` | silent | VietQR form tracks success/fail only | P3 |
| `settings_bank_save_success` | active | `vietqr-bank-settings-form.tsx` | — |
| `settings_bank_save_failed` | active | `vietqr-bank-settings-form.tsx` | — |
| `settings_payment_save_submitted` | silent | — | P3 |
| `settings_payment_save_success` | active | `momo-settings.tsx` | — |
| `settings_payment_save_failed` | active | `momo-settings.tsx` | — |

### Reports

| Event | Status | Evidence | Priority fix |
|-------|--------|----------|--------------|
| `report_generated` | active | `reports.tsx` | — |
| `report_exported` | active | `reports.tsx` | — |

### Dashboard & pond

| Event | Status | Evidence | Priority fix |
|-------|--------|----------|--------------|
| `dashboard_tab_changed` | active | `dashboard.tsx` | — |
| `dashboard_balance_card_clicked` | active | `balance-table-row-expandable.tsx` | — |
| `dashboard_activity_item_clicked` | active | `activity-feed.tsx` | — |
| `dashboard_fab_clicked` | active | `FloatingActionButton.tsx` | — |
| `dashboard_pond_impression` | active | `DashboardSimSection.tsx` | — |
| `dashboard_pond_mode_changed` | active | `DashboardSimSection.tsx` | — |
| `dashboard_pond_feed_toggled` | active | `DashboardSimSection.tsx` | — |
| `dashboard_pond_sound_toggled` | active | `DashboardSimSection.tsx`, `DashboardPond.tsx` | — |
| `dashboard_pond_session_end` | active | `DashboardSimSection.tsx` | — |
| `dashboard_pond_interaction` | partial | `use-pond-scene.ts`, `SoccerSim.tsx` | P2 other modes |
| `activity_filter_changed` | active | `activity-filter-controls.tsx` | doc-missing |

### Onboarding

| Event | Status | Evidence | Priority fix |
|-------|--------|----------|--------------|
| `onboarding_checklist_viewed` | active | `OnboardingChecklist.tsx` | doc-missing |
| `onboarding_step_completed` | active | `onboarding/utils/mark-step.ts` | doc-missing |
| `onboarding_checklist_skipped` | silent | — | P3 |
| `onboarding_checklist_dismissed` | active | `OnboardingChecklist.tsx` | doc-missing |

### Billing & referral

| Event | Status | Evidence | Priority fix |
|-------|--------|----------|--------------|
| `pricing_page_viewed` | active | `pricing.tsx` | doc-missing |
| `billing_checkout_started` | active | `pricing.tsx` | doc-missing |
| `billing_checkout_success` | active | `pricing.tsx` | doc-missing |
| `billing_checkout_failed` | active | `pricing.tsx` | doc-missing |
| `billing_portal_opened` | silent | allowlist only | P3 — wire Polar customer portal |
| `referral_link_copied` | active | `ReferralCard.tsx` | doc-missing |
| `referral_signup_attributed` | silent | allowlist only | P3 — wire referral attribution RPC |

### AI chat

| Event | Status | Evidence | Priority fix |
|-------|--------|----------|--------------|
| `ai_chat_opened` | active | `AiChatContext.tsx` | doc-missing |
| `ai_chat_message_sent` | active | `use-ai-chat.ts` | doc-missing |
| `ai_chat_tool_preview_shown` | active | `use-ai-chat.ts` | doc-missing |
| `ai_chat_preview_confirmed` | active | `use-ai-chat.ts` | doc-missing |
| `ai_chat_preview_dismissed` | active | `use-ai-chat.ts` | doc-missing |

### Generic UI interactions

| Event | Status | Evidence | Priority fix |
|-------|--------|----------|--------------|
| `modal_opened` | silent | types only | P3 — remove or instrument modals |
| `modal_closed` | silent | types only | P3 |
| `sheet_opened` | silent | types + share native name collision | P3 |
| `sheet_closed` | silent | types only | P3 |
| `filter_applied` | silent | types only (expense uses specific name) | P3 |
| `sort_applied` | silent | types only | P3 |
| `search_used` | silent | types only | P3 |
| `tab_changed` | silent | allowlist; dashboard uses `dashboard_tab_changed` | P3 — dedupe or use generic |

### Errors

| Event | Status | Evidence | Priority fix |
|-------|--------|----------|--------------|
| `error_boundary_caught` | legacy-only | `ErrorTracker` → Vercel; not journey | P2 |
| `api_error` | legacy-only | `ErrorTracker.apiError` → `error_api_error` on Vercel | P2 |

---

## Methodology notes

1. **Allowlist** parsed from `allowed-events.ts` (138 strings).
2. **Active** if `rg` finds the exact name in `src/` outside allowlist mirrors/admin journey UI labels, in `event_name`, `track(`, `trackEvent`, or `data-track-event` wiring that resolves to the name via [`getTrackedElementPayload`](../../src/lib/journey-tracking/dom.ts).
3. **DOM delegation** requires `data-track-id` + click handler in [`JourneyTrackingManager`](../../src/lib/journey-tracking/manager.ts); `data-track-event` alone is insufficient.
4. **Tests** (`tests/`) may reference event names but were not counted as production instrumentation.
5. Re-run this audit after instrumentation changes; Admin **Growth → Tracking health** uses the same allowlist for 24h volume checks.

---

## Related files

- Allowlist: [`src/lib/journey-tracking/allowed-events.ts`](../../src/lib/journey-tracking/allowed-events.ts)
- Edge mirror: [`supabase/functions/_shared/allowed-tracking-events.ts`](../../supabase/functions/_shared/allowed-tracking-events.ts)
- Journey entrypoint: [`src/lib/analytics/track.ts`](../../src/lib/analytics/track.ts)
- Product docs: [`docs/analytics/TRACKING.md`](./TRACKING.md)
- Sync test: [`tests/lib/allowed-events-sync.test.ts`](../../tests/lib/allowed-events-sync.test.ts)
