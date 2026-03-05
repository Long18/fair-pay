# FairPay Haptic Feedback Scout Report

**Date**: 2026-03-04  
**Project**: FairPay (React 19 + Refine v5 + Supabase + TypeScript)  
**Scope**: Identify all user interaction points for haptic feedback integration

## Executive Summary

FairPay is a modern expense-sharing web app with rich interactive UI. Identified 80+ interaction points across button clicks, form submissions, navigation, financial transactions, and destructive actions. Haptic feedback would enhance user experience especially on:
- Financial transaction actions (settle, pay)
- Destructive operations (delete, remove)
- Form submissions & validations
- Navigation & modal transitions
- Toggle/switch interactions

## Project Foundation

**Entry Points:**
- `/Users/long.lnt/Desktop/Projects/FairPay/src/index.tsx` - React DOM mount
- `/Users/long.lnt/Desktop/Projects/FairPay/src/App.tsx` - Main Refine app shell
- `/Users/long.lnt/Desktop/Projects/FairPay/src/pages/dashboard.tsx` - Primary dashboard (active tab switching)

**Package Manager:** pnpm  
**Notification System:** Sonner (toast-based)  
**Gesture Support:** `use-touch-interactions.ts` hook already exists for swipe detection

## 1. CRITICAL INTERACTIVE COMPONENTS

### 1.1 Floating Action Button (FAB)
**File:** `/Users/long.lnt/Desktop/Projects/FairPay/src/components/dashboard/core/FloatingActionButton.tsx`

**Interactions:**
- Line 73: Main FAB toggle `toggleMenu()` - Opens/closes action menu
- Line 104: Sub-action buttons `onClick={() => handleClick(action.path)}` 
  - Add Expense (primary action)
  - Settle Up (green, financial)
  - Create Group (blue)
  - Invite Friend (purple)
- Line 87: Backdrop click to close menu

**Haptic Opportunities:**
- Toggle open/close (light haptic)
- Sub-action selection (medium haptic per action type)
- Color-coded feedback (green for settle = success haptic)

---

### 1.2 Dashboard Main Actions
**File:** `/Users/long.lnt/Desktop/Projects/FairPay/src/components/dashboard/core/quick-actions.tsx`

**Interactions:**
- Line 13: Create Group button → `go({ to: "/groups/create" })`
- Line 21: Add Expense button → `go({ to: "/groups" })`

**Haptic Opportunities:**
- Navigation trigger (light haptic)

---

### 1.3 Bulk Action Operations

#### 1.3.1 Bulk Action Bar
**File:** `/Users/long.lnt/Desktop/Projects/FairPay/src/components/bulk-operations/BulkActionBar.tsx`

**Interactions:**
- Line 37: Delete button `onClick={onDelete}` - Destructive operation
- Line 47: Cancel button `onClick={onCancel}`

**Haptic Opportunities:**
- Delete action (strong destructive haptic)
- Cancel (light dismiss haptic)

#### 1.3.2 Bulk Delete Dialog
**File:** `/Users/long.lnt/Desktop/Projects/FairPay/src/components/bulk-operations/BulkDeleteDialog.tsx`

**Interactions:**
- Line 72: Confirm delete button `onClick={onConfirm}` - Destructive confirmation
- Line 68: Cancel button

**Haptic Opportunities:**
- Confirmation modal appears (success/warning pattern)
- Destructive action confirmation (strong haptic)

#### 1.3.3 Settle All Dialog
**File:** `/Users/long.lnt/Desktop/Projects/FairPay/src/components/bulk-operations/SettleAllDialog.tsx`

**Interactions:**
- Line 82: Settle All button `onClick={onConfirm}` - Financial transaction
- Line 79: Cancel button

**Haptic Opportunities:**
- Financial action confirmation (success haptic)
- Bulk settlement (impact-level haptic based on count)

---

## 2. FORM & SUBMISSION INTERACTIONS

### 2.1 Authentication Forms
**Files:**
- `/Users/long.lnt/Desktop/Projects/FairPay/src/components/refine-ui/form/sign-in-form.tsx`
- `/Users/long.lnt/Desktop/Projects/FairPay/src/components/refine-ui/form/sign-up-form.tsx`
- `/Users/long.lnt/Desktop/Projects/FairPay/src/components/refine-ui/form/forgot-password-form.tsx`
- `/Users/long.lnt/Desktop/Projects/FairPay/src/components/refine-ui/form/update-password-form.tsx`

