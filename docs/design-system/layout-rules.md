# Layout System Rules

Consistent layout patterns create visual rhythm and reduce cognitive load. This document defines the 3 standard page layouts and layout composition rules for FairPay.

---

## Page Layout Patterns

### Pattern 1: Default Page (Most Common)

**Use for**: Dashboard, Expenses List, Payments, Groups, Friends

```tsx
<div className="container max-w-7xl px-4 py-6 md:px-6 md:py-8">
  {/* Page title */}
  <h1 className="typography-page-title mb-6">Dashboard</h1>

  {/* Page content */}
  <div className="space-y-6">
    {/* Sections with 24px vertical gap */}
    <section>
      <h2 className="typography-section-title mb-4">Overview</h2>
      {/* Section content */}
    </section>
  </div>
</div>
```

**Breakdown**:
- Container: `max-w-7xl` (1280px max width)
- Padding: `px-4 py-6` mobile → `md:px-6 md:py-8` desktop
- Section spacing: `space-y-6` (24px)

---

### Pattern 2: Narrow Page

**Use for**: Forms, Settings, Profile Edit, Detail Views

```tsx
<div className="container max-w-4xl px-4 py-6 mx-auto">
  {/* Page title */}
  <h1 className="typography-page-title mb-6">Create Expense</h1>

  {/* Form content (narrower for readability) */}
  <Card className="p-4 md:p-6">
    <form className="space-y-4">
      {/* Form fields */}
    </form>
  </Card>
</div>
```

**Breakdown**:
- Container: `max-w-4xl` (896px max width, better for forms)
- Padding: `px-4 py-6` (consistent mobile/desktop)
- Form spacing: `space-y-4` (16px between fields)

---

### Pattern 3: Full Width

**Use for**: Reports, Charts, Data Visualizations, Tables

```tsx
<div className="w-full px-4 py-6 md:px-6 md:py-8">
  {/* Page title */}
  <div className="container max-w-7xl mx-auto mb-6">
    <h1 className="typography-page-title">Reports</h1>
  </div>

  {/* Full-width content */}
  <div className="container max-w-7xl mx-auto">
    <Card className="p-4 md:p-6">
      {/* Charts, tables, etc. */}
    </Card>
  </div>
</div>
```

**Breakdown**:
- Wrapper: `w-full` (no max-width constraint)
- Content containers: `max-w-7xl mx-auto` (centered with max width)
- Padding: `px-4 py-6` mobile → `md:px-6 md:py-8` desktop

---

## Layout Pattern Decision Tree

```
What type of page are you building?

├─ List view (expenses, groups, friends)
│  └─ Use Default Page (max-w-7xl)

├─ Form (create/edit)
│  └─ Use Narrow Page (max-w-4xl)

├─ Data visualization (reports, charts)
│  └─ Use Full Width (w-full with max-w-7xl content)

├─ Dashboard (multiple sections)
│  └─ Use Default Page (max-w-7xl)

└─ Detail view (expense show, group show)
   └─ Use Default Page (max-w-7xl)
```

---

## Container Width Standards

| Max Width | Value | Use Case |
|-----------|-------|----------|
| `max-w-4xl` | 896px | Forms, narrow content |
| `max-w-7xl` | 1280px | Default pages, dashboards |
| `w-full` | 100% | Full-width layouts |

**Rule**: DO NOT use arbitrary max-widths like `max-w-[950px]`. Use approved values only.

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
    // 1. Page Container
    <div className="container max-w-7xl px-4 py-6 md:px-6 md:py-8">

      {/* 2. Page Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="typography-page-title">Expenses</h1>
        <Button>Create Expense</Button>
      </div>

      {/* 3. Page Content (sections with spacing) */}
      <div className="space-y-6">

        {/* Section 1 */}
        <section>
          <h2 className="typography-section-title mb-4">Recent Expenses</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card />
            <Card />
            <Card />
          </div>
        </section>

        {/* Section 2 */}
        <section>
          <h2 className="typography-section-title mb-4">All Expenses</h2>
          <DataTable />
        </section>

      </div>
    </div>
  )
}
```

### Structure Rules

**Rule 1**: Page title MUST have `mb-6` (24px margin below)
**Rule 2**: Section headers MUST have `mb-4` (16px margin below)
**Rule 3**: Sections MUST use `space-y-6` (24px vertical gap)
**Rule 4**: Card grids MUST use `gap-4` (16px gap between cards)

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

| Page Type | Pattern | Max Width | Padding |
|-----------|---------|-----------|---------|
| List views | Default | `max-w-7xl` | `px-4 py-6 md:px-6 md:py-8` |
| Forms | Narrow | `max-w-4xl` | `px-4 py-6` |
| Reports | Full Width | `w-full` | `px-4 py-6 md:px-6 md:py-8` |

### Spacing Quick Reference

| Context | Gap/Space | Value |
|---------|-----------|-------|
| Sections | `space-y-6` | 24px |
| Cards | `space-y-4` | 16px |
| Form fields | `space-y-4` | 16px |
| Button groups | `gap-2` | 8px |
| Card grids | `gap-4` | 16px |

### Validation Checklist

- [ ] Using one of 3 approved page patterns (Default, Narrow, Full Width)
- [ ] Container padding follows mobile-first progression
- [ ] Page titles have `mb-6` (24px margin below)
- [ ] Section headers have `mb-4` (16px margin below)
- [ ] Card grids use `gap-4` (16px gap)
- [ ] Mobile stacking follows priority order (primary content first)
- [ ] Sticky elements use approved z-index scale
- [ ] Empty states centered with `py-12` padding
