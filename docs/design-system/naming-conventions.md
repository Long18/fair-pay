# Naming Conventions

Consistent naming reduces cognitive load and makes codebases scannable. This document defines mandatory naming standards for FairPay.

---

## File Naming

### Component Files

**Rule**: ALL component files MUST use `kebab-case.tsx`

```
✅ GOOD
src/components/dashboard/balance-summary-card.tsx
src/components/dashboard/simplified-debts-toggle.tsx
src/components/ui/button.tsx

❌ BAD
src/components/dashboard/BalanceSummaryCard.tsx
src/components/dashboard/SimplifiedDebtsToggle.tsx
src/components/ui/Button.tsx
```

**Rationale**:
- Consistency with shadcn/ui conventions
- Prevents case-sensitivity issues (macOS vs Linux)
- Easier CLI tooling (tab completion, grep)
- Enforced by ESLint (Phase 2)

### Page/Route Files

**Rule**: Use `kebab-case.tsx` for page files

```
✅ GOOD
src/pages/dashboard.tsx
src/pages/expense-detail.tsx
src/pages/group-show.tsx

❌ BAD
src/pages/Dashboard.tsx
src/pages/ExpenseDetail.tsx
src/pages/GroupShow.tsx
```

### Utility/Hook Files

**Rule**: Use `kebab-case.ts` with descriptive prefixes

```
✅ GOOD
src/hooks/use-document-title.ts
src/hooks/use-local-storage.ts
src/utils/format-currency.ts
src/utils/calculate-balance.ts

❌ BAD
src/hooks/useDocumentTitle.ts
src/hooks/DocumentTitle.ts
src/utils/formatCurrency.ts
src/utils/CurrencyFormatter.ts
```

### Type/Interface Files

**Rule**: Use `kebab-case.ts` for type definition files

```
✅ GOOD
src/types/expense.ts
src/types/payment.ts
src/types/supabase.ts

❌ BAD
src/types/Expense.ts
src/types/Payment.ts
src/types/Supabase.ts
```

---

## Component Naming

### Component Exports

**Rule**: Component exports MUST use `PascalCase`

```tsx
✅ GOOD
// File: balance-summary-card.tsx
export function BalanceSummaryCard() {
  return <Card>...</Card>
}

// File: simplified-debts-toggle.tsx
export function SimplifiedDebtsToggle() {
  return <Switch>...</Switch>
}

❌ BAD
// File: balance-summary-card.tsx
export function balanceSummaryCard() {
  return <Card>...</Card>
}

// File: simplified-debts-toggle.tsx
export function simplified_debts_toggle() {
  return <Switch>...</Switch>
}
```

### Component Name Structure

**Pattern**: `{Feature}{Element}{Type}`

```tsx
✅ GOOD
BalanceSummaryCard      // Feature: Balance, Element: Summary, Type: Card
ExpenseListTable        // Feature: Expense, Element: List, Type: Table
PaymentStatusBadge      // Feature: Payment, Element: Status, Type: Badge
DashboardActionsList    // Feature: Dashboard, Element: Actions, Type: List

❌ BAD (Too Generic)
Card                    // What kind of card?
Table                   // What data does it show?
Badge                   // What status?
List                    // List of what?

❌ BAD (Too Verbose)
BalanceSummaryCardComponentForDashboard
ExpenseListTableWithPaginationAndFilters
```

**Rule**: Component names should be 2-4 words max. If longer, consider splitting the component.

---

## Props Naming

### Prop Names

**Rule**: Props MUST use `camelCase`

```tsx
✅ GOOD
interface BalanceCardProps {
  totalAmount: number
  currencyCode: string
  showDetails: boolean
  onViewClick: () => void
}

❌ BAD
interface BalanceCardProps {
  TotalAmount: number          // PascalCase
  currency_code: string        // snake_case
  show_details: boolean        // snake_case
  OnViewClick: () => void      // PascalCase
}
```

### Boolean Props

**Rule**: Boolean props SHOULD use `is*`, `has*`, `can*`, `should*` prefixes

