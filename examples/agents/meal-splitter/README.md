# Meal Splitter Agent

Splits a restaurant bill equally among group members.

## How It Works

1. **Parse input** — Agent receives: `"Lunch at Bún Chả Hà Nội, 450,000 VND for Weekend Squad"`
2. **Find group** — Looks up "Weekend Squad" among the actor's groups
3. **Get members** — Fetches registered members of the group
4. **Check duplicates** — Verifies this is not a duplicate expense
5. **Create preview** — Computes equal split (450,000 / 3 members = 150,000 each), stores immutable preview
6. **Poll for confirmation** — Agent polls every 2 seconds until user confirms in FairPay app (max 5 minutes)
7. **Commit** — Once confirmed, atomically writes the expense + splits to the database

## Running

```bash
export FAIRPAY_BASE_URL="https://your-project.supabase.co/functions/v1/fairpay-agent-api"
export FAIRPAY_TOKEN="your-supabase-jwt-token"

node examples/agents/meal-splitter/index.ts
```

## Example Input

```
Lunch at Bún Chả Hà Nội, 450,000 VND for Weekend Squad
```

## Output

```
✓ User: user@example.com
✓ Group: Weekend Squad (id: abc123...)
✓ Members: 3 (Thành Long, Hoa Nguyễn, Minh Trần)
✓ Duplicate check: No matches
✓ Preview created: id=xyz789..., hash=abc...
  - Bún Chả Hà Nội, 450,000 VND
  - Thành Long: 150,000 VND
  - Hoa Nguyễn: 150,000 VND
  - Minh Trần: 150,000 VND

⏳ Waiting for user to confirm in FairPay app...
   (Check Expenses tab, click "Confirm" on the preview)

✓ Preview confirmed by user
✓ Expense committed: id=exp456...
```

## Notes

- Agent is idempotent — can retry on network failure using the same `idempotency_key`.
- Previews expire after 24 hours; user must confirm before expiry.
- All amounts are in **integer VND** — no decimals.
- Group name matching is case-insensitive, substring search.
