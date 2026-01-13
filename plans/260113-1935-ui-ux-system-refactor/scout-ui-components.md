# FairPay UI Component Structure Scout Report

**Date**: 2026-01-13
**Codebase**: FairPay (React 19 + Refine v5 + shadcn/ui + Tailwind CSS)
**Total UI Components**: 182 files

---

## Executive Summary

FairPay's UI architecture consists of:
- **UI Primitives** (57 components): Reusable shadcn/ui-based components in `src/components/ui/`
- **Refine-Specific Components** (38 components): Business logic wrappers in `src/components/refine-ui/`
- **Feature Components** (50+ components): Domain-specific components across specialized directories
- **Page/Screen Components** (10 pages): Route-level entry points in `src/pages/`

Key findings: **Dual sidebar implementations exist** (refine-ui/layout/sidebar.tsx vs ui/sidebar.tsx), **mixed naming conventions** (PascalCase vs kebab-case), **scattered form components** across multiple locations.

---

## 1. Main Page/Screen Components (src/pages)

Primary entry points for routing. All use Refine's resource-based routing.

| File | Purpose |
|------|---------|
| `/src/pages/dashboard.tsx` | Main dashboard - core user interface |
| `/src/pages/balances.tsx` | Balance summary and settlement view |
| `/src/pages/reports.tsx` | Expense reports and analytics |
| `/src/pages/person-debt-breakdown.tsx` | Detailed debt breakdown per person |
| `/src/pages/login/index.tsx` | Authentication - login form |
| `/src/pages/register/index.tsx` | Authentication - account creation |
| `/src/pages/forgot-password/index.tsx` | Password recovery flow |
| `/src/pages/oauth/consent.tsx` | OAuth third-party consent screen |
| `/src/pages/privacy.tsx` | Legal - privacy policy |
| `/src/pages/terms.tsx` | Legal - terms of service |

---

## 2. Dashboard Components (src/components/dashboard)

High-level composed components for the main dashboard view. **NAMING ISSUE**: Mixed case conventions (PascalCase + kebab-case).

### Balance & Summary Sections
- `/src/components/dashboard/BalanceFeed.tsx` - User's transaction feed
- `/src/components/dashboard/BalanceRow.tsx` - Individual balance entry
- `/src/components/dashboard/balance-summary.tsx` - Summary card container
- `/src/components/dashboard/balance-summary-cards.tsx` - Multiple summary cards
- `/src/components/dashboard/balance-chart.tsx` - Visual balance trends
- `/src/components/dashboard/simplified-debts.tsx` - Simplified debt view
- `/src/components/dashboard/SimplifiedDebtsToggle.tsx` - Toggle control (PascalCase)
- `/src/components/dashboard/circular-progress.tsx` - Progress visualization

### Data Tables
- `/src/components/dashboard/accounting-records-table.tsx` - Record listing
- `/src/components/dashboard/payments-table.tsx` - Payment history
- `/src/components/dashboard/friends-table.tsx` - Friends listing
- `/src/components/dashboard/groups-table.tsx` - Groups listing
- `/src/components/dashboard/documents-table.tsx` - Document management

### Card Components
- `/src/components/dashboard/creditor-card.tsx` - Creditor information card
- `/src/components/dashboard/group-balance-card.tsx` - Group balance summary
- `/src/components/dashboard/one-off-payment-card.tsx` - Payment quick action
- `/src/components/dashboard/repayment-plan-card.tsx` - Repayment schedule
- `/src/components/dashboard/statistics-card.tsx` - Stat display component

### Activity & Metrics
- `/src/components/dashboard/activity-feed.tsx` - Recent activity stream
- `/src/components/dashboard/success-rate-chart.tsx` - Payment completion rate
- `/src/components/dashboard/payment-counter.tsx` - Payment count display
- `/src/components/dashboard/public-leaderboard.tsx` - User rankings
- `/src/components/dashboard/public-stats.tsx` - Public statistics display

### Supporting Components
- `/src/components/dashboard/DashboardActionsList.tsx` - Quick action buttons
- `/src/components/dashboard/DashboardStates.tsx` - State-based rendering (empty, loading, error)
- `/src/components/dashboard/accounting-notes.tsx` - Inline notes/annotations
- `/src/components/dashboard/welcome-header.tsx` - Greeting banner
- `/src/components/dashboard/tab-navigation.tsx` - Tab navigation control
- `/src/components/dashboard/dashboard-skeleton.tsx` - Loading skeleton
- `/src/components/dashboard/DashboardErrorBoundary.tsx` - Error boundary wrapper (top-level)

