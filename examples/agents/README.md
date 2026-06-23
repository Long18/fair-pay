# FairPay Agent Examples

Minimal, runnable examples showing how AI agents can create group expenses via the FairPay Agent API.

## Overview

These examples demonstrate:
- **meal-splitter**: Splits a restaurant bill equally among group members
- **receipt-logger**: Logs a receipt with exact, itemized split amounts

Each agent creates a preview of the expense, which the user confirms in the FairPay app. The agent polls until the expense is confirmed/committed or expires.

## Prerequisites

- **Node.js 18+**
- **FairPay account** with at least one group
- **Environment variables:**
  - `FAIRPAY_BASE_URL`: Base URL of the Agent API (e.g., `https://project-ref.supabase.co/functions/v1/fairpay-agent-api`)
  - `FAIRPAY_TOKEN`: Supabase JWT token for authentication

## Setup

```bash
# Clone the FairPay repo
git clone <repo>
cd fairpay/examples/agents

# Install dependencies
npm install

# Set environment variables
export FAIRPAY_BASE_URL="https://your-project.supabase.co/functions/v1/fairpay-agent-api"
export FAIRPAY_TOKEN="your-supabase-jwt-token"
```

## Workflow

1. **Agent creates a preview** — validates expense, computes splits, stores immutable preview server-side
2. **User confirms in FairPay app** — navigates to Expenses, clicks "Confirm" on the preview
3. **Agent polls for confirmation** — checks the preview status until confirmed or expired
4. **Expense committed** — once confirmed, the agent commits the expense atomically

## Running Examples

```bash
# Split a restaurant bill equally
node meal-splitter/index.ts

# Log a receipt with exact splits
node receipt-logger/index.ts
```

## Important Notes

- **All money is in integer VND.** Do not use decimals.
- **member_id always refers to `group_members.id`**, never `profiles.id`.
- **Previews expire after 24 hours.** The agent must poll and confirm before expiry.
- **Single-use confirmations.** Once a preview is confirmed, it cannot be re-confirmed.
- **Idempotent commits.** Safe to retry on network failure using the same idempotency key.

## API Contract

See `docs/openapi-agent-api-v1.yaml` for the full OpenAPI specification.

### Key Routes

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/v1/me` | Get authenticated user profile |
| GET | `/v1/groups` | List actor's non-archived groups |
| GET | `/v1/groups/{group_id}/members` | List group members |
| POST | `/v1/expense-duplicate-checks` | Check for duplicate expenses |
| POST | `/v1/expenses/preview` | Create immutable preview |
| GET | `/v1/operations/{preview_id}` | Poll operation status |
| POST | `/v1/previews/{preview_id}/confirm` | Confirm preview (UI only) |
| POST | `/v1/expenses/commit` | Commit expense + splits |
