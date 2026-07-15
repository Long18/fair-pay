# Layout System Rules

Consistent layout patterns create visual rhythm and reduce cognitive load. This document defines the standard page layouts and layout composition rules for FairPay.

---

## Horizontal gutter ownership (single owner)

**Canonical pattern (authenticated app shell):**

1. `Layout` (`src/components/refine-ui/layout/layout.tsx`) owns horizontal gutters: `px-4 sm:px-6`.
2. Nested pages use `PageContainer` with **`padding="none"`** so content is not double-padded.
3. Vertical rhythm comes from `PageContainer` `spacing` (`default` / `compact` / `spacious` / `none`).

```tsx
// layout.tsx — gutters once
<div className="container mx-auto … px-4 sm:px-6 pt-16 md:pt-20">
  {children}
</div>

// page — no second horizontal pad
<PageContainer padding="none" variant="default">
  <PageHeader title="…" />
  …
</PageContainer>
```

**Do not** add another `px-4 md:px-6` on the page root when already inside `Layout`. Outside the shell (rare marketing / standalone), `PageContainer padding="default"` is fine.

---

## Page Layout Patterns

### Pattern 1: Default Page (Most Common)

**Use for**: Dashboard, Expenses List, Payments, Groups, Friends, Settings

```tsx
import { PageContainer } from "@/components/ui/page-container"
import { PageHeader } from "@/components/ui/page-header"

<PageContainer padding="none" variant="default">
  <PageHeader title="Dashboard" action={<Button>Create</Button>} />
  <div className="space-y-6">
    <section>
      <h2 className="typography-section-title mb-4">Overview</h2>
      {/* Section content */}
    </section>
  </div>
</PageContainer>
```

**Breakdown**:
- Max width: `max-w-7xl` via `PageContainer variant="default"`
- Horizontal padding: owned by `Layout` (`px-4 sm:px-6`); page uses `padding="none"`
- Section spacing: `space-y-6` (24px)

---

### Pattern 2: Narrow Page

**Use for**: Forms, Profile Edit, Detail Views

```tsx
<PageContainer padding="none" variant="narrow">
  <PageHeader title="Create Expense" />
  <Card className="p-4 md:p-6">
    <form className="space-y-4">{/* fields */}</form>
  </Card>
</PageContainer>
```

**Breakdown**:
- Max width: `max-w-4xl` via `variant="narrow"`
- Form spacing: `space-y-4` (16px between fields)

---

### Pattern 3: Full Width

**Use for**: Charts, Data Visualizations, Wide Tables

```tsx
<PageContainer padding="none" variant="full">
  <PageHeader title="Reports" />
  <Card className="p-4 md:p-6">{/* charts, tables */}</Card>
</PageContainer>
```

**Breakdown**:
- Max width: unconstrained (`variant="full"`)
- Still nested under Layout gutters

---

## Layout Pattern Decision Tree

```
What type of page are you building?

├─ List view (expenses, groups, friends, settings)
│  └─ PageContainer default + PageHeader (required)

├─ Form (create/edit)
│  └─ PageContainer narrow + PageHeader

├─ Data visualization (charts, wide tables)
│  └─ PageContainer full + PageHeader

├─ Dashboard (multiple sections)
│  └─ PageContainer default + PageHeader

└─ Detail view (expense show, group show)
   └─ PageContainer default + PageHeader
```

---

## Container Width Standards

| Max Width | Value | Use Case |
|-----------|-------|----------|
| `max-w-4xl` | 896px | Forms, narrow content (`variant="narrow"`) |
| `max-w-7xl` | 1280px | Default pages, dashboards (`variant="default"`) |
| `max-w-none` / full | 100% | Full-width layouts (`variant="full"`) |

**Rule**: DO NOT use arbitrary max-widths like `max-w-[950px]`. Use approved `PageContainer` variants only.

---

## Padding Progression

### Mobile-First Padding

**Rule**: Start with mobile padding, then scale up for larger screens.

```tsx
// Container padding
className="px-4 py-6 md:px-6 md:py-8"
// Mobile: 16px horizontal, 24px vertical
// Desktop: 24px horizontal, 32px vertical

// Card padding
className="p-4 md:p-6"
// Mobile: 16px all sides
// Desktop: 24px all sides

// Section padding (rare)
className="px-3 py-4 md:px-4 md:py-6"
// Mobile: 12px horizontal, 16px vertical
// Desktop: 16px horizontal, 24px vertical
```

### Padding Anti-Patterns

