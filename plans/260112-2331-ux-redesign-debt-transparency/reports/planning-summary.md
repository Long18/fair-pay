# Planning Summary: FairPay UI/UX Redesign

**Plan ID:** 260112-2331-ux-redesign-debt-transparency
**Created:** 2026-01-12 23:31
**Planning Agent:** Planner
**Status:** Complete

## Executive Summary

Comprehensive 6-phase implementation plan created for FairPay UI/UX redesign based on real user feedback from Lucy's testing. Plan addresses 6 critical UX problems with focus on debt transparency, user-centric data display, and navigation expectations.

## Analysis Conducted

### 1. Codebase Structure Analysis
- Reviewed 135+ files across dashboard, profile, expense modules
- Identified current navigation patterns (BalanceTable → profile)
- Analyzed existing hooks for balance calculations and activity data
- Reviewed performance optimizations and mobile touch interactions

### 2. User Feedback Analysis
Lucy's testing revealed:
1. **Debt Opacity**: Can't understand what total debt includes
2. **Confusing Context**: Mixed shared/personal debts unclear
3. **Wrong Navigation**: Dashboard click → profile (expected breakdown)
4. **Cluttered Details**: Can't see "my share" in transactions
5. **Bugged Filters**: Users avoid due to unreliability
6. **Poor Readability**: Font hard to read

### 3. Current Implementation Review
- **Dashboard** (`src/pages/dashboard.tsx`): Shows BalanceTable, no breakdown
- **BalanceTable** (`src/components/dashboard/BalanceTable.tsx`): Navigates to profile (line 141, 242)
- **Profile** (`src/modules/profile/pages/show-unified.tsx`): General user info, not financial-focused
- **Expense Detail** (`src/modules/expenses/pages/show.tsx`): All participants shown equally, user's share not prominent

## Solution Architecture

### Key Decisions
1. **Create New Route**: `/debts/:userId` for person debt breakdown
2. **Update Navigation**: BalanceTable → debt breakdown (not profile)
3. **Component Hierarchy**: Emphasize "Your position" at expense detail top
4. **Progressive Disclosure**: Expandable sections for contributing expenses
5. **Typography System**: Consistent type scale across financial views

### New Components to Create
- `DebtBreakdownSection` - Expandable person rows on dashboard
- `PersonDebtBreakdownPage` - New page at `/debts/:userId`
- `YourPositionCard` - User's financial position summary
- `WhatToPayNowPanel` - Settlement action panel
- `ContributingExpensesList` - Expense breakdown with "my share"

### Hooks to Create
- `useContributingExpenses(userId)` - Fetch expenses with person
- `useDebtSummary(userId)` - Calculate net debt position
- `useSettleSplits()` - Mark expenses as settled

## Implementation Phases

### Phase 1: Typography & Readability (4-6 hours)
- Establish readable type scale
- Update Tailwind config with financial-optimized sizes
- Apply consistent typography across all screens
- Right-align amounts, mute metadata

**Files to Modify:** 7 files
**Files to Create:** 0 files
**Risk:** Low (CSS-only changes)

### Phase 2: Dashboard Debt Breakdown (8-12 hours)
- Add expandable debt breakdown section to dashboard
- Show contributing expenses per person
- Update BalanceTable navigation to debt breakdown page

**Files to Modify:** 2 files
**Files to Create:** 6 files (components + hook)
**Risk:** Medium (new database queries)

### Phase 3: Person Debt Breakdown Page (12-16 hours)
- Create NEW route `/debts/:userId`
- Header with person info + net position
- "What to Pay Now" panel with settlement CTA
- Contributing expenses with checkbox selection
- Profile as secondary action

**Files to Modify:** 1 file (App.tsx route)
**Files to Create:** 7 files (page + components + hooks)
**Risk:** Medium (new page, settlement logic)

### Phase 4: Expense Detail User-Centric (6-8 hours)
- Add "Your Position" section at top
- Emphasize user's row in participants table
- Add prominent "Settle" section
- Calculate and display net position

**Files to Modify:** 3 files
**Files to Create:** 3 files
**Risk:** Low (UI-only changes)

### Phase 5: Filters Stabilization (4-6 hours)
- Audit all filter functionality
- Fix filter count calculations
- Ensure sort order predictable
- Disable or fix unreliable filters

**Files to Modify:** 6 files (determined after audit)
**Files to Create:** 0 files
**Risk:** Low (isolated logic)

### Phase 6: Integration & Testing (4-6 hours)
- Test all redesigned screens
- Validate navigation flows
- Ensure typography consistency
- Verify accessibility (WCAG AA)
- Performance testing
- Cross-browser compatibility
- Acceptance criteria validation

**Files to Modify:** 0 files (testing only)
**Files to Create:** 1 file (test report)
**Risk:** None (testing phase)

## Total Effort Estimate

**38-54 hours** (approximately 5-7 working days)

## Success Criteria

All 6 acceptance criteria must pass:
- [ ] User identifies who they owe + which expenses in <10 seconds
- [ ] From Home to per-person breakdown in 1 click
- [ ] In person breakdown, see "my share per expense" without deep pages
- [ ] Filters correct or disabled (no half-working controls)
- [ ] Typography readable, amounts easy to scan
- [ ] Navigation matches expectations (no surprise redirects)

## Technical Constraints Respected

✅ Color theme unchanged
✅ Data model unchanged
✅ Focus on layout, hierarchy, interaction, copy, readability only

## Risk Assessment

**Low Risk:**
- Typography changes (isolated CSS)
- Expense detail UI (no logic changes)
- Filter fixes (isolated components)

**Medium Risk:**
- New database queries (contributing expenses)
- Navigation changes (user muscle memory)
- Settlement logic (affects financial data)

**High Risk:**
- None (no data model or backend changes)

## Dependencies

- Phase 3 depends on Phase 2 (debt breakdown UI patterns)
- Phase 6 depends on Phases 1-5 (integration testing)
- Phases 1, 4, 5 can run in parallel

## Unresolved Questions

1. Should profile page remain accessible via secondary button? (Recommended: Yes)
2. Should "Settle" action be inline or separate dialog? (Recommended: Inline)
3. Should filters be completely removed or disabled? (Recommended: Disable with "Coming soon")
4. Preferred font family for financial data? (Recommended: System fonts with tabular-nums)

## Files Created

1. `plan.md` - Overview and summary
2. `phase-01-typography-improvements.md` - Typography system
3. `phase-02-dashboard-debt-breakdown.md` - Dashboard improvements
4. `phase-03-person-debt-breakdown-page.md` - New debt breakdown page
5. `phase-04-expense-detail-user-centric.md` - Expense detail redesign
6. `phase-05-filters-stabilization.md` - Filter reliability
7. `phase-06-integration-testing.md` - Testing checklist
8. `reports/planning-summary.md` - This document

## Next Steps

1. Review plan with user
2. Clarify unresolved questions
3. Get approval to proceed
4. Begin Phase 1 (Typography improvements)
5. Proceed sequentially through phases
6. Conduct user testing after Phase 3
7. Iterate based on feedback

## Plan Quality Checklist

- [x] Comprehensive research conducted
- [x] Current implementation understood
- [x] User feedback analyzed
- [x] Solution architecture defined
- [x] Implementation steps detailed
- [x] File paths specified
- [x] Effort estimates provided
- [x] Risk assessment included
- [x] Success criteria defined
- [x] Testing strategy outlined
- [x] Rollback plan considered
- [x] Documentation complete

**Plan Status:** ✅ Ready for Review and Approval
