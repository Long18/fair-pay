# Interaction Principles

Consistent interaction patterns create predictable user experiences. This document defines how users interact with FairPay through buttons, forms, loading states, and feedback mechanisms.

---

## Button Hierarchy

### Hierarchy Rules

**Rule**: Use button variants to establish clear visual hierarchy.

| Priority | Variant | Count Per Screen | Usage |
|----------|---------|------------------|-------|
| Primary | `default` | **Maximum 1** | Main action (Create, Save, Submit) |
| Secondary | `secondary` | Multiple OK | Supporting actions (Cancel, Back) |
| Tertiary | `outline` | Multiple OK | Filters, toggles, less important actions |
| Destructive | `destructive` | As needed | Delete, remove, irreversible actions |
| Ghost | `ghost` | As needed | Inline actions, icon buttons |

### Button Placement

```tsx
// ✅ GOOD: Clear hierarchy (1 primary, others secondary)
<div className="flex gap-2 justify-end">
  <Button variant="secondary">Cancel</Button>
  <Button variant="default">Save</Button>
</div>

// ❌ BAD: Two primary actions (confusing)
<div className="flex gap-2">
  <Button variant="default">Save</Button>
  <Button variant="default">Save and Continue</Button>
</div>

// ✅ GOOD: Single primary, split action
<div className="flex gap-2 justify-end">
  <Button variant="outline">Save Draft</Button>
  <Button variant="default">Publish</Button>
</div>
```

### Loading States for Buttons

```tsx
import { Button } from "@/components/ui/button"

// Button with loading state
<Button disabled={isLoading}>
  {isLoading && <Spinner className="mr-2 size-4 animate-spin" />}
  {isLoading ? "Saving..." : "Save"}
</Button>

// Better: Use button loading prop (if available)
<Button loading={isLoading}>
  Save
</Button>
```

---

## Loading States

### When to Use Each Loading Pattern

| Pattern | Usage | Example |
|---------|-------|---------|
| **Skeleton** | Initial page load, data fetching | Dashboard cards, expense list |
| **Spinner** | Button actions, inline operations | Form submission, delete confirmation |
| **Progress Bar** | Known duration tasks | File upload, data export |
| **Overlay** | Full-page blocking operations | Payment processing, critical updates |

### Skeleton Loading

Use skeletons for predictable layouts during initial load.

```tsx
import { Skeleton } from "@/components/ui/skeleton"

// Card skeleton
<Card className="p-4">
  <Skeleton className="h-5 w-32 mb-2" />  {/* Title */}
  <Skeleton className="h-4 w-full mb-1" /> {/* Line 1 */}
  <Skeleton className="h-4 w-3/4" />       {/* Line 2 */}
</Card>

// List skeleton
<div className="space-y-2">
  {Array.from({ length: 5 }).map((_, i) => (
    <Skeleton key={i} className="h-16 w-full" />
  ))}
</div>

// Table skeleton
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Amount</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {Array.from({ length: 3 }).map((_, i) => (
      <TableRow key={i}>
        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

### Spinner Loading

Use spinners for short-duration operations (< 3 seconds).

```tsx
import { Spinner } from "@/components/ui/spinner"

// Centered spinner (page-level)
<div className="flex items-center justify-center py-12">
  <Spinner className="size-8" />
</div>

// Inline spinner (form field)
<div className="flex items-center gap-2">
  <Spinner className="size-4" />
  <span className="text-sm text-muted-foreground">Loading...</span>
</div>

// Button spinner (action in progress)
<Button disabled>
  <Spinner className="mr-2 size-4" />
  Saving...
</Button>
```

### Loading Overlay

Use overlays for critical operations that block user input.

```tsx
import { LoadingOverlay } from "@/components/refine-ui/layout/loading-overlay"

// Full-page overlay
{isProcessing && (
  <LoadingOverlay message="Processing payment..." />
)}

// Card-level overlay
<Card className="relative">
  {isLoading && (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
      <Spinner className="size-8" />
    </div>
  )}
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

### Loading State Rules

**Rule 1**: Use skeletons for initial page load (shows structure)
**Rule 2**: Use spinners for button actions (< 3 seconds)
**Rule 3**: Use progress bars for known duration (file uploads)
**Rule 4**: Use overlays for blocking operations (payment processing)
**Rule 5**: Never show "Loading..." without a spinner/skeleton

