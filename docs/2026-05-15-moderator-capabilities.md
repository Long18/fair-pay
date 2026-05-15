# Moderator capability layer

FairPay now treats `moderator` as a staff role with explicit capabilities, not as a reduced admin clone.

## Capability matrix

| Surface | Admin | Moderator |
| --- | --- | --- |
| `/admin` entry | Yes | Yes |
| Overview | Full | Sanitized KPI-only |
| People | Full CRUD + roles + tracking | Read all, edit `full_name` + `avatar_url` only |
| Transactions | Full | Create/edit own, never delete |
| Groups | Full | Read-only; hidden when archived by a system admin |
| Reactions | CRUD | CRUD |
| Tracking / audit / devtool | Yes | No |

## Schema notes

- `user_roles.role` accepts `admin`, `moderator`, and `user`.
- Shared helpers: `has_role`, `is_admin`, `is_moderator`, `is_staff`.
- Moderator profile edits flow through `moderator_update_profile_basic(...)`.
- Moderator-created expense payouts resolve through `get_expense_payout_recipient(...)` so Bank/VietQR points at the moderator's own `user_settings.bank_info`.

## Drift note

On May 15, 2026, the linked remote migration history was still behind local by:

- `20260501090000_utm_attribution_pipeline.sql`
- `20260505090000_utm_config_canvas.sql`
- `20260509043631_admin_placeholder_profiles.sql`

`src/types/database.ts` was refreshed from the linked remote schema on the same date. After the pending local migrations plus `20260515082018_add_moderator_capabilities.sql` are applied remotely, regenerate the type snapshot again with:

```bash
supabase gen types typescript --linked > src/types/database.ts
```
