# FairPay Codebase Scout Report
**Date**: 2026-02-09
**Task**: Find all files related to dashboard debt summary, currency formatting/rounding, and debt calculation logic

---

## Summary

Comprehensive search identified **30+ files** across debt summary, currency formatting, debt calculation logic, and UI components. The codebase has a well-structured debt aggregation system with Supabase backend functions and React hooks for frontend consumption.

---

## 1. DEBT SUMMARY & AGGREGATION

### Core Debt Calculation Hooks

#### `/Users/long.lnt/Desktop/Projects/FairPay/src/hooks/use-debt-summary.ts`
- **Purpose**: Calculates bilateral debt summary between two users
- **Key Exports**: `useDebtSummary(counterpartyId, counterpartyName, counterpartyAvatarUrl)`
- **Returns**: `DebtSummary` interface with:
  - `total_i_owe`, `total_they_owe`, `net_amount`
  - `i_owe_them` (boolean flag for debt direction)
  - `currency`, `unpaid_count`, `partial_count`, `paid_count`
- **Key Logic**: Calculates net balance as `totalTheyOweMe - totalIOweThem`, uses `direction` field to determine debt direction
- **Data Source**: Consumes `useContributingExpenses` hook

#### `/Users/long.lnt/Desktop/Projects/FairPay/src/hooks/use-aggregated-debts.ts`
- **Purpose**: Fetches aggregated debts for current user (with real-time subscriptions)
- **Key Exports**: `useAggregatedDebts(options)` with optional `includeHistory` and `dateRange` parameters
- **Returns**: `AggregatedDebt[]` with fields for amount, currency, i_owe_them, transaction metadata
- **Key Features**:
  - Supports both authenticated users (real debts) and unauthenticated users (public demo data)
  - Calls Supabase RPC functions: `get_user_debts_aggregated` (current) or `get_user_debts_history` (with history)
  - Real-time subscriptions to `expenses` and `expense_splits` tables (500ms debounce)
  - Filters out zero-balance debts automatically
  - Avatar URLs fetched from profiles table and merged
- **Caching**: 500ms debounce on real-time updates, separate history mode

#### `/Users/long.lnt/Desktop/Projects/FairPay/src/hooks/use-simplified-debts.ts`
- **Purpose**: Fetches simplified debts using Min-Cost Max-Flow algorithm to reduce transaction count
- **Key Exports**: `useSimplifiedDebts(options)`
- **Returns**: `SimplifiedDebt[]` with from/to user IDs and amounts
- **Key Logic**: Calls Supabase RPC `simplify_group_debts` for group-level debt simplification
- **Cache Settings**: 5-minute stale time, 10-minute garbage collection time
- **Example**: A→B $10, B→C $15, C→A $5 simplified to just B→C $5

### Debt Simplification Algorithm

#### `/Users/long.lnt/Desktop/Projects/FairPay/src/lib/simplify-debts.ts`
- **Purpose**: Pure TypeScript implementation of greedy debt simplification
- **Key Exports**: 
  - `simplifyDebts(debts: DebtEdge[])` - Main algorithm
  - `areDebtsEquivalent(debts1, debts2)` - Validation function
  - `formatDebtEdge()` - Display formatting
- **Algorithm**: Greedy matching of debtors to creditors sorted by amount
- **Key Features**:
  - Calculates net balances for each person
  - Separates creditors (positive balance) from debtors (negative balance)
  - Matches largest amounts first to minimize transaction count
  - Rounds to 2 decimals with 0.01 tolerance for floating point comparison
- **Output**: `SimplifiedDebts` interface with `original`, `simplified`, and `transactionsSaved` count

---

## 2. DASHBOARD PAGES & COMPONENTS

### Main Dashboard Page

#### `/Users/long.lnt/Desktop/Projects/FairPay/src/pages/dashboard.tsx`
- **Purpose**: Main dashboard with balance and activity tabs
- **Key Features**:
  - Uses `useAggregatedDebts` hook for balance data
  - Uses `useEnhancedActivity` for activity feed
  - Tab-based navigation (balances vs activity)
  - History toggle to include settled debts
  - Visibility-based data refresh (30-second stale time, 1-second debounce)
  - Dashboard event tracking via `DashboardTracker`