---

## Form Validation

### Validation Timing

| Timing | Usage | Example |
|--------|-------|---------|
| **Real-time** | Email format, username availability | Typing in email field |
| **On Blur** | Required fields, complex validation | Leaving field after typing |
| **On Submit** | Final validation, server-side checks | Clicking "Submit" button |

### Real-Time Validation

Show validation feedback while typing (use debounce for performance).

```tsx
import { Input } from "@/components/ui/input"
import { useState, useEffect } from "react"

const [email, setEmail] = useState("")
const [error, setError] = useState("")

useEffect(() => {
  // Debounce validation
  const timer = setTimeout(() => {
    if (email && !email.includes("@")) {
      setError("Invalid email format")
    } else {
      setError("")
    }
  }, 300)

  return () => clearTimeout(timer)
}, [email])

return (
  <div className="space-y-2">
    <Label htmlFor="email">Email</Label>
    <Input
      id="email"
      type="email"
      value={email}
      onChange={(e) => setEmail(e.target.value)}
      className={error ? "border-destructive" : ""}
    />
    {error && (
      <p className="text-xs text-destructive">{error}</p>
    )}
  </div>
)
```

### On-Blur Validation

Validate after user leaves field (less intrusive).

```tsx
const [amount, setAmount] = useState("")
const [touched, setTouched] = useState(false)
const error = touched && !amount ? "Amount is required" : ""

return (
  <div className="space-y-2">
    <Label htmlFor="amount">Amount</Label>
    <Input
      id="amount"
      type="number"
      value={amount}
      onChange={(e) => setAmount(e.target.value)}
      onBlur={() => setTouched(true)}
      className={error ? "border-destructive" : ""}
    />
    {error && (
      <p className="text-xs text-destructive">{error}</p>
    )}
  </div>
)
```

### Validation Display Patterns

```tsx
// ✅ GOOD: Error below field, red border, icon
<div className="space-y-2">
  <Label htmlFor="field">Field Name</Label>
  <div className="relative">
    <Input
      id="field"
      className="border-destructive"
    />
    <AlertCircleIcon className="absolute right-3 top-3 size-4 text-destructive" />
  </div>
  <p className="text-xs text-destructive">Error message here</p>
</div>

// ❌ BAD: No visual indication
<Input id="field" />
{error && <p className="text-xs text-red-500">{error}</p>}

// ✅ GOOD: Success state (optional)
<div className="space-y-2">
  <Label htmlFor="field">Field Name</Label>
  <div className="relative">
    <Input id="field" className="border-status-success-border" />
    <CheckCircleIcon className="absolute right-3 top-3 size-4 text-status-success-foreground" />
  </div>
  <p className="text-xs text-status-success-foreground">Looks good!</p>
</div>
```

### Form Validation Rules

**Rule 1**: Show validation errors inline (below field)
**Rule 2**: Add red border to invalid fields (`border-destructive`)
**Rule 3**: Display icon for error/success states (right side of input)
**Rule 4**: Use real-time validation for email, username, format checks
**Rule 5**: Use on-blur validation for required fields
**Rule 6**: Disable submit button until form is valid

---

## Feedback Patterns

### Success Feedback

#### Toast Notifications (Transient Actions)

Use toasts for non-critical feedback that doesn't require acknowledgment.

```tsx
import { useToast } from "@/hooks/use-toast"

const { toast } = useToast()

// Success toast
toast({
  title: "Expense created",
  description: "Coffee expense added successfully.",
})

// Error toast
toast({
  title: "Failed to create expense",
  description: "An error occurred. Please try again.",
  variant: "destructive",
})

// Info toast
toast({
  title: "Syncing data",
  description: "Your data is being synced in the background.",
})
```

#### Alert Component (Persistent Feedback)

Use alerts for page-level feedback that should persist.

```tsx
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { CheckCircleIcon, AlertCircleIcon } from "@/components/ui/icons"

// Success alert
<Alert className="bg-status-success-bg border-status-success-border">
  <CheckCircleIcon className="size-4 text-status-success-foreground" />
  <AlertTitle className="text-status-success-foreground">Success!</AlertTitle>
  <AlertDescription className="text-status-success-foreground">
    Your expense has been created successfully.
  </AlertDescription>
</Alert>

// Error alert
<Alert variant="destructive">
  <AlertCircleIcon className="size-4" />
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>
    Failed to load expenses. Please refresh the page.
  </AlertDescription>
</Alert>
```

