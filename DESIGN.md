# UI design contract

Agents and skills read this file before changing UI. Hand-edits are fine; when this file disagrees with code, **code wins**.
Detailed rules live under [docs/design-system/](docs/design-system/README.md); this file only records product decisions.

## Product

- **Product:** FairPay — shared expenses and balances among friends and groups.
- **Users:** Friend groups, families, roommates (Vietnam-first); admins/moderators for operations.
- **Core jobs:** Log expenses, see who owes whom, record payments and settlements.
- **Platforms:** Mobile-first client; admin mostly desktop.
- **Copy:** i18n `vi` / `en` (`src/locales/*.json`, admin `src/modules/admin/i18n.ts`) — no hardcoded user-facing strings.

## Visual system

- **Mode:** Keep existing FairPay brand (colors, logo, fonts) when redesigning screens.
- **Stack:** Vite + React 19, Tailwind v4, shadcn/Radix (`src/components/ui/`), recharts, react-day-picker.
- **Tokens:** `src/App.css` (`@theme inline`, `:root`, `.dark`); user palettes via `src/lib/theme-palettes`.
- **Accent:** `--primary` (default teal/cyan palettes); status `--status-*`; debt `--semantic-negative|positive`.
- **Type:** Google Sans Flex (UI), JetBrains Mono (amounts, codes); amounts use `--font-size-amount-*`.
- **Radius:** `--radius` 0.75rem (cards `rounded-xl`).
- **Surfaces:** Mixed glass headers and selective gradients/shadows; in-page cards default **flat** (border, no shadow); use `interactive` / `elevation="elevated"` when chrome must float.
- **Dark mode:** Theme provider (`src/components/refine-ui/theme/`).
- **Chrome:** Client `PageContainer` + `PageHeader`; admin `AdminPageHeader`, `AdminTabs`, `AdminMetricCard`.

## Constraints

- Keep FairPay brand tokens; significant visual changes should be reviewed against screenshots before merge.
- Do not change auth/RLS, Polar billing, settle/payment RPCs, or production migrations for UI-only work.

## Evon / redesign tracking

- No screens are marked complete under the evon redesign program yet.