**Haptic Opportunities:**
- Form submission (medium haptic)
- Password visibility toggle (light)
- OTP input completion (success haptic)

### 2.2 Settings Forms
**Files:**
- `/Users/long.lnt/Desktop/Projects/FairPay/src/modules/settings/components/bank-settings.tsx`
- `/Users/long.lnt/Desktop/Projects/FairPay/src/modules/settings/components/sepay-settings.tsx`
- `/Users/long.lnt/Desktop/Projects/FairPay/src/modules/settings/components/momo-settings.tsx`

**Toast Notifications (Success):**
- Line ~18: `toast.success('Bank settings saved successfully')`
- Line ~24: `toast.error('Failed to save bank settings')`
- Line ~35: `toast.success('SePay settings saved successfully')`
- Line ~44: `toast.success('MoMo settings saved successfully')`

**Haptic Opportunities:**
- Save success (success haptic)
- Save error (error haptic pattern)

---

## 3. BALANCE & DEBT INTERACTIONS

### 3.1 Balance Row
**File:** `/Users/long.lnt/Desktop/Projects/FairPay/src/components/dashboard/balance/BalanceRow.tsx`

**Interactions:**
- Line 33: Row click navigation (clickable balance item)
- Line 37: Hover state activation

**Haptic Opportunities:**
- Balance row click (light haptic)
- Pending email state indication (warning haptic)

### 3.2 Enhanced Activity Row
**File:** `/Users/long.lnt/Desktop/Projects/FairPay/src/components/dashboard/activity/enhanced-activity-row.tsx`

**Interactions:**
- Line 68: Row click → `go({ to: '/expenses/show/${activity.id}' })`
- Line 78: Quick view button
- Line 83: Bulk settlement action `go({ to: '/expenses/show/${activity.id}?action=settle' })`
- Line 73: Expand button click

**Haptic Opportunities:**
- Row selection/expansion (light)
- Settlement action (success haptic)
- Navigation between activities (light)

### 3.3 Contributing Expense Item
**File:** `/Users/long.lnt/Desktop/Projects/FairPay/src/components/dashboard/core/contributing-expense-item.tsx`

**Interactions:**
- Line 48: Item click navigation → `go({ to: '/expenses/show/${id}' })`

**Haptic Opportunities:**
- Expense item click (light haptic)

---

## 4. SETTLEMENT & FINANCIAL TRANSACTIONS

### 4.1 Settlement Button
**File:** `/Users/long.lnt/Desktop/Projects/FairPay/src/components/groups/settlement-button.tsx`

**Interactions:**
- Line 24: Settlement button `onClick={onClick}` - Financial transaction action

**Haptic Opportunities:**
- Settlement trigger (success haptic - medium)
- Disabled state (warning if no balance)

### 4.2 Payment Dialogs
**Files:**
- `/Users/long.lnt/Desktop/Projects/FairPay/src/modules/payments/components/vietqr-payment-dialog.tsx`
- `/Users/long.lnt/Desktop/Projects/FairPay/src/modules/payments/components/sepay-payment-dialog.tsx`
- `/Users/long.lnt/Desktop/Projects/FairPay/src/modules/payments/components/momo-payment-dialog.tsx`
- `/Users/long.lnt/Desktop/Projects/FairPay/src/modules/payments/components/banking-payment-dialog.tsx`

**Interactions:**
- Copy account/reference code buttons → `toast.success('Account number copied!')`
- Bank app launch buttons
- Payment verification buttons

**Haptic Opportunities:**
- Copy action (light haptic)
- App launch attempt (medium)
- Payment verification success (strong success haptic)
- Payment QR scan prompt (info haptic)

---

## 5. TOGGLE & SWITCH INTERACTIONS

### 5.1 Switch Component
**File:** `/Users/long.lnt/Desktop/Projects/FairPay/src/components/ui/switch.tsx`

**Interactions:**
- Line 13-20: Radix Switch toggle state

**Haptic Opportunities:**
- Toggle on/off (light toggle haptic per state)

### 5.2 Language Toggle
**File:** `/Users/long.lnt/Desktop/Projects/FairPay/src/components/ui/language-toggle.tsx`

**Interactions:**
- Language selection buttons

**Haptic Opportunities:**
- Language switch (light UI preference change haptic)