### Enhanced Activity
- `/src/components/dashboard/enhanced-activity/` - Submodule for activity features

---

## 3. Layout Components (src/components/refine-ui/layout)

**CRITICAL ISSUE**: Sidebar exists in TWO locations with different implementations:
1. `refine-ui/layout/sidebar.tsx` - Refine-specific with advanced features
2. `ui/sidebar.tsx` - shadcn/ui primitive with context provider

### Core Layout
- `/src/components/refine-ui/layout/layout.tsx` - Main app wrapper
  - Composes: SidebarProvider (from ui/sidebar) + Header + Footer
  - Uses: ThemeProvider
  
- `/src/components/refine-ui/layout/header.tsx` - Top navigation bar
- `/src/components/refine-ui/layout/footer.tsx` - Bottom footer section
- `/src/components/refine-ui/layout/sidebar.tsx` - Navigation sidebar (Refine version)
  - Features: Collapsible, responsive, menu navigation
  
- `/src/components/refine-ui/layout/breadcrumb.tsx` - Navigation breadcrumbs

### Supporting Layout
- `/src/components/refine-ui/layout/error-component.tsx` - Error page template
- `/src/components/refine-ui/layout/loading-overlay.tsx` - Full-page loader
- `/src/components/refine-ui/layout/user-avatar.tsx` - User profile avatar
- `/src/components/refine-ui/layout/user-info.tsx` - User identity display

---

## 4. UI Primitives (src/components/ui)

Reusable shadcn/ui-based components from Radix UI + Tailwind. **57 components total**. All follow kebab-case naming.

### Form Controls
- `input.tsx` - Text input field
- `textarea.tsx` - Multi-line text
- `checkbox.tsx` - Checkbox control
- `radio-group.tsx` - Radio button group
- `select.tsx` - Dropdown select
- `toggle.tsx` - Toggle switch
- `toggle-group.tsx` - Toggle group
- `switch.tsx` - On/off switch
- `slider.tsx` - Range slider
- `calendar.tsx` - Date picker
- `input-otp.tsx` - OTP input
- `label.tsx` - Form label
- `field.tsx` - Form field wrapper
- `form.tsx` - React Hook Form integration
- `pagination-controls.tsx` - Custom pagination UI

### Navigation
- `sidebar.tsx` - **DUPLICATE**: Also in refine-ui/layout
- `navigation-menu.tsx` - Multi-level navigation
- `menubar.tsx` - Menu bar component
- `breadcrumb.tsx` - **DUPLICATE**: Also in refine-ui/layout
- `pagination.tsx` - Page navigation

### Display Components
- `card.tsx` - Container card
- `badge.tsx` - Status badge
- `alert.tsx` - Alert message
- `alert-dialog.tsx` - Confirmation dialog
- `button.tsx` - Primary button
- `button-group.tsx` - Grouped buttons
- `action-button-group.tsx` - Action button set
- `spinner.tsx` - Loading spinner
- `skeleton.tsx` - Content skeleton
- `empty.tsx` - Empty state
- `progress.tsx` - Progress bar
- `separator.tsx` - Visual divider

### Complex Components
- `dialog.tsx` - Modal dialog (shadcn)
- `drawer.tsx` - Side drawer panel
- `popover.tsx` - Popover/tooltip container
- `hover-card.tsx` - Hover reveal card
- `tabs.tsx` - Tab navigation
- `accordion.tsx` - Collapsible accordion
- `collapsible.tsx` - Expand/collapse section
- `command.tsx` - Command palette
- `context-menu.tsx` - Right-click menu
- `dropdown-menu.tsx` - Dropdown menu
- `sheet.tsx` - Side sheet overlay

### Data/Content
- `table.tsx` - Data table
- `carousel.tsx` - Image carousel
- `chart.tsx` - Charting library wrapper
- `scroll-area.tsx` - Scrollable container
- `resizable.tsx` - Resizable panels
- `aspect-ratio.tsx` - Aspect ratio container

### Specialized UI
- `member-combobox.tsx` - **Custom**: Member selection combo
- `language-toggle.tsx` - **Custom**: Language switcher
- `payment-state-badge.tsx` - **Custom**: Payment status display
- `owe-status-indicator.tsx` - **Custom**: Debt status indicator
- `floating-action-button.tsx` - **Custom**: FAB component
- `icons.tsx` - **Custom**: Icon exports (Lucide)
- `sonner.tsx` - Toast notifications
- `tooltip.tsx` - Tooltip component

