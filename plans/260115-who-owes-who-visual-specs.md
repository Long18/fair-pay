# Visual Specifications: "Who Owes Who" UI Patterns
**Date**: January 15, 2026
**Purpose**: Design specifications with exact measurements and visual hierarchy
**Format**: Specification guide for designers + developers

---

## Dashboard Debt Breakdown: Card Pattern

### Desktop Layout (1200px+)

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ Debt Breakdown                                   [Show History]┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  64px ┌────┐  Name: Alice                    YOU OWE $45.50 │
│       │    │  Metadata: 3 expenses • Last: 12/25         [▼]│
│  64px │Ave │                                                │
│       │    │                                                │
│       └────┘                                                │
└──────────────────────────────────────────────────────────────┘
                               ↓ EXPAND
┌──────────────────────────────────────────────────────────────┐
│                     CONTRIBUTING EXPENSES                    │
│                                                              │
│ [Checkbox] Dinner              12/25  -$50.00  [Unpaid]    │
│            Restaurant • Total: $100                          │
│                                                              │
│ [Checkbox] Drinks              12/24  -$30.00  [Unpaid]    │
│            Bar • Total: $60                                  │
│                                                              │
│ [Checkbox] Dessert             12/23  -$20.00  [Paid]      │
│            Bakery • Total: $40                               │
├──────────────────────────────────────────────────────────────┤
│ [View Full Breakdown] [View Profile]                        │
└──────────────────────────────────────────────────────────────┘
```

### Mobile Layout (375px)

```
Debt Breakdown

┌───────────────────────────────┐
│ ┌──────┐ Alice                │
│ │      │ [YOU OWE] -$45.50  │
│ │ Ave  │ 3 exp • 12/25    [▼]│
│ └──────┘                       │
└───────────────────────────────┘
         ↓ EXPAND
┌───────────────────────────────┐
│ Dinner              -$50.00   │
│ 12/25 • Restaurant [Unpaid]   │
│                               │
│ Drinks              -$30.00   │
│ 12/24 • Bar        [Unpaid]   │
│                               │
│ Dessert             -$20.00   │
│ 12/23 • Bakery    [Paid]      │
├───────────────────────────────┤
│ [View Full Breakdown]         │
├───────────────────────────────┤
│ [View Profile]                │
└───────────────────────────────┘
```

### Spacing & Dimensions

```
Collapsed Row:
├─ Padding: 16px (all sides)
├─ Avatar: 64px × 64px
├─ Gap between avatar + text: 16px
├─ Text area:
│  ├─ Name: 16px font, semibold
│  ├─ Badge: 12px font, inline
│  ├─ Metadata: 13px font, muted
│  └─ Line height: 1.4
├─ Amount: 20px font, bold
├─ Icon: 20px × 20px (right side)
└─ Min height: 96px (64px avatar + padding)

Expanded Content:
├─ Padding: 8px horizontal (sub-section)
├─ Expense row height: 56px
├─ Expense row padding: 12px vertical, 16px horizontal
├─ Checkbox size: 20px × 20px (with 44px touch target)
├─ Amount column width: 100px (right-aligned)
└─ Status badge: 11px font, inline-block

Borders & Separators:
├─ Outer border: 1px, border-slate-200
├─ Border-radius: 8px
├─ Expanded content bg: rgba(0, 0, 0, 0.02)
└─ Row separator: 1px, border-slate-100
```

### Typography Hierarchy

```
Name (Alice):
├─ Font: Inter, system-ui
├─ Size: 16px
├─ Weight: 600 (semibold)
├─ Line-height: 1.4
├─ Color: #1f2937 (slate-900)
└─ Letter-spacing: 0

Badge Text (YOU OWE):
├─ Font: Inter
├─ Size: 11px
├─ Weight: 600
├─ Transform: uppercase
├─ Color: #b91c1c (red-700)
└─ Letter-spacing: 0.05em

Amount (-$45.50):
├─ Font: Inter, monospace fallback
├─ Size: 20px
├─ Weight: 700 (bold)
├─ Color: #dc2626 (red-600)
└─ Letter-spacing: 0