### Feedback Decision Matrix

| Scenario | Feedback Type | Duration | Example |
|----------|---------------|----------|---------|
| Form submitted | Toast | 3s | "Expense created" |
| Delete confirmation | Dialog | Until action | "Delete this expense?" |
| Background sync | Toast | 2s | "Data synced" |
| Error loading page | Alert (persistent) | Until refresh | "Failed to load data" |
| Destructive action | Dialog + Toast | Dialog until action, toast 3s | "Delete?" → "Deleted" |

---

## Confirmation Dialogs

### Destructive Actions

Always confirm destructive actions (delete, remove, irreversible changes).

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

<Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Delete Expense?</DialogTitle>
    </DialogHeader>
    <p className="typography-body text-muted-foreground">
      This action cannot be undone. This will permanently delete the expense.
    </p>
    <DialogFooter className="flex gap-2 justify-end">
      <Button
        variant="secondary"
        onClick={() => setDeleteDialogOpen(false)}
      >
        Cancel
      </Button>
      <Button
        variant="destructive"
        onClick={handleDelete}
        loading={isDeleting}
      >
        Delete
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Confirmation Rules

**Rule 1**: All destructive actions MUST show confirmation dialog
**Rule 2**: Confirmation message MUST explain consequence ("cannot be undone")
**Rule 3**: Cancel button MUST be secondary variant
**Rule 4**: Destructive button MUST be `variant="destructive"`
**Rule 5**: Show loading state on destructive button during action

---

## Optimistic UI Updates

### When to Use Optimistic Updates

Use optimistic updates for high-confidence actions to improve perceived performance.

**Good candidates**:
- Like/unlike
- Toggle settings
- Add to favorites
- Simple mutations (low failure rate)

**Bad candidates**:
- Payment processing
- File uploads
- Complex validations
- Actions with high failure rate

### Implementation Pattern

```tsx
import { useMutation, useQueryClient } from "@tanstack/react-query"

const queryClient = useQueryClient()

const mutation = useMutation({
  mutationFn: updateExpense,

  // Optimistic update (runs immediately)
  onMutate: async (newData) => {
    // Cancel outgoing queries
    await queryClient.cancelQueries({ queryKey: ["expenses"] })

    // Snapshot previous value
    const previousExpenses = queryClient.getQueryData(["expenses"])

    // Optimistically update cache
    queryClient.setQueryData(["expenses"], (old) => {
      return old.map(expense =>
        expense.id === newData.id ? { ...expense, ...newData } : expense
      )
    })

    // Return rollback function
    return { previousExpenses }
  },

  // Rollback on error
  onError: (err, newData, context) => {
    queryClient.setQueryData(["expenses"], context.previousExpenses)

    toast({
      title: "Failed to update expense",
      description: "Changes have been reverted.",
      variant: "destructive",
    })
  },

  // Refetch on success (ensure consistency)
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ["expenses"] })
  },
})
```

### Optimistic Update Rules

**Rule 1**: Always implement rollback on error
**Rule 2**: Show toast on error explaining rollback
**Rule 3**: Refetch data after success to ensure consistency
**Rule 4**: Never use for financial transactions
**Rule 5**: Cancel ongoing queries before optimistic update

---

## Hover & Focus States

### Interactive Element States

All interactive elements MUST have visible hover/focus states.

```tsx
// Button (automatic with shadcn)
<Button>Click Me</Button>
// Has hover:bg-primary/90 and focus-visible:ring-2

// Clickable card
<Card className="cursor-pointer hover:shadow-md transition-shadow focus-visible:ring-2 focus-visible:ring-ring">
  <CardContent>Click me</CardContent>
</Card>

// Link
<a
  href="/expenses"
  className="text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring rounded"
>
  View Expenses
</a>

// Icon button
<button
  className="p-2 rounded-md hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
  aria-label="Delete"
>
  <TrashIcon className="size-4" />
</button>
```

### Hover/Focus Rules

**Rule 1**: All interactive elements MUST have visible focus state (`focus-visible:ring-2`)
**Rule 2**: Hover states MUST be subtle (not jarring)
**Rule 3**: Use `transition-*` utilities for smooth state changes
**Rule 4**: Icon-only buttons MUST have hover background (`hover:bg-accent`)