- **Components Used**: `BalanceTable`, `EnhancedActivityList`, `FloatingActionButton`

#### `/Users/long.lnt/Desktop/Projects/FairPay/src/pages/balances.tsx`
- **Purpose**: Comprehensive balance reporting page
- **Key Features**:
  - Uses `useAggregatedDebts` for balance data
  - Spending summary hooks: `useSpendingSummary`, `useCategoryBreakdown`, `useSpendingTrend`, etc.
  - Date range filtering support
  - Multiple tabs for balance, spending analysis, reports
  - Category breakdown and comparison charts

#### `/Users/long.lnt/Desktop/Projects/FairPay/src/pages/person-debt-breakdown.tsx`
- **Purpose**: Individual debt breakdown page for a specific counterparty
- **Key Usage**: Navigate from balance table to see detailed debt with one person

### Balance Display Components

#### `/Users/long.lnt/Desktop/Projects/FairPay/src/components/dashboard/balance-summary.tsx`
- **Purpose**: Summary cards showing three metrics
- **Displays**: 
  - "You Owe" (TrendingDown icon, red)
  - "Owed to You" (TrendingUp icon, green)
  - "Net Balance" (Minus icon)
- **Formatting**: Uses `formatCurrency()` utility with Vietnamese locale
- **Props**: `totalOwed`, `totalOwedToMe`, `netBalance`

#### `/Users/long.lnt/Desktop/Projects/FairPay/src/components/dashboard/BalanceTable.tsx`
- **Purpose**: Paginated table of all balance relationships
- **Key Features**:
  - Displays counterparty avatar, name, amount, currency
  - Shows payment state (unpaid/partial/paid) badges
  - Expandable rows for transaction details
  - Mobile and desktop versions
  - Pagination controls (configurable page size)
- **Props Interface**: `Balance[]` with amounts, currencies, payment states
- **Uses**: `formatCurrency()`, `PaymentStateBadge`, `getOweStatusColors()`

#### `/Users/long.lnt/Desktop/Projects/FairPay/src/components/dashboard/simplified-debts.tsx`
- **Purpose**: Shows simplified "who owes whom" view
- **Key Features**:
  - Pagination support (default 10 items per page)
  - User avatars with names
  - "Who Owes Whom" directional display
  - Action buttons to navigate to details
  - Loading skeleton state
- **Props**: `debts: AggregatedDebt[]`, `isLoading`, `pageSize`
- **Uses**: `formatNumber()` from locale-utils

#### `/Users/long.lnt/Desktop/Projects/FairPay/src/components/dashboard/balance-summary-cards.tsx`
- **Purpose**: Card-based summary display (alternative to table)

---

## 3. CURRENCY FORMATTING & UTILITIES

### Main Format Utilities

#### `/Users/long.lnt/Desktop/Projects/FairPay/src/lib/format-utils.ts`
- **Purpose**: Comprehensive formatting utilities for currency, dates, numbers
- **Key Exports**:

**Currency Functions**:
- `formatCurrency(amount, currency, options)` - Main function supporting:
  - VND, USD, EUR, GBP, JPY, CNY, KRW, THB, SGD
  - Configurable decimals per currency (VND: 0, USD: 2, etc.)
  - Compact notation for large numbers (1K, 1.5M)
  - Sign display options (auto, always, never)
  - Symbol placement (₫ suffix for VND, $ prefix for USD)
  
- `formatNumber(num, locale, options)` - Locale-aware number formatting
- `parseCurrency(str, currency)` - Parse formatted currency back to number
- `SUPPORTED_CURRENCIES` constant with all currency configs

**Currency Configuration**:
```typescript
VND: { symbol: '₫', decimals: 0, locale: 'vi-VN' }
USD: { symbol: '$', decimals: 2, locale: 'en-US' }
EUR: { symbol: '€', decimals: 2, locale: 'de-DE' }
... (9 currencies total)
```

