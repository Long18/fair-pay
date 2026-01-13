# Phase 3: Page Layout & Navigation Standardization

**Date**: 2026-01-13 | **Priority**: 🟡 High | **Status**: 🟠 Blocked by Phase 2
**Duration**: 2 weeks | **Dependencies**: Phase 1 rules, Phase 2 composites

---

## Context

**Research Sources**:
- [Scout: Page Layouts](./scout-page-layouts.md) - 3 different container padding approaches identified
- [UI Inconsistencies Research](./research-ui-inconsistencies.md) - Typography hierarchy issues
- [UX Flows Research](./research-ux-flows.md) - Tab navigation problems

---

## Overview

FairPay's page layouts are **wildly inconsistent**:

**Container Padding Chaos**:
- Dashboard: `px-2 md:p-4 lg:px-6` (from layout wrapper)
- Balances: `py-4 md:py-6 lg:py-8 px-4 sm:px-6 lg:px-8`
- Group Show: `px-4 sm:px-6 py-4 sm:py-8`

**Page Title Anarchy**:
- Dashboard: `.typography-page-title` class
- Balances: `text-xl md:text-2xl font-bold`
- Reports: `text-2xl font-semibold`

**Tab Navigation Inconsistency**:
- Dashboard: Custom tab component with underline
- Group Show: shadcn Tabs with 4-column grid
- Balances: shadcn Tabs with `w-full sm:w-auto`

**Card Wrapper Confusion**:
- Some sections use `<Card>` component
- Others use `<div className="bg-card border rounded-lg">`
- Some use no wrapper at all

**The Result**: Users feel visual dissonance when navigating between pages. Developers waste time figuring out "the right pattern."

**The Solution**: Enforce Phase 1 design system rules across ALL pages. Create standard layout wrappers. Unify tab styling. Eliminate card wrapper ambiguity.

---

## Key Insights from Research

### Critical Layout Issues

#### Issue 1: Container Padding (3 Competing Patterns)
**Scout Finding**: 3 different padding approaches across 10 pages

**User Impact**: Broken visual rhythm. Content feels "jumpy" between pages.

**Root Cause**: No enforced standard. Developers copy-paste from different sources.

#### Issue 2: Page Title Typography
**Scout Finding**: 4 different sizing patterns for page titles

**User Impact**: Inconsistent information hierarchy. Users can't predict importance.

**Root Cause**: No typography scale enforcement.

#### Issue 3: Tab Navigation Styling
**Scout Finding**:
- Dashboard tabs: Custom component, border-bottom, gap-8
- Group tabs: shadcn Tabs, grid-cols-4, text-xs sm:text-sm
- Balance tabs: shadcn Tabs, w-full sm:w-auto

**User Impact**: Learned tab patterns don't transfer. Each page feels different.

**Root Cause**: No tab styling standard.

#### Issue 4: Missing Mobile Breadcrumb
**Scout Finding**: Breadcrumb hidden on mobile (`hidden md:flex`)

**User Impact**: Users can't see navigation path on mobile. Disorienting.

**Root Cause**: No mobile alternative designed.

#### Issue 5: Space-Y Inconsistency
**Scout Finding**:
- Dashboard: `space-y-6` (static)
- Balances: `space-y-4 md:space-y-6` (responsive)

**User Impact**: Visual rhythm breaks on mobile vs desktop.

**Root Cause**: No spacing progression rule.

---

## Requirements

### Must Deliver

1. **Standard Page Layout Wrapper** (`src/components/layout/page-container.tsx`)
   - 3 variants: `default` (max-w-7xl), `narrow` (max-w-4xl), `full` (w-full)
   - Enforced padding progression
   - Optional breadcrumb slot
   - Optional page title slot

2. **Page Title Component** (`src/components/layout/page-title.tsx`)
   - Enforces typography scale from Phase 1
   - Supports optional subtitle
   - Responsive sizing

3. **Standard Tab Navigation** (`src/components/ui/page-tabs.tsx`)
   - Unified styling across all pages
   - Mobile-responsive (horizontal scroll)
   - URL persistence pattern

4. **Mobile Breadcrumb Alternative**
   - Back button + current page title
   - Replaces hidden breadcrumb on mobile

