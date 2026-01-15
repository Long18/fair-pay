# Group UX Redesign - Implementation Roadmap

**Created:** 2026-01-15
**Status:** Ready to Execute
**Total Effort:** 82-108 hours (~2-3 weeks)

---

## Quick Reference

### Core Problem
User feedback: "Too much information at once, balance display unclear, navigation confusing"

### Solution
Single scrollable page with sticky hero balance, color-coded debt cards, progressive disclosure

### Primary User Goal
"See who owes money quickly" - answered in <3 seconds

---

## Execution Strategy

### Option 1: Sequential Implementation (Recommended)
Execute phases 1→2→3→4→5→6→7→8 in order for safest rollout

**Pros:**
- Lower risk (each phase builds on previous)
- Can test incrementally
- Easier to track progress

**Cons:**
- Longer time to user-visible improvements
- Full benefits realized only at end

**Timeline:** 2-3 weeks continuous work

---

### Option 2: Parallel Tracks
Execute phases in parallel where dependencies allow

**Track A (Critical Path):**
- Phase 1 (Design System) → Phase 2 (Group Detail) → Phase 8 (Testing)
- **Timeline:** 1.5 weeks
- **Impact:** Core user problem solved

**Track B (Enhancements):**
- Phase 3 (Balance Viz) + Phase 4 (Member Mgmt) + Phase 5 (Settlement)
- **Timeline:** 1 week (parallel with Track A final stages)
- **Impact:** Enhanced features

**Track C (Polish):**
- Phase 6 (Group List) + Phase 7 (Mobile Optimization)
- **Timeline:** 1 week (after Track A complete)
- **Impact:** Consistency and performance

**Total Timeline:** 2-2.5 weeks with parallelization

---

### Option 3: MVP First (Fastest User Impact)
Implement minimal viable product to solve core problem ASAP

**MVP Scope:**
- Phase 1 (partial): BalanceCard, DebtStatusBadge only
- Phase 2 (core): Remove tabs, add hero balance, debt cards
- Phase 8 (quick test): Basic usability test (3 users)

**Timeline:** 4-5 days
**Then:** Iterate with remaining phases based on feedback

---

## Phase-by-Phase Checklist

### ✅ Phase 0: Research & Analysis
**Status:** COMPLETE
- [x] User feedback collected
- [x] Scout report generated
- [x] UI patterns researched
- [x] Implementation plan created

---

### 📋 Phase 1: Design System Preparation (8-12h)

**Files to Create:**
- [ ] `/src/lib/status-colors.ts` - Add DEBT_STATUS_COLORS
- [ ] `/src/components/groups/balance-card.tsx` - BalanceCard component
- [ ] `/src/components/groups/debt-status-badge.tsx` - DebtStatusBadge component
- [ ] `/src/components/groups/settlement-button.tsx` - SettlementButton component
- [ ] `/src/components/ui/expandable-card.tsx` - ExpandableCard component
- [ ] `/src/components/groups/index.ts` - Export all new components

**Success Criteria:**
- [ ] All color constants added with WCAG AAA contrast
- [ ] All 4 components created and tested
- [ ] Components exported properly
- [ ] TypeScript errors: 0

**Ready to Start:** YES - No blockers

---

### 📋 Phase 2: Group Detail Page Redesign (16-20h) ⭐ CRITICAL

**Files to Modify:**
- [ ] `/src/modules/groups/pages/show.tsx` - Replace tabs with single scroll (654 → ~480 lines)
- [ ] `/src/modules/groups/components/member-list.tsx` - Add showPagination prop

**Key Changes:**
- [ ] Remove `<Tabs>` component (lines 385-639)
- [ ] Add sticky hero balance section
- [ ] Add "You Owe" debt cards section (red)
- [ ] Add "Owes You" debt cards section (green)
- [ ] Add expandable expenses section
- [ ] Add expandable recurring section
- [ ] Remove member pagination
- [ ] Calculate totalIOwe, totalOwedToMe