### 5.3 Filter & Sort Controls
**Files:**
- `/Users/long.lnt/Desktop/Projects/FairPay/src/components/filters/expense-filters-panel.tsx`
- `/Users/long.lnt/Desktop/Projects/FairPay/src/components/dashboard/activity/activity-filter-controls.tsx`
- `/Users/long.lnt/Desktop/Projects/FairPay/src/components/dashboard/activity/activity-sort-controls.tsx`

**Interactions:**
- Filter chip clicks
- Apply filters button
- Clear filters button
- Sort option selection

**Haptic Opportunities:**
- Filter activation (light)
- Sort selection (light)

---

## 6. MODAL & DIALOG INTERACTIONS

### 6.1 Alert Dialogs
**Files using AlertDialog:**
- `BulkDeleteDialog.tsx` (destructive)
- `SettleAllDialog.tsx` (financial confirmation)
- Multiple payment confirmation dialogs

**Interactions:**
- Modal open (backdrop appears)
- Action buttons (confirm/cancel)

**Haptic Opportunities:**
- Modal appearance (light success/warning pattern)
- Destructive action confirmation (strong)
- Financial confirmation (success pattern)

### 6.2 Sheet & Drawer
**Files:**
- `/Users/long.lnt/Desktop/Projects/FairPay/src/components/ui/sheet.tsx`
- `/Users/long.lnt/Desktop/Projects/FairPay/src/components/ui/drawer.tsx`

**Haptic Opportunities:**
- Bottom sheet open/close (swipe gesture)
- Drawer appearance (light)

---

## 7. GESTURE-BASED INTERACTIONS

### 7.1 Existing Gesture Support
**File:** `/Users/long.lnt/Desktop/Projects/FairPay/src/hooks/ui/use-touch-interactions.ts`

**Exported Utilities:**
- `useSwipeGesture()` - Swipe detection (up/down/left/right)
- `useSwipeToDismiss()` - Drag-to-dismiss with framer-motion
- `usePullToRefresh()` - Pull-to-refresh functionality
- `useHasTouch()` - Touch capability detection
- `getTouchTargetClass()` - Minimum touch target sizing (44px)

**Haptic Opportunities:**
- Swipe gesture completion (directional haptics)
- Pull-to-refresh (loading haptic)
- Dismiss gestures (light dismiss feedback)

### 7.2 Swipeable Card Component
**File:** `/Users/long.lnt/Desktop/Projects/FairPay/src/components/ui/swipeable-card.tsx`

**Interactions:**
- Line ~50: Swipe action click handlers → `action.onClick()`

**Haptic Opportunities:**
- Swipe completion (action-specific haptic)
- Action button press (medium)

---

## 8. PAGINATION & LIST NAVIGATION

### 8.1 Pagination Controls
**File:** `/Users/long.lnt/Desktop/Projects/FairPay/src/components/ui/pagination-controls.tsx`

**Interactions:**
- Line ~28-45: Page number clicks, next/prev buttons → `onPageChange(page)`

**Haptic Opportunities:**
- Page change (light haptic)

### 8.2 Bottom Navigation
**File:** `/Users/long.lnt/Desktop/Projects/FairPay/src/components/ui/bottom-navigation.tsx`

**Interactions:**
- Tab selection buttons → `onClick={onClick}`

**Haptic Opportunities:**
- Tab switch (light)

---

## 9. NOTIFICATION & TOAST SYSTEM

### 9.1 Toast Provider
**File:** `/Users/long.lnt/Desktop/Projects/FairPay/src/components/refine-ui/notification/use-notification-provider.tsx`

**Types:**
- Line 16-22: Success toast → `toast.success(message)`
- Line 24-30: Error toast → `toast.error(message)`
- Line 32-52: Progress/undoable toast

**Toast Triggers Across App:**
- API secret creation/revocation
- Bank settings save/clear
- SePay settings save/clear
- MoMo settings save/clear
- Donation settings update
- Payment operations (copy, verify, launch)
- Form submissions

**Haptic Opportunities:**
- Success toast (success haptic)
- Error toast (error/warning haptic)
- Progress indication (loading pattern)
- Toast dismissal (light dismiss)

---

## 10. EXPANDABLE & COLLAPSIBLE COMPONENTS

### 10.1 Expandable Card
**File:** `/Users/long.lnt/Desktop/Projects/FairPay/src/components/ui/expandable-card.tsx`

**Interactions:**
- Card expansion toggle

**Haptic Opportunities:**
- Expand/collapse (light toggle)

