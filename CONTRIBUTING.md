# Contributing to FairPay

Thank you for your interest in contributing to FairPay! This document provides guidelines and best practices for contributing to the project.

## Code Style and Conventions

### Status Color Token Enforcement

**IMPORTANT**: To maintain visual consistency and design system compliance, we enforce the use of status color tokens instead of hardcoded Tailwind classes.

#### ❌ Don't Use Hardcoded Status Colors

```tsx
// BAD - Hardcoded Tailwind classes
<div className="bg-green-100 text-green-700">Paid</div>
<span className="text-red-600">You owe</span>
<Badge className="bg-orange-100">Unpaid</Badge>
```

#### ✅ Use Status Color Tokens

```tsx
// GOOD - Use status color tokens
import { getPaymentStateColors, getOweStatusColors } from '@/lib/status-colors';

const paidColors = getPaymentStateColors('paid');
<div className={`${paidColors.bg} ${paidColors.text}`}>Paid</div>

const oweColors = getOweStatusColors('owe');
<span className={oweColors.text}>You owe</span>

const unpaidColors = getPaymentStateColors('unpaid');
<Badge className={unpaidColors.bg}>Unpaid</Badge>
```

#### Available Status Color Helpers

1. **Payment State Colors** - For expense payment status
   ```tsx
   import { getPaymentStateColors } from '@/lib/status-colors';
   
   // States: 'paid', 'unpaid', 'partial'
   const colors = getPaymentStateColors('paid');
   // Returns: { bg, text, border, icon }
   ```

2. **Owe Status Colors** - For debt direction indicators
   ```tsx
   import { getOweStatusColors, getOweStatusFromBalance } from '@/lib/status-colors';
   
   // States: 'owe', 'owed', 'neutral'
   const status = getOweStatusFromBalance(-50000); // 'owe'
   const colors = getOweStatusColors(status);
   ```

3. **Semantic Status Colors** - For general success/warning/error states
   ```tsx
   import { getSemanticStatusColors } from '@/lib/status-colors';
   
   // States: 'success', 'warning', 'error', 'info'
   const colors = getSemanticStatusColors('success');
   ```

#### ESLint Enforcement

The project uses ESLint to automatically detect hardcoded status colors:

```bash
# Run ESLint to check for violations
npm run lint

# Auto-fix some issues (won't fix status colors automatically)
npm run lint:fix
```

**Error Message**: If you use hardcoded status colors, you'll see:
```
Use status color tokens from '@/lib/status-colors' instead of hardcoded Tailwind status colors.
Import getPaymentStateColors(), getOweStatusColors(), or getSemanticStatusColors().
```

#### Migration Guide

When updating existing components:

1. **Identify the status type**: Is it payment state, owe status, or semantic status?
2. **Import the appropriate helper**: `getPaymentStateColors`, `getOweStatusColors`, or `getSemanticStatusColors`
3. **Replace hardcoded classes**: Use the returned color tokens
4. **Test the component**: Verify colors work in both light and dark modes

**Example Migration**:

```tsx
// Before
<div className="bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-300">
  <CheckIcon className="text-green-600 dark:text-green-400" />
  Paid
</div>

// After
import { getPaymentStateColors } from '@/lib/status-colors';

const colors = getPaymentStateColors('paid');
<div className={`${colors.bg} ${colors.text}`}>
  <CheckIcon className={colors.icon} />
  Paid
</div>
```

#### Why This Matters

- **Consistency**: Ensures all status indicators use the same colors across the app
- **Maintainability**: Centralized color definitions make theme updates easier
- **Accessibility**: Status colors are designed to meet WCAG AA contrast standards
- **Design System Compliance**: Aligns with Requirements 8.1, 8.2, 8.3 for consistent status indicators

## General Guidelines

### TypeScript

- Use TypeScript strict mode
- Define proper types for all props and function parameters
- Avoid `any` types unless absolutely necessary

### React Components

- Use functional components with hooks
- Follow the component structure defined in coding conventions
- Keep components focused and single-responsibility

### Imports

Organize imports in this order:
1. External libraries
2. Refine imports
3. Internal components
4. Hooks and utilities
5. Types

### Testing

- Write tests for new features
- Ensure existing tests pass before submitting PR
- Follow the testing patterns in the codebase

## Questions?

If you have questions about status color tokens or other conventions, please open an issue or ask in the project discussions.
