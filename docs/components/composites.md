# Composite Components & Custom Hooks

Documentation for reusable composite components and custom hooks that consolidate common UI patterns in FairPay.

---

## DataCard Component

**File**: `src/components/ui/data-card.tsx`

Composite card component with CVA variants for displaying self-contained data entities.

### When to Use

Use `DataCard` for:
- Balance summaries
- Statistics displays
- User profile previews
- Activity items with multiple data points
- Any self-contained "thing" that's not just a layout container

### API

```tsx
import { DataCard } from "@/components/ui/data-card"

<DataCard
  variant="default" | "elevated" | "flat"
  padding="compact" | "comfortable" | "spacious"
>
  <DataCard.Header
    title={ReactNode}
    description={ReactNode}
    badge={ReactNode}
  />
  <DataCard.Content noPadding={boolean}>
    {children}
  </DataCard.Content>
  <DataCard.Footer align="start" | "center" | "end" | "between">
    {children}
  </DataCard.Footer>
</DataCard>
```

### Variants

| Variant | Shadow | Usage |
|---------|--------|-------|
| `default` | `shadow-sm` (hover: `shadow-md`) | Standard cards (default) |
| `elevated` | `shadow-md` (hover: `shadow-lg`) | Important/featured content |
| `flat` | `shadow-none` | Subtle cards, nested cards |

| Padding | Gap | Usage |
|---------|-----|-------|
| `compact` | `gap-3` (12px) | Dense layouts, statistics grids |
| `comfortable` | `gap-6` (24px) | Default spacing |
| `spacious` | `gap-8` (32px) | Hero sections, feature cards |

### Examples

#### Basic Balance Card

```tsx
<DataCard>
  <DataCard.Header
    title="Total Balance"
    description="Across all groups"
  />
  <DataCard.Content>
    <span className="typography-amount-large">$1,234.56</span>
  </DataCard.Content>
</DataCard>
```

#### Card with Badge and Action

```tsx
<DataCard variant="elevated">
  <DataCard.Header
    title="Coffee Expense"
    description="Split with 3 friends"
    badge={<Badge variant="success">Paid</Badge>}
  />
  <DataCard.Content>
    <div className="space-y-2">
      <div className="flex justify-between">
        <span className="typography-body">Your share:</span>
        <span className="typography-amount">$6.25</span>
      </div>
      <div className="flex justify-between">
        <span className="typography-body">Total:</span>
        <span className="typography-amount">$25.00</span>
      </div>
    </div>
  </DataCard.Content>
  <DataCard.Footer>
    <Button variant="outline" size="sm">View Details</Button>
  </DataCard.Footer>
</DataCard>
```

#### Compact Statistics Card

```tsx
<DataCard variant="flat" padding="compact">
  <DataCard.Header title="Total Expenses" />
  <DataCard.Content>
    <div className="typography-amount-large">342</div>
  </DataCard.Content>
</DataCard>
```

#### Card with No Padding Content (Charts)

```tsx
<DataCard>
  <DataCard.Header title="Spending Trend" />
  <DataCard.Content noPadding>
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data}>
        {/* Chart components */}
      </LineChart>
    </ResponsiveContainer>
  </DataCard.Content>
</DataCard>
```

---

## ActivityItem Component

**File**: `src/components/ui/activity-item.tsx`

Reusable primitive for activity feed items with icon + title + description + timestamp + action.

### When to Use

Use `ActivityItem` for:
- Activity feeds
- Balance feed items
- Notification lists
- Transaction history
- Event logs

### API

```tsx
import { ActivityItem } from "@/components/ui/activity-item"

<ActivityItem
  icon={ReactNode}
  iconVariant="default" | "success" | "warning" | "destructive" | "info"
  title={ReactNode}
  description={ReactNode}
  timestamp={ReactNode}
  action={ReactNode}
/>
```

### Icon Variants

| Variant | Background | Usage |
|---------|-----------|-------|
| `default` | Gray | Neutral events |
| `success` | Green | Payments received, settled |
| `warning` | Orange | Pending actions |
| `destructive` | Red | Errors, deletions |
| `info` | Blue | Informational updates |

### Examples

#### Basic Activity Item

```tsx
<ActivityItem
  icon={<DollarSignIcon className="size-5" />}
  iconVariant="success"
  title="Payment received"
  description="John paid you $25 for coffee"
  timestamp="2 hours ago"
/>
```

#### With Action Button

```tsx
<ActivityItem
  icon={<AlertCircleIcon className="size-5" />}
  iconVariant="warning"
  title="Pending settlement"
  description="You owe Sarah $15 for lunch"
  timestamp="Yesterday"
  action={
    <Button variant="outline" size="sm">
      Settle
    </Button>
  }
/>
```

