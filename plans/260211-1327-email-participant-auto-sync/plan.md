# Email Participant Auto-Sync Implementation Plan

## Overview
Support unregistered email participants in expenses with auto-sync on first login.

## Current State
- DB schema ready: `pending_email`, `is_claimed`, nullable `user_id` on `expense_splits`
- Frontend form ready: email input, pending badges, split creation with `pending_email`
- Settlement functions handle NULL `user_id` gracefully

## Gap Analysis
| Gap | Impact | Fix |
|-----|--------|-----|
| `get_user_debts_aggregated` excludes `user_id IS NULL` | Pending email debts invisible in dashboard | Modify SQL function |
| No claim function | Can't convert email→user on registration | Create SQL function |
| No registration trigger | Auto-sync doesn't happen | Create DB trigger |
| Frontend can't render email counterparties | Dashboard broken for email debts | Update types, hooks, components |

## Phases

| # | Phase | Status | Details |
|---|-------|--------|---------|
| 1 | [DB: Auto-Claim Function & Trigger](./phase-01-db-claim-function.md) | Pending | Core auto-sync mechanism |
| 2 | [DB: Include Email Debts in Aggregation](./phase-02-db-debt-aggregation.md) | Pending | Make email debts visible |
| 3 | [Frontend: Display Email Debts](./phase-03-frontend-display.md) | Pending | Render email participants in dashboard |
| 4 | [Verification & Testing](./phase-04-verification.md) | Pending | End-to-end validation |

## Risk Assessment
- **Low risk**: DB changes are additive (new function, trigger, column in return type)
- **Medium risk**: Modifying `get_user_debts_aggregated` — used by dashboard, must not break existing UUID-based debts
- **Mitigation**: New migration file, test with existing data before deploying
