# Phase 1: UX Foundation & Design System Rules

**Date**: 2026-01-13 | **Priority**: 🔴 Critical | **Status**: 🟢 Ready for Implementation
**Duration**: 2 weeks | **Dependencies**: None

---

## Context

**Research Sources**:
- [UI Inconsistencies Research](./research-ui-inconsistencies.md) - Spacing fragmentation, typography hierarchy issues
- [Component Architecture Research](./research-component-architecture.md) - Composition patterns, CVA usage
- [Scout: UI Components](./scout-ui-components.md) - 182 components analyzed, naming convention issues
- [Scout: Page Layouts](./scout-page-layouts.md) - 3 different container padding approaches identified

---

## Overview

FairPay lacks a documented design system foundation. Developers make ad-hoc styling decisions, resulting in:
- **Spacing chaos**: `p-4`, `p-6`, `p-8` used interchangeably without rules
- **Typography anarchy**: Page titles use 3 different patterns (`.typography-page-title`, `text-xl md:text-2xl`, inline styles)
- **Component ambiguity**: Unclear when to use `Card` vs `div`, `Dialog` vs `Drawer`, `Button` variants

This phase establishes the **rulebook** that all future development must follow.

---

## Key Insights from Research

### Critical Findings
1. **Spacing Scale Violation**: Tailwind provides numeric scale (4, 8, 12, 16, 24, 32), but codebase uses arbitrary values (`gap-5`, `p-7`)
2. **Container Padding Chaos**:
   - Dashboard: `px-2 md:p-4 lg:px-6`
   - Balances: `px-4 sm:px-6 lg:px-8`
   - Group Show: `px-4 sm:px-6`
   - **No consistency = broken visual rhythm**
3. **Typography Hierarchy Missing**: No defined system for page titles, section headers, body text scaling
4. **Component Responsibilities Unclear**:
   - When to use `Card` vs `div`?
   - When does `Dialog` become `Drawer`?
   - What's the difference between `SimplifiedDebtsToggle` and `toggle.tsx`?

### UX Anti-Patterns Observed
- **Information overload**: Dashboard shows all data at once without visual hierarchy
- **Unclear CTAs**: Action buttons lack consistent positioning/styling
- **Missing feedback states**: No unified loading/success/error patterns
- **Accessibility gaps**: Color-only status indicators, inconsistent focus states

---

## Requirements

### Must Deliver
1. **Design Token Documentation** (`docs/design-system/tokens.md`)
   - Spacing scale with usage rules
   - Typography scale with responsive rules
   - Color usage guidelines (status, interactive, neutral)
   - Shadow/elevation system
   - Border radius standards

2. **Component Responsibility Matrix** (`docs/design-system/component-rules.md`)
   - When to use each shadcn/ui component
   - Composition patterns for common layouts
   - CVA variant naming conventions
   - Custom component creation criteria

3. **Layout System Rules** (`docs/design-system/layout-rules.md`)
   - Container width standards (max-w-7xl = default)
   - Padding progression rules (mobile → tablet → desktop)
   - Grid/flex usage guidelines
   - Responsive breakpoint strategy

4. **Interaction Principles** (`docs/design-system/interaction-rules.md`)
   - Button hierarchy (primary/secondary/ghost)
   - Loading states (skeleton/spinner/overlay)
   - Error/success feedback patterns
   - Form validation display rules

5. **Naming Conventions** (`docs/design-system/naming-conventions.md`)
   - File naming: `kebab-case.tsx` (MANDATORY)
   - Component naming: `PascalCase` exports
   - Variant naming: CVA patterns
   - Props naming: camelCase

---

## Architecture Decisions

### Decision 1: Spacing Scale (Tailwind 4-Based)
**Adopted Standard**:
```
Container:   gap-6 (24px)   - Major section spacing
Card Inner:  p-4 (16px)     - Internal content padding
Component:   gap-2 (8px)    - Button groups, input combos
Responsive:  Mobile p-3 (12px), Tablet p-4 (16px), Desktop p-6 (24px)
```

**Rationale**: Follows Tailwind's 4px base unit, provides clear progression, prevents arbitrary values.

**Rule**: Never use `p-5`, `gap-5`, `m-7`. Only multiples of 4 (4, 8, 12, 16, 20, 24, 32).

---

