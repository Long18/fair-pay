export * from "./types";
export { calculateSpotlightPosition, useSpotlight } from "./hooks/use-spotlight";
export type { TooltipPosition } from "./hooks/use-spotlight";
export { useCameraScroll } from "./hooks/use-camera-scroll";
export { useDarkMode } from "./hooks/use-dark-mode";
export { SpotlightOverlay } from "./components/spotlight-overlay";
export type { SpotlightOverlayProps } from "./components/spotlight-overlay";
export { OnboardingOrchestrator } from "./components/onboarding-orchestrator";
export type { OnboardingOrchestratorProps } from "./components/onboarding-orchestrator";
export { OnboardingTutorialShell } from "./components/onboarding-tutorial-shell";
export type { OnboardingTutorialShellProps } from "./components/onboarding-tutorial-shell";
export { OnboardingProvider, useOnboarding } from "./components/onboarding-provider";
export { OnboardingChecklist } from "./components/OnboardingChecklist";
export { useOnboardingProgress } from "./hooks/use-onboarding-progress";
export type { UseOnboardingProgressReturn } from "./hooks/use-onboarding-progress";
export {
  CHECKLIST_STEP_KEYS,
  ONBOARDING_PROGRESS_EVENT,
  markOnboardingStep,
} from "./utils/mark-step";
export type { OnboardingProgressDetail } from "./utils/mark-step";
