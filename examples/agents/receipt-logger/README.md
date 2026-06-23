# Receipt Logger Agent

Logs a receipt with exact, itemized split amounts.

## How It Works

1. **Parse structured input** — Agent receives: itemized receipt with member names and amounts
2. **Resolve member names** — Maps member names (display names) to `member_id` in the group
3. **Check duplicates** — Verifies this is not a duplicate expense
4. **Create preview** — Stores immutable preview with exact splits
5. **Poll for confirmation** — Agent polls until user confirms in FairPay app (max 5 minutes)
6. **Commit** — Once confirmed, atomically writes the expense + splits

## Running

```bash
export FAIRPAY_BASE_URL="https://your-project.supabase.co/functions/v1/fairpay-agent-api"
export FAIRPAY_TOKEN="your-supabase-jwt-token"

node examples/agents/receipt-logger/index.ts
```

## Example Input

```json
{
  "group_name": "Weekend Squad",
  "description": "Dinner at Quán Ơi (Tiramisu)",
  "splits": [
    { "member_name": "Thành Long", "amount_vnd": 250000 },
    { "member_name": "Hoa Nguyễn", "amount_vnd": 280000 },
    { "member_name": "Minh Trần", "amount_vnd": 220000 }
  ]
}
```

## Output

```
📄 Receipt: Dinner at Quán Ơi (Tiramisu)
✓ Group: Weekend Squad
✓ Resolved members:
  - Thành Long → member_abc...
  - Hoa Nguyễn → member_def...
  - Minh Trần → member_ghi...
✓ Duplicate check: No matches
✓ Preview created: id=xyz789...
  - Thành Long: 250,000 VND
  - Hoa Nguyễn: 280,000 VND
  - Minh Trần: 220,000 VND
  - Total: 750,000 VND

⏳ Waiting for user to confirm...
✓ Preview confirmed
✓ Expense committed: id=exp456...
```

## Notes

- Member names are case-insensitive, substring search — "thành" matches "Thành Long"
- All amounts must be integers (VND) — no decimals
- Total is automatically calculated; splits must sum exactly
- Agent is idempotent and safe to retry