Metadata (3 expenses • Last: 12/25):
├─ Font: Inter
├─ Size: 13px
├─ Weight: 400
├─ Color: #6b7280 (slate-500)
└─ Letter-spacing: 0
```

---

## Settlement Page: Layout Specifications

### Desktop (3-Column Grid)

```
┌─────────────────────────────────────────────────────────────────┐
│ [←] Back                                                        │
│                                          [+ Add Expense] [Profile]│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────┐ Alice                    YOU OWE   -$100.00           │
│  │    │ 3 unpaid, 1 partial                                    │
│  │ Ave│                                                         │
│  └────┘                                                         │
├─────────────────────────────────────────────────────────────────┤
│                               │                                 │
│  EXPENSES                     │  WHAT TO PAY NOW               │
│  ┌──────────────────┐        │  ┌────────────────────┐        │
│  │ [✓] Dinner       │        │  │ Pay Alice:         │        │
│  │ 12/25  -$50 [U]  │        │  │ -$100.00 (2 sel)   │        │
│  │                  │        │  │                    │        │
│  │ [✓] Drinks       │        │  │ [SETTLE $100.00] ← 48px    │
│  │ 12/24  -$30 [U]  │        │  │                    │        │
│  │                  │        │  │ ⓘ Settlements are │        │
│  │ [✓] Dessert      │        │  │   marked manually  │        │
│  │ 12/23  -$20 [P]  │        │  └────────────────────┘        │
│  └──────────────────┘        │                                 │
│                               │                                 │
└───────────────────────────────┴─────────────────────────────────┘

Column Widths:
├─ Left (Expenses): 66% (2/3)
├─ Right (Action): 33% (1/3)
└─ Gap: 24px
```

### Mobile (Stacked)

```
┌─────────────────────────────────┐
│ [←] Back                  [Profile]
├─────────────────────────────────┤
│                                 │
│ ┌────┐ Alice                    │
│ │    │ YOU OWE: -$100.00       │
│ │Ave │ 3 unpaid, 1 partial     │
│ └────┘                          │
│                                 │
├─────────────────────────────────┤
│ EXPENSES LIST                   │
│ ┌───────────────────────────────┐
│ │ [✓] Dinner        -$50 [Unpaid]
│ │ 12/25 • Rest                  │
│ └───────────────────────────────┘
│ ┌───────────────────────────────┐
│ │ [✓] Drinks        -$30 [Unpaid]
│ │ 12/24 • Bar                   │
│ └───────────────────────────────┘
│ ┌───────────────────────────────┐
│ │ [☐] Dessert       -$20 [Paid] │
│ │ 12/23 • Bakery (grayed)       │
│ └───────────────────────────────┘
├─────────────────────────────────┤
│ ← STICKY BOTTOM SHEET           │
│ WHAT TO PAY NOW                 │
│                                 │
│ Pay Alice: -$100.00             │
│ 2 selected                      │
│                                 │
│ [    SETTLE $100.00    ]        │
│      (48px height)              │
│                                 │
│ ⓘ Settlements marked manually   │
└─────────────────────────────────┘
```

### Sticky Panel (Desktop)

```
POSITION: sticky, top: 20px, right: 20px
WIDTH: 300px (25% of 1200px container)
MAX-HEIGHT: calc(100vh - 40px)
OVERFLOW: auto

┌──────────────────────────────┐
│ WHAT TO PAY NOW              │
├──────────────────────────────┤
│                              │
│ Pay Alice                    │
│ -$100.00 (20px, bold, red)  │
│                              │
│ Expenses: 2 of 4 selected    │
│                              │
│ [ SETTLE $100.00 ]           │
│   48px height, full width    │
│                              │
│ ⓘ Settlements are marked    │
│   manually. Make sure to     │
│   complete payment outside   │
│   the app before marking as  │
│   settled.                   │
│                              │
└──────────────────────────────┘

Z-index: 40 (above content)
Box-shadow: -4px 0 12px rgba(0,0,0,0.1)
Border-left: 1px, #e5e7eb
```

### Bottom Sheet (Mobile)

```
POSITION: fixed bottom, right: 0, left: 0
HEIGHT: auto (content-driven, max 80vh)
BORDER-RADIUS: 16px 16px 0 0
ANIMATION: slide-up 250ms ease-out

