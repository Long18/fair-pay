# Component Responsibility Matrix

This document defines when and how to use each shadcn/ui component in FairPay. Following these rules ensures consistency and prevents ad-hoc UI decisions.

---

## Card

### When to Use

Use `<Card>` when content represents a **self-contained data entity** (a "thing").

**Examples**:
- Balance summary (shows total owed/owing)
- Statistics (expense count, payment count)
- User profile preview
- Activity item with multiple data points

### When NOT to Use

DO NOT use `<Card>` for:
- Pure layout containers (use `<div>` with flex/grid)
- Tab content wrappers (use `<div>`)
- Form groups (use `<fieldset>` or `<div>`)

### Component API

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"

// Full structure
<Card>
  <CardHeader>
    <CardTitle>Balance Summary</CardTitle>
    <CardDescription>Your current balance across all groups</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Data goes here */}
  </CardContent>
  <CardFooter>
    <Button>View Details</Button>
  </CardFooter>
</Card>

// Minimal (most common)
<Card>
  <CardHeader>
    <CardTitle>Total Expenses</CardTitle>
  </CardHeader>
  <CardContent>
    <span className="typography-amount-large">$1,234.56</span>
  </CardContent>
</Card>
```

### Variants & Styling

```tsx
// Default (most common)
<Card className="p-4">

// Clickable card (hover effect)
<Card className="cursor-pointer hover:shadow-md transition-shadow">

// Card with border emphasis
<Card className="border-primary">

// Glass effect card
<Card className="glass">
```

### Decision Tree

```
Is this content self-contained data?
├─ YES → Use <Card>
└─ NO → Is it a layout container?
    ├─ YES → Use <div className="bg-card border rounded-lg p-4">
    └─ NO → Use plain <div>
```

---

## Button

### Hierarchy

FairPay uses 5 button variants based on action importance.

| Variant | Usage | Example |
|---------|-------|---------|
| `default` | Primary actions (one per screen) | "Create Expense", "Settle Balance" |
| `secondary` | Secondary actions (multiple OK) | "Cancel", "View More" |
| `outline` | Tertiary actions | "Filter", "Export" |
| `ghost` | Inline actions, icon buttons | "Edit", "Delete", Close icons |
| `destructive` | Destructive actions | "Delete Expense", "Remove Friend" |

### Usage Examples

```tsx
import { Button } from "@/components/ui/button"

// Primary action (one per view)
<Button variant="default">Create Expense</Button>

// Secondary action
<Button variant="secondary">Cancel</Button>

// Tertiary action
<Button variant="outline">
  <FilterIcon className="mr-2 size-4" />
  Filter
</Button>

// Inline action (ghost)
<Button variant="ghost" size="icon">
  <TrashIcon className="size-4" />
</Button>

// Destructive action
<Button variant="destructive">Delete Expense</Button>
```

### Size Variants

```tsx
// Default (44px height - mobile compliant)
<Button size="default">Click Me</Button>

// Small (36px height - use sparingly)
<Button size="sm">Small Button</Button>

// Large (52px height - hero CTAs)
<Button size="lg">Get Started</Button>

// Icon only (44x44px)
<Button size="icon">
  <PlusIcon className="size-4" />
</Button>
```

### Button Rules

**Rule 1**: Maximum one `variant="default"` button per screen section
**Rule 2**: All buttons MUST be ≥44px height on mobile (default size compliant)
**Rule 3**: Destructive actions MUST use `variant="destructive"` and confirm before executing
**Rule 4**: Icon-only buttons MUST have `aria-label` for accessibility

```tsx
// ✅ GOOD: Primary action is clear
<div>
  <Button variant="default">Create Expense</Button>
  <Button variant="secondary">Cancel</Button>
</div>

// ❌ BAD: Two primary actions competing
<div>
  <Button variant="default">Create Expense</Button>
  <Button variant="default">Create Payment</Button>
</div>

// ✅ GOOD: Icon button with label
<Button variant="ghost" size="icon" aria-label="Delete expense">
  <TrashIcon className="size-4" />
</Button>
```

---

## Dialog vs Drawer

### Decision Matrix

| Use Case | Mobile | Desktop | Component |
|----------|--------|---------|-----------|
| Form (< 5 fields) | Drawer | Dialog | `<ResponsiveDialog>` |
| Form (> 5 fields) | Full page | Dialog | `<Dialog>` or navigate |
| Confirmation | Dialog | Dialog | `<Dialog>` |
| Filters | Drawer | Dialog | `<ResponsiveDialog>` |
| Settings | Drawer | Dialog | `<ResponsiveDialog>` |
| Details view | Drawer | Dialog | `<ResponsiveDialog>` |

### ResponsiveDialog (Recommended)

Use `<ResponsiveDialog>` for most cases — it automatically switches between Dialog (desktop) and Drawer (mobile).

```tsx
import { ResponsiveDialog } from "@/components/refine-ui/responsive-dialog"

