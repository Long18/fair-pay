# FairPay Analytics & Event Tracking

## Overview

FairPay uses a dual-layer analytics system:

1. **Event Analytics** (`src/lib/analytics/`) — AnalyticsManager with a Vercel Analytics provider. Typed tracker classes (AuthTracker, ExpenseTracker, etc.) dispatch structured events enriched with session, user, and build info.
2. **Journey Tracking** (`src/lib/journey-tracking/`) — Lightweight funnel/conversion tracker that batches events and sends them to the backend. Used for step-by-step user flow reconstruction.

Both layers are wired together via the centralized `trackEvent` helper and `useTrackEvent` hook.

---

## Quick Start

```tsx
import { useTrackEvent } from '@/hooks/use-track-event';

function MyComponent() {
  const { track } = useTrackEvent();

  const handleClick = () => {
    track('expense_create_button_clicked');
    // or with options:
    track({ eventName: 'expense_create_success', expenseId: id, resultStatus: 'success' });
  };
}
```

The hook auto-attaches current user display metadata (avatar, name, role, badge) to every event.

---

## Scope

### Tracked (Normal User Flows)
- Page views
- Button / CTA clicks
- Tab changes
- Modal / sheet open + close
- Filter, sort, search usage
- Form started / submitted / success / failed
- Share actions
- Expense actions (create, edit, delete, settle)
- Debt / settlement actions
- Group actions (create, invite, leave)
- Friend actions (view, remove)
- Payment / QR actions
- Profile actions (view, edit, update)
- Settings saves
- Report generation / export

### NOT Tracked
- Admin dashboard actions
- Admin CRUD operations
- Admin analytics pages
- Internal moderator tools
- Developer / debug-only pages
- Any sensitive user data (see Sensitive Data Rules below)

---

## Event Naming Convention

Format: `<area>_<object>_<action>`

All parts lowercase, separated by underscores. Minimum two segments required.

| Area | Object | Action |
|------|--------|--------|
| `expense` | `form`, `detail`, `edit`, `delete`, `settle` | `opened`, `clicked`, `submitted`, `success`, `failed` |
| `debt` | `detail`, `settle` | `opened`, `button_clicked`, `submitted`, `success`, `failed` |
| `group` | `detail`, `member`, `invite`, `leave`, `share` | `opened`, `clicked`, `success`, `failed` |
| `friend` | `detail`, `remove`, `share` | `opened`, `clicked`, `success`, `failed` |
| `profile` | `avatar`, `edit`, `update` | `opened`, `clicked`, `submitted`, `success`, `failed` |
| `payment` | `options`, `method`, `qr` | `opened`, `selected` |
| `settings` | `bank`, `payment` | `save_submitted`, `save_success`, `save_failed` |
| `report` | | `generated`, `exported` |
| `auth` | `login`, `signup` | `started`, `submitted`, `success`, `failed` |
| `dashboard` | `tab`, `balance_card`, `activity_item`, `fab` | `changed`, `clicked` |
| `share` | `method` | `clicked`, `selected`, `success`, `failed` |

### Examples

```
expense_create_button_clicked
expense_form_submitted
expense_create_success
expense_create_failed
debt_settle_button_clicked
debt_settle_success
group_member_invite_clicked
group_member_invite_success
profile_avatar_clicked
settings_bank_save_success
report_generated
```

---

## Required Common Properties

Every event automatically includes these via `AnalyticsManager.enrichEvent()` and `trackEvent()`:

| Field | Source |
|-------|--------|
| `event_name` | Caller |
| `user_id` | AnalyticsManager (`setUser`) |
| `session_id` | AnalyticsManager (generated per session) |
| `page_path` | `window.location.pathname` |
| `device_type` | `mobile` or `desktop` based on window width |
| `language` | `navigator.language` |
| `platform` | `navigator.platform` |
| `timestamp` | `Date.now()` |
| `environment` | `production` or `development` |
| `app_version` | Build info |
| `commit_sha` | Build info |

---

## User Display Metadata

Every event also auto-attaches user display metadata when the user is authenticated:

| Field | Description |
|-------|-------------|
| `user_display_name` | User's full name or email |
| `user_avatar_url` | Avatar URL (nullable) |
| `user_role` | Role string (e.g., `member`, `admin`) |
| `user_role_badge` | Short badge identifier |
| `user_role_label` | Human-readable role label |

### Updating User Display Metadata

The `useTrackEvent` hook syncs metadata from Refine identity before each track call. For service-level (non-React) tracking, call:

```typescript
import { setUserDisplay } from '@/lib/analytics/user-display';

setUserDisplay({
  user_id: 'uuid',
  user_display_name: 'Long Nguyễn',
  user_avatar_url: 'https://...',
  user_role: 'admin',
  user_role_badge: 'admin',
  user_role_label: 'Admin',
});
```

---

## Role Badge Mapping

