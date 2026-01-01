# Analytics Architecture Documentation

## Overview

FairPay implements a clean, modular analytics architecture that supports multiple analytics providers with type-safe event tracking. The system follows SOLID principles and provides a unified interface for tracking user behavior, errors, and business metrics.

## Architecture

```
src/lib/analytics/
├── index.ts                    # Public API exports
├── types.ts                    # Type definitions and event schemas
├── manager.ts                  # Core AnalyticsManager orchestrator
├── instance.ts                 # Singleton instance with configuration
├── trackers.ts                 # Domain-specific tracking helpers
└── providers/
    └── vercel.ts              # Vercel Analytics provider implementation
```

### Design Principles

1. **Single Responsibility**: Each class has one clear purpose
2. **Open/Closed**: Easy to add new providers without modifying existing code
3. **Dependency Inversion**: Code depends on abstractions (interfaces), not implementations
4. **Type Safety**: Full TypeScript support with strict event schemas
5. **Provider Agnostic**: Easy to switch or add analytics providers

## Core Components

### 1. AnalyticsManager (Orchestrator)

Central coordinator that manages multiple analytics providers and ensures consistent tracking across all providers.

**Responsibilities:**
- Register/unregister providers
- Initialize all providers
- Enrich events with session metadata
- Route events to all active providers
- Handle errors gracefully

**Key Methods:**
```typescript
class AnalyticsManager {
  registerProvider(name: string, provider: AnalyticsProvider): void
  init(): void
  trackEvent(event: AnalyticsEvent): void
  pageView(path: string, title?: string): void
  setUser(userId: string, properties?: Record<string, any>): void
  clearUser(): void
  getProvidersStatus(): Record<string, boolean>
}
```

### 2. AnalyticsProvider (Interface)

Contract that all analytics providers must implement.

```typescript
interface AnalyticsProvider {
  init(): void
  track(eventName: string, properties?: Record<string, any>): void
  pageView(path: string, title?: string): void
  setUser(userId: string, properties?: Record<string, any>): void
  clearUser(): void
  isInitialized(): boolean
}
```

### 3. VercelAnalyticsProvider (Implementation)

Concrete implementation for Vercel Web Analytics.

**Features:**
- Sanitizes properties (max length, JSON serialization)
- Debug logging in development
- Error handling with fallback
- Production-only tracking (configurable)

### 4. Domain-Specific Trackers

Type-safe, business-logic focused tracking helpers organized by domain:

- **AuthTracker**: Login, logout, registration
- **ExpenseTracker**: Expense lifecycle events
- **PaymentTracker**: Payment recording and management
- **GroupTracker**: Group operations
- **FriendTracker**: Friend management
- **DashboardTracker**: Dashboard interactions
- **SettingsTracker**: Settings changes
- **ReportTracker**: Report generation and export
- **ErrorTracker**: Error logging
- **FeatureTracker**: Feature usage

## Type System

### Event Hierarchy

All events extend `BaseEventProperties` and are union-typed as `AnalyticsEvent`:

```typescript
interface BaseEventProperties {
  category: EventCategory;
  timestamp?: number;
  userId?: string;
  sessionId?: string;
}

type AnalyticsEvent =
  | AuthEvent
  | ExpenseEvent
  | PaymentEvent
  | GroupEvent
  | FriendEvent
  | DashboardEvent
  | SettingsEvent
  | ReportEvent
  | ErrorEvent
  | FeatureEvent;
```

### Event Categories

Strongly-typed categories ensure consistency:

```typescript
type EventCategory =
  | 'Auth'
  | 'Expense'
  | 'Payment'
  | 'Group'
  | 'Friend'
  | 'Dashboard'
  | 'Settings'
  | 'Report'
  | 'Error'
  | 'Feature';
```

## Usage Guide

### Basic Usage