<ResponsiveDialog
  open={open}
  onOpenChange={setOpen}
  title="Create Expense"
  description="Split an expense with friends"
>
  <ExpenseForm />
</ResponsiveDialog>
```

### Dialog (Desktop Only)

Use `<Dialog>` when you specifically need centered modal behavior.

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent className="max-w-md">
    <DialogHeader>
      <DialogTitle>Delete Expense?</DialogTitle>
    </DialogHeader>
    <p>This action cannot be undone.</p>
    <div className="flex gap-2 justify-end">
      <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
      <Button variant="destructive" onClick={handleDelete}>Delete</Button>
    </div>
  </DialogContent>
</Dialog>
```

### Drawer (Mobile Optimized)

Use `<Drawer>` when you specifically need bottom-sheet behavior (rare — prefer ResponsiveDialog).

```tsx
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"

<Drawer open={open} onOpenChange={setOpen}>
  <DrawerContent>
    <DrawerHeader>
      <DrawerTitle>Filters</DrawerTitle>
    </DrawerHeader>
    <FilterOptions />
  </DrawerContent>
</Drawer>
```

---

## Badge

### Variants

| Variant | Usage | Example |
|---------|-------|---------|
| `default` | Neutral status | "Draft", "Pending" |
| `secondary` | Low-priority info | "Optional", "Beta" |
| `outline` | Counts, labels | "5 items", "New" |
| `destructive` | Errors, warnings | "Overdue", "Failed" |
| `success` | Positive status | "Paid", "Completed" |

### Usage Examples

```tsx
import { Badge } from "@/components/ui/badge"

// Status indicators
<Badge variant="success">Paid</Badge>
<Badge variant="destructive">Unpaid</Badge>
<Badge variant="default">Partial</Badge>

// Counts
<Badge variant="outline">5 expenses</Badge>

// Labels
<Badge variant="secondary">Optional</Badge>
```

### Custom Status Badges

For payment/expense status, use semantic colors:

```tsx
// Paid (green)
<Badge className="bg-status-success-bg text-status-success-foreground border-status-success-border">
  Paid
</Badge>

// Unpaid (orange)
<Badge className="bg-status-warning-bg text-status-warning-foreground border-status-warning-border">
  Unpaid
</Badge>

// Partial (blue)
<Badge className="bg-status-info-bg text-status-info-foreground border-status-info-border">
  Partial
</Badge>
```

---

## Alert

### Variants

| Variant | Usage | Icon | Example |
|---------|-------|------|---------|
| `default` | Informational | `InfoIcon` | "Your data is syncing" |
| `destructive` | Errors, warnings | `AlertCircleIcon` | "Failed to load data" |
| `success` | Success messages | `CheckCircleIcon` | "Expense created successfully" |

### Usage Examples

```tsx
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { InfoIcon, AlertCircleIcon, CheckCircleIcon } from "@/components/ui/icons"

// Informational
<Alert>
  <InfoIcon className="size-4" />
  <AlertTitle>Heads up!</AlertTitle>
  <AlertDescription>
    Your data is syncing in the background.
  </AlertDescription>
</Alert>

// Error
<Alert variant="destructive">
  <AlertCircleIcon className="size-4" />
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>
    Failed to load expenses. Please try again.
  </AlertDescription>
</Alert>

// Success (custom)
<Alert className="bg-status-success-bg border-status-success-border">
  <CheckCircleIcon className="size-4 text-status-success-foreground" />
  <AlertTitle className="text-status-success-foreground">Success!</AlertTitle>
  <AlertDescription className="text-status-success-foreground">
    Expense created successfully.
  </AlertDescription>
</Alert>
```

### Alert Rules

**Rule 1**: Alerts are for page-level feedback. Use toasts for transient actions.
**Rule 2**: Always include an icon for scannability.
**Rule 3**: Keep descriptions concise (1-2 sentences max).

---

## Tabs

### When to Use

Use `<Tabs>` for **view switching** within a single page context (e.g., Dashboard tabs, Profile tabs).

### Usage Example

```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

<Tabs defaultValue="overview" className="space-y-4">
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="expenses">Expenses</TabsTrigger>
    <TabsTrigger value="payments">Payments</TabsTrigger>
  </TabsList>

  <TabsContent value="overview" className="space-y-4">
    <OverviewContent />
  </TabsContent>

  <TabsContent value="expenses" className="space-y-4">
    <ExpensesContent />
  </TabsContent>

  <TabsContent value="payments" className="space-y-4">
    <PaymentsContent />
  </TabsContent>
</Tabs>
```

