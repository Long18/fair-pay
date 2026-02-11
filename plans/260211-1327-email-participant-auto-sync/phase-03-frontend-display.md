# Phase 3: Frontend Display of Email Debts

## Context
- `useAggregatedDebts` hook returns `AggregatedDebt[]` with `counterparty_id UUID`
- Dashboard components (`BalanceFeed`, `BalanceRow`) expect UUID-based counterparties
- Need: Display email-based counterparties with distinctive visual treatment

## Implementation Steps

### 3.1 Update `AggregatedDebt` type
File: `src/hooks/use-aggregated-debts.ts`
```typescript
export interface AggregatedDebt {
    counterparty_id: string;       // Can be empty for email participants
    counterparty_email?: string;   // NEW: email for pending participants
    counterparty_name: string;
    // ... rest unchanged
}
```

### 3.2 Update `useAggregatedDebts` hook
- Pass through `counterparty_email` from RPC response
- Skip avatar fetch for entries where `counterparty_id` is null/empty

### 3.3 Update `BalanceRow` component
File: `src/components/dashboard/BalanceRow.tsx`
- Detect email participant: `!debt.counterparty_id && debt.counterparty_email`
- Show mail icon instead of avatar
- Show "Pending" badge
- Disable "settle" and "view profile" actions for email participants
- Show email as display name

### 3.4 Update `BalanceFeed` component
File: `src/components/dashboard/BalanceFeed.tsx`
- Handle click on email participant row (no navigation, show tooltip/info)

### 3.5 Update person debt breakdown page
File: `src/pages/person-debt-breakdown.tsx`
- Handle case where counterparty_id is null (email participant)
- Show email instead of profile name

## Visual Design
- Email participants: amber/yellow border (consistent with ParticipantChips)
- Mail icon (MailIcon) instead of avatar
- "Pending" badge next to name
- Tooltip: "This person hasn't joined yet. They'll see this debt when they sign up."

## Related Files
- `src/hooks/use-aggregated-debts.ts`
- `src/components/dashboard/BalanceRow.tsx`
- `src/components/dashboard/BalanceFeed.tsx`
- `src/pages/person-debt-breakdown.tsx`

## Success Criteria
- [ ] Email participants visible in dashboard balance feed
- [ ] Distinctive visual treatment (mail icon, pending badge, amber styling)
- [ ] No crashes when counterparty_id is null
- [ ] Settled/profile actions disabled for email participants
