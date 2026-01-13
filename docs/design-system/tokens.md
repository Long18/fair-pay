# Design Tokens

Design tokens are the visual design atoms of the design system — specifically, they are named entities that store visual design attributes.

## Spacing Scale

### Base Unit: 4px

FairPay uses Tailwind's default spacing scale based on a 4px unit. This ensures consistent visual rhythm and makes calculations predictable.

**Rule**: NEVER use arbitrary spacing values like `p-5`, `gap-7`, `m-9`. Only use multiples of 4.

### Approved Spacing Values

| Token | Value | Tailwind Class | Usage |
|-------|-------|----------------|-------|
| `1` | 4px | `p-1`, `gap-1`, `m-1` | Minimal spacing, tight layouts |
| `2` | 8px | `p-2`, `gap-2`, `m-2` | Component internal spacing (button groups, input combos) |
| `3` | 12px | `p-3`, `gap-3`, `m-3` | Mobile padding (responsive base) |
| `4` | 16px | `p-4`, `gap-4`, `m-4` | **DEFAULT** - Card internal padding, standard spacing |
| `6` | 24px | `p-6`, `gap-6`, `m-6` | Section spacing, desktop padding |
| `8` | 32px | `p-8`, `gap-8`, `m-8` | Major section separation |
| `12` | 48px | `p-12`, `gap-12`, `m-12` | Hero sections, large whitespace |
| `16` | 64px | `p-16`, `gap-16`, `m-16` | Extra large whitespace |

### Spacing Patterns

**Container Padding (Responsive)**:
```tsx
// Mobile-first progression
className="px-4 py-6 md:px-6 md:py-8"
// 16px horizontal, 24px vertical on mobile
// 24px horizontal, 32px vertical on desktop
```

**Section Spacing**:
```tsx
// Major sections (Dashboard tabs, feature blocks)
className="space-y-6"  // 24px vertical gap

// Card groups
className="space-y-4"  // 16px vertical gap

// List items
className="space-y-2"  // 8px vertical gap
```

**Component Internal Spacing**:
```tsx
// Cards
className="p-4"  // 16px all sides (mobile/desktop)
className="p-4 md:p-6"  // 16px mobile, 24px desktop

// Buttons/inputs grouped together
className="flex gap-2"  // 8px gap

// Form fields
className="space-y-4"  // 16px between fields
```

### Anti-Patterns (DO NOT USE)

```tsx
// ❌ BAD: Arbitrary values
className="p-[18px]"
className="gap-[22px]"
className="m-[35px]"

// ❌ BAD: Off-scale values
className="p-5"   // 20px - not in scale
className="gap-7" // 28px - not in scale
className="m-9"   // 36px - not in scale

// ✅ GOOD: Use closest approved value
className="p-4"   // Use 16px instead of 20px
className="gap-6" // Use 24px instead of 28px
className="m-8"   // Use 32px instead of 36px
```

---

## Typography Scale

### Hierarchy (6 Tiers)

FairPay uses a 6-tier typography system with responsive scaling for mobile-first design.

| Tier | Class | Usage | Font Size | Weight |
|------|-------|-------|-----------|--------|
| **Page Title** | `.typography-page-title` | H1, page headers | `text-2xl md:text-3xl` | `font-bold` |
| **Section Header** | `.typography-section-title` | H2, major sections | `text-xl md:text-2xl` | `font-semibold` |
| **Subsection** | `.typography-card-title` | H3, card titles | `text-lg md:text-xl` | `font-medium` |
| **Row Title** | `.typography-row-title` | Table headers, list items | `text-base` | `font-medium` |
| **Body** | `.typography-body` | Default text | `text-sm` | `font-normal` |
| **Caption** | `.typography-metadata` | Metadata, timestamps | `text-xs` | `font-normal` |

### Usage Examples

```tsx
// Page Title
<h1 className="typography-page-title">Dashboard</h1>
// or inline
<h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>

// Section Header
<h2 className="typography-section-title">Recent Activity</h2>
// or inline
<h2 className="text-xl md:text-2xl font-semibold">Recent Activity</h2>

// Card Title
<h3 className="typography-card-title">Balance Summary</h3>
// or inline
<h3 className="text-lg md:text-xl font-medium">Balance Summary</h3>

// Row Title
<div className="typography-row-title">John Doe</div>
// or inline
<div className="text-base font-medium">John Doe</div>

// Body Text
<p className="typography-body">You owe John $25 for lunch.</p>
// or inline
<p className="text-sm">You owe John $25 for lunch.</p>

// Caption/Metadata
<span className="typography-metadata">2 hours ago</span>
// or inline
<span className="text-xs text-muted-foreground">2 hours ago</span>
```

### Financial Amount Typography

Special typography classes for displaying monetary amounts with tabular numerals.

