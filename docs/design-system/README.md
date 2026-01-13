# FairPay Design System

**Version**: 1.0.0
**Status**: Foundation Complete
**Last Updated**: 2026-01-13

---

## Overview

The FairPay Design System establishes the foundational rules, patterns, and principles for building consistent, scalable, and maintainable UI/UX across the application.

**Purpose**: Eliminate ad-hoc design decisions, reduce component duplication, and ensure visual consistency.

**Philosophy**: YAGNI + KISS + DRY = Simple, consistent, reusable patterns.

---

## Documentation

### Core Documentation

1. **[Design Tokens](./tokens.md)** - Spacing, typography, colors, shadows, animations
2. **[Component Rules](./component-rules.md)** - When to use each shadcn/ui component
3. **[Layout Rules](./layout-rules.md)** - Page patterns, grid/flex layouts, responsive design
4. **[Interaction Rules](./interaction-rules.md)** - Loading states, validation, feedback, animations
5. **[Naming Conventions](./naming-conventions.md)** - File, component, variable, type naming standards

---

## Quick Reference

### Spacing Scale (Primary)

Most common values — use these for 95% of cases:

| Value | Tailwind | Usage |
|-------|----------|-------|
| 8px | `gap-2` | Component internal (button groups) |
| 16px | `gap-4` | **DEFAULT** - Card spacing |
| 24px | `gap-6` | Section spacing |
| 32px | `gap-8` | Major sections |

**Rule**: NEVER use `p-5`, `gap-7`, `m-9` (only multiples of 4)

See [tokens.md](./tokens.md) for full spacing scale including secondary values (`gap-1`, `gap-3`, `gap-12`, `gap-16`)

---

### Typography Hierarchy

| Tier | Class | Usage |
|------|-------|-------|
| Page Title | `.typography-page-title` | H1, page headers |
| Section | `.typography-section-title` | H2, major sections |
| Card Title | `.typography-card-title` | H3, card headers |
| Body | `.typography-body` | Default text |
| Caption | `.typography-metadata` | Timestamps, metadata |

**Rule**: All page titles MUST use `.typography-page-title`

---

### Layout Patterns

| Pattern | Max Width | Usage |
|---------|-----------|-------|
| Default | `max-w-7xl` | Lists, dashboards |
| Narrow | `max-w-4xl` | Forms, detail views |
| Full Width | `w-full` | Reports, charts |

```tsx
// Default page
<div className="container max-w-7xl px-4 py-6 md:px-6 md:py-8">
  <h1 className="typography-page-title mb-6">Dashboard</h1>
  <div className="space-y-6">{/* Sections */}</div>
</div>
```

---

### Component Decisions

#### Card vs Div

- **Use `<Card>`**: Self-contained data (balance summary, stats)
- **Use `<div>`**: Layout containers, form groups

#### Dialog vs Drawer

- **Use `<ResponsiveDialog>`**: Forms, filters, settings (auto-switches)
- **Use `<Dialog>`**: Confirmations, small modals
- **Use `<Drawer>`**: Rarely (prefer ResponsiveDialog)

#### Button Hierarchy

- **`default`**: Primary action (max 1 per section)
- **`secondary`**: Supporting actions
- **`outline`**: Tertiary actions
- **`destructive`**: Delete, remove
- **`ghost`**: Inline actions, icon buttons

---

### Loading States

| Pattern | Usage |
|---------|-------|
| **Skeleton** | Initial page load |
| **Spinner** | Button actions (< 3s) |
| **Progress Bar** | Known duration tasks |
| **Overlay** | Blocking operations |

---

### Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Component file | `kebab-case.tsx` | `balance-summary-card.tsx` |
| Component export | `PascalCase` | `BalanceSummaryCard` |
| Props | `camelCase` | `totalAmount` |
| Boolean prop | `is/has/can/should` | `isLoading` |
| Event handler prop | `on*` | `onClick` |
| Constant | `UPPER_SNAKE_CASE` | `MAX_UPLOAD_SIZE` |
| Function | `camelCase` (verb) | `calculateBalance` |
| Custom hook | `use*` | `useLocalStorage` |

---

## Design Principles

### 1. Mobile-First

Design for 375px (iPhone SE) first, then scale up.

```tsx
className="px-4 py-6 md:px-6 md:py-8"
```

**Touch targets**: Minimum 44px (iOS HIG standard)

### 2. Consistent Spacing

Use approved spacing scale. No arbitrary values.

```tsx
✅ gap-4 gap-6 gap-8
❌ gap-5 gap-7 gap-[22px]
```

### 3. Component Reuse

Prefer composition over duplication. Use CVA for variants.

### 4. Semantic Naming

Names should describe purpose, not appearance.

```tsx
✅ BalanceSummaryCard
❌ BlueCard
```

### 5. Accessibility

