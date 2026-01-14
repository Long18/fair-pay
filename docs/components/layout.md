# Page Layout Components

Documentation for reusable page layout components that ensure consistent structure across FairPay pages.

---

## PageContainer Component

**File**: `src/components/ui/page-container.tsx`

Root wrapper component for all page content with responsive padding and max-width constraints.

### When to Use

Use `PageContainer` as the outermost wrapper for **every page** in the application to ensure:
- Consistent responsive padding
- Proper max-width constraints
- Consistent vertical spacing
- Predictable layout behavior

### API

```tsx
import { PageContainer } from "@/components/ui/page-container"

<PageContainer
  variant="default" | "narrow" | "full"
  padding="default" | "none"
  spacing="default" | "compact" | "spacious" | "none"
  withBackground={boolean}
  fullHeight={boolean}
>
  {children}
</PageContainer>
```

### Variants

#### Layout Variants

| Variant | Max Width | Usage |
|---------|-----------|-------|
| `default` | `max-w-7xl` (1280px) | Standard pages (dashboard, balances, reports) |
| `narrow` | `max-w-4xl` (896px) | Reading-focused pages (terms, privacy, blog posts) |
| `full` | `max-w-none` | Data-heavy tables, full-width layouts |

#### Padding Variants

| Padding | Classes | Usage |
|---------|---------|-------|
| `default` | `px-4 sm:px-6 lg:px-8` | Standard horizontal padding (responsive) |
| `none` | `px-0` | No horizontal padding (for custom layouts) |

#### Spacing Variants

| Spacing | Classes | Usage |
|---------|---------|-------|
| `default` | `py-4 md:py-6 lg:py-8` | Standard vertical spacing |
| `compact` | `py-3 md:py-4 lg:py-5` | Tighter vertical spacing |
| `spacious` | `py-6 md:py-8 lg:py-10` | More vertical spacing |
| `none` | `py-0` | No vertical spacing (for custom layouts) |

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `"default"` \| `"narrow"` \| `"full"` | `"default"` | Max-width constraint |
| `padding` | `"default"` \| `"none"` | `"default"` | Horizontal padding |
| `spacing` | `"default"` \| `"compact"` \| `"spacious"` \| `"none"` | `"default"` | Vertical spacing |
| `withBackground` | `boolean` | `false` | Add `bg-background` for distinct background |
| `fullHeight` | `boolean` | `false` | Add `min-h-screen` for full viewport height |

### Examples

#### Standard Page Layout

```tsx
<PageContainer variant="default">
  <PageHeader title="Dashboard" description="Overview of your activity" />
  <PageContent>
    {/* Page content */}
  </PageContent>
</PageContainer>
```

#### Narrow Reading Layout

```tsx
<PageContainer variant="narrow">
  <PageHeader title="Terms of Service" />
  <PageContent>
    <div className="prose dark:prose-invert max-w-none">
      {/* Long-form content */}
    </div>
  </PageContent>
</PageContainer>
```

#### Full-Width Table Layout

```tsx
<PageContainer variant="full" padding="none" spacing="compact">
  <div className="px-4 sm:px-6 lg:px-8">
    <PageHeader title="All Transactions" />
  </div>
  <PageContent>
    {/* Full-width table with horizontal scrolling */}
    <TransactionsTable />
  </PageContent>
</PageContainer>
```

#### Page with Background and Full Height

```tsx
<PageContainer withBackground fullHeight>
  <PageHeader title="Settings" />
  <PageContent>
    {/* Settings form */}
  </PageContent>
</PageContainer>
```

---

## PageHeader Component

**File**: `src/components/ui/page-header.tsx`

Consistent page header with title, description, and optional action buttons.

### When to Use

Use `PageHeader` at the top of every page (immediately inside PageContainer) to display:
- Page title
- Optional subtitle/description
- Optional action button(s) on the right

### API

```tsx
import { PageHeader } from "@/components/ui/page-header"

<PageHeader
  title={ReactNode}
  description={ReactNode}
  action={ReactNode}
  titleId={string}
  descriptionId={string}
/>
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `title` | `ReactNode` | ✓ | Page title (string or custom element) |
| `description` | `ReactNode` | | Optional subtitle below title |
| `action` | `ReactNode` | | Optional action button(s) on the right |
| `titleId` | `string` | | Custom ID for ARIA labelledby |
| `descriptionId` | `string` | | Custom ID for ARIA describedby |

### Examples

#### Basic Page Header

```tsx
<PageHeader
  title="Dashboard"
  description="Overview of your activity"
/>
```

#### With Action Button

```tsx
<PageHeader
  title="All Balances"
  description="Complete overview of your debts and credits"
  action={
    <Button variant="outline" size="sm">
      <RefreshCwIcon className="h-4 w-4 mr-2" />
      Refresh
    </Button>
  }
/>
```

#### With Multiple Actions

```tsx
<PageHeader
  title="Settings"
  action={
    <>
      <Button variant="outline" size="sm">Cancel</Button>
      <Button size="sm">Save Changes</Button>
    </>
  }