**Date Functions**:
- `formatDate(date, formatPattern, language)` - DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD formats
- `formatDateTime(date, pattern, language)` - Date with HH:mm time
- `formatRelativeDate(date, language)` - "2 hours ago", "yesterday", etc.
- `parseDate(dateStr, pattern)` - Parse date string to Date object
- `formatPercentage(value, decimals)` - Percentage formatting

**Other Utilities**:
- `formatFileSize(bytes)` - B, KB, MB, GB, TB
- `truncateText(text, maxLength)` - Truncate with ellipsis
- `formatPhoneNumber(phone)` - Vietnamese phone formatting

**Key Features**:
- Locale-specific formatting using `Intl.NumberFormat`
- Supports English and Vietnamese language variants
- Error handling with sensible fallbacks
- Consistent rounding (2 decimals for most currencies, 0 for VND/JPY/KRW)

### Locale-Specific Utilities

#### `/Users/long.lnt/Desktop/Projects/FairPay/src/lib/locale-utils.ts` (if exists)
- Referenced in `simplified-debts.tsx` import: `formatNumber from "@/lib/locale-utils"`
- Likely contains locale-specific number formatting

---

## 4. SUPABASE BACKEND FUNCTIONS

### Public Debt API Functions

#### `/Users/long.lnt/Desktop/Projects/FairPay/supabase/functions/get-user-debt/index.ts`
- **Purpose**: Deno edge function for public API access to debt data
- **Endpoint**: `/functions/v1/get-user-debt`
- **Authentication**: API secret-based (not Supabase auth)
- **Parameters**: `user_id` (UUID), `secret` (token)
- **Calls**: Supabase RPC `get_user_debt_by_secret(p_user_id, p_secret_token)`
- **Response Structure**: `DebtResponse` with:
  - User metadata (id, name, email)
  - Aggregated amounts (total_owed_to_me, total_i_owe, net_balance)
  - Debts by person (with remaining/settled amounts, transaction counts)
  - Debts by group (group name, group avatar, net balances)
  - Settlement summary (counts and amounts)
- **CORS**: Enabled for all origins
- **Validation**: UUID format check, required parameter validation

#### `/Users/long.lnt/Desktop/Projects/FairPay/supabase/functions/all-users-debt-summary/index.ts`
- **Purpose**: Deno edge function for public leaderboard of all users
- **Endpoint**: `/functions/v1/all-users-debt-summary`
- **Calls**: Supabase RPC `get_all_users_debt_summary(p_limit, p_offset)`
- **Parameters**: `limit` (max 100), `offset` (pagination)
- **Response**: Paginated list with user_id, full_name, net_balance
- **CORS**: Enabled for all origins

#### `/Users/long.lnt/Desktop/Projects/FairPay/supabase/functions/all-users-debt-detailed/index.ts`
- **Purpose**: Detailed breakdown of all users' debts (if used)

#### `/Users/long.lnt/Desktop/Projects/FairPay/supabase/functions/process-recurring-expenses/index.ts`
- **Purpose**: Background job for recurring expense processing

### Supporting Supabase Migrations (Debt-Related)

#### Key Database Functions (from migrations):
- **`get_user_debts_aggregated`** - Fetch current aggregated debts for authenticated user
- **`get_user_debts_history`** - Fetch historical debts including settled transactions
- **`get_user_debts_public`** - Fetch debts for unauthenticated public demo
- **`get_user_debt_by_secret`** - Verify API secret and return debt data
- **`get_all_users_debt_summary`** - Leaderboard of all users with net balance
- **`simplify_group_debts`** - Min-Cost Max-Flow algorithm for group debt simplification
- **`settle_split`** - Mark expense split as settled
- **`settle_all_splits_for_user`** - Settle all splits for a specific user