#### Activity Feed List

```tsx
<div className="divide-y">
  {activities.map(activity => (
    <ActivityItem
      key={activity.id}
      icon={activity.icon}
      iconVariant={activity.variant}
      title={activity.title}
      description={activity.description}
      timestamp={activity.timestamp}
      action={activity.action}
    />
  ))}
</div>
```

---

## Custom Hooks

### useTableFilter

**File**: `src/hooks/use-table-filter.ts`

Generic hook for managing table filter state and applying filters to data.

#### API

```tsx
import { useTableFilter, FilterSchema } from "@/hooks/use-table-filter"

interface DataType {
  id: string
  name: string
  amount: number
  status: "paid" | "unpaid"
}

const schema: FilterSchema<DataType> = {
  name: { type: "contains" },
  status: { type: "exact" },
  amount: {
    type: "custom",
    filterFn: (value, range) => value >= range.min && value <= range.max
  }
}

const {
  filters,
  setFilter,
  clearFilter,
  clearFilters,
  filteredData,
  hasActiveFilters
} = useTableFilter(data, schema)
```

#### Filter Types

| Type | Description | Example |
|------|-------------|---------|
| `exact` | Exact match | `status === "paid"` |
| `contains` | String contains (case-insensitive) | `name.includes("john")` |
| `range` | Numeric range | `amount >= min && amount <= max` |
| `custom` | Custom filter function | `filterFn(value, filterValue)` |

#### Example Usage

```tsx
function ExpensesTable({ data }) {
  const schema: FilterSchema<Expense> = {
    status: { type: "exact" },
    description: { type: "contains" },
    amount: {
      type: "custom",
      filterFn: (value, range) => {
        if (range.min !== undefined && value < range.min) return false
        if (range.max !== undefined && value > range.max) return false
        return true
      }
    }
  }

  const { filters, setFilter, clearFilters, filteredData } =
    useTableFilter(data, schema)

  return (
    <div>
      {/* Filters */}
      <div className="flex gap-2 mb-4">
        <Select
          value={filters.status || "all"}
          onValueChange={(value) => setFilter("status", value === "all" ? undefined : value)}
        >
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="paid">Paid</SelectItem>
          <SelectItem value="unpaid">Unpaid</SelectItem>
        </Select>

        <Input
          placeholder="Search description..."
          value={filters.description || ""}
          onChange={(e) => setFilter("description", e.target.value)}
        />

        <Button variant="outline" onClick={clearFilters}>
          Clear Filters
        </Button>
      </div>

      {/* Table */}
      <Table>
        {/* Render filteredData */}
      </Table>
    </div>
  )
}
```

---

### useTableSort

**File**: `src/hooks/use-table-sort.ts`

Generic hook for managing table sort state and sorting data.

#### API

```tsx
import { useTableSort, SortConfig } from "@/hooks/use-table-sort"

interface DataType {
  id: string
  name: string
  amount: number
  date: Date
}

const config: SortConfig<DataType> = {
  date: (a, b, direction) => {
    const diff = a.date.getTime() - b.date.getTime()
    return direction === "asc" ? diff : -diff
  }
}

const {
  sortKey,
  sortDirection,
  setSortKey,
  setSortDirection,
  clearSort,
  sortedData
} = useTableSort(data, config, "date", "desc")
```

#### Example Usage

```tsx
function ExpensesTable({ data }) {
  const { sortKey, sortDirection, setSortKey, sortedData } = useTableSort(data)

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead
            onClick={() => setSortKey("description")}
            className="cursor-pointer"
          >
            Description
            {sortKey === "description" && (
              sortDirection === "asc" ? " ↑" : " ↓"
            )}
          </TableHead>
          <TableHead
            onClick={() => setSortKey("amount")}
            className="cursor-pointer"
          >
            Amount
            {sortKey === "amount" && (
              sortDirection === "asc" ? " ↑" : " ↓"
            )}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedData.map(expense => (
          <TableRow key={expense.id}>
            <TableCell>{expense.description}</TableCell>
            <TableCell className="tabular-nums">{expense.amount}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
```

---

### useTablePagination

**File**: `src/hooks/use-table-pagination.ts`

Generic hook for managing table pagination state and paginating data.

#### API

```tsx
import { useTablePagination } from "@/hooks/use-table-pagination"

const {
  page,
  pageSize,
  totalPages,
  totalItems,
  setPage,
  setPageSize,
  nextPage,
  prevPage,
  firstPage,
  lastPage,
  canNextPage,
  canPrevPage,
  paginatedData,
  startIndex,
  endIndex
} = useTablePagination(data, 20)
```

