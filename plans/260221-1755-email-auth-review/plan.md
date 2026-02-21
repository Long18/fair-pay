# Plan: Email Auth Review & Fix

**Date:** 2026-02-21
**Dir:** `plans/260221-1755-email-auth-review/`
**Status:** Ready for implementation

## Summary

Audited the full email sign-in/sign-up flow. Found 2 critical blockers (P0), 2 significant issues (P1), and 4 UX/polish gaps (P2/P3).

## Research

- [Auth Flow Analysis](./research/researcher-01-auth-flow-analysis.md)
- [Missing Features & Gaps](./research/researcher-02-missing-features-gaps.md)

## Implementation Phases

| # | Phase | Priority | Status |
|---|-------|----------|--------|
| 1 | [Critical Blockers](./phase-01-critical-blockers.md) | P0 | ⬜ Pending |
| 2 | [Sign-up & Confirmation Fixes](./phase-02-signup-confirmation.md) | P1 | ⬜ Pending |
| 3 | [UX Polish & i18n](./phase-03-ux-polish.md) | P2/P3 | ⬜ Pending |

## Issue Priority Map

```
P0 (Broken — do first):
  ├── Google OAuth on Register page → silently fails
  └── /update-password page missing → reset email links 404

P1 (Significant — do second):
  ├── Email confirmation not handled post-signup
  └── Duplicate email signup → silent/confusing error

P2/P3 (Polish — do last):
  ├── rememberMe checkbox non-functional
  ├── forgot-password: no loading/error/success states
  ├── forgot-password: hardcoded English (no i18n)
  └── forgot-password: styling inconsistency
```