**Migration Files**:
- `/Users/long.lnt/Desktop/Projects/FairPay/supabase/migrations/20260109100000_add_currency_to_debt_functions.sql` - Add currency support
- `/Users/long.lnt/Desktop/Projects/FairPay/supabase/migrations/20260109130000_update_debt_functions_currency.sql` - Currency column updates
- `/Users/long.lnt/Desktop/Projects/FairPay/supabase/migrations/20260206100000_create_public_debt_api_system.sql` - Public API setup
- `/Users/long.lnt/Desktop/Projects/FairPay/supabase/migrations/20260206120000_create_all_users_debt_endpoints.sql` - Endpoints for all users

---

## 5. UTILITY & API CLIENT

#### `/Users/long.lnt/Desktop/Projects/FairPay/src/utility/debt-api-client.ts`
- **Purpose**: Client class for interacting with public debt API
- **Key Methods**:
  - `createSecret(label?)` - Generate new API secret
  - `listSecrets()` - List all user's secrets
  - `revokeSecret(secretId)` - Revoke a secret
  - `fetchDebtData(userId, secret, options)` - Call get-user-debt endpoint
  - `getPublicShareLink(userId, secret)` - Generate shareable URL
  - `getApiEndpoint(baseUrl)` - Get endpoint URL
  - `formatDebtData(data)` - Format response for display
- **Response Types**: Uses `DebtApiResponse`, `UserDebtData` types
- **Singleton Export**: `debtApiClient` instance

#### `/Users/long.lnt/Desktop/Projects/FairPay/src/utility/supabaseClient.ts`
- **Purpose**: Supabase client initialization

---

## 6. TYPE DEFINITIONS

#### `/Users/long.lnt/Desktop/Projects/FairPay/src/types/api-debt.ts`
- **Purpose**: Types for public debt API consumption
- **Key Interfaces**:
  - `DebtByPerson` - Individual debt to/from one person
  - `DebtInGroup` - Debt relationship within a group
  - `DebtByGroup` - Aggregated debt at group level
  - `SettlementSummary` - Summary of settled vs unsettled
  - `UserDebtData` - Complete user debt snapshot
  - `DebtApiResponse` - API response wrapper
  - `ApiSecret`, `CreateApiSecretResponse` - Secret management

#### `/Users/long.lnt/Desktop/Projects/FairPay/src/types/all-users-debt.ts`
- **Purpose**: Types for all-users-debt endpoints

---

## 7. ADDITIONAL DASHBOARD COMPONENTS

### Balance-Related Components

- `/Users/long.lnt/Desktop/Projects/FairPay/src/components/dashboard/BalanceFeed.tsx` - Feed view of balance changes
- `/Users/long.lnt/Desktop/Projects/FairPay/src/components/dashboard/BalanceRow.tsx` - Individual balance row
- `/Users/long.lnt/Desktop/Projects/FairPay/src/components/dashboard/balance-summary-cards.tsx` - Card summary layout
- `/Users/long.lnt/Desktop/Projects/FairPay/src/components/dashboard/balance-table-row-expandable.tsx` - Expandable row with details

### Supporting Components

- `/Users/long.lnt/Desktop/Projects/FairPay/src/components/dashboard/SimplifiedDebtsToggle.tsx` - Toggle simplified view
- `/Users/long.lnt/Desktop/Projects/FairPay/src/components/dashboard/DashboardTopCards.tsx` - Top metric cards
- `/Users/long.lnt/Desktop/Projects/FairPay/src/components/dashboard/activity-summary.tsx` - Activity statistics
- `/Users/long.lnt/Desktop/Projects/FairPay/src/components/dashboard/enhanced-activity-list.tsx` - Activity log
- `/Users/long.lnt/Desktop/Projects/FairPay/src/components/dashboard/DashboardStates.tsx` - Loading/empty states
- `/Users/long.lnt/Desktop/Projects/FairPay/src/components/dashboard/welcome-header.tsx` - Header section
- `/Users/long.lnt/Desktop/Projects/FairPay/src/components/dashboard/quick-actions.tsx` - Action buttons

### Debt Status Components

