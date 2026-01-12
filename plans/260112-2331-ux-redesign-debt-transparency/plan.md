# FairPay UI/UX Redesign: Debt Transparency & User-Centric Views

**Plan ID:** 260112-2331-ux-redesign-debt-transparency
**Created:** 2026-01-12 23:31
**Status:** Draft
**Priority:** High

## Executive Summary

Redesign FairPay UI/UX based on real user feedback (Lucy's testing) to make debts and payment actions instantly understandable. Focus on debt transparency, user-centric data display, and fixing navigation expectations.

## User Feedback Analysis

Lucy's testing revealed 6 critical UX problems:
1. **Debt Opacity**: Cannot understand what total debt includes
2. **Confusing Context**: Mixed shared bill vs personal debts unclear
3. **Wrong Navigation**: Dashboard summary click → profile (expected: debt breakdown)
4. **Cluttered Details**: Transaction detail doesn't show "my share" clearly
5. **Bugged Filters**: Users avoid filters due to unreliability
6. **Poor Readability**: Font hard to read, increases cognitive load

## Goals

User must immediately answer:
1. Who do I owe?
2. How much do I owe each person?
3. Which expenses make up that total?
4. What should I pay next (and how)?

## Constraints

- **DO NOT** change color theme
- **DO NOT** modify data model
- **ONLY** improve: layout, hierarchy, interaction, copy, readability

## Implementation Phases

### Phase 1: Typography & Readability Improvements
**File:** `phase-01-typography-improvements.md`
**Status:** Not Started
**Effort:** 4-6 hours
**Description:** Fix font hierarchy, improve readability, establish consistent type scale

### Phase 2: Dashboard Debt Breakdown Section
**File:** `phase-02-dashboard-debt-breakdown.md`
**Status:** Not Started
**Effort:** 8-12 hours
**Description:** Add expandable debt breakdown under summary cards, show contributing expenses

### Phase 3: Person Debt Breakdown Page (NEW)
**File:** `phase-03-person-debt-breakdown-page.md`
**Status:** Not Started
**Effort:** 12-16 hours
**Description:** Create new view showing what user owes person, broken down by expense

### Phase 4: Expense Detail User-Centric View
**File:** `phase-04-expense-detail-user-centric.md`
**Status:** Not Started
**Effort:** 6-8 hours
**Description:** Redesign expense detail to emphasize "Your position" and "My share"

### Phase 5: Filters Stabilization
**File:** `phase-05-filters-stabilization.md`
**Status:** Not Started
**Effort:** 4-6 hours
**Description:** Fix or disable unreliable filters, ensure predictable behavior

### Phase 6: Integration & Testing
**File:** `phase-06-integration-testing.md`
**Status:** Not Started
**Effort:** 4-6 hours
**Description:** Test all flows, validate acceptance criteria, ensure consistency

## Total Estimated Effort

**38-54 hours** (approximately 5-7 working days)

## Success Criteria

- [ ] User identifies who they owe + which expenses in <10 seconds
- [ ] From Home to per-person breakdown in 1 click
- [ ] In person breakdown, see "my share per expense" without deep detail pages
- [ ] Filters correct or disabled (no half-working controls)
- [ ] Typography readable, amounts easy to scan
- [ ] Navigation matches user expectations (no surprise profile redirects)

## Key Architectural Decisions

1. **Create New Route**: `/debts/:userId` for person debt breakdown
2. **Update Navigation**: BalanceTable → debt breakdown (not profile)
3. **Component Hierarchy**: Emphasize "Your position" at top of expense details
4. **Progressive Disclosure**: Expandable sections for contributing expenses
5. **Typography System**: Consistent type scale across all financial views

## Risk Assessment

**Low Risk Areas:**
- Typography changes (isolated CSS/Tailwind updates)
- Adding new components (no breaking changes)

**Medium Risk Areas:**
- Navigation changes (affects user muscle memory)
- Filter changes (may expose edge cases)

**High Risk Areas:**
- None (no data model or backend changes)

## Dependencies

- Phase 3 depends on Phase 2 (debt breakdown UI patterns)
- Phase 6 depends on Phases 1-5 (integration testing)

## Next Steps

1. Review and approve plan
2. Begin Phase 1 (Typography improvements)
3. Proceed sequentially through phases
4. Conduct user testing after Phase 3
5. Iterate based on feedback

## Unresolved Questions

1. Should profile page remain accessible via secondary button?
2. Should "Settle" action be inline or in separate dialog?
3. Should filters be completely removed or just disabled?
4. What's the preferred font family for financial data?
