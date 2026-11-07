# FairPay motion system

Central motion tokens and shell patterns adapted from scroll-driven marketing sites into a finance UI: short fades, no decorative loops, GSAP reserved for the dashboard pond hero.

## Package layout

| Path | Role |
| --- | --- |
| `src/lib/motion/tokens.ts` | Durations (ms/s), easing tuples, shell transition; re-exports `src/lib/animation.ts` springs |
| `src/lib/motion/reduced-motion.ts` | `useReducedMotion`, `instantIfReduced`, shell enter helpers |
| `src/lib/motion/MotionPageShell.tsx` | Client/admin page wrapper |
| `src/lib/motion/SkeletonCrossFade.tsx` | 200ms skeleton → content cross-fade |
| `src/lib/motion/index.ts` | Public import: `@/lib/motion` |
| `src/lib/motion/ScrollReveal.tsx` | GSAP scroll-linked opacity + translate (tokenized) |
| `src/lib/motion/StaggerChildren.tsx` | Staggered child reveals (cap 8) |
| `src/lib/motion/first-paint.ts` | Full document load detection + shell pacing |
| `src/lib/motion/gsap-scroll.ts` | One-time ScrollTrigger registration |
| `src/App.css` | CSS variables `--animation-duration-*`, keyframes, reduced-motion overrides |
| `src/styles/viewport-transitions.css` | Breakpoint morph (grid/gap/padding) |

Legacy entry `src/lib/animation.ts` remains for `Button`, FAB, stagger hooks — new code should import springs from `@/lib/motion`.

## Shell strategy (one tree, no double fade)

| Surface | Shell | Route transition |
| --- | --- | --- |
| **Client** | `Layout` → single `<MotionPageShell>` wrapping `<AnimatedOutlet />` (mount once; not per page) | `AnimatedOutlet` (`SHELL_TRANSITION` + reduced motion) |
| **Admin** | Each top-level admin route page wraps content in `<MotionPageShell>` (optional `loading`) | `AdminLayout` → `AnimatedOutlet` only |

Do **not** add `MotionPageShell` inside individual client pages — layout already owns the shell.

## Shipped exemplars

- **Client:** `src/components/refine-ui/layout/layout.tsx` + `src/components/animated-outlet.tsx`
- **Admin:** all routed pages (`AdminOverview` … `AdminUserJourney`, `ModeratorPeople`)
- **Skeleton cross-fade:** `BalanceRecentTransactionsPreview` via `SkeletonCrossFade`
- **Stagger cap 8 (client):** `use-stagger-animation` default, `AnimatedList`, `StaggerChildren`
- **Stagger cap 15 (admin tables):** `data-table`, audit logs, marketing KPI rows

## Do not migrate blindly

- **GSAP pond:** `src/components/pond-hero/DashboardPondReveal.tsx` — scroll-scrubbed reveal; keep isolated under `GSAPProvider`.
- **Radix/shadcn:** `animate-in` / `animate-out` on dialogs — out of scope unless spec requires unification.
- **Embedded admin devtool tabs** — motion shell on parent `AdminDevTool` only (not each embedded panel).

## Rollout checklist

- [x] **Tokens:** `AnimatedOutlet`, `BalanceTable` list reveal use `@/lib/motion` durations/easing where touched.
- [x] **AnimatedOutlet:** `ENTRANCE_OFFSET_Y`, `SHELL_TRANSITION`, `useReducedMotion`, `shellEnterInitial`.
- [x] **ScrollReveal / StaggerChildren:** Stagger cap (max 8) per internal motion spec.
- [x] **Admin pages:** Top-level routed pages wrapped in `MotionPageShell`.
- [x] **Skeleton cross-fade:** `SkeletonCrossFade` + balance recent preview.
- [x] **FAB / bottom nav:** No hover-scale on fixed chrome (`ChatFAB`, `client-bottom-nav`).
- [x] **CSS audit:** `--animation-duration-*` (~line 590) is source of truth for Framer/CSS utilities; legacy `--animation-fast` block (~1110) — prefer duration tokens for new work.
- [x] **Tests:** `src/lib/motion/__tests__/reduced-motion.test.ts`
- [ ] **Verify:** Manual pond scroll on dashboard.
- [x] **Client scroll reveals:** Connections, group list, friends list, settings, profile tabs, balances/reports, recurring list.
- [x] **Reduced motion:** OS setting → instant shell, viewport transitions off, pond GSAP skip.

## Pattern comparison (product vs marketing reference)

| Pattern | Typical marketing site | FairPay |
| --- | --- | --- |
| Initial load pacing | Coordinated narrative fade-in | Chrome sequence: `NavBar` (`firstPaintChromeHeader*`) → `MotionPageShell` (`FIRST_PAINT` + `contentDelay`) → page hero (`firstPaintHero*`). Cold load only; in-app routes use `AnimatedOutlet` |
| Scroll section reveal | IO + translate/opacity | `ScrollReveal` / `StaggerChildren` — GSAP ScrollTrigger, `SCROLL_REVEAL` tokens (`top 85%`, 600ms, `power2.out`, 40px) |
| Multi-section choreography | Sequential blocks + staggered children | Partial — `StaggerChildren` (0.1s stagger, cap 8); not full-page narrative |
| Scrubbed timeline | SVG stroke locked to scroll progress | Not in app chrome; dashboard **pond** keeps isolated scrub via `DashboardPondReveal` |
| Smooth scroll | Lenis (or similar) | `useSmoothScroll()` globally; notes in `docs/motion/load-scroll-route-patterns.md` |
| Vector hero art | Many layered illustrations | N/A (product UI) |
| Hover micro | Button/state motion | Existing `Button` springs + ripples |
| Reduced motion | — | `useReducedMotion` → instant shell, no ScrollTrigger tweens, pond skip |

**Engine choice:** scroll reveals use **GSAP ScrollTrigger** only (already in bundle for pond/charts). No second scroll stack.

**Honest gaps:**

| Surface | Gap |
| --- | --- |
| Expense create/edit/show, payment flows | Route shell only; no scroll choreography |
| Bank / MoMo / SePay settings sub-routes | Thin wrappers, no `ScrollReveal` |
| Admin inner tabs | Parent `MotionPageShell` only |
| Marketing / about / pricing | Not in scope |
| Profile / group headers | Hero uses `firstPaintHero*`; tab bodies use GSAP |
| Scrubbed SVG / Rive heroes | Not portable; pond scrub is the only scrubbed timeline |

## References

- In-repo motion patterns: `docs/motion/load-scroll-route-patterns.md`
- Internal UI motion spec (when present): `docs/design-system/evon-review/specs/uiux-motion.md`
