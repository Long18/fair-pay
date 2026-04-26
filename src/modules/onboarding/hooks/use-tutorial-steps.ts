import { useMemo, useCallback } from "react";

import {
  FairPayIcon,
  WalletIcon,
  PlusIcon,
  UsersIcon,
  PaletteIcon,
  CreditCardIcon,
  BellIcon,
  GlobeIcon,
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
    requiresAuth: false,
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
    requiresAuth: false,
    tooltipPosition: "bottom",
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
  },
  {
    id: "theme-customization",
    titleKey: "onboarding.theme.title",
    descriptionKey: "onboarding.theme.description",
    icon: PaletteIcon,
    targetSelector: '[data-onboarding-target="theme-selector"]',
    spotlightShape: "circle",
    spotlightPadding: 8,
    intent: "accent",
    requiresAuth: false,
    tooltipPosition: "bottom",
  },
  {
    id: "payments",
    titleKey: "onboarding.payments.title",
    descriptionKey: "onboarding.payments.description",
    icon: CreditCardIcon,
    targetSelector: null,
    intent: "success",
    requiresAuth: true,
    tooltipPosition: "center",
  },
  {
    id: "notifications",
    titleKey: "onboarding.notifications.title",
    descriptionKey: "onboarding.notifications.description",
    icon: BellIcon,
    targetSelector: '[data-onboarding-target="notification-panel"]',
    spotlightShape: "circle",
    spotlightPadding: 8,
    intent: "warning",
    requiresAuth: true,
    tooltipPosition: "bottom",
  },
  {
    id: "language",
    titleKey: "onboarding.language.title",
    descriptionKey: "onboarding.language.description",
    icon: GlobeIcon,
    targetSelector: '[data-onboarding-target="language-toggle"]',
    spotlightShape: "circle",
    spotlightPadding: 8,
    intent: "info",
    requiresAuth: false,
    tooltipPosition: "bottom",
  },
  {
    id: "completion",
    titleKey: "onboarding.completion.title",
    descriptionKey: "onboarding.completion.description",
    icon: CheckCircle2Icon,
    targetSelector: null,
    intent: "success",
    requiresAuth: false,
    tooltipPosition: "center",
  },
];

/**
 * Hook that provides the filtered tutorial steps based on authentication state.
 *
 * For unauthenticated users, steps with `requiresAuth: true` are excluded.
 * For authenticated users, all steps are included.
 *
 * The result is memoized to avoid unnecessary re-renders.
 */
export function useTutorialSteps(isAuthenticated: boolean) {
  const steps = useMemo(() => {
    if (isAuthenticated) {
      return TUTORIAL_STEPS;
    }
    return TUTORIAL_STEPS.filter((step) => !step.requiresAuth);
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