### Tab Persistence

For tabs that should persist state (scroll position, filters), use URL params:

```tsx
import { useSearchParams } from "react-router"

const [searchParams, setSearchParams] = useSearchParams()
const activeTab = searchParams.get("tab") || "overview"

<Tabs
  value={activeTab}
  onValueChange={(value) => setSearchParams({ tab: value })}
>
  {/* ... */}
</Tabs>
```

### Tab Rules

**Rule 1**: Tabs MUST have consistent styling across pages (use `<Tabs>` from shadcn, not custom)
**Rule 2**: Tab content MUST use `space-y-4` or `space-y-6` for section spacing
**Rule 3**: Limit to 2-5 tabs per view (more tabs = confusing navigation)

---

## Form Components

### Input

```tsx
import { Input } from "@/components/ui/input"

// Basic input
<Input type="text" placeholder="Enter amount" />

// With label
<div className="space-y-2">
  <Label htmlFor="amount">Amount</Label>
  <Input id="amount" type="number" placeholder="0.00" />
</div>

// With validation state
<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input
    id="email"
    type="email"
    placeholder="you@example.com"
    className="border-destructive" // Error state
  />
  <p className="text-xs text-destructive">Invalid email address</p>
</div>
```

### Select / Combobox

```tsx
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"

<Select defaultValue="equal">
  <SelectTrigger>
    <SelectValue placeholder="Split method" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="equal">Split Equally</SelectItem>
    <SelectItem value="exact">Exact Amounts</SelectItem>
    <SelectItem value="percentage">Percentage</SelectItem>
  </SelectContent>
</Select>
```

### Checkbox / Switch

```tsx
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"

// Checkbox
<div className="flex items-center space-x-2">
  <Checkbox id="terms" />
  <label htmlFor="terms" className="text-sm">
    Accept terms and conditions
  </label>
</div>

// Switch
<div className="flex items-center space-x-2">
  <Switch id="notifications" />
  <label htmlFor="notifications" className="text-sm">
    Enable notifications
  </label>
</div>
```

### Form Rules

**Rule 1**: All form fields MUST have associated `<Label>` with matching `htmlFor`
**Rule 2**: Use `space-y-4` between form fields
**Rule 3**: Show validation errors inline (below field) in real-time
**Rule 4**: Use `min-h-11` (44px) for all inputs on mobile

---

## Table

### Basic Usage

```tsx
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Amount</TableHead>
      <TableHead>Status</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Coffee</TableCell>
      <TableCell className="tabular-nums">$25.00</TableCell>
      <TableCell><Badge variant="success">Paid</Badge></TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### Responsive Tables

On mobile, use card-based layout instead of tables:

```tsx
// Desktop: Table
<div className="hidden md:block">
  <Table>{/* ... */}</Table>
</div>

// Mobile: Cards
<div className="md:hidden space-y-2">
  {expenses.map(expense => (
    <Card key={expense.id} className="p-4">
      <div className="flex justify-between">
        <span className="typography-row-title">{expense.name}</span>
        <span className="typography-amount">{expense.amount}</span>
      </div>
      <Badge variant="success">{expense.status}</Badge>
    </Card>
  ))}
</div>
```

---

## Summary

### Component Decision Flowchart

```
Need to display data?
├─ Self-contained entity → Card
├─ Tabular data → Table (desktop) / Cards (mobile)
├─ Status indicator → Badge
└─ Page-level message → Alert

Need user interaction?
├─ Primary action → Button variant="default"
├─ Secondary action → Button variant="secondary"
├─ Tertiary action → Button variant="outline"
├─ Destructive action → Button variant="destructive"
├─ Form input → Input / Select / Checkbox
├─ Modal form → ResponsiveDialog
└─ View switching → Tabs

Need layout?
├─ Data container → div className="bg-card border rounded-lg"
├─ Flex container → div className="flex gap-4"
└─ Grid container → div className="grid gap-4"
```

### Validation Checklist

- [ ] Using `<Card>` only for self-contained data entities
- [ ] Maximum one primary button per screen section
- [ ] All buttons ≥44px height on mobile
- [ ] Using `<ResponsiveDialog>` for forms (not full-page modals)
- [ ] All form inputs have associated `<Label>`
- [ ] Tables replaced with cards on mobile
- [ ] Status badges use semantic color tokens
- [ ] Tab styling consistent across pages