```tsx
✅ GOOD
interface CardProps {
  isLoading: boolean
  hasError: boolean
  canDelete: boolean
  shouldAutoFocus: boolean
}

❌ BAD
interface CardProps {
  loading: boolean      // Ambiguous (loading what? state or action?)
  error: boolean        // Could be the error object
  delete: boolean       // Sounds like an action
  autoFocus: boolean    // Unclear if it's enabled or happening
}
```

### Event Handler Props

**Rule**: Event handler props MUST use `on*` prefix

```tsx
✅ GOOD
interface ButtonProps {
  onClick: () => void
  onHover: () => void
  onFocus: () => void
  onSubmit: (data: FormData) => void
}

❌ BAD
interface ButtonProps {
  click: () => void           // Missing prefix
  handleHover: () => void     // Use "on", not "handle"
  focusHandler: () => void    // Use "on", not "handler"
  submit: () => void          // Missing prefix
}
```

### Render Props

**Rule**: Render prop functions SHOULD use `render*` prefix

```tsx
✅ GOOD
interface ListProps<T> {
  items: T[]
  renderItem: (item: T) => React.ReactNode
  renderEmpty: () => React.ReactNode
}

❌ BAD
interface ListProps<T> {
  items: T[]
  item: (item: T) => React.ReactNode      // Unclear it's a render function
  emptyState: () => React.ReactNode       // Sounds like a prop, not function
}
```

---

## Variable Naming

### Constants

**Rule**: Constants MUST use `UPPER_SNAKE_CASE`

```ts
✅ GOOD
const MAX_UPLOAD_SIZE = 5_000_000  // 5MB
const API_BASE_URL = "https://api.fairpay.com"
const DEFAULT_CURRENCY = "USD"

❌ BAD
const maxUploadSize = 5_000_000
const apiBaseUrl = "https://api.fairpay.com"
const defaultCurrency = "USD"
```

**Exception**: Configuration objects use `camelCase`

```ts
✅ GOOD
const supabaseConfig = {
  url: process.env.VITE_SUPABASE_URL,
  anonKey: process.env.VITE_SUPABASE_ANON_KEY,
}

const validationRules = {
  minAmount: 0.01,
  maxAmount: 1_000_000,
}
```

### Local Variables

**Rule**: Local variables MUST use `camelCase`

```ts
✅ GOOD
const userId = user.id
const expenseTotal = calculateTotal(expenses)
const isBalanced = balance === 0

❌ BAD
const UserID = user.id
const expense_total = calculateTotal(expenses)
const IsBalanced = balance === 0
```

### Private Variables/Methods

**Rule**: Private variables/methods SHOULD use `_` prefix (optional, for clarity)

```ts
✅ GOOD
class ExpenseService {
  private _cache = new Map()

  private _validateAmount(amount: number) {
    return amount > 0
  }
}

✅ ALSO GOOD (without prefix)
class ExpenseService {
  private cache = new Map()

  private validateAmount(amount: number) {
    return amount > 0
  }
}
```

---

## Function Naming

### Function Names

**Rule**: Functions MUST use `camelCase` and start with a verb

```ts
✅ GOOD
function calculateBalance(expenses: Expense[]) { }
function formatCurrency(amount: number) { }
function validateEmail(email: string) { }
function fetchExpenses() { }

❌ BAD
function balance(expenses: Expense[]) { }        // Missing verb
function currency(amount: number) { }            // Missing verb
function email_validator(email: string) { }      // snake_case
function GetExpenses() { }                       // PascalCase
```

### Event Handlers

**Rule**: Event handler functions SHOULD use `handle*` prefix

```tsx
✅ GOOD
function handleClick() { }
function handleSubmit(data: FormData) { }
function handleDeleteExpense(id: string) { }

❌ BAD
function onClick() { }              // Use "handle" prefix
function submitForm() { }           // Use "handleSubmit"
function deleteExpense() { }        // Use "handleDeleteExpense"
```

### Async Functions

**Rule**: Async functions SHOULD clearly indicate async nature (optional but recommended)