```tsx
// ❌ BAD: Inconsistent progression
className="px-4 md:px-8"  // 16px → 32px (too big jump)
className="py-3 md:py-7"  // 12px → 28px (off-scale)

// ✅ GOOD: Consistent progression
className="px-4 md:px-6"  // 16px → 24px (8px increment)
className="py-6 md:py-8"  // 24px → 32px (8px increment)
```

---

## Grid Layouts

### Responsive Grid Patterns

```tsx
// 1 column mobile → 2 columns tablet → 3 columns desktop
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  <Card />
  <Card />
  <Card />
</div>

// 1 column mobile → 3 columns desktop (skip tablet)
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  <Card />
  <Card />
  <Card />
</div>

// Auto-fit (responsive without breakpoints)
<div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4">
  <Card />
  <Card />
  <Card />
</div>
```

### Grid Gap Standards

| Gap | Value | Usage |
|-----|-------|-------|
| `gap-2` | 8px | Tight layouts (button groups) |
| `gap-4` | 16px | **DEFAULT** - Standard card grids |
| `gap-6` | 24px | Spacious layouts (dashboard sections) |

**Rule**: Use `gap-4` as the default. Only deviate for specific needs.

---

## Flex Layouts

### Horizontal Layouts (Row)

```tsx
// Default: left-aligned with gap
<div className="flex gap-4">
  <Button>Save</Button>
  <Button variant="secondary">Cancel</Button>
</div>

// Space between (common for headers)
<div className="flex items-center justify-between">
  <h2 className="typography-section-title">Expenses</h2>
  <Button>Create</Button>
</div>

// Centered (common for empty states)
<div className="flex flex-col items-center justify-center gap-4">
  <EmptyIcon />
  <p>No expenses found</p>
</div>
```

### Vertical Layouts (Column)

```tsx
// Stack with gap
<div className="flex flex-col gap-4">
  <Card />
  <Card />
  <Card />
</div>

// Alternative: space-y utility
<div className="space-y-4">
  <Card />
  <Card />
  <Card />
</div>
```

### Flex Gap Standards

| Gap | Value | Usage |
|-----|-------|-------|
| `gap-1` | 4px | Icon + text |
| `gap-2` | 8px | Button groups, input combos |
| `gap-4` | 16px | **DEFAULT** - General spacing |
| `gap-6` | 24px | Major sections |

---

## Page Structure Template

### Standard Page Anatomy

```tsx
export function ExpensesListPage() {
  return (
    <PageContainer padding="none" variant="default">
      <PageHeader title="Expenses" action={<Button>Create Expense</Button>} />

      <div className="space-y-6">
        <section>
          <h2 className="typography-section-title mb-4">Recent Expenses</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card />
            <Card />
            <Card />
          </div>
        </section>

        <section>
          <h2 className="typography-section-title mb-4">All Expenses</h2>
          <DataTable />
        </section>
      </div>
    </PageContainer>
  )
}
```

### Structure Rules

**Rule 1**: List/settings pages MUST use `PageHeader` (not a raw `h1` with ad-hoc text sizes)
**Rule 2**: Section headers MUST have `mb-4` (16px margin below)
**Rule 3**: Sections MUST use `space-y-6` (24px vertical gap)
**Rule 4**: Card grids MUST use `gap-4` (16px gap between cards)
**Rule 5**: Do not double horizontal gutters when nested under `Layout`

---

## Responsive Behavior

### Breakpoint Strategy

| Breakpoint | Width | Typical Change |
|------------|-------|----------------|
| `sm:` | 640px | 1 col → 2 cols |
| `md:` | 768px | Mobile → Desktop transition, padding increase |
| `lg:` | 1024px | 2 cols → 3 cols |

### Mobile-First Responsive Example

```tsx
<div className="container max-w-7xl px-4 py-6 md:px-6 md:py-8">
  {/* Title: smaller on mobile */}
  <h1 className="text-2xl md:text-3xl font-bold mb-6">
    Dashboard
  </h1>

  {/* Grid: 1 col mobile → 2 cols tablet → 3 cols desktop */}
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    <Card className="p-4 md:p-6">
      {/* Card padding: 16px mobile → 24px desktop */}
      <h3 className="text-lg md:text-xl font-medium mb-2">
        Balance
      </h3>
      <span className="text-lg font-bold">$125.50</span>
    </Card>
  </div>
</div>
```

---

## Stack Order (Mobile)

### Mobile Layout Rules

**Rule**: On mobile, stack content vertically in priority order.

