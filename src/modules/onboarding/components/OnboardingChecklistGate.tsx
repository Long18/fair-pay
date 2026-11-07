"use client";

/**
 * Onboarding checklist FAB is intentionally unmounted app-wide.
 * Progress + CTAs live on profile (`ProfileAboutSidebar`, header tutorial restart).
 *
 * Kept as a no-op gate so older imports fail soft if reintroduced.
 */
export function OnboardingChecklistGate() {
  return null;
}