- `/Users/long.lnt/Desktop/Projects/FairPay/src/components/groups/debt-status-badge.tsx` - Status indicator
- `/Users/long.lnt/Desktop/Projects/FairPay/src/components/debts/debt-breakdown-header.tsx` - Debt page header

---

## 8. ARCHITECTURAL PATTERNS

### Debt Aggregation Flow

```
Database (Supabase)
    ↓
RPC Functions (get_user_debts_aggregated, get_user_debts_history, simplify_group_debts)
    ↓
React Hooks (useAggregatedDebts, useSimplifiedDebts, useDebtSummary)
    ↓
UI Components (BalanceTable, SimplifiedDebts, BalanceSummary)
    ↓
Formatting (formatCurrency, formatNumber)
    ↓
Display
```

### Real-Time Updates

- `useAggregatedDebts` subscribes to:
  - `expenses` table changes
  - `expense_splits` table changes
- 500ms debounce to avoid excessive re-renders
- 30-second stale time for visibility-based refetch

### Netting & Bilateral Debt Logic

- **Net Balance**: `Amount They Owe Me - Amount I Owe Them`
- **Direction Flag**: `i_owe_them` boolean (true if net negative)
- **Absolute Amount**: `Math.abs(netAmount)` for display
- **Netting**: Database RPC functions handle netting at aggregation level
- **Simplification**: `simplify_group_debts` reduces multi-party transactions

### Currency Handling

- Default: VND (Vietnamese Dong)
- All amounts carry currency code in responses
- Formatting rules per currency (decimals, symbol placement, locale)
- Parser handles locale-specific separators (comma vs period)

---

## 9. KEY DATA FLOWS

### For Balance Summary Card Display
1. User visits dashboard
2. `useAggregatedDebts()` fetches from `get_user_debts_aggregated`
3. Data includes `total_owed_to_me`, `total_i_owe`, `currency`
4. Components calculate `netBalance = totalOwedToMe - totalI Owe`
5. `formatCurrency()` formats each value
6. Display with appropriate icons/colors (red for owe, green for owed)

### For "Who Owes Whom" Simplified View
1. User toggles simplified debts view
2. `useSimplifiedDebts(groupId)` calls `simplify_group_debts` RPC
3. Returns minimal list of direct payments needed
4. `SimplifiedDebts` component renders with direction arrows
5. Click to navigate to settlement

### For Public API Access
1. User generates API secret via `debtApiClient.createSecret()`
2. Secret stored in database via `create_api_secret` RPC
3. Third party calls `/functions/v1/get-user-debt?user_id=X&secret=Y`
4. Edge function validates secret via `get_user_debt_by_secret` RPC
5. Returns complete debt snapshot with all categories

---

## 10. ROUNDING & PRECISION

- **Currency Rounding**: 2 decimal places for most currencies (USD, EUR, etc.)
- **VND/JPY/KRW**: 0 decimal places (whole numbers)
- **Floating Point Tolerance**: 0.01 threshold for zero-balance detection
- **Debt Simplification**: Rounds intermediate calculations to 2 decimals with `Math.round(amount * 100) / 100`

---

## File Count Summary

| Category | Count | Key Files |
|----------|-------|-----------|
| Debt Hooks | 3 | use-debt-summary, use-aggregated-debts, use-simplified-debts |
| Dashboard Pages | 3 | dashboard, balances, person-debt-breakdown |
| Balance Components | 7+ | BalanceTable, BalanceSummary, SimplifiedDebts, BalanceFeed, etc. |
| Supabase Functions | 4 | get-user-debt, all-users-debt-summary, etc. |
| Format Utilities | 1 | format-utils.ts (comprehensive) |
| Type Definitions | 2 | api-debt.ts, all-users-debt.ts |
| Database Migrations | 15+ | Debt function migrations |
| Supporting Components | 10+ | Activity, status, navigation, etc. |

**Total: 30+ files directly related to debt summary, currency formatting, and debt calculation**

---

## Unresolved Questions

None identified - codebase is well-documented and comprehensive.