```tsx
// ✅ GOOD: Priority order (mobile stacks vertically)
<div className="flex flex-col md:flex-row gap-4">
  {/* 1. Primary content (shows first on mobile) */}
  <div className="flex-1">
    <MainContent />
  </div>

  {/* 2. Secondary content (shows second on mobile) */}
  <aside className="md:w-80">
    <Sidebar />
  </aside>
</div>

// ❌ BAD: Sidebar shows first on mobile
<div className="flex flex-col md:flex-row gap-4">
  <aside className="md:w-80">
    <Sidebar />
  </aside>
  <div className="flex-1">
    <MainContent />
  </div>
</div>
```

---

## Card Layouts

### Card Variants

```tsx
// Simple card (default)
<Card className="p-4">
  <h3 className="typography-card-title mb-2">Title</h3>
  <p className="typography-body">Content</p>
</Card>

// Card with header/footer
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Content</p>
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>

// Clickable card
<Card className="p-4 cursor-pointer hover:shadow-md transition-shadow">
  <h3 className="typography-card-title">Title</h3>
</Card>

// Card with border emphasis
<Card className="p-4 border-primary">
  <h3 className="typography-card-title text-primary">Featured</h3>
</Card>
```

### Card Grid Layouts

```tsx
// 3-column grid (responsive)
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  <Card className="p-4">
    <CardContent />
  </Card>
</div>

// 2-column grid (forms)
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <Card className="p-4">
    <FormField />
  </Card>
</div>

// Bento grid (mixed sizes)
<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
  <Card className="md:col-span-2 p-4">
    <LargeCard />
  </Card>
  <Card className="p-4">
    <SmallCard />
  </Card>
  <Card className="p-4">
    <SmallCard />
  </Card>
</div>
```

---

## Sticky Elements

### Sticky Header

```tsx
<header className="sticky top-0 z-20 bg-background border-b">
  <div className="container max-w-7xl px-4 py-3 md:px-6">
    <div className="flex items-center justify-between">
      <Logo />
      <Navigation />
    </div>
  </div>
</header>
```

### Sticky Sidebar

```tsx
<aside className="sticky top-4 h-fit">
  <Card className="p-4">
    <SidebarContent />
  </Card>
</aside>
```

### Sticky Rules

**Rule 1**: Use `z-20` for sticky headers (see z-index scale in tokens.md)
**Rule 2**: Add `bg-background` to prevent content showing through
**Rule 3**: Use `top-0` for headers, `top-4` for sidebars (offset for spacing)

---

## Empty States

### Empty State Layout

```tsx
<div className="flex flex-col items-center justify-center py-12 text-center">
  <EmptyIcon className="size-16 text-muted-foreground mb-4" />
  <h3 className="typography-card-title mb-2">No expenses yet</h3>
  <p className="typography-body text-muted-foreground mb-6">
    Create your first expense to get started.
  </p>
  <Button>Create Expense</Button>
</div>
```

### Empty State Rules

**Rule 1**: Use `py-12` (48px) for vertical padding (generous whitespace)
**Rule 2**: Center-align content (`items-center justify-center text-center`)
**Rule 3**: Icon size: `size-16` (64x64px)
**Rule 4**: Always provide a CTA button

---

## Summary

### Layout Pattern Quick Reference

| Page Type | Pattern | Max Width | Gutters |
|-----------|---------|-----------|---------|
| List / settings | Default + `PageHeader` | `max-w-7xl` | Layout `px-4 sm:px-6`; `PageContainer padding="none"` |
| Forms | Narrow + `PageHeader` | `max-w-4xl` | Same |
| Charts / wide tables | Full + `PageHeader` | full | Same |

### Spacing Quick Reference

| Context | Gap/Space | Value |
|---------|-----------|-------|
| Sections | `space-y-6` | 24px |
| Cards | `space-y-4` | 16px |
| Form fields | `space-y-4` | 16px |
| Button groups | `gap-2` | 8px |
| Card grids | `gap-4` | 16px |

### Validation Checklist

- [ ] Using `PageContainer` + `PageHeader` (one of default / narrow / full)
- [ ] No double horizontal padding (Layout owns gutters; page uses `padding="none"`)
- [ ] Page titles use `PageHeader` / `typography-page-title` (not ad-hoc text sizes)
- [ ] Section headers have `mb-4` (16px margin below)
- [ ] Card grids use `gap-4` (16px gap)
- [ ] Mobile stacking follows priority order (primary content first)
- [ ] Sticky elements use approved z-index scale
- [ ] Empty states use shared empty primitives / centered `py-12` padding