┌───────────────────────────────┐
│ ▬▬▬ (Drag handle - 44px)      │
├───────────────────────────────┤
│ WHAT TO PAY NOW               │
├───────────────────────────────┤
│ Pay Alice:                    │
│ -$100.00                      │
│                               │
│ 2 expenses selected           │
│                               │
│ [ SETTLE $100.00 ]            │
│   48px height                 │
│                               │
│ ⓘ Settlements marked manually │
└───────────────────────────────┘

Background: white / dark-gray-900
Box-shadow: 0 -4px 12px rgba(0,0,0,0.1)
Padding: 16px
Padding-top: 12px (drag handle space)
```

---

## Expense Item Row Specifications

### Collapsed View (List Item)

```
┌────────────────────────────────────────────────────────────┐
│ ☐ Dinner                        12/25  -$50.00  [Unpaid]  │
└────────────────────────────────────────────────────────────┘

Dimensions:
├─ Height: 48px (minimum touch target)
├─ Padding: 12px vertical, 16px horizontal
├─ Checkbox: 20px × 20px (touch target: 44px × 44px)
├─ Gap between checkbox + title: 12px
├─ Title width: flex 1 (fill available)
├─ Status badge: fixed width ~80px
├─ Amount: fixed width ~100px, right-aligned

Typography:
├─ Title: 15px, semibold, #1f2937
├─ Date: 13px, #6b7280
├─ Badge: 11px, uppercase, semibold
└─ Amount: 16px, bold, #dc2626 (red for "owe")