### Decision 2: Typography Scale
**Adopted Standard**:
```
Page Title:     text-2xl md:text-3xl font-bold
Section Header: text-xl md:text-2xl font-semibold
Subsection:     text-lg md:text-xl font-medium
Body Large:     text-base
Body Default:   text-sm
Caption:        text-xs
```

**Rationale**: Provides 6-tier hierarchy, mobile-first scaling, clear semantic meaning.

**Rule**: All page titles MUST use `text-2xl md:text-3xl font-bold`. No custom sizes.

---

### Decision 3: Container Padding Standard
**Adopted Standard**:
```
Default Page: className="container max-w-7xl px-4 py-6 md:px-6 md:py-8"
Narrow Page:  className="container max-w-4xl px-4 py-6"
Full Width:   className="w-full px-4 py-6 md:px-6"
```

**Rationale**: Eliminates 3 competing patterns, provides clear semantic choices.

**Rule**: All new pages MUST use one of these 3 patterns. No custom padding.

---

### Decision 4: Card vs Div Usage
**Rule**:
- Use `<Card>` when content is self-contained data (balance summary, statistics)
- Use `<div className="bg-card border rounded-lg">` for layout sections (tab containers, form groups)
- Use `<div>` for pure layout (flex/grid containers, spacers)

**When in doubt**: If it feels like a "thing" (noun), use `Card`. If it's a "container" (verb), use `div`.

---

### Decision 5: Component Naming Convention
**Mandatory Standard**: `kebab-case.tsx` for ALL component files

**Examples**:
- ✅ `balance-summary-card.tsx`
- ✅ `simplified-debts-toggle.tsx`
- ✅ `dashboard-states.tsx`
- ❌ `BalanceSummaryCard.tsx`
- ❌ `SimplifiedDebtsToggle.tsx`

**Rationale**: Consistency with shadcn/ui conventions, prevents case-sensitivity issues, easier CLI tooling.

**Migration**: Phase 2 will rename all PascalCase files.

---

### Decision 6: Responsive Strategy
**Mobile-First Approach**:
1. Design for 375px (iPhone SE) first
2. Add `sm:` breakpoint for 640px+ (landscape, tablets)
3. Add `md:` breakpoint for 768px+ (primary desktop transition)
4. Add `lg:` breakpoint for 1024px+ (large desktops)

**Touch Target Minimum**: 44px (iOS HIG standard)

**Rule**: All interactive elements MUST be 44px minimum on mobile. Use `min-h-11` (44px) for buttons.

---

## Related Code Files

**Will Create**:
- `/Users/long.lnt/Desktop/Projects/FairPay/docs/design-system/tokens.md`
- `/Users/long.lnt/Desktop/Projects/FairPay/docs/design-system/component-rules.md`
- `/Users/long.lnt/Desktop/Projects/FairPay/docs/design-system/layout-rules.md`
- `/Users/long.lnt/Desktop/Projects/FairPay/docs/design-system/interaction-rules.md`
- `/Users/long.lnt/Desktop/Projects/FairPay/docs/design-system/naming-conventions.md`

**Will Reference**:
- `/Users/long.lnt/Desktop/Projects/FairPay/src/components/ui/` - shadcn/ui primitives
- `/Users/long.lnt/Desktop/Projects/FairPay/tailwind.config.ts` - Theme tokens

---

## Implementation Steps

### Step 1: Create Design System Documentation Structure
```bash
mkdir -p docs/design-system
touch docs/design-system/{tokens,component-rules,layout-rules,interaction-rules,naming-conventions}.md
```

### Step 2: Document Spacing Scale
**File**: `docs/design-system/tokens.md`

Write comprehensive spacing rules:
- Base unit: 4px
- Scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64
- Usage examples for each value
- Responsive progression patterns
- Shadow/elevation scale (shadow-sm, shadow, shadow-md)
- Border radius scale (rounded, rounded-md, rounded-lg)

### Step 3: Document Typography Scale
**File**: `docs/design-system/tokens.md` (Typography section)

Define:
- 6-tier text hierarchy
- Font weights (normal, medium, semibold, bold)
- Line heights (tight, normal, relaxed)
- Responsive scaling patterns
- Usage examples per tier

### Step 4: Create Component Responsibility Matrix
**File**: `docs/design-system/component-rules.md`

Document for each shadcn/ui component:
- When to use it
- When NOT to use it
- Common variants
- Composition examples
- Anti-patterns to avoid