5. **Refactored Pages**
   - Dashboard, Balances, Group Show, Friend Show, Reports
   - All use PageContainer wrapper
   - All use PageTitle component
   - All use standard tab styling

---

## Architecture Decisions

### Decision 1: PageContainer Wrapper Component
**Adopted Pattern**:
```tsx
<PageContainer variant="default" showBreadcrumb>
  <PageTitle title="Dashboard" subtitle="Welcome back, John" />
  {children}
</PageContainer>
```

**Variants**:
- `default`: `max-w-7xl px-4 py-6 md:px-6 md:py-8` (most pages)
- `narrow`: `max-w-4xl px-4 py-6` (forms, settings)
- `full`: `w-full px-4 py-6 md:px-6` (reports with wide tables)

**Rationale**: Eliminates 3 competing patterns. Clear semantic choices.

---

### Decision 2: Page Title Typography Standard
**Adopted Pattern**:
```tsx
<PageTitle
  title="Dashboard"           // text-2xl md:text-3xl font-bold
  subtitle="Welcome back"     // text-sm md:text-base text-muted-foreground
/>
```

**Rationale**: Enforces Phase 1 typography scale. No more ad-hoc sizing.

---

### Decision 3: Tab Styling Standard
**Adopted Pattern**: Use shadcn Tabs with standard classes
```tsx
<Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
  <TabsList className="w-full sm:w-auto">
    <TabsTrigger value="balances">Balances</TabsTrigger>
    <TabsTrigger value="activity">Activity</TabsTrigger>
  </TabsList>
  <TabsContent value="balances">{content}</TabsContent>
</Tabs>
```

**Standard Classes**:
- TabsList: `w-full sm:w-auto` (full width mobile, auto desktop)
- TabsTrigger: No custom classes (use shadcn defaults)
- TabsContent: `space-y-4` (consistent content spacing)

**Rationale**: Eliminates custom tab component. Uses shadcn conventions.

---

### Decision 4: Mobile Breadcrumb Alternative
**Adopted Pattern**: Back button component on mobile
```tsx
{/* Desktop: Breadcrumb */}
<Breadcrumb className="hidden md:flex">...</Breadcrumb>

{/* Mobile: Back button */}
<Button variant="ghost" size="sm" className="md:hidden" onClick={goBack}>
  <ChevronLeft /> Back
</Button>
```

**Rationale**: Provides navigation context on mobile without cluttering UI.

---

### Decision 5: Card vs Div Usage Enforcement
**Rules** (from Phase 1):
- Use `<Card>` for self-contained data displays (statistics, balance summaries)
- Use `<div className="bg-card border rounded-lg p-4">` for layout sections (tab containers)
- Use `<div>` for pure layout (flex/grid)

**Enforcement**: Refactor all pages to follow this rule consistently.

---

### Decision 6: Space-Y Responsive Progression
**Standard**: All page-level spacing must be responsive
```tsx
<PageContainer>
  <div className="space-y-4 md:space-y-6">
    {/* Sections */}
  </div>
</PageContainer>
```

**Rationale**: Prevents cramped mobile layouts. Improves readability.

---

## Related Code Files

**Will Create**:
- `/Users/long.lnt/Desktop/Projects/FairPay/src/components/layout/page-container.tsx`
- `/Users/long.lnt/Desktop/Projects/FairPay/src/components/layout/page-title.tsx`
- `/Users/long.lnt/Desktop/Projects/FairPay/src/components/layout/mobile-back-button.tsx`

**Will Refactor**:
- `/Users/long.lnt/Desktop/Projects/FairPay/src/pages/dashboard.tsx`
- `/Users/long.lnt/Desktop/Projects/FairPay/src/pages/balances.tsx`
- `/Users/long.lnt/Desktop/Projects/FairPay/src/pages/reports.tsx`
- `/Users/long.lnt/Desktop/Projects/FairPay/src/modules/groups/pages/show.tsx`
- `/Users/long.lnt/Desktop/Projects/FairPay/src/modules/friends/pages/show.tsx`