#### Example Usage

```tsx
function ExpensesTable({ data }) {
  const {
    page,
    totalPages,
    nextPage,
    prevPage,
    canNextPage,
    canPrevPage,
    paginatedData,
    startIndex,
    endIndex,
    totalItems
  } = useTablePagination(data, 10)

  return (
    <div>
      {/* Table */}
      <Table>
        <TableBody>
          {paginatedData.map(expense => (
            <TableRow key={expense.id}>
              {/* Render expense */}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between py-4">
        <div className="typography-metadata">
          Showing {startIndex}-{endIndex} of {totalItems}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={prevPage}
            disabled={!canPrevPage}
          >
            Previous
          </Button>
          <div className="typography-body flex items-center px-4">
            Page {page + 1} of {totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={nextPage}
            disabled={!canNextPage}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
```

---

## Combining Hooks

All three hooks can be combined for full table functionality:

```tsx
function FullFeaturedTable({ data }: { data: Expense[] }) {
  // Filter
  const schema: FilterSchema<Expense> = {
    status: { type: "exact" },
    description: { type: "contains" },
  }
  const { filteredData, setFilter, clearFilters } = useTableFilter(data, schema)

  // Sort
  const { sortedData, sortKey, sortDirection, setSortKey } = useTableSort(filteredData)

  // Paginate
  const { paginatedData, page, totalPages, nextPage, prevPage, canNextPage, canPrevPage } =
    useTablePagination(sortedData, 10)

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-2">
        <Select onValueChange={(value) => setFilter("status", value)}>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="paid">Paid</SelectItem>
          <SelectItem value="unpaid">Unpaid</SelectItem>
        </Select>
        <Input
          placeholder="Search..."
          onChange={(e) => setFilter("description", e.target.value)}
        />
        <Button variant="outline" onClick={clearFilters}>Clear</Button>
      </div>

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead onClick={() => setSortKey("description")} className="cursor-pointer">
              Description {sortKey === "description" && (sortDirection === "asc" ? "↑" : "↓")}
            </TableHead>
            <TableHead onClick={() => setSortKey("amount")} className="cursor-pointer">
              Amount {sortKey === "amount" && (sortDirection === "asc" ? "↑" : "↓")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedData.map(expense => (
            <TableRow key={expense.id}>
              <TableCell>{expense.description}</TableCell>
              <TableCell className="tabular-nums">{expense.amount}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Pagination */}
      <div className="flex justify-between">
        <Button onClick={prevPage} disabled={!canPrevPage}>Previous</Button>
        <span>Page {page + 1} of {totalPages}</span>
        <Button onClick={nextPage} disabled={!canNextPage}>Next</Button>
      </div>
    </div>
  )
}
```

---

## Migration Guide

### Migrating from Old Card Components

**Before (creditor-card.tsx)**:
```tsx
<Card className="p-4 space-y-2">
  <div className="flex justify-between">
    <h3 className="text-lg font-medium">{name}</h3>
    <Badge>{status}</Badge>
  </div>
  <div className="typography-amount-large">{amount}</div>
  <Button size="sm">Settle</Button>
</Card>
```

**After (using DataCard)**:
```tsx
<DataCard>
  <DataCard.Header
    title={name}
    badge={<Badge>{status}</Badge>}
  />
  <DataCard.Content>
    <div className="typography-amount-large">{amount}</div>
  </DataCard.Content>
  <DataCard.Footer>
    <Button size="sm">Settle</Button>
  </DataCard.Footer>
</DataCard>
```

### Migrating from Inline Table Logic

**Before**:
```tsx
const [filters, setFilters] = useState({})
const [sortKey, setSortKey] = useState("date")
const [sortDirection, setSortDirection] = useState("desc")
const [page, setPage] = useState(0)

// Manual filtering logic...
// Manual sorting logic...
// Manual pagination logic...
```

**After**:
```tsx
const { filteredData, setFilter } = useTableFilter(data, schema)
const { sortedData, setSortKey } = useTableSort(filteredData)
const { paginatedData, nextPage, prevPage } = useTablePagination(sortedData, 10)
```

---

## Best Practices

1. **Use DataCard for data entities, div for layout**: Don't use DataCard just for visual styling
2. **Combine hooks for full functionality**: Filter → Sort → Paginate (in that order)
3. **Keep filter schemas co-located with components**: Define schema near component using it
4. **Use TypeScript generics**: Ensures type safety across hook usage
5. **Prefer ActivityItem over custom layouts**: Maintains consistency across feeds

---

## Related Documentation

- [Design System README](../design-system/README.md)
- [Component Rules](../design-system/component-rules.md)
- [Layout Rules](../design-system/layout-rules.md)