**Success Criteria:**
- [ ] Tabs removed completely
- [ ] Hero balance sticky on scroll
- [ ] Debt cards color-coded correctly
- [ ] Expandable sections work
- [ ] All members visible (no pagination)
- [ ] TypeScript errors: 0
- [ ] User test: Can identify "who owes who" in <3s

**Blockers:** Requires Phase 1 components

---

### 📋 Phase 3: Balance Visualization (12-16h)

**Files to Create:**
- [ ] `/src/hooks/use-expense-breakdown.ts` - Breakdown logic
- [ ] `/src/hooks/use-category-breakdown.ts` - Category grouping
- [ ] `/src/lib/priority-calculator.ts` - Priority logic

**Files to Modify:**
- [ ] `/src/modules/groups/pages/show.tsx` - Add visualization sections
- [ ] `/src/components/groups/balance-card.tsx` - Add breakdown children

**Key Features:**
- [ ] Expense breakdown in BalanceCard expansion
- [ ] Category-based debt breakdown
- [ ] Timeline visualization
- [ ] Settlement priority indicators
- [ ] Simplified debts before/after comparison
- [ ] Enhanced empty states

**Success Criteria:**
- [ ] Breakdown totals match balances
- [ ] Timeline chronologically correct
- [ ] Priority badges visible
- [ ] Performance: No lag with 100+ expenses

**Blockers:** Requires Phase 2 structure

---

### 📋 Phase 4: Member Management Simplification (8-10h)

**Files to Modify:**
- [ ] `/src/modules/groups/pages/show.tsx` - Remove pagination state
- [ ] `/src/modules/groups/components/member-list.tsx` - Add virtual scrolling
- [ ] `/src/modules/groups/components/add-member-modal.tsx` - Convert to inline

**New Files:**
- [ ] `/src/modules/groups/components/member-card.tsx` - Reusable member card

**Key Features:**
- [ ] Show all members (no pagination)
- [ ] Virtual scrolling for 50+ members
- [ ] Inline add member form
- [ ] Member search/filter
- [ ] Role toggle (admin/member)
- [ ] Member stats display

**Success Criteria:**
- [ ] All members visible
- [ ] Virtual scrolling smooth
- [ ] Search filters real-time
- [ ] Role toggle works

**Blockers:** Requires Phase 2 structure

---

### 📋 Phase 5: Settlement Flow Enhancement (10-12h)

**Files to Create:**
- [ ] `/src/components/payments/quick-settlement-dialog.tsx` - Quick settle dialog
- [ ] `/src/lib/payment-methods.ts` - Payment method constants
- [ ] `/src/hooks/use-create-payment.ts` - Payment creation hook

**Files to Modify:**
- [ ] `/src/modules/groups/pages/show.tsx` - Add quick settle handler
- [ ] `/src/modules/payments/components/payment-list.tsx` - Enhanced layout
- [ ] `/src/components/bulk-operations/settle-all-dialog.tsx` - Add payment method

**Key Features:**
- [ ] Quick settlement dialog (in-page)
- [ ] Partial payment option
- [ ] Payment method selection
- [ ] Settlement suggestions
- [ ] Enhanced success feedback
- [ ] Payment history with methods

**Success Criteria:**
- [ ] Quick settle opens from debt cards
- [ ] Partial payments work
- [ ] Success toast actionable

**Blockers:** Requires Phase 2 debt cards

---

### 📋 Phase 6: Group List Enhancement (8-10h)

**Files to Create:**
- [ ] `/src/modules/groups/components/group-card.tsx` - Reusable group card
- [ ] `/src/modules/groups/components/empty-groups-state.tsx` - Enhanced empty state
- [ ] `/src/hooks/use-group-balance-summaries.ts` - Balance summaries hook
- [ ] `supabase/migrations/YYYYMMDD_group_balance_summaries.sql` - RPC function

**Files to Modify:**
- [ ] `/src/modules/groups/pages/list.tsx` - Replace DataTable with cards

**Key Features:**
- [ ] Card-based layout (not table)
- [ ] Balance preview on each card
- [ ] Search/filter/sort
- [ ] Quick actions (View, Add Expense)
- [ ] Enhanced empty state