```typescript
import {
  AuthTracker,
  ExpenseTracker,
  PaymentTracker,
} from '@/lib/analytics';

// Track user login
AuthTracker.login('email');
AuthTracker.login('oauth', 'google');

// Track expense creation
ExpenseTracker.created({
  amount: 100,
  currency: 'USD',
  splitMethod: 'equal',
  participantCount: 3,
  hasReceipt: true,
  context: 'group',
});

// Track payment
PaymentTracker.recorded({
  amount: 50,
  currency: 'USD',
  paymentMethod: 'bank_transfer',
  hasProof: true,
  context: 'friend',
});
```

### Advanced Usage

#### Set User Identity

```typescript
import { analyticsManager } from '@/lib/analytics';

// On successful login
analyticsManager.setUser(userId, {
  plan: 'free',
  signupDate: '2024-01-01',
});

// On logout
analyticsManager.clearUser();
```

#### Track Page Views

```typescript
import { analyticsManager } from '@/lib/analytics';

// Automatic via router (recommended)
// Or manual:
analyticsManager.pageView('/dashboard', 'Dashboard - FairPay');
```

#### Error Tracking

```typescript
import { ErrorTracker } from '@/lib/analytics';

// In error boundary
ErrorTracker.boundaryCaught({
  errorName: error.name,
  errorMessage: error.message,
  componentStack: errorInfo.componentStack,
});

// API error
ErrorTracker.apiError({
  endpoint: '/api/expenses',
  statusCode: 500,
  errorMessage: 'Internal server error',
});

// Validation error
ErrorTracker.validationError({
  errorName: 'ValidationError',
  errorMessage: 'Amount must be positive',
});
```

#### Custom Events

```typescript
import { FeatureTracker, DashboardTracker } from '@/lib/analytics';

// Track feature usage
FeatureTracker.used('simplify_debts', { debtCount: 5 });

// Track dashboard interaction
DashboardTracker.featureUsed('export_csv');
DashboardTracker.balanceChecked({
  hasDebts: true,
  debtCount: 3,
});
```

## Implementation Examples

### Example 1: Authentication Flow

```typescript
// In src/authProvider.ts
import { AuthTracker, analyticsManager } from '@/lib/analytics';

export const authProvider = {
  login: async ({ email, password, providerName }) => {
    try {
      const result = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (result.data.user) {
        // Track login event
        AuthTracker.login('email');

        // Set user identity
        analyticsManager.setUser(result.data.user.id, {
          email: result.data.user.email,
          createdAt: result.data.user.created_at,
        });
      }

      return result;
    } catch (error) {
      ErrorTracker.apiError({
        endpoint: 'auth/login',
        errorMessage: error.message,
      });
      throw error;
    }
  },

  logout: async () => {
    AuthTracker.logout();
    analyticsManager.clearUser();
    await supabaseClient.auth.signOut();
  },
};
```

### Example 2: Expense Form

```typescript
// In src/modules/expenses/expense-form.tsx
import { ExpenseTracker } from '@/lib/analytics';

export const ExpenseForm = () => {
  const handleSubmit = async (data: ExpenseFormData) => {
    try {
      const result = await createExpense(data);

      // Track expense creation
      ExpenseTracker.created({
        amount: data.amount,
        currency: data.currency,
        splitMethod: data.splitMethod,
        participantCount: data.participants.length,
        hasReceipt: !!data.receiptFile,
        context: data.groupId ? 'group' : 'friend',
      });

      navigate(`/expenses/show/${result.id}`);
    } catch (error) {
      ErrorTracker.validationError({
        errorName: 'ExpenseCreationError',
        errorMessage: error.message,
      });
    }
  };

  // ... rest of component
};
```

### Example 3: Error Boundary

```typescript
// In src/components/error-boundary.tsx
import { ErrorTracker } from '@/lib/analytics';

export class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Track to analytics
    ErrorTracker.boundaryCaught({
      errorName: error.name,
      errorMessage: error.message,
      componentStack: errorInfo.componentStack,
    });

    // Also send to Sentry
    Sentry.captureException(error, { contexts: { react: errorInfo } });
  }

  // ... rest of component
}
```