### 10.2 Accordion
**File:** `/Users/long.lnt/Desktop/Projects/FairPay/src/components/ui/accordion.tsx`

**Haptic Opportunities:**
- Accordion item expand/collapse (light)

### 10.3 Debt Month Groups
**File:** `/Users/long.lnt/Desktop/Projects/FairPay/src/components/debts/debt-month-group.tsx`

**Interactions:**
- Settled items expansion toggle

**Haptic Opportunities:**
- Group expansion (light toggle)

---

## 11. NAVIGATION ACTIONS

### 11.1 Router Navigation Points

**Critical Navigation (Financial/Important):**
- `/expenses/create` - Create expense (medium haptic)
- `/expenses/show/{id}` - View expense detail (light)
- `/expenses/show/{id}?action=settle` - Settlement intent (success haptic)
- `/payments/create` - Create payment (success haptic)
- `/groups/create` - Create group (medium)
- `/groups/show/{id}` - View group (light)
- `/debts/{counterpartyId}` - View debt breakdown (medium)
- `/profile/{userId}` - View profile (light)

**Navigation Implemented Via:**
- `useGo()` hook from Refine
- `useNavigate()` from React Router (in mobile app bar)
- Links in navbar, FAB, quick actions, activity rows

**Haptic Opportunities:**
- Financial navigation (settle, pay) = success pattern
- Destructive navigation (delete flow) = warning pattern
- View/read navigation = light
- List/group navigation = medium

---

## 12. SPECIFIC INTERACTION HOTSPOTS

### High Priority (Haptic Strongly Recommended)

| Component | File | Interaction | Type | Reason |
|-----------|------|-------------|------|--------|
| Bulk Delete | `BulkDeleteDialog.tsx:72` | Confirm delete | Destructive | Irreversible action |
| Settle All | `SettleAllDialog.tsx:82` | Confirm settle | Financial | Money involved |
| Settlement Button | `settlement-button.tsx:24` | Pay recipient | Financial | Money transaction |
| FAB Primary | `FloatingActionButton.tsx:148` | Open/close menu | Visual Feedback | Central interaction hub |
| Payment Verify | `momo-payment-dialog.tsx` | Verify payment | Financial | Critical confirmation |
| Bank Settings Save | `bank-settings.tsx:~18` | Save settings | State Change | Critical config |

### Medium Priority (Haptic Recommended)

| Component | File | Interaction | Type | Reason |
|-----------|------|-------------|------|--------|
| Activity Row | `enhanced-activity-row.tsx:68` | Navigate to expense | Navigation | Common action |
| Balance Row | `BalanceRow.tsx:33` | Click balance | Navigation | Frequent use |
| Filter Apply | `expense-filters-panel.tsx` | Apply filters | UI State | Important filtering |
| Form Submit | `sign-in-form.tsx` | Submit form | Form Action | Auth critical |
| Expand Details | `enhanced-activity-row.tsx:73` | Expand item | UI Toggle | Detail reveal |

### Lower Priority (Optional Haptic)

| Component | File | Interaction | Type | Reason |
|-----------|------|-------------|------|--------|
| Language Toggle | `language-toggle.tsx` | Switch language | Preference | UI setting |
| Pagination | `pagination-controls.tsx` | Page change | Navigation | List browsing |
| Tab Navigation | `tab-navigation.tsx` | Switch tab | View Switch | Local navigation |

---

## 13. NOTIFICATION PATTERNS PRESENT

Already using Sonner toast system with 3 types:

1. **Success Toast** - Used for:
   - Settings save operations
   - Payment confirmations
   - Copy-to-clipboard actions
   - API operations
   
2. **Error Toast** - Used for:
   - Failed saves
   - Validation errors
   - API failures

3. **Info Toast** - Used for:
   - QR code scan prompts
   - General information
   - Progress messages

**Integration Point:** All use `toast.success()`, `toast.error()`, `toast.info()` from Sonner library.

---

## 14. EXISTING ANIMATION FRAMEWORK

**Framework:** Framer Motion (v12.24.10)

**Existing Animations:**
- FAB entrance/exit animations (staggered, line 115-120)
- Activity row expand animations
- Modal fade-in animations
- Swipe-to-dismiss animations

**Implication:** Haptic API calls should sync with animation timings for cohesive UX.

---

## 15. DEVICE CAPABILITY DETECTION

