import { useMemo, useCallback } from "react";

import {
  FairPayIcon,
  WalletIcon,
  PlusIcon,
  UsersIcon,
  CheckCircle2Icon,
} from "@/components/ui/icons";

import type { TutorialStep } from "../types";

/**
 * Complete registry of all tutorial steps in deterministic order.
 * Each step defines its i18n keys, target selector, spotlight config,
 * theme intent, and auth requirement.
 */
export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "welcome",
    titleKey: "onboarding.welcome.title",
    descriptionKey: "onboarding.welcome.description",
    icon: FairPayIcon,
    targetSelector: null,
    intent: "brand",
    requiresAuth: true,
    tooltipPosition: "center",
  },
  {
    id: "dashboard-overview",
    titleKey: "onboarding.dashboard.title",
    descriptionKey: "onboarding.dashboard.description",
    icon: WalletIcon,
    targetSelector: '[data-onboarding-target="dashboard-tabs"]',
    spotlightShape: "pill",
    spotlightPadding: 8,
    intent: "brand",
    requiresAuth: true,
    tooltipPosition: "bottom",
    action: {
      labelKey: "onboarding.actions.tryIt",
    },
  },
  {
    id: "add-expense",
    titleKey: "onboarding.addExpense.title",
    descriptionKey: "onboarding.addExpense.description",
    icon: PlusIcon,
    targetSelector: '[data-onboarding-target="fab-button"]',
    spotlightShape: "circle",
    spotlightPadding: 12,
    intent: "success",
    requiresAuth: true,
    tooltipPosition: "top",
    action: {
      labelKey: "onboarding.actions.tryIt",
    },
  },
  {
    id: "connections",
    titleKey: "onboarding.connections.title",
    descriptionKey: "onboarding.connections.description",
    icon: UsersIcon,
    targetSelector: '[data-onboarding-target="nav-connections"]',
    spotlightShape: "pill",
    spotlightPadding: 6,
    intent: "info",
    requiresAuth: true,
    tooltipPosition: "bottom",
    // On mobile, connections is inside the hamburger menu — no spotlight target
    mobileTargetSelector: null,
  },
  {
    id: "completion",
    titleKey: "onboarding.completion.title",
    descriptionKey: "onboarding.completion.description",
    icon: CheckCircle2Icon,
    targetSelector: null,
    intent: "success",
    requiresAuth: true,
    tooltipPosition: "center",
  },
];

/**
 * Hook that provides the filtered tutorial steps based on authentication state.
 *
 * Unauthenticated users get no steps — the tutorial is auth-gated.
 * Authenticated users get the full registry.
 *
 * The result is memoized to avoid unnecessary re-renders.
 */
export function useTutorialSteps(isAuthenticated: boolean) {
  const steps = useMemo(() => {
    if (isAuthenticated) {
      return TUTORIAL_STEPS;
    }
    return [];
  }, [isAuthenticated]);

  const totalSteps = steps.length;

  const getStep = useCallback(
    (index: number): TutorialStep | null => {
      if (index >= 0 && index < steps.length) {
        return steps[index];
      }
      return null;
    },
    [steps],
  );

  return { steps, totalSteps, getStep };
}