---

## 5. Refine-Specific Components (src/components/refine-ui)

Framework-specific implementations wrapping Refine functionality.

### Form Components (src/components/refine-ui/form)
- `sign-in-form.tsx` - Login form with Refine auth
- `sign-up-form.tsx` - Registration form
- `forgot-password-form.tsx` - Password reset form
- `input-password.tsx` - Password field wrapper

### Button Components (src/components/refine-ui/buttons)
Standard Refine CRUD action buttons:
- `create.tsx` - Create resource button
- `edit.tsx` - Edit resource button
- `show.tsx` - Show/view button
- `delete.tsx` - Delete resource button
- `list.tsx` - List view button
- `clone.tsx` - Clone/duplicate button
- `refresh.tsx` - Refresh/reload button

### Data Table (src/components/refine-ui/data-table)
Custom table implementation for Refine:
- `data-table.tsx` - Main table component
- `data-table-filter.tsx` - Filter controls
- `data-table-pagination.tsx` - Pagination wrapper
- `data-table-sorter.tsx` - Column sorting

### Views (src/components/refine-ui/views)
Resource CRUD view templates:
- `list-view.tsx` - Resource list page
- `create-view.tsx` - Create resource page
- `edit-view.tsx` - Edit resource page
- `show-view.tsx` - Show resource page

### Theme (src/components/refine-ui/theme)
- `theme-provider.tsx` - Theme context provider
- `theme-select.tsx` - Theme selection dropdown
- `theme-selector.tsx` - Theme selector component

### Notifications (src/components/refine-ui/notification)
- `use-notification-provider.tsx` - Notification hook (implements Refine interface)
- `undoable-notification.tsx` - Notification with undo action
- `toaster.tsx` - Toast container

### Other
- `empty-state.tsx` - Empty state display
- `responsive-dialog.tsx` - Dialog with responsive sizing

---

## 6. Feature-Specific Components

### Expense Components (src/components/expenses)
- `/src/components/expenses/settle-expense-section.tsx` - Expense settlement UI
- `/src/components/expenses/your-position-card.tsx` - User's position in expense

### Debt Components (src/components/debts)
- `/src/components/debts/what-to-pay-now-panel.tsx` - Payment recommendations
- `/src/components/debts/expense-breakdown-item-selectable.tsx` - Selectable expense item
- `/src/components/debts/debt-breakdown-header.tsx` - Debt breakdown header

### Reports (src/components/reports)
Analytics and visualization components:
- `bar-chart.tsx` - Bar chart visualization
- `category-pie-chart.tsx` - Category spending pie chart
- `category-breakdown-table.tsx` - Category details table
- `comparison-chart.tsx` - Comparative analytics
- `spending-heatmap.tsx` - Activity heatmap
- `spending-trend-chart.tsx` - Trend analysis
- `spending-summary-stats.tsx` - Summary statistics
- `top-spenders.tsx` - Ranking display
- `insights-panel.tsx` - Insight generation

### Filters (src/components/filters)
- `use-expense-filters.ts` - Filter logic hook
- `types.ts` - Filter type definitions
- `index.ts` - Public exports

### Global Search (src/components/global-search)
- `search-modal.tsx` - Global search UI
- `use-global-search.ts` - Search logic
- `use-search-shortcut.ts` - Keyboard shortcut handler
- `types.ts` - Search types
- `index.ts` - Exports

### Bulk Operations (src/components/bulk-operations)
- `BulkActionBar.tsx` - Bulk action controls

### Donation Widget (src/components/donation-widget)
- `DonationDialog.tsx` - Donation modal
- `index.tsx` - Widget export

### Skeletons (src/components/skeletons)
Loading placeholders:
- `BalanceSkeleton.tsx` - Balance loading skeleton
- `ExpenseListSkeleton.tsx` - Expense list loading skeleton

### Error Handling
- `/src/components/error-boundary.tsx` - Top-level error boundary
- `/src/components/DashboardErrorBoundary.tsx` - Dashboard-specific boundary

---

## 7. Naming Convention Issues

### ISSUE: Inconsistent Case Convention