**Touch Detection Already Present:**
```typescript
// File: use-touch-interactions.ts:260-273
export function useHasTouch(): boolean {
  const [hasTouch, setHasTouch] = useState(false);
  useEffect(() => {
    setHasTouch(
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0
    );
  }, []);
  return hasTouch;
}
```

**Recommendation:** Reuse this hook before triggering haptic feedback.

---

## 16. IMPLEMENTATION RECOMMENDATIONS

### 16.1 Create Utility Hook
**Suggested Location:** `/Users/long.lnt/Desktop/Projects/FairPay/src/hooks/ui/use-haptic-feedback.ts`

```typescript
export function useHapticFeedback() {
  const hasTouch = useHasTouch();
  
  const patterns = {
    light: () => { /* 20ms, light intensity */ },
    medium: () => { /* 40ms, medium */ },
    success: () => { /* success pattern */ },
    warning: () => { /* warning pattern */ },
    destructive: () => { /* destructive pattern */ },
  };
  
  return { trigger: (pattern) => { ... } };
}
```

### 16.2 Wrapper Components
Create HAF-enabled button wrapper:
- `/Users/long.lnt/Desktop/Projects/FairPay/src/components/ui/haptic-button.tsx`

### 16.3 Priority Implementation Order
1. Destructive actions (delete, remove)
2. Financial transactions (settle, pay)
3. Form submissions (login, settings save)
4. Navigation triggers (especially settlement flow)
5. Toggle/switch interactions
6. Gesture completions

---

## 17. FILES REQUIRING HAPTIC INTEGRATION

**High Priority Files (30):**
- `src/components/dashboard/core/FloatingActionButton.tsx` (4 interactions)
- `src/components/bulk-operations/BulkDeleteDialog.tsx` (2 interactions)
- `src/components/bulk-operations/SettleAllDialog.tsx` (2 interactions)
- `src/components/groups/settlement-button.tsx` (1 interaction)
- `src/components/dashboard/activity/enhanced-activity-row.tsx` (3 interactions)
- `src/modules/payments/components/momo-payment-dialog.tsx` (3 interactions)
- `src/modules/settings/components/bank-settings.tsx` (2 interactions)
- `src/modules/settings/components/sepay-settings.tsx` (2 interactions)
- `src/modules/settings/components/momo-settings.tsx` (2 interactions)
- `src/components/refine-ui/form/sign-in-form.tsx` (1 interaction)
- `src/components/refine-ui/form/sign-up-form.tsx` (1 interaction)
- `src/components/refine-ui/form/update-password-form.tsx` (1 interaction)
- `src/components/dashboard/balance/BalanceRow.tsx` (1 interaction)
- `src/components/dashboard/core/contributing-expense-item.tsx` (1 interaction)
- `src/components/dashboard/core/quick-actions.tsx` (2 interactions)
- `src/components/ui/swipeable-card.tsx` (1 interaction)
- `src/components/ui/button.tsx` (base - 0 changes, inherit from parent)
- Plus 13 more files...

**Medium Priority Files (20):**
- All payment dialog components
- Filter panel components
- Pagination components
- Navigation components

**Low Priority Files (15):**
- Language toggle
- Theme selector
- Settings components (non-critical)
- Help/documentation pages

---

## 18. UNRESOLVED QUESTIONS

1. **Browser Compatibility Target?**
   - Vibration API works on Android, limited iOS support
   - Recommend feature detection with graceful degradation

2. **Haptic Pattern Library?**
   - Use native `navigator.vibrate()` or third-party library?
   - Recommend: Custom hook wrapper for flexibility

3. **Intensity/Duration Standards?**
   - Define company standard for light/medium/heavy patterns
   - Suggest: Light=20ms, Medium=40ms, Heavy=60ms

4. **Accessibility Considerations?**
   - Some users disable vibration for privacy/battery
   - Recommend: Make optional, respect system settings

5. **Analytics Tracking?**
   - Should haptic interactions be tracked?
   - Recommend: Optional analytics flag in hook

---

## Summary Statistics

- **Total Interactive Components:** 80+
- **High-Priority Interactions:** 35
- **Medium-Priority Interactions:** 25
- **Low-Priority Interactions:** 20+
- **Existing Gesture Hooks:** 5 (swipe, pull-refresh, touch detection)
- **Toast/Notification Points:** 25+
- **Navigation Entry Points:** 15+
- **Modal/Dialog Count:** 8+

**Recommended Implementation Effort:** 2-3 weeks (phased approach)

---

Generated: 2026-03-04