```ts
✅ GOOD
async function fetchExpenses() { }
async function loadUserData() { }
async function createExpense(data: ExpenseData) { }

✅ ALSO GOOD (explicit async prefix)
async function asyncFetchExpenses() { }
async function asyncLoadUserData() { }
```

---

## Hook Naming

### Custom Hooks

**Rule**: Custom hooks MUST start with `use` prefix

```ts
✅ GOOD
function useLocalStorage(key: string) { }
function useDebounce(value: string, delay: number) { }
function useExpenses(groupId: string) { }

❌ BAD
function localStorage(key: string) { }       // Missing "use" prefix
function debounce(value: string) { }        // Missing "use" prefix
function getExpenses(groupId: string) { }   // Missing "use" prefix
```

### Hook Return Values

**Rule**: Hooks returning single value use descriptive name, hooks returning multiple values use array/object

```ts
✅ GOOD
// Single value
function useUserId() {
  return userId
}

// Multiple values (array)
function useToggle(initial: boolean) {
  const [value, setValue] = useState(initial)
  const toggle = () => setValue(!value)
  return [value, toggle] as const
}

// Multiple values (object)
function useExpenses() {
  const [expenses, setExpenses] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  return { expenses, isLoading, error, refetch }
}
```

---

## Type Naming

### Interfaces vs Types

**Rule**: Use `interface` for object shapes, `type` for unions/intersections

```ts
✅ GOOD
// Objects: use interface
interface User {
  id: string
  name: string
  email: string
}

// Unions/intersections: use type
type Status = "paid" | "unpaid" | "partial"
type UserWithExpenses = User & { expenses: Expense[] }

❌ BAD
// Don't use type for simple objects
type User = {
  id: string
  name: string
}

// Don't use interface for unions
interface Status extends "paid" | "unpaid" { }  // Invalid
```

### Type Naming Convention

**Rule**: Types/Interfaces MUST use `PascalCase`

```ts
✅ GOOD
interface ExpenseFormData {
  amount: number
  description: string
}

type PaymentStatus = "paid" | "unpaid" | "partial"

type ApiResponse<T> = {
  data: T
  error: Error | null
}

❌ BAD
interface expenseFormData { }      // camelCase
type payment_status = "paid"       // snake_case
type apiResponse<T> = { }          // camelCase
```

### Props Type Naming

**Rule**: Props types SHOULD use `{ComponentName}Props` suffix

```tsx
✅ GOOD
interface BalanceCardProps {
  amount: number
  currency: string
}

function BalanceCard({ amount, currency }: BalanceCardProps) {
  return <Card>...</Card>
}

❌ BAD
interface BalanceCardProperties { }     // Too verbose
interface IBalanceCardProps { }         // No "I" prefix (outdated)
interface BalanceCardPropsInterface { } // Redundant suffix
```

---

## CSS Class Naming

### Utility Classes

**Rule**: Use Tailwind utility classes (kebab-case built-in)

```tsx
✅ GOOD
className="flex items-center gap-4 px-4 py-6"
className="text-2xl md:text-3xl font-bold"
className="bg-primary text-primary-foreground"

❌ BAD (Inline Styles)
style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}
```

### Custom CSS Classes

**Rule**: Custom classes MUST use `kebab-case`

```css
✅ GOOD
.balance-card { }
.expense-list-item { }
.payment-status-badge { }

❌ BAD
.balanceCard { }           // camelCase
.ExpenseListItem { }       // PascalCase
.payment_status_badge { }  // snake_case
```

---

## Directory Naming

### Directory Structure

**Rule**: Directories MUST use `kebab-case`

```
✅ GOOD
src/components/dashboard/
src/components/expense-forms/
src/hooks/use-local-storage/
src/utils/currency-formatter/

❌ BAD
src/components/Dashboard/
src/components/ExpenseForms/
src/hooks/useLocalStorage/
src/utils/CurrencyFormatter/
```

---

## Database/API Naming

### Database Tables

**Rule**: Use `snake_case` for table names (Supabase convention)