/>
```

#### With Custom Title Element

```tsx
<PageHeader
  title={
    <div className="flex items-center gap-3">
      <Avatar src={user.avatar} />
      <span>{user.name}'s Profile</span>
    </div>
  }
  description="Manage your account settings"
/>
```

#### Accessible Header with IDs

```tsx
<PageHeader
  title="Balances"
  description="View and manage your balances"
  titleId="balances-page-title"
  descriptionId="balances-page-description"
  action={
    <Button aria-labelledby="balances-page-title" aria-describedby="balances-page-description">
      Refresh
    </Button>
  }
/>
```

---

## PageContent Component

**File**: `src/components/ui/page-content.tsx`

Wrapper for main page content with consistent vertical spacing between sections.

### When to Use

Use `PageContent` to wrap the main content area of a page (after PageHeader) to ensure:
- Consistent spacing between content sections
- Responsive spacing adjustments
- Clean separation from header

### API

```tsx
import { PageContent } from "@/components/ui/page-content"

<PageContent
  spacing="default" | "compact" | "spacious" | "none"
>
  {children}
</PageContent>
```

### Variants

| Spacing | Classes | Usage |
|---------|---------|-------|
| `default` | `space-y-4 md:space-y-6` | Standard spacing between sections |
| `compact` | `space-y-3 md:space-y-4` | Tighter spacing for dense layouts |
| `spacious` | `space-y-6 md:space-y-8` | More spacing for breathing room |
| `none` | `space-y-0` | No automatic spacing (manage manually) |

### Examples

#### Standard Content Layout

```tsx
<PageContent>
  <Card>
    <CardHeader>...</CardHeader>
    <CardContent>...</CardContent>
  </Card>
  <Card>
    <CardHeader>...</CardHeader>
    <CardContent>...</CardContent>
  </Card>
</PageContent>
```

#### Compact Content Layout

```tsx
<PageContent spacing="compact">
  <Alert>Important notification</Alert>
  <div className="grid grid-cols-3 gap-4">
    <StatCard />
    <StatCard />
    <StatCard />
  </div>
  <DataTable />
</PageContent>
```

#### Custom Spacing

```tsx
<PageContent spacing="none" className="space-y-8">
  {/* Manually control spacing */}
  <Section />
  <Divider />
  <Section />
</PageContent>
```

---

## Complete Page Template

Here's a complete example combining all three layout components:

```tsx
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { PageContent } from "@/components/ui/page-content";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCwIcon } from "@/components/ui/icons";

export const MyPage = () => {
  return (
    <PageContainer variant="default">
      {/* Page Header */}
      <PageHeader
        title="My Page Title"
        description="A brief description of this page"
        action={
          <Button variant="outline" size="sm">
            <RefreshCwIcon className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        }
      />

      {/* Page Content */}
      <PageContent>
        <Card>
          <CardHeader>
            <CardTitle>Section 1</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Content */}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Section 2</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Content */}
          </CardContent>
        </Card>
      </PageContent>
    </PageContainer>
  );
};
```

---

## Migration Guide

### Before (Inconsistent Layouts)

**Dashboard.tsx** (old pattern):
```tsx
<div className="space-y-6">
  <h1 className="typography-page-title">Dashboard</h1>
  <Card>...</Card>
  <Card>...</Card>
</div>
```

**Balances.tsx** (old pattern):
```tsx
<div className="min-h-screen bg-background">
  <div className="container max-w-7xl mx-auto py-4 md:py-6 lg:py-8 px-4 sm:px-6 lg:px-8">
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">All Balances</h1>
          <p className="text-sm text-muted-foreground mt-1">Description</p>
        </div>
        <Button>Refresh</Button>
      </div>
      <Card>...</Card>
    </div>
  </div>
</div>
```

### After (Using Layout Components)

**Dashboard.tsx** (new pattern):
```tsx
<PageContainer variant="default">
  <PageHeader title="Dashboard" />
  <PageContent>
    <Card>...</Card>
    <Card>...</Card>
  </PageContent>
</PageContainer>
```

**Balances.tsx** (new pattern):
```tsx
<PageContainer variant="default" withBackground fullHeight>
  <PageHeader
    title="All Balances"
    description="Complete overview of your debts and credits"
    action={<Button variant="outline" size="sm">Refresh</Button>}
  />
  <PageContent>
    <Card>...</Card>
  </PageContent>
</PageContainer>
```

---

## Best Practices

1. **Always use PageContainer**: Every page should start with PageContainer as the root wrapper
2. **Use PageHeader for titles**: Don't use raw `<h1>` tags - use PageHeader for consistency
3. **Wrap content in PageContent**: Place all main content inside PageContent for consistent spacing
4. **Choose appropriate variant**: Use `default` for most pages, `narrow` for reading, `full` for tables
5. **Responsive by default**: These components handle responsive behavior automatically
6. **Accessibility**: Use `titleId` and `descriptionId` props when actions reference the header
7. **Don't nest PageContainers**: Each page should have exactly one PageContainer

---

## Related Documentation

- [Design System README](../design-system/README.md)
- [Layout Rules](../design-system/layout-rules.md)
- [Component Rules](../design-system/component-rules.md)
- [Composite Components](./composites.md)