**Success Criteria:**
- [ ] Cards display correctly
- [ ] Balance previews accurate
- [ ] Search/filter instant

**Blockers:** None (can run parallel to Phase 2-5)

---

### 📋 Phase 7: Mobile Optimization (12-16h)

**Dependencies to Install:**
```bash
pnpm add vaul @tanstack/react-virtual
```

**Files to Create:**
- [ ] `/src/components/ui/bottom-sheet.tsx` - Bottom sheet component
- [ ] `/src/lib/mobile-utils.ts` - Touch target utilities
- [ ] `/src/lib/haptics.ts` - Haptic feedback
- [ ] `/src/hooks/use-online-status.ts` - Offline detection

**Files to Modify:**
- [ ] All dialogs → Replace with BottomSheet on mobile
- [ ] All buttons → Add touchTarget() utility
- [ ] All cards → Add swipe gestures
- [ ] MemberList → Add virtual scrolling
- [ ] All avatars → Add lazy loading
- [ ] `/src/styles/globals.css` → Add safe area utilities

**Key Features:**
- [ ] All touch targets 44px minimum
- [ ] Bottom sheets on mobile
- [ ] Swipe gestures on cards
- [ ] Virtual scrolling for large lists
- [ ] Haptic feedback on actions
- [ ] Pull-to-refresh
- [ ] Safe area insets (iOS)

**Success Criteria:**
- [ ] 60fps scrolling
- [ ] Touch targets meet 44px
- [ ] Bottom sheets smooth
- [ ] Swipe actions work

**Blockers:** Requires all previous phases for complete coverage

---

### 📋 Phase 8: Testing & Refinement (8-12h)

**Testing Activities:**
- [ ] Usability testing (5-8 participants)
- [ ] Accessibility audit (axe DevTools + manual)
- [ ] Performance testing (Lighthouse, DevTools)
- [ ] Cross-browser testing (Chrome, Safari, Firefox, Edge)
- [ ] Device testing (iPhone, Android, iPad)
- [ ] Beta testing program (20-30 users)

**Metrics to Measure:**
- [ ] Task completion rate: 80%+
- [ ] Accessibility score: 100%
- [ ] Performance score: 90%+
- [ ] Time to understand balance: <3s
- [ ] Settlement completion: 70%+
- [ ] NPS score: >40

**Deliverables:**
- [ ] Test report (usability, accessibility, performance)
- [ ] Bug list (prioritized)
- [ ] Analytics dashboard
- [ ] User feedback summary
- [ ] Launch readiness report

**Blockers:** Requires all implementation phases complete

---

## Database Migrations Required

### Phase 6: Group Balance Summaries
```sql
-- Create RPC function
supabase/migrations/YYYYMMDD_group_balance_summaries.sql
```

**Apply with:**
```bash
pnpm supabase db push
```

---

## Dependencies to Install

```bash
# Phase 7: Mobile Optimization
pnpm add vaul @tanstack/react-virtual

# Phase 8: Testing
pnpm add -D @axe-core/react
```

---

## Progress Tracking

Use this checklist to track overall progress:

- [ ] **Phase 1:** Design System (4 components created)
- [ ] **Phase 2:** Group Detail Redesign (tabs removed, single scroll)
- [ ] **Phase 3:** Balance Visualization (breakdowns, timeline, priority)
- [ ] **Phase 4:** Member Management (all visible, search, inline add)
- [ ] **Phase 5:** Settlement Flow (quick dialog, partial payments)
- [ ] **Phase 6:** Group List (cards, balance preview, filters)
- [ ] **Phase 7:** Mobile Optimization (44px targets, bottom sheets, gestures)
- [ ] **Phase 8:** Testing & Refinement (usability, accessibility, performance)

---

## Risk Mitigation

### High Risk Areas

**Risk:** Users resist change (familiar with tabs)
**Mitigation:**
- Beta test with 20-30 users first
- Provide "What's New" guide
- Monitor support tickets closely
- Be ready to iterate quickly