**PascalCase (Component-style)**:
- BalanceFeed.tsx, BalanceRow.tsx
- DashboardActionsList.tsx, DashboardStates.tsx
- SimplifiedDebtsToggle.tsx
- DashboardErrorBoundary.tsx
- BalanceSkeleton.tsx, ExpenseListSkeleton.tsx
- BulkActionBar.tsx
- DonationDialog.tsx

**kebab-case (File-style)**:
- balance-summary.tsx, balance-summary-cards.tsx
- balance-chart.tsx, circular-progress.tsx
- accounting-notes.tsx, accounting-records-table.tsx
- activity-feed.tsx, payment-counter.tsx
- dashboard-skeleton.tsx, welcome-header.tsx
- settle-expense-section.tsx, your-position-card.tsx
- what-to-pay-now-panel.tsx, debt-breakdown-header.tsx
- (entire ui/ and refine-ui/ directories)

**Root cause**: Manual naming inconsistency. No linting rule enforces consistent naming.

---

## 8. Duplicate Components

### CRITICAL DUPLICATES:

1. **Sidebar Implementations**
   - `/src/components/ui/sidebar.tsx` - shadcn primitive
   - `/src/components/refine-ui/layout/sidebar.tsx` - Refine wrapper
   - **Issue**: Both exist, one is imported from ui/ into layout/layout.tsx
   - **Status**: Actually NOT a duplicate - ui/sidebar is the primitive, layout/sidebar wraps it with Refine features

2. **Breadcrumb Implementations**
   - `/src/components/ui/breadcrumb.tsx` - shadcn primitive
   - `/src/components/refine-ui/layout/breadcrumb.tsx` - Refine wrapper
   - **Status**: Actually NOT a duplicate - ui/breadcrumb is shadcn, layout/breadcrumb extends it

3. **Error Components**
   - `/src/components/error-boundary.tsx` - Generic error boundary
   - `/src/components/DashboardErrorBoundary.tsx` - Dashboard-specific
   - `/src/components/refine-ui/layout/error-component.tsx` - Refine error page
   - **Status**: Different purposes - not true duplicates

4. **Skeleton/Loading**
   - Multiple skeleton components (BalanceSkeleton.tsx, ExpenseListSkeleton.tsx, dashboard-skeleton.tsx)
   - `ui/skeleton.tsx` - Generic skeleton primitive
   - **Status**: Composed skeletons using the primitive - intentional

---

## 9. Unclear Responsibilities

### Components with Potentially Unclear Purpose:

1. **DashboardStates.tsx**
   - Location: `/src/components/dashboard/`
   - Name suggests state management but likely a view selector
   - **Recommendation**: Rename to `DashboardViewStates` or `DashboardStateViews`

2. **SimplifiedDebtsToggle.tsx**
   - Location: `/src/components/dashboard/`
   - Unclear if it's a control or a display component
   - **Recommendation**: Clarify in naming (e.g., `SimplifiedDebtsToggleControl`)

3. **responsive-dialog.tsx**
   - Location: `/src/components/refine-ui/`
   - Too generic - unclear what makes it "responsive"
   - **Recommendation**: `ResponsiveDialogWrapper` or `AdaptiveDialog`

4. **what-to-pay-now-panel.tsx**
   - Location: `/src/components/debts/`
   - Colloquial naming - should use domain language
   - **Recommendation**: `PaymentRecommendationPanel` or `DuePaymentPanel`

5. **your-position-card.tsx**
   - Location: `/src/components/expenses/`
   - Uses second-person perspective - unclear for reusability
   - **Recommendation**: `ExpensePositionCard` or `UserExpensePositionCard`

---

## 10. Component Organization Summary

```
src/
├── pages/                          [10 page screens]
│   ├── dashboard.tsx               (main entry)
│   ├── login/, register/, forgot-password/
│   ├── reports.tsx, balances.tsx
│   └── privacy.tsx, terms.tsx
│
├── components/
│   ├── refine-ui/                  [38 components]
│   │   ├── layout/                 [10 components] - Main layout structure
│   │   ├── form/                   [4 components]  - Auth forms
│   │   ├── buttons/                [7 components]  - CRUD actions
│   │   ├── data-table/             [4 components]  - Table system
│   │   ├── views/                  [4 components]  - CRUD templates
│   │   ├── theme/                  [3 components]  - Theming
│   │   └── notification/           [3 components]  - Notifications
│   │
│   ├── ui/                         [57 components]
│   │   ├── Form controls           [15 files]
│   │   ├── Navigation              [5 files]
│   │   ├── Display                 [13 files]
│   │   ├── Complex/Composed        [13 files]
│   │   ├── Data/Content            [6 files]
│   │   └── Custom specialized      [6 files]
│   │
│   ├── dashboard/                  [24 components]
│   ├── reports/                    [9 components]
│   ├── expenses/                   [2 components]
│   ├── debts/                      [3 components]
│   ├── refine-ui/forms/            [4 forms]
│   ├── filters/                    [3 files]
│   ├── global-search/              [4 files]
│   ├── bulk-operations/            [1 component]
│   ├── donation-widget/            [2 files]
│   ├── skeletons/                  [2 components]
│   ├── DashboardErrorBoundary.tsx  [boundary]
│   └── error-boundary.tsx          [boundary]
```