### Example 4: Dashboard Interactions

```typescript
// In src/pages/dashboard.tsx
import { DashboardTracker } from '@/lib/analytics';

export const Dashboard = () => {
  const handleSimplifyDebts = () => {
    DashboardTracker.featureUsed('simplify_debts');
    // ... simplify logic
  };

  const handleShowSettledToggle = (value: boolean) => {
    DashboardTracker.viewToggled(`show_settled_${value}`);
    setShowSettled(value);
  };

  useEffect(() => {
    // Track balance check on mount
    DashboardTracker.balanceChecked({
      hasDebts: totalDebts > 0,
      debtCount: debts.length,
    });
  }, []);

  // ... rest of component
};
```

## Adding a New Provider

### Step 1: Implement AnalyticsProvider Interface

```typescript
// src/lib/analytics/providers/google-analytics.ts
import type { AnalyticsProvider, AnalyticsConfig } from '../types';

export class GoogleAnalyticsProvider implements AnalyticsProvider {
  private initialized = false;
  private config: AnalyticsConfig;

  constructor(config: AnalyticsConfig) {
    this.config = config;
  }

  init(): void {
    if (this.initialized || !this.config.enabled) return;

    // Load GA script
    const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
    if (!measurementId) return;

    // ... GA initialization code

    this.initialized = true;
  }

  track(eventName: string, properties?: Record<string, any>): void {
    if (!this.initialized) return;

    // Send to GA
    window.gtag?.('event', eventName, properties);
  }

  pageView(path: string, title?: string): void {
    if (!this.initialized) return;

    window.gtag?.('event', 'page_view', {
      page_path: path,
      page_title: title,
    });
  }

  setUser(userId: string, properties?: Record<string, any>): void {
    if (!this.initialized) return;

    window.gtag?.('set', 'user_properties', {
      user_id: userId,
      ...properties,
    });
  }

  clearUser(): void {
    if (!this.initialized) return;

    window.gtag?.('set', 'user_properties', {
      user_id: undefined,
    });
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}
```

### Step 2: Register Provider

```typescript
// src/lib/analytics/instance.ts
import { GoogleAnalyticsProvider } from './providers/google-analytics';

// ... existing code

const gaProvider = new GoogleAnalyticsProvider(config);
analyticsManager.registerProvider('ga4', gaProvider);
```

### Step 3: Done!

All tracking calls will now automatically send to both Vercel and Google Analytics.

## Configuration

### Environment-based Configuration

```typescript
// src/lib/analytics/instance.ts
const config: AnalyticsConfig = {
  enabled: import.meta.env.PROD, // Only in production
  environment: import.meta.env.PROD ? 'production' : 'development',
  debug: import.meta.env.DEV, // Debug logs in development
};
```

### Environment Variables

```env
# Optional: Enable specific providers
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_MIXPANEL_TOKEN=your_token
VITE_AMPLITUDE_API_KEY=your_key
```

## Testing

### Development Mode

In development, analytics is enabled with debug logging:

```typescript
// All events logged to console
[AnalyticsManager] Event: { category: 'Expense', action: 'created', ... }
[VercelAnalytics] Track: expense_created { amount: 100, ... }
```

### Check Provider Status

```typescript
import { analyticsManager } from '@/lib/analytics';

// Get status of all providers
const status = analyticsManager.getProvidersStatus();
console.log(status); // { vercel: true, ga4: true }
```

### Manual Testing

```typescript
import {
  ExpenseTracker,
  analyticsManager,
} from '@/lib/analytics';

// Initialize
analyticsManager.init();

// Track test event
ExpenseTracker.created({
  amount: 100,
  currency: 'USD',
  splitMethod: 'equal',
  participantCount: 3,
  hasReceipt: false,
  context: 'group',
});

// Check Network tab for request to Vercel Analytics
// Should see POST to /_vercel/insights/event or similar
```