---

## Disabled States

### Disabled Element Styling

```tsx
// Disabled button (automatic with shadcn)
<Button disabled>
  Submit
</Button>
// Has opacity-50 and cursor-not-allowed

// Disabled input
<Input disabled placeholder="Cannot edit" />
// Has opacity-50 and cursor-not-allowed

// Disabled with explanation
<div className="space-y-2">
  <Button disabled>
    Submit
  </Button>
  <p className="text-xs text-muted-foreground">
    Complete all required fields to submit
  </p>
</div>
```

### Disabled State Rules

**Rule 1**: Always explain WHY element is disabled (tooltip or helper text)
**Rule 2**: Never disable without visual indication
**Rule 3**: Use `disabled` attribute (not just `className`)
**Rule 4**: Disabled elements MUST have `cursor-not-allowed`

---

## Animation & Transitions

### Animation Duration Guidelines

| Duration | Usage | Example |
|----------|-------|---------|
| `150ms` (fast) | Hover states, focus rings | Button hover |
| `200ms` (normal) | Fades, slides | Toast enter/exit |
| `300ms` (slow) | Complex animations | Accordion expand |

### Common Transition Patterns

```tsx
// Hover state transition
className="transition-colors duration-150"

// Shadow transition
className="transition-shadow duration-200"

// Transform transition (lift card)
className="transition-transform duration-200 hover:-translate-y-1"

// Opacity fade
className="transition-opacity duration-200"

// Multiple properties
className="transition-all duration-200"
```

### Animation Rules

**Rule 1**: Use CSS variables from tokens.md for duration
**Rule 2**: Prefer `transition` over `animation` for simple states
**Rule 3**: Use `ease-out` for entering, `ease-in` for exiting
**Rule 4**: Keep animations subtle (avoid distracting users)
**Rule 5**: Respect `prefers-reduced-motion` (automatic with Tailwind)

---

## Keyboard Navigation

### Keyboard Shortcuts

Document common keyboard shortcuts in command palette.

```tsx
// Example: Command palette registration
{
  id: "create-expense",
  name: "Create Expense",
  shortcut: ["$mod", "e"], // Cmd+E or Ctrl+E
  perform: () => navigate("/expenses/create"),
}
```

### Focus Management

```tsx
import { useEffect, useRef } from "react"

// Auto-focus first field in form
const firstInputRef = useRef<HTMLInputElement>(null)

useEffect(() => {
  firstInputRef.current?.focus()
}, [])

return (
  <form>
    <Input ref={firstInputRef} placeholder="Amount" />
    {/* ... */}
  </form>
)
```

### Keyboard Navigation Rules

**Rule 1**: All interactive elements MUST be keyboard accessible (Tab navigation)
**Rule 2**: Modal dialogs MUST trap focus (automatic with Radix Dialog)
**Rule 3**: First input in forms SHOULD auto-focus
**Rule 4**: Keyboard shortcuts MUST be discoverable (command palette)

---

## Summary

### Interaction Pattern Quick Reference

| Pattern | Component/Approach | Example |
|---------|-------------------|---------|
| Loading (initial) | Skeleton | Dashboard cards |
| Loading (action) | Spinner | Button submission |
| Success feedback | Toast | "Expense created" |
| Error feedback | Toast + Alert | "Failed to save" |
| Confirmation | Dialog | "Delete expense?" |
| Validation | Inline + border | Red border + error text |
| Hover state | `transition-colors` | Button hover |
| Focus state | `focus-visible:ring-2` | All interactive elements |
| Disabled state | `disabled` + explanation | "Complete fields to submit" |

### Validation Checklist

- [ ] Maximum one primary button per screen section
- [ ] All buttons ≥44px height on mobile
- [ ] Loading states use appropriate pattern (skeleton/spinner/overlay)
- [ ] Form validation errors shown inline below fields
- [ ] Destructive actions show confirmation dialog
- [ ] All interactive elements have visible focus state
- [ ] Disabled elements have explanation text
- [ ] Animations use approved durations (150ms/200ms/300ms)
- [ ] Success/error feedback uses toasts for transient, alerts for persistent
- [ ] Optimistic updates implement rollback on error