- All interactive elements ≥44px on mobile
- Visible focus states (`focus-visible:ring-2`)
- Proper ARIA labels for icon-only buttons
- Keyboard navigation support

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-01-13 | Adopt kebab-case for files | Consistency with shadcn/ui, prevents case issues |
| 2026-01-13 | 4px spacing scale only | Tailwind default, predictable progression |
| 2026-01-13 | Max 1 primary button per section | Clear action hierarchy |
| 2026-01-13 | ResponsiveDialog as default modal | Auto-adapts mobile/desktop |
| 2026-01-13 | 6-tier typography hierarchy | Sufficient granularity without complexity |

---

## Usage Guidelines

### For Developers

**Before writing code**:
1. Check if component exists in `src/components/ui/` (shadcn)
2. Check if pattern exists in Layout Rules
3. Check if similar component exists in codebase
4. Follow naming conventions

**During development**:
- Use design tokens (spacing, typography, colors)
- Follow component responsibility matrix
- Apply responsive breakpoints (mobile-first)
- Add proper loading/error states

**Before PR**:
- Run type check (`pnpm type-check`)
- Validate naming conventions
- Check accessibility (focus states, touch targets)
- Test on mobile viewport

### For Designers

**Design checklist**:
- [ ] Use spacing scale (4, 8, 16, 24, 32px)
- [ ] Use typography hierarchy (6 tiers)
- [ ] Use semantic color tokens
- [ ] Touch targets ≥44px
- [ ] Mobile-first approach
- [ ] Consistent component patterns

---

## Migration Checklist

### Phase 1: Foundation ✅

- [x] Document spacing scale
- [x] Document typography hierarchy
- [x] Document component responsibilities
- [x] Document layout patterns
- [x] Document interaction principles
- [x] Document naming conventions
- [x] Create design system index

### Phase 2: Component Consolidation (Next)

- [ ] Rename PascalCase files to kebab-case
- [ ] Extract CVA variants for cards/buttons/badges
- [ ] Create custom hooks (useTableFilter, useTableSort)
- [ ] Build composite DataCard component
- [ ] Consolidate dashboard components (33 → 23)

### Phase 3: Layout Consistency

- [ ] Create PageContainer wrapper component
- [ ] Create PageTitle component
- [ ] Standardize tab navigation
- [ ] Fix container padding inconsistencies
- [ ] Add mobile breadcrumb alternative

### Phase 4: UX Flows

- [ ] Implement tab state persistence
- [ ] Simplify expense entry form (7 → 2 fields)
- [ ] Add sticky balance card
- [ ] Implement optimistic UI updates
- [ ] Create quick settlement modal

### Phase 5: Mobile Optimization

- [ ] Enforce 44px touch targets
- [ ] Add mobile bottom navigation
- [ ] Create ResponsiveModal wrapper
- [ ] Fix horizontal scroll on mobile cards
- [ ] Add Floating Action Button

---

## Common Patterns

### Page Template

```tsx
export function ExpensesPage() {
  return (
    <div className="container max-w-7xl px-4 py-6 md:px-6 md:py-8">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="typography-page-title">Expenses</h1>
        <Button>Create Expense</Button>
      </div>

      {/* Page content */}
      <div className="space-y-6">
        <section>
          <h2 className="typography-section-title mb-4">Recent</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {expenses.map(expense => <ExpenseCard key={expense.id} {...expense} />)}
          </div>
        </section>
      </div>
    </div>
  )
}
```

### Form Pattern

```tsx
export function ExpenseForm() {
  return (
    <Card className="p-4 md:p-6">
      <form className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <Input id="amount" type="number" />
          <p className="text-xs text-destructive">{error}</p>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="secondary">Cancel</Button>
          <Button type="submit">Save</Button>
        </div>
      </form>
    </Card>
  )
}
```

### Loading Pattern

```tsx
export function ExpenseList() {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {expenses.map(expense => <ExpenseCard key={expense.id} {...expense} />)}
    </div>
  )
}
```

---

## Resources

### External References

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Radix UI Documentation](https://www.radix-ui.com/primitives)
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines)
- [Material Design Guidelines](https://m3.material.io/)

### Internal Documentation

- **Codebase**: `/docs/codebase-summary.md`
- **Implementation Plans**: `/plans/260113-1935-ui-ux-system-refactor/`
- **Research Reports**: See plan directory

---

## Support

### Questions?

**Design Questions**: Refer to component-rules.md
**Layout Questions**: Refer to layout-rules.md
**Naming Questions**: Refer to naming-conventions.md
**Token Questions**: Refer to tokens.md

### Feedback

Found an issue or have a suggestion? Create an issue in the project repository with the label `design-system`.

---

## Changelog

### Version 1.0.0 (2026-01-13)

**Initial Release**:
- Established spacing scale (4px base unit)
- Defined 6-tier typography hierarchy
- Created component responsibility matrix
- Documented 3 standard page layouts
- Codified interaction patterns
- Enforced naming conventions
- Created design system documentation structure

---

**Next**: Proceed to [Phase 2: Component Consolidation](../../plans/260113-1935-ui-ux-system-refactor/phase-02-component-consolidation.md)