| Role | Badge | Label |
|------|-------|-------|
| `admin` | `admin` | Admin |
| `moderator` | `mod` | Moderator |
| `member` | `member` | Member |
| (default) | `member` | Member |

Group-level roles (from `group_members.role`) override the global default within group context.

---

## Contextual Properties

Pass contextual IDs via `TrackEventOptions`:

```typescript
track({
  eventName: 'expense_settle_success',
  expenseId: 'uuid',
  groupId: 'uuid',
  counterpartyUserId: 'uuid',
  resultStatus: 'success',
});
```

Supported contextual fields:

| Field | When to use |
|-------|-------------|
| `groupId` | Any group-context event |
| `expenseId` | Any expense-context event |
| `debtId` | Debt detail / settle events |
| `paymentId` | Payment events |
| `counterpartyUserId` | Settlement / debt events |
| `resultStatus` | `'success' \| 'failed' \| 'pending'` |
| `errorCode` | Failed events |
| `errorMessageKey` | Failed events (i18n key, not raw message) |
| `flowName` | Journey funnel name |
| `stepName` | Current step within a funnel |

Additional contextual properties that don't fit the above can go in the `properties` bag:

```typescript
track({
  eventName: 'report_exported',
  properties: { format: 'csv', preset: 'monthly' },
});
```

---

## Sensitive Data Rules

The `trackEvent` helper automatically blocks these field names (case-insensitive):

`password`, `token`, `secret`, `key`, `auth`, `session`, `bank_account`, `phone_number`, `card_number`, `cvv`, `pin`, `private_note`, `raw_amount`, `payment_content`, `transaction_payload`, `supabase_token`, `access_token`, `refresh_token`

### Never Send
- Raw financial amounts (use `amount_range` or omit)
- Bank account numbers
- Phone numbers
- Private notes / comments content
- Full transaction payloads
- Authentication tokens
- Supabase session tokens

### Safe to Send
- `amount_range` (e.g., `'0-100k'`, `'1M+'`)
- `currency`
- `transaction_type`
- `result_status`
- `split_method`
- `participant_count`
- `has_receipt` (boolean)

---

## Key User Funnels

### A. Login / Sign-up
```
auth_login_started → auth_login_submitted → auth_login_success | auth_login_failed
auth_signup_started → auth_signup_success | auth_signup_failed
```

### B. Create Expense
```
expense_create_button_clicked
→ expense_form_started (journeyTracking.trackFormView)
→ expense_participants_selected
→ expense_split_method_selected
→ expense_form_submitted
→ expense_create_success | expense_create_failed
```

### C. Debt Settlement
```
debt_detail_opened
→ debt_settle_button_clicked
→ payment_options_opened
→ payment_method_selected
→ debt_settle_submitted
→ debt_settle_success | debt_settle_failed
```

### D. Create Group
```
group_create_button_clicked
→ group_form_started
→ group_form_submitted
→ group_create_success | group_create_failed
```

### E. Invite Group Member
```
group_member_invite_clicked
→ (member selected)
→ group_member_invite_success | group_member_invite_failed
```

### F. Share Flow
```
expense_share_clicked | debt_share_clicked | group_share_clicked
→ share_method_selected
→ share_success | share_failed
```

### G. Profile Update
```
profile_opened
→ profile_edit_clicked
→ profile_update_submitted
→ profile_update_success | profile_update_failed
```

---

## Complete Event List

### Auth Events
| Event | When |
|-------|------|
| `auth_login_started` | Login page loaded / form focused |
| `auth_login_submitted` | Login form submitted |
| `auth_login_success` | Login succeeded |
| `auth_login_failed` | Login failed |
| `auth_signup_started` | Register page loaded |
| `auth_signup_success` | Registration succeeded |
| `auth_signup_failed` | Registration failed |

### Expense Events
| Event | When |
|-------|------|
| `expense_detail_opened` | Expense show page loaded |
| `expense_create_button_clicked` | FAB or create button tapped |
| `expense_form_started` | Form view tracked (journeyTracking) |
| `expense_form_submitted` | Submit button clicked |
| `expense_create_success` | Expense created successfully |
| `expense_create_failed` | Expense creation failed |
| `expense_edit_button_clicked` | Edit button clicked on expense detail |
| `expense_edit_submitted` | Edit form submitted |
| `expense_edit_success` | Expense updated successfully |
| `expense_edit_failed` | Expense update failed |
| `expense_delete_button_clicked` | Delete action triggered |
| `expense_delete_success` | Expense deleted |
| `expense_delete_failed` | Delete failed |
| `expense_settle_button_clicked` | Individual split settle clicked |
| `expense_settle_all_button_clicked` | Settle all button clicked |
| `expense_settle_success` | Settlement succeeded |
| `expense_settle_failed` | Settlement failed |