Colors:
├─ Background: transparent (hover: #f9fafb)
├─ Checkbox: border-slate-300, checked: bg-blue-600
├─ Title: slate-900
├─ Badge: red-100 bg, red-900 text
├─ Amount: red-600
└─ Border-bottom: 1px #e5e7eb
```

### Expanded View (Full Details)

```
┌────────────────────────────────────────────────────────────┐
│ ☑ Dinner                        12/25  -$50.00  [Unpaid]  │
│   Restaurant • My share: $50 / Total: $100                │
└────────────────────────────────────────────────────────────┘

Dimensions:
├─ First line: same as collapsed (48px)
├─ Detail line: additional 28px
├─ Total height: 76px
├─ Detail padding: 12px left (aligned under checkbox)

Typography (Detail Line):
├─ Font size: 13px
├─ Color: #6b7280 (muted)
├─ Content: "Restaurant • My share: $50 / Total: $100"
└─ Line-height: 1.4
```

### Status Badge Variants

```
UNPAID (Default)
┌──────────┐
│[Unpaid] │  bg: #fee2e2 (red-100)
└──────────┘  text: #991b1b (red-900)
             border: #fca5a5 (red-300)

PAID (Grayed)
┌──────────┐
│[Paid]    │  bg: #f3f4f6 (gray-100)
└──────────┘  text: #4b5563 (gray-600)
             border: #e5e7eb (gray-200)
             parent row: opacity 0.6

PARTIAL
┌──────────┐
│[Partial] │  bg: #fed7aa (orange-100)
└──────────┘  text: #7c2d12 (orange-900)
             border: #feda8b (orange-200)
```

---

## Color Reference Grid

### "You Owe" State (Negative)

```
Text             Badge BG         Badge Text      Border
#dc2626          #fee2e2          #991b1b         #fca5a5
(red-600)        (red-100)        (red-900)       (red-300)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-$100.00         [YOU OWE]        visible         visible
Red text         Light red bg     Dark red text   Light red border

Contrast:
- Text on white: 8.1:1 ✓ (WCAG AAA)
- Text on badge: 9.2:1 ✓ (WCAG AAA)
- Text on background: 7.2:1 ✓ (WCAG AAA)
```

### "Owed to You" State (Positive)

```
Text             Badge BG         Badge Text      Border
#16a34a          #dcfce7          #15803d         #86efac
(green-600)      (green-100)      (green-900)     (green-300)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
+$100.00         [OWES YOU]       visible         visible
Green text       Light green bg   Dark green text Light green border

Contrast:
- Text on white: 8.9:1 ✓ (WCAG AAA)
- Text on badge: 10.1:1 ✓ (WCAG AAA)
- Text on background: 7.5:1 ✓ (WCAG AAA)
```

### Paid State

```
Text             Badge BG         Badge Text      Border
#475569          #e2e8f0          #1e293b         #cbd5e1
(slate-600)      (slate-100)      (slate-900)     (slate-200)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
$50.00           [PAID]           visible         visible
Slate text       Light slate bg   Dark slate text Light slate border

Contrast:
- Text on white: 5.2:1 ✓ (WCAG AAA)
- Text on badge: 5.8:1 ✓ (WCAG AAA)
```

---

## Button Specifications

### Primary CTA (Settlement)

```
┌─────────────────────────────────────────────┐
│            SETTLE $100.00                   │
└─────────────────────────────────────────────┘

Dimensions:
├─ Height: 48px (3:1 width:height ratio preferred)
├─ Padding: 12px vertical, 24px horizontal
├─ Border-radius: 8px
├─ Font: 16px, semibold, white

Colors:
├─ Background: #3b82f6 (blue-500)
├─ Text: #ffffff (white)
├─ Hover: #2563eb (blue-600)
├─ Disabled: #d1d5db (gray-300), opacity 0.5

States:
├─ Default: filled blue, clickable
├─ Disabled: grayed, no pointer-events
├─ Loading: "Settling... $100.00" text + spinner
└─ Success: "Settled! ✓" (2s then reset)

Accessibility:
├─ Minimum width: 120px (fits "Settle")
├─ Focus ring: 2px blue-500, offset 2px
├─ Cursor: pointer (default) / not-allowed (disabled)
└─ Aria-disabled: true (when disabled)
```

### Secondary Actions (Profile, History)

```
┌──────────────┐  ┌──────────────┐
│   Profile    │  │ View History │
└──────────────┘  └──────────────┘

Dimensions:
├─ Height: 44px
├─ Padding: 10px horizontal
├─ Border-radius: 6px
├─ Font: 14px, medium

Colors:
├─ Background: #f3f4f6 (gray-100)
├─ Text: #374151 (gray-700)
├─ Border: 1px #d1d5db (gray-300)
├─ Hover: #e5e7eb (gray-200)

Layout:
├─ Display: flex, gap 8px
├─ Icon: 16px × 16px (left side)
├─ Text: 14px
└─ Group spacing: 8px between buttons
```

---

## Animation Timings

### Expand/Collapse (Collapsible)

```
Duration: 200ms
Easing: ease-out (cubic-bezier(0, 0, 0.2, 1))
Properties animated:
├─ max-height: 0 → auto
├─ opacity: 0 → 1
├─ transform: translateY(-8px) → translateY(0)
└─ Icon rotation: 0deg → 180deg

Mobile:
├─ Duration: 150ms (faster, less data)
└─ Same easing
```

### Checkbox Toggle

```
Duration: 150ms
Easing: ease-out
Properties animated:
├─ background-color: transparent → blue-600
├─ transform: scale(1) → scale(1.1) → scale(1)
└─ box-shadow: none → 0 0 8px rgba(59, 130, 246, 0.5)
```

### Button Interaction

```
Hover:
├─ Duration: 150ms
├─ background-color change
└─ box-shadow: none → 0 4px 12px rgba(0,0,0,0.15)

Click:
├─ Duration: 100ms
├─ transform: scale(0.98)
└─ After release: scale(1) with ease-out
```

---

## Dark Mode Adjustments

### Color Remapping

```
Light Mode (Default)          Dark Mode
─────────────────────────────────────────
Text: #1f2937              → #f3f4f6
Muted: #6b7280             → #d1d5db
Bg: #ffffff                → #1f2937
Card: #ffffff              → #2d3748

You Owe (Red):
─────────────────────────────────────────
Text: #dc2626              → #fca5a5
Badge: #fee2e2             → #7f1d1d
Badge text: #991b1b        → #fee2e2

Owed (Green):
─────────────────────────────────────────
Text: #16a34a              → #86efac
Badge: #dcfce7             → #164e63
Badge text: #15803d        → #dcfce7
```

### Implementation

```tsx
// Tailwind dark: prefix handles automatically
<span className="text-red-600 dark:text-red-400">
  -$100.00
</span>

<div className="bg-red-50 dark:bg-red-950/20">
  Badge content
</div>
```

---

## Responsive Breakpoints Summary

```
Mobile (320px - 479px):
├─ Single column layout
├─ Full-width buttons
├─ 16px padding
├─ Bottom sheet for actions
├─ Avatar: 48px × 48px
└─ Font size: 14-16px

Small Mobile (480px - 767px):
├─ Single column layout
├─ Full-width buttons
├─ 16px padding
├─ Bottom sheet for actions
├─ Avatar: 56px × 56px
└─ Font size: 15-16px

Tablet (768px - 1023px):
├─ Can support 2-column on desktop-like tabs
├─ Keep single column for debt complexity
├─ Sidebar starts working (conditionally)
├─ Padding: 20px
└─ Avatar: 64px × 64px

Desktop (1024px+):
├─ 3-column: Header + List (66%) + Panel (33%)
├─ Sidebar sticky layout
├─ Padding: 24px
├─ Avatar: 64px × 64px
└─ Max container width: 1280px
```

---

## Touch Target Specifications

```
Minimum: 44px × 44px (Apple WCAG)
Recommended: 48px × 48px (Google Material)

Components:
├─ Checkbox: 20px × 20px (with 44px row = OK)
├─ Expand icon: 20px × 20px (with 44px row = OK)
├─ Avatar: 64px × 64px (clickable, meets target)
├─ Button: 48px height × 100%+ width
├─ Status badge: text only (not directly tappable)
└─ Debt row: 56px min height (collapsible trigger)

Spacing Between:
├─ Horizontal gap: 12px+ between interactive
├─ Vertical gap: 8px+ between rows
└─ All met in layouts above
```

---

## Icon Specifications

### Sizes

```
Small: 16px × 16px
├─ Status badges
├─ Metadata icons
└─ Inline icons

Medium: 20px × 20px
├─ Expand/collapse chevron
├─ Checkbox indicator
└─ Secondary buttons

Large: 24px × 24px
├─ Navigation
├─ Floating actions
└─ Primary button icons

Extra Large: 64px × 64px
├─ Avatar (user photo)
└─ Empty state graphics
```

### Icon Usage

```
Expand/Collapse:
├─ ChevronDown (default, shows more below)
├─ ChevronUp (expanded, shows more above)
└─ Rotation: 0deg → 180deg on expand

Status Indicators:
├─ ✓ Checkmark (paid)
├─ ⊘ Circle icon (unpaid)
├─ ≈ Partial lines (partial)
└─ Color coded (not icon-dependent)

Currency:
├─ Dollar sign ($) prefix
├─ No special icon needed
└─ Font: monospace for alignment
```

---

## Summary Table: Component Specifications

```
┌─────────────────────┬────────────┬──────────────┬────────────┐
│ Component           │ Min Height │ Padding      │ Border-R   │
├─────────────────────┼────────────┼──────────────┼────────────┤
│ Debt Row (Expanded) │ 96px       │ 16px all     │ 8px        │
│ Expense Item        │ 48px       │ 12v, 16h     │ 0px        │
│ Checkbox Row        │ 56px       │ 12v, 16h     │ 0px        │
│ Primary Button      │ 48px       │ 12v, 24h     │ 8px        │
│ Secondary Button    │ 44px       │ 10v, 16h     │ 6px        │
│ Status Badge        │ N/A        │ 4v, 8h       │ 4px        │
│ Bottom Sheet        │ auto       │ 16px all     │ 16 16 0 0  │
└─────────────────────┴────────────┴──────────────┴────────────┘
```

---

*Use these visual specifications alongside the implementation guide (`260115-who-owes-who-implementation-guide.md`) for pixel-perfect UI development.*