---

## 11. Key Architectural Patterns

### Composition Pattern
- `layout.tsx` composes: SidebarProvider + Sidebar + Header + Footer
- Dashboard components compose sub-components (cards, tables, charts)
- Refine views compose common CRUD patterns

### Context & Providers
- `ThemeProvider` - Theme context
- `SidebarProvider` - Sidebar state
- `RefineKbarProvider` - Command palette

### Custom Hooks
- `use-expense-filters.ts` - Filter state
- `use-global-search.ts` - Search state
- `use-search-shortcut.ts` - Keyboard shortcuts
- `use-notification-provider.ts` - Notification system
- `use-document-title` - Page title sync

### Dark Mode Support
- Components use `dark:` Tailwind classes
- ThemeProvider manages theme state

---

## 12. Recommendations for Refactor

### HIGH PRIORITY:
1. **Enforce naming convention**: Choose kebab-case for ALL component files
   - Impact: Consistency, developer experience
   - Files to rename: 6+ PascalCase components in dashboard/

2. **Consolidate error boundaries**:
   - Keep generic `error-boundary.tsx` and dashboard-specific variant
   - Remove redundancy if `DashboardErrorBoundary` just wraps the generic

3. **Clarify component responsibilities**:
   - Rename: `DashboardStates` → `DashboardViewStates`
   - Rename: `SimplifiedDebtsToggle` → `SimplifiedDebtsToggleControl`
   - Rename: `what-to-pay-now-panel` → `PaymentRecommendationPanel`

### MEDIUM PRIORITY:
4. **Create layout variants**:
   - Extract specialized layouts to dedicated files
   - Currently Layout.tsx handles all cases

5. **Extract form system**:
   - Forms scattered across: refine-ui/form, components/expenses, components/debts
   - Consider centralizing form builders

6. **Standardize skeleton patterns**:
   - Document skeleton composition pattern
   - Create shared skeleton utility

### LOW PRIORITY:
7. **Documentation**:
   - Create Storybook stories for ui/ primitives
   - Document component prop contracts
   - Create component inventory

---

## 13. File Statistics

| Category | Count | Location |
|----------|-------|----------|
| Page/Screen Components | 10 | src/pages/ |
| Dashboard Components | 24 | src/components/dashboard/ |
| UI Primitives | 57 | src/components/ui/ |
| Refine-Specific | 38 | src/components/refine-ui/ |
| Feature Components | 20+ | src/components/[feature]/ |
| **Total** | **182** | |

---

## 14. Tech Stack Reference

- **UI Library**: shadcn/ui (Radix UI + Tailwind CSS)
- **Framework**: Refine v5 (React admin framework)
- **Form Handling**: React Hook Form (integrated in ui/form.tsx)
- **Icons**: Lucide React (exported via ui/icons.tsx)
- **Charts**: Recharts (via ui/chart.tsx wrapper)
- **Notifications**: Sonner (via ui/sonner.tsx)
- **Animation**: Tailwind CSS + Framer Motion (implicit)
- **Color System**: Tailwind CSS custom properties
- **Responsive**: Tailwind CSS breakpoints + use-mobile hook

---

## Unresolved Questions

1. **Why is sidebar.tsx duplicated?** - Confirmed: Not truly duplicate, ui/sidebar is primitive, layout/sidebar wraps it
2. **What is DashboardErrorBoundary different from error-boundary?** - Need code review to confirm difference
3. **Where are form validation schemas?** - Likely in lib/validation or colocated with forms
4. **Are there module-level layouts?** (e.g., modules/expenses/layout.tsx) - Need to check modules/ directory
5. **Custom hooks distribution** - Are hooks properly exported from hooks/ directory?