## Best Practices

### 1. Use Domain-Specific Trackers

✅ **Good:**
```typescript
ExpenseTracker.created({ ... });
```

❌ **Bad:**
```typescript
analyticsManager.trackEvent({
  category: 'Expense',
  action: 'created',
  ...
});
```

### 2. Track Actions, Not State

✅ **Good:**
```typescript
// Track when user performs action
AuthTracker.login('email');
```

❌ **Bad:**
```typescript
// Don't track on every render
useEffect(() => {
  AuthTracker.login('email');
});
```

### 3. Sanitize Sensitive Data

✅ **Good:**
```typescript
ExpenseTracker.created({
  amount: expense.amount, // OK to track amount
  currency: expense.currency,
  splitMethod: expense.splitMethod,
  // Don't send PII
});
```

❌ **Bad:**
```typescript
ExpenseTracker.created({
  description: expense.description, // May contain PII
  participantNames: expense.participants, // PII
});
```

### 4. Handle Errors Gracefully

```typescript
try {
  await createExpense(data);
  ExpenseTracker.created({ ... });
} catch (error) {
  // Track error, but don't let analytics fail the operation
  ErrorTracker.validationError({
    errorName: 'ExpenseCreationError',
    errorMessage: error.message,
  });
  throw error; // Re-throw for UI handling
}
```

### 5. Use Production Checks for Heavy Operations

```typescript
// Only track expensive operations in production
if (import.meta.env.PROD) {
  ReportTracker.generated({
    reportType: 'custom',
    dateRangeDays: calculateDays(),
  });
}
```

## Performance Considerations

1. **Async Tracking**: All tracking is async and non-blocking
2. **Batch Events**: Providers can batch events internally
3. **Debug Mode**: Debug logging only in development
4. **Conditional Initialization**: Providers only init if enabled
5. **Error Handling**: Failures don't affect user experience

## Migration from Legacy Analytics

The new system coexists with the legacy `src/lib/analytics.ts`:

```typescript
// Old way (still works)
import { trackExpenseCreated } from '@/lib/analytics';
trackExpenseCreated(100, 'USD', 'equal');

// New way (recommended)
import { ExpenseTracker } from '@/lib/analytics';
ExpenseTracker.created({
  amount: 100,
  currency: 'USD',
  splitMethod: 'equal',
  participantCount: 3,
  hasReceipt: false,
  context: 'group',
});
```

Gradually migrate tracking calls to use the new domain-specific trackers for better type safety and consistency.

## Troubleshooting

### Events not appearing in Vercel Dashboard

1. Check Web Analytics is enabled in Vercel Dashboard
2. Verify `inject()` is called in src/index.tsx
3. Check Network tab for requests to `/_vercel/insights`
4. Confirm production environment (analytics disabled in dev by default)

### TypeScript Errors

```bash
# Rebuild types
pnpm tsc --noEmit

# Check for circular dependencies
```

### Provider Not Initializing

```typescript
import { analyticsManager } from '@/lib/analytics';

// Check provider status
console.log(analyticsManager.getProvidersStatus());

// Check config
console.log(analyticsManager.config);
```

## Future Enhancements

1. **Event Batching**: Batch multiple events for performance
2. **Offline Support**: Queue events when offline, send when online
3. **A/B Testing Integration**: Track experiment variants
4. **Custom Dimensions**: Add custom properties to all events
5. **Event Validation**: Runtime validation of event schemas
6. **Provider-specific Features**: Leverage provider-specific capabilities

## Related Documentation

- [Vercel Web Analytics Integration](./95-Vercel-Web-Analytics-Integration.md)
- [Sentry Integration](./35-Sentry-Integration.md)
- [Performance Monitoring](../src/lib/performance.ts)

## Support

For questions or issues:
1. Check this documentation
2. Review implementation examples
3. Check provider documentation
4. File an issue with reproduction steps