```tsx
// Small amount
<span className="typography-amount">$25.00</span>
// text-sm font-semibold tabular-nums

// Prominent amount
<span className="typography-amount-prominent">$125.50</span>
// text-base font-bold tabular-nums

// Large amount (balance cards)
<span className="typography-amount-large">$1,234.56</span>
// text-lg font-bold tabular-nums
```

### Typography Rules

**Rule 1**: All page titles MUST use `.typography-page-title` or `text-2xl md:text-3xl font-bold`
**Rule 2**: Never use arbitrary font sizes like `text-[17px]` or `text-[1.3rem]`
**Rule 3**: Use `tabular-nums` for all financial amounts (ensures digit alignment)
**Rule 4**: Prefer utility classes over custom font sizes

### Line Heights

| Class | Value | Usage |
|-------|-------|-------|
| `leading-tight` | 1.25 | Headings, titles |
| `leading-normal` | 1.5 | Body text (default) |
| `leading-relaxed` | 1.625 | Long-form content |

---

## Color Tokens

Colors are defined using OKLCH format for consistent color perception across light/dark modes.

### Semantic Colors (DO NOT MODIFY)

| Token | Usage | Light Mode | Dark Mode |
|-------|-------|------------|-----------|
| `--background` | Page background | `oklch(0.985 0 0)` | `oklch(0.145 0 0)` |
| `--foreground` | Primary text | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` |
| `--primary` | Primary buttons, links | `oklch(0.598 0.365 217.2)` | `oklch(0.678 0.376 213.1)` |
| `--accent` | Accent elements | `oklch(0.531 0.380 24.6)` | `oklch(0.6 0.35 24.6)` |
| `--destructive` | Destructive actions | `oklch(0.577 0.245 27.325)` | `oklch(0.704 0.191 22.216)` |
| `--muted` | Muted backgrounds | `oklch(0.97 0 0)` | `oklch(0.269 0 0)` |
| `--muted-foreground` | Muted text | `oklch(0.556 0 0)` | `oklch(0.708 0 0)` |
| `--border` | Borders | `oklch(0.922 0 0)` | `oklch(0.269 0 0)` |
| `--card` | Card backgrounds | `oklch(1 0 0)` | `oklch(0.205 0 0)` |

### Status Colors (Payment States)

| Status | Token | Usage |
|--------|-------|-------|
| Success | `--status-success` | Paid, settled, completed |
| Warning | `--status-warning` | Unpaid, pending, partial |
| Info | `--status-info` | Informational states |

```tsx
// Success (Green)
className="bg-status-success-bg text-status-success-foreground border-status-success-border"

// Warning (Orange)
className="bg-status-warning-bg text-status-warning-foreground border-status-warning-border"

// Info (Blue)
className="bg-status-info-bg text-status-info-foreground border-status-info-border"
```

### Semantic Colors (Owe Status)

| Semantic | Token | Usage |
|----------|-------|-------|
| Negative | `--semantic-negative` | You owe (red) |
| Positive | `--semantic-positive` | You are owed (green) |
| Neutral | `--semantic-neutral` | Balanced, neutral |

```tsx
// Negative balance (owe money)
className="text-semantic-negative"

// Positive balance (owed money)
className="text-semantic-positive"

// Neutral balance
className="text-semantic-neutral"
```

---

## Shadows & Elevation

### Shadow Scale

| Class | Value | Usage |
|-------|-------|-------|
| `shadow-sm` | Small shadow | Subtle elevation (cards at rest) |
| `shadow` | Default shadow | Standard elevation (dropdowns) |
| `shadow-md` | Medium shadow | Moderate elevation (modals) |
| `shadow-lg` | Large shadow | High elevation (tooltips) |
| `shadow-xl` | Extra large shadow | Maximum elevation (command palette) |

### Elevation Rules

**Rule**: Use shadows to indicate elevation hierarchy, not decoration.

```tsx
// Cards at rest
<Card className="shadow-sm">

// Hover state (lift card)
<Card className="shadow-sm hover:shadow-md transition-shadow">

// Modal/Dialog (high elevation)
<Dialog className="shadow-lg">

// Floating elements (command palette, tooltips)
<CommandPalette className="shadow-xl">
```

---

## Border Radius

### Radius Scale

| Token | Value | Tailwind Class | Usage |
|-------|-------|----------------|-------|
| `--radius-sm` | `calc(var(--radius) - 4px)` | `rounded-sm` | Buttons, badges |
| `--radius-md` | `calc(var(--radius) - 2px)` | `rounded-md` | Inputs, small cards |
| `--radius-lg` | `var(--radius)` (12px) | `rounded-lg` | Cards, dialogs (default) |
| `--radius-xl` | `calc(var(--radius) + 4px)` | `rounded-xl` | Hero sections, large cards |

### Radius Rules

**Rule**: Use `rounded-lg` as the default. Only deviate for specific use cases.

```tsx
// Default (most components)
<Card className="rounded-lg">

