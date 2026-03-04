# Phase 05 — QA + Rollout

**Status**: 🔲 Pending | **Priority**: Medium

## Acceptance Criteria Checklist
- [ ] `/admin/api-docs` visible only to admins, in admin nav
- [ ] Catalog lists 13+ HTTP + ~142 RPC entries with provenance tags
- [ ] Default: Active-first (used_in_code=true); toggle shows all
- [ ] Try It Out works for callable; disabled label for non-callable
- [ ] Privileged proxy: admin-verified + allowlist + host restriction
- [ ] Design system compliance (spacing, typography, 44px touch targets)
- [ ] i18n: all text keyed, EN + VI present

## Manual test scenarios
1. Open `/admin/api-docs` as admin → catalog loads with Active-first
2. Toggle "Show all" → full catalog visible
3. Search "debt" → filtered results
4. Select direct_rpc entry → run `is_admin` → see result
5. Select high-risk entry → mutation gate blocks until typed `EXECUTE`
6. Mobile: Sheet opens, endpoint runs in full-width view

## Next steps after QA
- Enable by default (remove feature flag or set to true in env)
- Document in `docs/codebase-summary.md`
