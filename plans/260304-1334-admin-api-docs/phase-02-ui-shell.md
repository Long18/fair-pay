# Phase 02 — UI Shell + i18n + Routing

**Status**: 🔲 Pending | **Priority**: High

## Context links
- Main plan: [plan.md](./plan.md)
- Design system: `docs/design-system/README.md`
- AdminLayout: `src/modules/admin/components/AdminLayout.tsx`
- App.tsx: `src/App.tsx`

## Architecture
Desktop: `flex` split — left panel (320px catalog list) + right panel (detail + console).
Mobile: left panel as Sheet (collapsible), right panel full-width.

## Implementation Steps

### Step 2.1 — i18n keys
Add `adminApiDocs` namespace to `src/locales/en.json` and `src/locales/vi.json`.

### Step 2.2 — AdminLayout nav item
Add to `NAV_ITEMS` array in `AdminLayout.tsx`:
```ts
{ key: "api-docs", label: "API Docs", icon: CodeIcon, path: "/admin/api-docs" }
```

### Step 2.3 — Route in App.tsx
Add lazy import `AdminApiDocs` and route:
```tsx
<Route path="api-docs" element={<Suspense fallback={<PageLoader />}><AdminApiDocs /></Suspense>} />
```

### Step 2.4 — AdminApiDocs.tsx
Sub-components:
- `CatalogSidebar` — search input + filter chips + scrollable entry list
- `EntryDetail` — method badge + auth badge + risk badge + param table + snippet tabs
- `SnippetViewer` — curl / fetch / rpc snippet with copy button
- `FilterBar` — Kind / Status / Auth / Risk / Used-in-code toggles

Default filter state: `usedInCode: true` (Active-first).

## Todo
- [ ] Add i18n keys
- [ ] Update AdminLayout NAV_ITEMS
- [ ] Add lazy import + route in App.tsx
- [ ] Create AdminApiDocs.tsx with sub-components
- [ ] Test filter + entry selection UX