**Will Update**:
- `/Users/long.lnt/Desktop/Projects/FairPay/src/components/refine-ui/layout/breadcrumb.tsx`
- `/Users/long.lnt/Desktop/Projects/FairPay/src/components/dashboard/tab-navigation.tsx` (delete after migration)

---

## Implementation Steps

### Step 1: Create PageContainer Component
**File**: `src/components/layout/page-container.tsx`

Implement:
- 3 variants with CVA (default, narrow, full)
- Standard padding progression
- Optional breadcrumb rendering
- Optional back button slot

**Acceptance**: Can render all 3 variants, breadcrumb shows/hides correctly

### Step 2: Create PageTitle Component
**File**: `src/components/layout/page-title.tsx`

Implement:
- Title with enforced typography (`text-2xl md:text-3xl font-bold`)
- Optional subtitle
- Optional action button slot (right side)
- Responsive layout (stack on mobile, row on desktop)

**Acceptance**: Matches Figma designs (if available)

### Step 3: Create MobileBackButton Component
**File**: `src/components/layout/mobile-back-button.tsx`

Implement:
- Only visible on mobile (`md:hidden`)
- Uses router history for back navigation
- Fallback to home if no history

**Acceptance**: Works on mobile Safari, Chrome Android

### Step 4: Refactor Dashboard Page
**File**: `src/pages/dashboard.tsx`

Changes:
- Wrap content in `<PageContainer variant="default">`
- Replace page title with `<PageTitle title="Dashboard" />`
- Update tab navigation to use shadcn Tabs (remove custom component)
- Ensure `space-y-4 md:space-y-6` on section container
- Verify all cards use `<Card>` component (not div)

**Acceptance**: Visual regression test passes, mobile layout correct

### Step 5: Refactor Balances Page
**File**: `src/pages/balances.tsx`

Changes:
- Replace custom container with `<PageContainer variant="default">`
- Replace custom title with `<PageTitle title="Balances" />`
- Standardize tab styling (`w-full sm:w-auto`)
- Update grid spacing to `gap-4 md:gap-6`
- Add mobile back button

**Acceptance**: Container padding matches dashboard

### Step 6: Refactor Reports Page
**File**: `src/pages/reports.tsx`

Changes:
- Use `<PageContainer variant="full">` (wide tables)
- Add `<PageTitle title="Reports" subtitle="Expense analytics" />`
- Ensure responsive spacing throughout

**Acceptance**: Wide tables don't overflow on desktop

### Step 7: Refactor Group Show Page
**File**: `src/modules/groups/pages/show.tsx`

Changes:
- Wrap in `<PageContainer variant="default">`
- Replace custom header with `<PageTitle>`
- Standardize 4-column tab grid styling
- Fix tab trigger text sizing (`text-sm` instead of `text-xs sm:text-sm`)
- Add mobile back button
- Ensure all sections use consistent spacing

**Acceptance**: Tab layout consistent with dashboard

### Step 8: Refactor Friend Show Page
**File**: `src/modules/friends/pages/show.tsx`

Apply same pattern as Step 7

**Acceptance**: Matches group show page layout

### Step 9: Update Breadcrumb Component
**File**: `src/components/refine-ui/layout/breadcrumb.tsx`

Changes:
- Ensure `hidden md:flex` class present
- Integrate with MobileBackButton on all pages using breadcrumb

**Acceptance**: Desktop shows breadcrumb, mobile shows back button

### Step 10: Delete Custom Tab Navigation
**File**: `src/components/dashboard/tab-navigation.tsx`

- Verify no longer used (replaced by shadcn Tabs)
- Delete file
- Update imports

**Acceptance**: No broken imports, all tabs work

### Step 11: Audit Card vs Div Usage
**Scope**: All pages

- Scan for `<div className="bg-card border rounded-lg">`
- Determine if should be `<Card>` based on Phase 1 rules
- Refactor where appropriate

**Acceptance**: No ambiguous card wrappers remain

### Step 12: Enforce Space-Y Responsiveness
**Scope**: All pages

- Find all `space-y-*` without responsive variants
- Add responsive variants (`space-y-4 md:space-y-6`)

**Acceptance**: Mobile layouts feel less cramped