// Buttons (slightly smaller radius)
<Button className="rounded-md">

// Avatars (full circle)
<Avatar className="rounded-full">

// Hero sections (larger radius)
<section className="rounded-xl">
```

---

## Breakpoints

### Responsive Breakpoints

| Breakpoint | Value | Tailwind Prefix | Device |
|------------|-------|-----------------|--------|
| `xs` | `0px` | (default) | Mobile portrait |
| `sm` | `640px` | `sm:` | Mobile landscape, tablets |
| `md` | `768px` | `md:` | Tablets, small laptops |
| `lg` | `1024px` | `lg:` | Desktops |
| `xl` | `1280px` | `xl:` | Large desktops |
| `2xl` | `1536px` | `2xl:` | Extra large screens |

### Mobile-First Strategy

**Rule**: Always design for 375px (iPhone SE) first, then scale up.

```tsx
// Mobile-first padding
className="px-4 py-6 md:px-6 md:py-8"
// Mobile: 16px horizontal, 24px vertical
// Desktop: 24px horizontal, 32px vertical

// Mobile-first grid
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
// Mobile: 1 column
// Tablet: 2 columns
// Desktop: 3 columns

// Mobile-first text
className="text-2xl md:text-3xl"
// Mobile: 24px
// Desktop: 30px
```

### Touch Target Minimum

**Rule**: All interactive elements MUST be 44px minimum on mobile (iOS HIG standard).

```tsx
// Buttons
<Button className="min-h-11">  // 44px
  Click Me
</Button>

// Links/clickable areas
<a className="inline-flex items-center min-h-11">
  Learn More
</a>

// Icon buttons
<button className="size-11">  // 44x44px
  <Icon />
</button>
```

---

## Animation Tokens

### Duration Scale

| Variable | Value | Usage |
|----------|-------|-------|
| `--animation-duration-fast` | `150ms` | Micro-interactions (hover, focus) |
| `--animation-duration-normal` | `200ms` | Standard transitions (fade, slide) |
| `--animation-duration-slow` | `300ms` | Complex animations (expand, collapse) |

### Easing Curves

| Variable | Value | Usage |
|----------|-------|-------|
| `--animation-easing-out` | `cubic-bezier(0, 0, 0.2, 1)` | Elements entering screen |
| `--animation-easing-in` | `cubic-bezier(0.4, 0, 1, 1)` | Elements leaving screen |
| `--animation-easing-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` | Bidirectional animations |

### Animation Rules

**Rule 1**: Use CSS variables for duration, not hardcoded values
**Rule 2**: Prefer `transition` over `animation` for simple state changes
**Rule 3**: Use `ease-out` for entering, `ease-in` for exiting

```tsx
// Hover state (fast)
className="transition-colors duration-[var(--animation-duration-fast)]"

// Fade in (normal)
className="animate-fade-in" // Uses --animation-duration-normal

// Expand/collapse (slow)
className="animate-expand" // Uses --animation-duration-slow
```

---

## Z-Index Scale

### Layering System

| Layer | Value | Usage |
|-------|-------|-------|
| Base | `0` | Default layer |
| Dropdown | `10` | Dropdowns, popovers |
| Sticky | `20` | Sticky headers |
| Modal | `30` | Dialogs, sheets |
| Popover | `40` | Tooltips, command palette |
| Toast | `50` | Notifications, toasts |

**Rule**: Never use arbitrary z-index values. Use this scale.

```tsx
// Sticky header
<header className="sticky top-0 z-20">

// Modal
<Dialog className="z-30">

// Toast
<Toast className="z-50">
```

---

## Summary

### Key Takeaways

1. **Spacing**: Use 4px base unit, only multiples of 4 (4, 8, 12, 16, 24, 32)
2. **Typography**: 6-tier hierarchy with responsive scaling
3. **Colors**: Use semantic tokens, never hardcode colors
4. **Shadows**: Indicate elevation, not decoration
5. **Radius**: `rounded-lg` default, `rounded-md` for buttons
6. **Breakpoints**: Mobile-first, 44px touch targets minimum
7. **Animation**: Use CSS variables for duration/easing
8. **Z-Index**: Use defined scale, no arbitrary values

### Validation Checklist

- [ ] No arbitrary spacing values (`p-[18px]`, `gap-[22px]`)
- [ ] No off-scale spacing (`p-5`, `gap-7`, `m-9`)
- [ ] All page titles use `.typography-page-title`
- [ ] All amounts use `tabular-nums`
- [ ] All interactive elements ≥44px on mobile
- [ ] No hardcoded color values (`text-blue-500`)
- [ ] All animations use CSS variables
- [ ] All z-index values from approved scale
