# Analytics System

Clean, type-safe, and modular analytics architecture for FairPay.

## Quick Start

```typescript
import {
  AuthTracker,
  ExpenseTracker,
  PaymentTracker,
  GroupTracker,
  analyticsManager,
} from '@/lib/analytics';

// Track events
AuthTracker.login('email');

ExpenseTracker.created({
  amount: 100,
  currency: 'USD',
  splitMethod: 'equal',
  participantCount: 3,
  hasReceipt: true,
  context: 'group',
});

// Set user identity (on login)
analyticsManager.setUser(userId, {
  email: user.email,
  createdAt: user.created_at,
});

// Clear user (on logout)
analyticsManager.clearUser();
```

## Architecture

```
src/lib/analytics/
├── index.ts              # Public API
├── types.ts              # Event type definitions
├── manager.ts            # AnalyticsManager (orchestrator)
├── instance.ts           # Singleton with providers
├── trackers.ts           # Domain-specific helpers
└── providers/
    └── vercel.ts         # Vercel Analytics implementation
```

## Features

- ✅ **Type-safe events** with full TypeScript support
- ✅ **Domain-specific trackers** for business logic
- ✅ **Multi-provider support** (Vercel, GA4, Mixpanel, etc.)
- ✅ **Automatic enrichment** (userId, sessionId, timestamp)
- ✅ **Error handling** with graceful degradation
- ✅ **Debug mode** for development
- ✅ **Production-only tracking** by default

## Available Trackers

- `AuthTracker` - Authentication events
- `ExpenseTracker` - Expense lifecycle
- `PaymentTracker` - Payment operations
- `GroupTracker` - Group management
- `FriendTracker` - Friend operations
- `DashboardTracker` - Dashboard interactions
- `SettingsTracker` - Settings changes
- `ReportTracker` - Report generation
- `ErrorTracker` - Error logging
- `FeatureTracker` - Feature usage

## Documentation

See [Analytics Architecture](../../docs/96-Analytics-Architecture.md) for:
- Complete implementation guide
- Usage examples
- Adding new providers
- Best practices
- Troubleshooting

## Current Providers

- **Vercel Web Analytics** - Page views, Web Vitals, visitor tracking
- _(Legacy: GA4, Mixpanel, Amplitude via `src/lib/analytics.ts`)_

## Configuration

Configured via environment:
- **Production**: Analytics enabled, no debug logs
- **Development**: Analytics enabled with debug logs
- **Test**: Analytics disabled

```typescript
// See src/lib/analytics/instance.ts
const config = {
  enabled: import.meta.env.PROD,
  environment: import.meta.env.PROD ? 'production' : 'development',
  debug: import.meta.env.DEV,
};
```

## Examples

### Track Expense Creation

```typescript
import { ExpenseTracker } from '@/lib/analytics';

const handleSubmit = async (data) => {
  const result = await createExpense(data);

  ExpenseTracker.created({
    amount: data.amount,
    currency: data.currency,
    splitMethod: data.splitMethod,
    participantCount: data.participants.length,
    hasReceipt: !!data.receiptFile,
    context: data.groupId ? 'group' : 'friend',
  });

  return result;
};
```

### Track Errors

```typescript
import { ErrorTracker } from '@/lib/analytics';

try {
  await apiCall();
} catch (error) {
  ErrorTracker.apiError({
    endpoint: '/api/expenses',
    statusCode: error.status,
    errorMessage: error.message,
  });
  throw error;
}
```

### Track Dashboard Feature Usage

```typescript
import { DashboardTracker } from '@/lib/analytics';

const handleSimplifyDebts = () => {
  DashboardTracker.featureUsed('simplify_debts');
  // ... logic
};
```

## Adding a New Provider

1. Implement `AnalyticsProvider` interface
2. Register in `src/lib/analytics/instance.ts`
3. Done! All events automatically tracked

```typescript
// 1. Create provider
export class CustomProvider implements AnalyticsProvider {
  // ... implement interface
}

// 2. Register
const customProvider = new CustomProvider(config);
analyticsManager.registerProvider('custom', customProvider);
```

See [documentation](../../docs/96-Analytics-Architecture.md#adding-a-new-provider) for details.

## Migration from Legacy

Old way (still works):
```typescript
import { trackExpenseCreated } from '@/lib/analytics';
trackExpenseCreated(100, 'USD', 'equal');
```

New way (recommended):
```typescript
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

## Testing

```typescript
import { analyticsManager } from '@/lib/analytics';

// Check provider status
console.log(analyticsManager.getProvidersStatus());
// { vercel: true }

// Track test event (will log in development)
ExpenseTracker.created({ ... });
```

## Best Practices

1. ✅ Use domain-specific trackers
2. ✅ Track actions, not state
3. ✅ Don't send PII (names, emails, etc.)
4. ✅ Handle errors gracefully
5. ✅ Use production checks for expensive operations

## Support

- [Full Documentation](../../docs/96-Analytics-Architecture.md)
- [Vercel Web Analytics](../../docs/95-Vercel-Web-Analytics-Integration.md)
- [Sentry Integration](../../docs/35-Sentry-Integration.md)
