# UI/UX Remediation PR Roadmap

**Source audit:** Full UI/UX Audit — FairPay (Client + Admin)  
**First slice locked:** Foundation (PR-1)  
**Status:** PR-1…PR-5 largely done; PR-6 scoped work done (docs / badge i18n / prune). Broader C11/A7 i18n sweep may continue separately.

Canonical target and inventory IDs (`F*`, `C*`, `A*`) match the audit plan. North stars: [shadcn/ui](https://ui.shadcn.com/), Tailwind v4 tokens in `src/App.css`, docs in this folder.

---

## PR-1 — Foundation (DONE)

**Goal:** Unblock visual consistency everywhere (icons, tabs gap, DevTool grid, token bugs).

| ID | File(s) | Change | Acceptance criteria |
|----|---------|--------|---------------------|
| F1 | [`src/components/ui/icons.tsx`](../../src/components/ui/icons.tsx) | Remove Lucide `fill="currentColor"` from wrappers; keep intentional custom-SVG fills (e.g. clock-face dot) | Lucide icons render stroke-only by default; callers may pass `fill` via props when intentional; admin/client nav icons visually match weight |
| F2 | [`src/components/ui/tabs.tsx`](../../src/components/ui/tabs.tsx) | Remove wrapping `<span className="relative z-10">`; drop unused `relative` on trigger | Icon + label siblings receive `gap-1.5`; People/Transactions/DevTool tab triggers show clear icon–label spacing |
| F5 | [`src/modules/admin/pages/AdminDevTool.tsx`](../../src/modules/admin/pages/AdminDevTool.tsx) | Replace ``sm:grid-cols-${n}`` with static `sm:grid-cols-5` / `sm:grid-cols-6` via conditional class | With API docs off, desktop TabsList is 5 columns; with `VITE_ENABLE_ADMIN_API_DOCS=true`, 6 columns; no dynamic Tailwind class strings |
| F6 | [`src/App.css`](../../src/App.css) | Scrollbar use `var(--border)` (not nested `oklch(var(--border))`); glow utilities use `color-mix(in oklch, var(--primary) …)` | Scrollbars theme-aware; hover glow uses brand primary (not green fallback) |

**Verify:** Spot-check `/admin/people`, `/admin/devtool`, `/connections` icons + tabs. Light + dark theme scrollbar + card hover glow.

---

## PR-2 — Shared primitives (DONE)

**Goal:** One chrome API for client + admin so later migrations are mechanical.

| Deliverable | Path | Acceptance criteria |
|-------------|------|---------------------|
| Wire `PageHeader` | [`src/components/ui/page-header.tsx`](../../src/components/ui/page-header.tsx) | Document as required for list/settings pages; uses `typography-page-title` |
| Tabs CVA variants | extend [`src/components/ui/tabs.tsx`](../../src/components/ui/tabs.tsx) | `variant="pill"` (default muted) and `variant="underline"`; at most these two styles app-wide |
| `AdminPageHeader` | `src/modules/admin/components/AdminPageHeader.tsx` | Props: `title`, `description?`, `actions?`, `density?: "page" \| "section"` |
| `AdminTabs` | `src/modules/admin/components/AdminTabs.tsx` | Optional `?tab=` sync, optional icons, mobile `Select` fallback, **static** grid class maps only |
| `AdminMetricCard` (+ grid) | `src/modules/admin/components/AdminMetricCard.tsx` | Variants cover Overview / Marketing / Journey / UTM / AgentOps; deprecate unused `AdminStatCard` or re-export through this |

**Out of scope for PR-2:** Migrating every page (that is PR-3+).

---

## PR-3 — Screenshot + high-traffic surfaces (DONE)

**Goal:** Fix the reported bug UIs and daily paths using PR-2 primitives.

| Surface | Files | Acceptance criteria |
|---------|-------|---------------------|
| Connections | [`src/pages/connections.tsx`](../../src/pages/connections.tsx) | `PageHeader` with title + actions; shadcn Tabs (pill); no empty left spacer; no custom pill strip |
| Client layout spacing | [`layout.tsx`](../../src/components/refine-ui/layout/layout.tsx), [`page-container.tsx`](../../src/components/ui/page-container.tsx) | Single owner of horizontal gutters; top offset matches nav height (no large empty band under bar) |
| NavBar | [`navbar.tsx`](../../src/components/refine-ui/layout/navbar.tsx) | Unified inactive/active styles desktop ↔ mobile; language control aligned with icon cluster |
| Admin People | [`AdminPeople.tsx`](../../src/modules/admin/pages/AdminPeople.tsx), ModeratorPeople | `AdminPageHeader` + `AdminTabs` (URL sync + mobile Select); icons consistent stroke weight |
| Admin Marketing | [`AdminMarketing.tsx`](../../src/modules/admin/pages/AdminMarketing.tsx) | Header via i18n; `AdminTabs` + mobile Select; KPIs via `AdminMetricCard`; section → cards spacing uses `space-y-6` / `gap-4` |
| Admin DevTool shell | [`AdminDevTool.tsx`](../../src/modules/admin/pages/AdminDevTool.tsx) | Title **above** tabs (not cramped beside on desktop); i18n tab labels; embedded tools use section density (no nested page `h1`) |

---

## PR-4 — Client chrome sweep (DONE)

| ID | Work | Acceptance criteria |
|----|------|---------------------|
| C5 + C8 | `PageContainer` + `PageHeader` on authenticated pages missing them (settings, payment/expense show, edit group, etc.) | No ad-hoc `text-2xl\|3xl\|4xl` page titles; all use typography tokens |
| Tabs | Migrate dashboard, debt-filter, chat micro-tabs to shadcn / ToggleGroup | Zero custom pill tab strips on primary pages |
| Balances | One TabsList variant family (pill or underline via CVA) | No dual tab styles on one page |
| Detail tabs | Profile / Friend / Group show | Short labels visible from `sm+` (not only `lg`) |
| C7 | Consolidate empties onto `@/components/ui/empty` / single `EmptyState` | One empty visual system; emoji-only empties removed or wrapped |
| F3 F4 | Replace `text-gray-*` / raw green-red money colors | Dark mode safe; semantic/status tokens for balances |

---

## PR-5 — Admin surface sweep (DONE)

| ID | Work | Acceptance criteria |
|----|------|---------------------|
| A3 A4 | `AdminTabs` on People, Transactions, Marketing, DevTool, Journey | URL sync + mobile Select everywhere tabs exist |
| A5 | Migrate all KPI cards to `AdminMetricCard` | No local `SimpleStatCard` / duplicate `MetricCard` |
| A6 | Delete orphans: `AdminGrowth.tsx`, `AdminRetention.tsx`, duplicate `pages/AdminNotifications.tsx` | Confirm redirects still work; no dead imports |
| A8 | Reactions: always-visible row actions + mobile cards; Notifications: mobile cards | Touch-usable; matches Transactions pattern |
| Nested tools | OgPreview / UTM / Audit / AgentOps / ApiDocs | Section headers when embedded; remove double `container` on ApiDocs |

---

## PR-6 — i18n + docs + prune (DONE for scoped work)

| Work | Acceptance criteria | Status |
|------|---------------------|--------|
| i18n badge states | `PaymentStateBadge` / `DebtStatusBadge` use `t()` | Done |
| Docs refresh | README / component-rules / layout-rules / this file | Done |
| Prune unused UI | Dead primitives deleted (see report); kept accordion + action-button-group (tests); Flip/Liquid stubs left | Done |
| Icon policy | Documented stroke default; fill via props | Done |
| Reports | `/reports` → `/balances` redirect kept; dead `reports.tsx` left in place | Done (no invest) |

---

## Suggested merge order

```text
PR-1 Foundation  →  PR-2 Primitives  →  PR-3 High-traffic
                                      ↘ PR-4 Client (can parallel after PR-2)
                                      ↘ PR-5 Admin  (can parallel after PR-2)
                   PR-6 Docs/i18n/prune (after PR-4 + PR-5 land)
```

---

## Out of scope (unchanged from audit)

- New brand / visual redesign  
- Email HTML design system (`email-design-system.ts`)  
- Product IA choice: BottomNavigation — decision recorded above (deleted unused)