```sql
✅ GOOD
expenses
payments
group_members
expense_splits

❌ BAD
Expenses
Payments
GroupMembers
expenseSplits
```

### Database Columns

**Rule**: Use `snake_case` for column names

```sql
✅ GOOD
user_id
created_at
updated_at
total_amount

❌ BAD
userId
createdAt
updatedAt
totalAmount
```

### API Routes

**Rule**: Use `kebab-case` for API routes

```
✅ GOOD
/api/expenses
/api/expense-splits
/api/group-members

❌ BAD
/api/Expenses
/api/expenseSplits
/api/group_members
```

---

## Git Branch Naming

### Branch Naming Convention

**Pattern**: `{type}/{ticket-id}-{description}`

```
✅ GOOD
feature/FP-123-expense-split-ui
bugfix/FP-456-payment-calculation
hotfix/FP-789-security-patch
refactor/FP-321-dashboard-cleanup

❌ BAD
feature/ExpenseSplitUI
fix_payment_bug
myFeatureBranch
update-dashboard
```

**Types**: `feature`, `bugfix`, `hotfix`, `refactor`, `chore`, `docs`

---

## Commit Message Naming

### Conventional Commits

**Pattern**: `{type}({scope}): {description}`

```
✅ GOOD
feat(expenses): add split by percentage functionality
fix(dashboard): correct balance calculation rounding
refactor(ui): consolidate card components using CVA
docs(design-system): add spacing scale documentation
chore(deps): update react to v19

❌ BAD
Added expense split feature
Fixed bug
Updated code
WIP
asdf
```

**Types**: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `style`

---

## Summary

### Naming Quick Reference

| Item | Convention | Example |
|------|-----------|---------|
| Component file | `kebab-case.tsx` | `balance-summary-card.tsx` |
| Component export | `PascalCase` | `BalanceSummaryCard` |
| Props interface | `PascalCase + Props` | `BalanceSummaryCardProps` |
| Prop name | `camelCase` | `totalAmount` |
| Boolean prop | `is/has/can/should` | `isLoading` |
| Event handler prop | `on*` | `onClick` |
| Variable | `camelCase` | `userId` |
| Constant | `UPPER_SNAKE_CASE` | `MAX_UPLOAD_SIZE` |
| Function | `camelCase` (verb) | `calculateBalance` |
| Event handler | `handle*` | `handleClick` |
| Custom hook | `use*` | `useLocalStorage` |
| Type/Interface | `PascalCase` | `ExpenseFormData` |
| CSS class | `kebab-case` | `.balance-card` |
| Directory | `kebab-case` | `/expense-forms/` |
| DB table/column | `snake_case` | `expense_splits` |
| API route | `kebab-case` | `/api/expense-splits` |
| Git branch | `type/id-desc` | `feature/FP-123-split-ui` |
| Commit message | `type(scope): desc` | `feat(expenses): add split` |

### Validation Checklist

- [ ] All component files use `kebab-case.tsx`
- [ ] All component exports use `PascalCase`
- [ ] All props use `camelCase`
- [ ] Boolean props use `is/has/can/should` prefix
- [ ] Event handler props use `on*` prefix
- [ ] Constants use `UPPER_SNAKE_CASE`
- [ ] Functions use `camelCase` with verb prefix
- [ ] Custom hooks use `use*` prefix
- [ ] Types/interfaces use `PascalCase`
- [ ] Props types use `{Component}Props` suffix
- [ ] Git commits follow conventional commits format

### Migration Strategy (Phase 2)

Files requiring rename (from scout report):
- `DashboardErrorBoundary.tsx` → `dashboard-error-boundary.tsx`
- `BalanceFeed.tsx` → `balance-feed.tsx`
- `BalanceRow.tsx` → `balance-row.tsx`
- `DashboardActionsList.tsx` → `dashboard-actions-list.tsx`
- `DashboardStates.tsx` → `dashboard-states.tsx`
- `SimplifiedDebtsToggle.tsx` → `simplified-debts-toggle.tsx`

(Full list in Phase 2 implementation plan)