**Risk:** Performance issues with large groups (100+ members, 500+ expenses)
**Mitigation:**
- Virtual scrolling implemented (Phase 7)
- Memoization throughout
- Performance testing (Phase 8)
- Stale time configured on queries

**Risk:** Mobile layout breaks on edge devices
**Mitigation:**
- Test on iPhone SE (smallest), iPhone Pro (notch), various Android
- Safe area insets implemented
- Bottom sheets for dialogs
- 44px touch targets everywhere

**Risk:** Accessibility issues block launch
**Mitigation:**
- WCAG AAA target set
- Screen reader testing in Phase 8
- Keyboard navigation verified
- Color + text labels (not color alone)

---

## Success Metrics Dashboard

Track these KPIs to measure success:

### Primary Metrics
- **Time to Understand Balance:** <3 seconds (user test)
- **Settlement Completion Rate:** 70%+ (initiated → completed)
- **Task Completion Rate:** 80%+ (usability tests)

### Secondary Metrics
- **Support Tickets:** -30% tickets about "confusing UI"
- **Mobile Usability Score:** 85+ (Lighthouse)
- **NPS Score:** >40 (post-launch survey)
- **Page Load Time:** <2 seconds (mobile)

### Technical Metrics
- **TypeScript Errors:** 0
- **Accessibility Score:** 100% (Lighthouse)
- **Performance Score:** 90%+ (Lighthouse)
- **Bundle Size:** <200kb gzipped

---

## Communication Plan

### Stakeholders
- **Users:** "What's New" guide, email announcement
- **Support Team:** Briefing on changes, FAQ document
- **Development Team:** This implementation plan

### Launch Announcement Template

```markdown
# 🎉 New Group Experience - Simpler, Clearer, Faster

We heard your feedback that the group interface was confusing. Today we're launching a completely redesigned experience focused on one thing: **making it crystal clear who owes money to whom.**

## What's New

✨ **Instant Balance Overview** - See your debts at a glance with color-coded cards
💚 **Clear "You Owe" / "Owes You" Sections** - No more guessing
⚡ **Quick Settlement** - Pay debts with one tap
📱 **Mobile Optimized** - Smooth swipe gestures and touch-friendly design
🔍 **Progressive Details** - Expand cards to see expense breakdowns

## Getting Started

Visit any group to see the new interface. Your first visit will show a quick tip about swiping cards for actions.

## Feedback Welcome

Help us improve! Click the "Feedback" button (bottom right) to share your thoughts.
```

---

## Emergency Rollback Plan

If critical issues arise post-launch:

### Rollback Triggers
- **Critical bug** affecting > 10% users
- **Data integrity** issues (incorrect balances)
- **Performance degradation** > 50% slower
- **Accessibility blocker** (keyboard nav broken)

### Rollback Process
1. Revert deployment to previous version
2. Investigate root cause
3. Fix issue in development
4. Re-deploy with fix

### Code Preservation
```bash
# Tag current production before deploying
git tag pre-group-ux-redesign
git push origin pre-group-ux-redesign

# If rollback needed
git checkout pre-group-ux-redesign
# Deploy
```

---

## Next Immediate Actions

1. **Review this plan** with team/stakeholders
2. **Choose execution strategy** (Sequential, Parallel, or MVP)
3. **Set timeline** based on available resources
4. **Start Phase 1** (Design System) - No blockers, safe to begin
5. **Set up progress tracking** (GitHub Project, Jira, etc.)

---

## Questions Before Starting?

- Resource allocation? (1 developer full-time vs multiple parallel)
- Beta testing program setup? (how to recruit testers)
- Analytics integration? (Mixpanel, PostHog, or custom)
- Rollout strategy? (all users at once vs gradual)
- Timeline constraints? (hard deadlines)

---

## Plan Status

- [x] Research complete
- [x] User feedback collected
- [x] Implementation plan created
- [x] All phases specified
- [x] Roadmap documented
- [ ] **Ready to execute** ← YOU ARE HERE

**Recommended:** Start with Phase 1 (Design System) immediately - no dependencies, provides foundation for all other work.
