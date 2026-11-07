# Local motion analysis tooling

Optional Rust CLI for capturing timing and DOM notes while studying external sites. It is **not** a runtime dependency of FairPay.

## Requirements

- macOS or Linux
- [Rust toolchain](https://rustup.rs/) (`rustc`, `cargo`)
- Docker is not required for web timing study

## Install (inside the FairPay repo)

```bash
pnpm motion:local-tool:install
```

The script clones a release build into `.tools/` (gitignored) and prints the CLI path.

## Using captured notes

Record loader timing, scroll smoothing, and section reveal behavior in [load-scroll-route-patterns.md](./load-scroll-route-patterns.md).

Tunable FairPay files after a study pass:

| File | What to align |
| --- | --- |
| `src/lib/motion/tokens.ts` | Durations, stagger, travel |
| `src/lib/motion/brand-loader/*` | Logo SVG, timeline, isolated stage |
| `src/lib/motion/use-first-paint-curtain-ready.ts` | Min/max veil milliseconds |
| `load-scroll-route-patterns.md` | Evidence tables |

Do not paste third-party CSS, scripts, or artwork into the product tree.

## Load veil (product behavior)

- FairPay gradient background + logo motion only (`FirstPaintBrandCurtain`)
- Veil waits for `window.load` and at least ~720ms for hydration below
- Hard reload shows the veil; SPA navigation does not repeat it

See also: [load-scroll-route-patterns.md](./load-scroll-route-patterns.md).