### Step 13: Visual Regression Testing
- Run Chromatic tests on all refactored pages
- Compare desktop vs mobile layouts
- Verify padding consistency
- Test tab navigation on all pages

### Step 14: Mobile Device Testing
- Test on iOS Safari (iPhone SE, iPhone 14)
- Test on Chrome Android (Pixel 5, Samsung S21)
- Verify back button works
- Verify touch targets meet 44px minimum

---

## Todo Checklist

### Layout Components
- [ ] Create PageContainer component with 3 variants
- [ ] Create PageTitle component with typography enforcement
- [ ] Create MobileBackButton component
- [ ] Test PageContainer on 3 viewport sizes (mobile, tablet, desktop)

### Page Refactoring
- [ ] Refactor dashboard.tsx to use PageContainer + PageTitle
- [ ] Refactor balances.tsx to use PageContainer + PageTitle
- [ ] Refactor reports.tsx to use PageContainer (full variant)
- [ ] Refactor group show page to use PageContainer
- [ ] Refactor friend show page to use PageContainer

### Navigation Standardization
- [ ] Standardize all tab navigation to shadcn Tabs
- [ ] Remove custom tab-navigation.tsx component
- [ ] Add mobile back button to all detail pages
- [ ] Update breadcrumb to integrate with mobile alternative
- [ ] Verify URL persistence on all tabbed pages

### Card/Spacing Cleanup
- [ ] Audit all pages for card vs div usage
- [ ] Refactor ambiguous card wrappers to use Card component
- [ ] Add responsive space-y to all page-level containers
- [ ] Verify consistent gap spacing on grids

### Testing & Validation
- [ ] Run visual regression tests (Chromatic)
- [ ] Test on mobile devices (iOS Safari, Chrome Android)
- [ ] Verify container padding consistency across all pages
- [ ] Verify page title typography matches design system
- [ ] Test tab navigation on all pages
- [ ] Verify back button works on mobile

---

## Success Criteria

### Layout Consistency
- [ ] All pages use PageContainer wrapper (10+ pages)
- [ ] All pages use PageTitle component (consistent typography)
- [ ] Container padding identical across pages (visual diff)
- [ ] Responsive spacing applied everywhere (space-y-4 md:space-y-6)

### Navigation Consistency
- [ ] All tabs use shadcn Tabs with standard classes
- [ ] Tab styling identical across pages (visual comparison)
- [ ] Mobile back button present on all detail pages
- [ ] Breadcrumb hidden on mobile, back button visible

### Card Usage
- [ ] Zero ambiguous card wrappers (audit finds none)
- [ ] All data cards use Card component
- [ ] All layout sections use div with explicit classes

### User Experience
- [ ] Zero "where am I?" moments on mobile (user testing)
- [ ] Page transitions feel consistent (team consensus)
- [ ] Touch targets meet 44px minimum (accessibility audit)

---

## Risk Assessment

### High Risk
- **Visual Regressions**: Layout changes may break pixel-perfect designs → **Mitigation**: Chromatic testing, manual QA
- **Responsive Breakpoints**: May break on edge-case devices → **Mitigation**: BrowserStack testing

### Medium Risk
- **Tab State Bugs**: URL persistence may not work correctly → **Mitigation**: E2E tests for tab navigation
- **Back Button Issues**: History API edge cases → **Mitigation**: Fallback to home route

---

## Next Steps

**After Phase 3 Completion**:
1. Proceed to [Phase 4: UX Flow Optimization](./phase-04-ux-flows.md)
2. Fix dashboard tab state persistence
3. Simplify expense entry flow

**Blockers for Phase 4**:
- ✅ All pages use PageContainer wrapper
- ✅ Tab navigation standardized
- ✅ Mobile breadcrumb alternative implemented

---

## Unresolved Questions

1. **PageContainer SSR?** - Does Refine layout wrapper affect SSR performance?
2. **Tab scroll behavior?** - Should tabs scroll horizontally on mobile if >4?
3. **Back button animation?** - Should page transitions have animations?
4. **Container max-width?** - Is 1280px (max-w-7xl) correct for all pages?
5. **Breadcrumb SEO?** - Does hiding breadcrumb on mobile affect SEO?