Priority components:
- Card, Button, Dialog, Drawer, Tabs, Badge, Alert

### Step 5: Define Layout System Rules
**File**: `docs/design-system/layout-rules.md`

Establish:
- 3 standard page layout patterns
- Container width rules
- Padding progression formulas
- Grid/flex usage guidelines
- Responsive breakpoint strategy

### Step 6: Document Interaction Principles
**File**: `docs/design-system/interaction-rules.md`

Define:
- Button hierarchy (primary/secondary/destructive/ghost)
- Loading states (when to use skeleton vs spinner)
- Error feedback patterns (inline vs toast vs alert)
- Form validation rules (real-time vs on-blur vs on-submit)
- Success confirmation patterns

### Step 7: Codify Naming Conventions
**File**: `docs/design-system/naming-conventions.md`

Enforce:
- File naming: kebab-case
- Component exports: PascalCase
- Props: camelCase
- CVA variants: descriptive names (not "large"/"small", use "compact"/"comfortable")
- File structure patterns

### Step 8: Create Design System Index
**File**: `docs/design-system/README.md`

Write overview linking to all sub-documents with:
- Quick reference table
- Decision log
- Migration checklist for existing code

### Step 9: Team Review & Approval
- Share documentation with team
- Gather feedback on rules
- Revise based on pushback
- Get formal approval from tech lead/product owner

### Step 10: Announce & Train
- Announce design system in team meeting
- Create PR review checklist based on rules
- Update linting rules to enforce conventions
- Schedule training session for CVA patterns

---

## Todo Checklist

- [ ] Create `docs/design-system/` directory structure
- [ ] Write spacing scale documentation with examples
- [ ] Write typography scale with responsive patterns
- [ ] Document component responsibility matrix (Card, Button, Dialog, etc.)
- [ ] Define 3 standard page layout patterns
- [ ] Document interaction principles (loading, error, success states)
- [ ] Codify naming conventions (kebab-case mandate)
- [ ] Create design system index/README
- [ ] Configure ESLint rule for file naming (kebab-case enforcement)
- [ ] Add Prettier config for consistent formatting
- [ ] Review with team and gather feedback
- [ ] Revise based on feedback
- [ ] Get formal approval from tech lead
- [ ] Announce design system in team meeting
- [ ] Create PR review checklist
- [ ] Schedule CVA training session

---

## Success Criteria

### Documentation Quality
- [ ] All 5 design system docs written (tokens, components, layout, interaction, naming)
- [ ] Each doc includes 5+ real code examples
- [ ] Decision rationale documented for each rule
- [ ] Anti-patterns explicitly listed

### Team Adoption
- [ ] 100% team members reviewed documentation
- [ ] Tech lead/product owner formal approval
- [ ] PR review checklist created and in use
- [ ] Linting rules configured to enforce naming

### Validation
- [ ] New component created using design system rules (proof of concept)
- [ ] Existing component refactored to match rules (migration test)
- [ ] Team can locate correct spacing value in <10 seconds (documentation usability)

---

## Risk Assessment

### High Risk
- **Team Pushback**: Developers resist new rules → **Mitigation**: Collaborative review process, explain rationale
- **Scope Creep**: Rules become too detailed/prescriptive → **Mitigation**: Keep rules actionable, not philosophical

### Medium Risk
- **Documentation Drift**: Rules documented but not followed → **Mitigation**: Linting enforcement, PR checklist
- **Incomplete Coverage**: Edge cases not documented → **Mitigation**: Living document, encourage questions

---

## Next Steps

**After Phase 1 Completion**:
1. Proceed to [Phase 2: Component Consolidation](./phase-02-component-consolidation.md)
2. Use design system rules to refactor dashboard components
3. Extract CVA variants based on documented patterns

**Blockers for Phase 2**:
- ✅ Spacing scale defined
- ✅ Typography scale defined
- ✅ Component responsibility matrix complete
- ✅ Naming convention approved

---

## Unresolved Questions

1. **Dark mode support?** - Does FairPay support dark mode? (Affects token naming)
2. **Animation standards?** - Should we document animation duration/easing?
3. **Icon usage rules?** - When to use Lucide vs custom SVGs?
4. **Form library?** - React Hook Form patterns documented?
5. **Table pagination?** - Standard pagination UI pattern?
