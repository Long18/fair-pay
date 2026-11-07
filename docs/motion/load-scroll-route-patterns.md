# Load, scroll, and route motion patterns

How FairPay maps common marketing-site motion ideas into a finance UI: **FairPay teal** and favicon only — never ship third-party assets or copied CSS.

## Optional local analysis tooling

```bash
pnpm motion:local-tool:install
```

See [local-analysis-setup.md](./local-analysis-setup.md).

---

## Phase 1 — Cold load

**Patterns observed in high-polish marketing sites:**

| Step | Behavior | Typical implementation |
| --- | --- | --- |
| 1 | Fixed full-viewport veil, high z-index | Fixed overlay root |
| 2 | Center logo stroke draw (SVG dasharray) | SVG + timeline |
| 3 | Main content hidden until veil completes | `data-*` gate on document root |
| 4 | Exit via **clip-path inset wipe**, not opacity-only | CSS / motion clip-path |
| 5 | Smooth wheel scroll after reveal | Lenis or equivalent |

**FairPay mapping:**

| Step | FairPay |
| --- | --- |
| 1–2 | `FirstPaintBrandCurtain` + `FairPayLoaderLogo` |
| 3 | `html[data-fp-preloader=active]` + `.fp-motion-main { opacity:0 }` |
| 4 | `PRELOADER_SHELL.clipExit` on Framer exit |
| 5 | `useSmoothScroll` + `lenis-bridge` + `ScrollTrigger.update` |

---

## Phase 2 — In-document scroll

**Patterns:**

- Wheel smoothing (low `lerp`)
- Tall sections with scroll-linked translate
- Intersection / ScrollTrigger opacity + translate on blocks
- Vector hero art (usually not appropriate for app UI)

**FairPay:**

| Pattern | FairPay |
| --- | --- |
| Wheel smoothing | `App.tsx` → `useSmoothScroll` |
| Section rhythm | `StorySection` + `dashboard-story-scroll` snap |
| One-shot reveal | `ScrollReveal` / `StaggerChildren` (`SCROLL_REVEAL` tokens) |
| Scroll-linked drift | `ScrollParallax` + `ScrollRevealStack` (`SCROLL_SCRUB`) |
| Scrubbed hero | `DashboardPondReveal` only (isolated) |
| After async paint | `ScrollTrigger.refresh` on tab / dashboard loads |

---

## Phase 3 — In-app navigation (SPA)

**Patterns from multi-page sites with loaders:**

| Step | Behavior |
| --- | --- |
| 1 | Next view fetched in background |
| 2 | Full-screen logo veil **does not** replay on in-site nav |
| 3 | Header shows loading HUD while next view prepares |
| 4 | Main content slides up; scroll resets |
| 5 | Full veil only on hard reload |

**FairPay (React Router SPA):**

| Step | FairPay |
| --- | --- |
| No in-nav full veil | `FirstPaintBrandCurtain` cold load only |
| Header HUD | Pill snap (`NAV_CHROME_ROUTE_SNAP`), then outlet slide; `fp-nav-hud-loading` |
| Hold until ready | `MotionRouteLoadingProvider` (`pathname` + rAF + `ROUTE_TRANSITION.minHudMs`) |
| Slide up | `AnimatedOutlet` — `enterY: 112` → `0` when loading clears |
| Scroll top | `useMotionRouteScroll` → Lenis `scrollTo(0)` |
| Layout refresh | `ScrollTrigger.refresh()` on `pathname` |

---

## Manual verification

1. **Load:** Hard reload → logo → wipe up → content visible (nothing readable under veil).
2. **Scroll:** Smooth wheel; dashboard sections reveal on scroll.
3. **Navigate:** Route changes → HUD → slide up; no full-screen loader repeat.
4. **`prefers-reduced-motion`:** No veil, no Lenis, instant outlet.

Token sources: `preloader-shell.tokens.ts`, `brand-loader/`, [motion-system.md](../motion-system.md).