### Debt Events
| Event | When |
|-------|------|
| `debt_detail_opened` | Debt detail page/sheet opened |
| `debt_settle_button_clicked` | Settle debt button clicked |
| `debt_settle_submitted` | Settlement submitted |
| `debt_settle_success` | Settlement completed |
| `debt_settle_failed` | Settlement failed |
| `payment_options_opened` | Payment method picker opened |
| `payment_method_selected` | User picks a payment method |
| `payment_qr_opened` | QR code shown for payment |

### Group Events
| Event | When |
|-------|------|
| `group_detail_opened` | Group show page loaded |
| `group_create_button_clicked` | Create group button clicked |
| `group_form_submitted` | Group create form submitted |
| `group_create_success` | Group created |
| `group_create_failed` | Group creation failed |
| `group_edit_clicked` | Edit group button clicked |
| `group_edit_submitted` | Edit form submitted |
| `group_edit_success` | Group updated |
| `group_edit_failed` | Group update failed |
| `group_member_invite_clicked` | Add member button clicked |
| `group_member_invite_success` | Member invited/added |
| `group_member_invite_failed` | Invite failed |
| `group_leave_clicked` | Leave group initiated |
| `group_leave_success` | Left group successfully |
| `group_leave_failed` | Leave failed |
| `group_share_clicked` | Share group button clicked |

### Friend Events
| Event | When |
|-------|------|
| `friend_detail_opened` | Friend show page loaded |
| `friend_remove_clicked` | Remove friend initiated |
| `friend_remove_success` | Friend removed |
| `friend_remove_failed` | Remove failed |
| `friend_share_clicked` | Share debt/balance with friend |

### Profile Events
| Event | When |
|-------|------|
| `profile_opened` | Profile page loaded |
| `profile_avatar_clicked` | Avatar tapped |
| `profile_edit_clicked` | Edit profile button clicked |
| `profile_update_submitted` | Profile save submitted |
| `profile_update_success` | Profile updated |
| `profile_update_failed` | Profile update failed |

### Settings Events
| Event | When |
|-------|------|
| `settings_opened` | Settings page loaded |
| `settings_bank_save_submitted` | Bank settings save clicked |
| `settings_bank_save_success` | Bank settings saved |
| `settings_bank_save_failed` | Bank settings save failed |
| `settings_payment_save_submitted` | Payment method settings saved |
| `settings_payment_save_success` | Payment settings saved |
| `settings_payment_save_failed` | Payment settings save failed |

### Report Events
| Event | When |
|-------|------|
| `report_generated` | Report preview generated |
| `report_exported` | Report exported (CSV/PDF) |

### Share Events
| Event | When |
|-------|------|
| `share_link_generated` | Share link created |
| `share_button_clicked` | Share button tapped |
| `share_method_selected` | User picks share method |
| `share_completed` | Share completed |
| `share_failed` | Share failed |

### Dashboard Events
| Event | When |
|-------|------|
| `dashboard_tab_changed` | User switches dashboard tab |
| `dashboard_balance_card_clicked` | Balance row tapped |
| `dashboard_activity_item_clicked` | Activity item tapped |
| `dashboard_fab_clicked` | Floating action button tapped |

---

## Adding a New Event

1. Pick an event name following `<area>_<object>_<action>` convention.
2. Add it to the `JourneyEventName` union in `src/lib/journey-tracking/types.ts` (optional — tracker accepts any string).
3. Call `track()` in the component:

```typescript
const { track } = useTrackEvent();

// Simple
track('expense_create_button_clicked');

// With context
track({
  eventName: 'expense_create_success',
  expenseId: id,
  groupId: groupId,
  resultStatus: 'success',
});

// With extra properties
track({
  eventName: 'report_exported',
  properties: { format: 'pdf', preset: 'monthly' },
});
```

4. For service-level (non-React) code, use `trackEvent()` directly from `@/lib/analytics/track`.

---

## Development Debug Logging

In development mode, every `trackEvent` call logs to the browser console with color:

```
[Analytics] expense_create_success
  user: Long Nguyễn (member)
  page: /expenses/create
  properties: { expense_id: "...", result_status: "success", ... }
  timestamp: 2026-05-16T...
```

Blocked sensitive fields also emit a warning:
```
[Analytics] Blocked sensitive field: "access_token"
```

To inspect all tracked events in dev, open DevTools → Console and filter by `[Analytics]`.

---

## Architecture Reference

```
useTrackEvent (hook)
  └─ setUserDisplay()         ← sync identity metadata
  └─ trackEvent()             ← src/lib/analytics/track.ts
       ├─ sanitize props      ← block sensitive fields
       ├─ validate name       ← <area>_<object>_<action>
       ├─ enrich properties   ← page_path, language, user display
       ├─ dev console log
       └─ journeyTracking.trackEvent()  ← backend funnel tracking

AnalyticsManager (Vercel)
  └─ TrackerClasses           ← AuthTracker, ExpenseTracker, etc.
       └─ analyticsManager.trackEvent(event)
            └─ enrichEvent()  ← auto-attach user display + session + build info
            └─ VercelAnalyticsProvider.track()
```
