# Research: Component Architecture & Reusability for FairPay

**Date**: 2026-01-13 | **Focus**: Dashboard UI decomposition, reusability patterns, refactoring strategies

## 1. Component Decomposition Strategies

### Atomic Design (5-Level Hierarchy)
- **Atoms**: Buttons, inputs, badges (base primitives)
- **Molecules**: Input+button combos, search bars (atom combinations)
- **Organisms**: Navigation headers, card layouts (larger sections)
- **Templates**: Page layouts without content
- **Pages**: Templates with real data

**Optimal for**: Design systems, enterprise apps with shared patterns

### Feature-Based Architecture
Organizes code by feature domains (e.g., `features/dashboard`, `features/expenses`). Each feature contains:
- Scoped components (UI specific to that feature)
- Custom hooks (feature-specific logic)
- API/services layer
- Types & state management
- Utility functions

**Advantage**: Scales better; developers stay within feature folder context.

**Tradeoff**: Risk of code duplication across features; requires discipline for shared component governance.

### Dashboard-Specific Patterns
For dashboards, hybrid approach works best:
1. **Shared primitives** (`/components/ui`): shadcn/ui base components
2. **Composite cards**: Balance cards, statistics cards (reusable containers)
3. **Data visualization**: Charts, tables (feature-specific wrappers)
4. **Layout grids**: Responsive grid containers shared across dashboard variants

## 2. Common Causes of Duplicated UI Code

**Pattern 1: Ad-hoc Card Wrappers**
- Multiple components recreating card + header + footer patterns independently
- FairPay example: `creditor-card.tsx`, `group-balance-card.tsx`, `one-off-payment-card.tsx` (likely similar structures)

**Pattern 2: Reused Logic Not Extracted**
- Filtering, sorting, pagination logic copied between tables/lists
- Status handling, loading states implemented inline repeatedly

**Pattern 3: Styling Inconsistency**
- Custom Tailwind classes repeated across components instead of using CVA (Class Variance Authority)
- No centralized theme token usage

**Pattern 4: Layout Containers**
- Section wrappers, grid arrangements, padding/margin patterns duplicated

## 3. shadcn/ui Best Practices for Composition

### Compound Component Pattern
Use cooperating components that share state and API:
```
<Dialog>
  <DialogTrigger />
  <DialogContent>
    <DialogHeader />
    <DialogBody />
  </DialogContent>
</Dialog>
```
Distributes responsibility; avoids prop-drilling; maintains API clarity.

### Class Variance Authority (CVA)
shadcn/ui uses CVA for variant management:
- Separate styling concerns from component logic
- Create composable variants (size, color, state)
- Reduces inline Tailwind duplication

### Composition Over Inheritance
- Build on existing shadcn/ui primitives rather than custom components
- Ensures visual consistency
- Reduces code duplication

### Key Principle
Design should be separate from implementation. Use composition patterns to create flexible APIs without cramming logic into single components.

## 4. Refactoring Strategies for Elimination

### Strategy A: Extract Custom Hooks
**Problem**: Duplicated stateful logic (filtering, form state, data fetching)
**Solution**: Create domain-specific hooks (`useExpenseFilters`, `useBalanceData`)
**Benefits**: Encapsulates logic; enables reuse across multiple components; keeps component surface area small

### Strategy B: Create Composite Components
**Problem**: Multiple card variants recreating similar layouts
**Solution**: Build base `<DataCard>` component with slots for header, content, footer
**Example**:
```tsx
<DataCard variant="balance">
  <DataCard.Header title="Balance" />
  <DataCard.Content>{children}</DataCard.Content>
  <DataCard.Footer action={<Action />} />
</DataCard>
```

### Strategy C: Leverage Render Props & Composition
**Problem**: Similar table/list renderers with different data
**Solution**: Create generic `<DataTable>` wrapper accepting render functions
**Benefit**: Single source of truth for table behavior (sorting, filtering, pagination)

### Strategy D: Consolidate Layout Patterns
**Problem**: Redundant grid/flex containers with magic numbers
**Solution**: Create layout primitives:
- `<GridContainer>` (responsive grid)
- `<StackContainer>` (flex column with gap)
- `<AspectRatio>` (for consistent card ratios)

### Step-by-Step Refactoring Approach
1. **Identify**: Scan for components with similar structure (name patterns: `*-card`, `*-table`, `*-list`)
2. **Extract**: Pull common logic into custom hooks or composite components
3. **Test**: Keep code working throughout; use incremental steps
4. **Validate**: Ensure visual consistency; test responsive behavior

## 5. FairPay-Specific Observations

**Current Structure**: ~33 dashboard components in `/components/dashboard/`
- Multiple card components (balance, creditor, group, payment, statistics)
- Table components (accounting-records, documents, friends, groups, payments)
- State/Feed components (activity-feed, balance-feed, simplified-debts)

**Refactoring Priorities**:
1. **Card variants**: Extract common card structure to reusable composite
2. **Table behavior**: Consolidate table sorting/filtering logic into custom hooks
3. **Activity feeds**: Extract feed item rendering to shared component
4. **Data loading states**: Create unified skeleton/loading patterns

## 6. Implementation Framework

**Phase 1 - Audit**:
- Map component dependencies and reused patterns
- Identify duplicated logic using grep on key patterns (e.g., "useState", "filter", "sort")

**Phase 2 - Core Composites**:
- Build base card composite with CVA variants
- Create generic table wrapper with default behaviors
- Extract common hooks (useFilter, useSort, usePaginate)

**Phase 3 - Migration**:
- Refactor existing components to use composites
- Update card variants to CVA-based system
- Test responsive behavior across all variants

**Phase 4 - Documentation**:
- Establish component composition guidelines
- Document custom hook contracts
- Create reusable patterns catalog

## Sources

- [Atomic Design in React: Best Practices](https://propelius.ai/blogs/atomic-design-in-react-best-practices)
- [Feature-Based Architecture](https://asrulkadir.medium.com/3-folder-structures-in-react-ive-used-and-why-feature-based-is-my-favorite-e1af7c8e91ec)
- [React Folder Structure 2025](https://www.robinwieruch.de/react-folder-structure/)
- [The Anatomy of shadcn/ui](https://manupa.dev/blog/anatomy-of-shadcn-ui)
- [Compound Components & Composition](https://vercel.com/academy/shadcn-ui/compound-components-and-advanced-composition)
- [Custom Hooks for Code Reuse](https://react.dev/learn/reusing-logic-with-custom-hooks)
- [Refactoring React Components with Hooks](https://blog.logrocket.com/refactor-react-components-hooks/)
- [Bulletproof React Structure](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md)
