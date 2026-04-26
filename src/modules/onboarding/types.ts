import type { ThemeIntent } from "@/lib/theme-intents";

// ─── Constants ───────────────────────────────────────────────────────────────

/** localStorage key for persisting onboarding state */
export const STORAGE_KEY = "fairpay-onboarding-state";

/** Current app version, used for version-aware state migration */
export const APP_VERSION: string =
  import.meta.env.VITE_APP_VERSION ?? "1.0.0";

// ─── Interfaces ──────────────────────────────────────────────────────────────

/** A single step in the onboarding tutorial */
export interface TutorialStep {
  /** Unique step identifier */
  id: string;
  /** i18n key for the step title */
  titleKey: string;
  /** i18n key for the step description */
  descriptionKey: string;
  /** Icon component to display */
  icon: React.ComponentType<{ className?: string }>;
  /** CSS selector for the element to spotlight (null = no spotlight) */
  targetSelector: string | null;
  /** Spotlight cutout shape */
  spotlightShape?: "rect" | "circle" | "pill";
  /** Spotlight padding in px */
  spotlightPadding?: number;
  /** Theme intent for step accent color */
  intent: ThemeIntent;
  /** Whether this step requires authentication */
  requiresAuth: boolean;
  /** Position of the tooltip relative to spotlight */
  tooltipPosition?: "top" | "bottom" | "left" | "right" | "center";
  /** Optional action the user can take during this step */
  action?: {
    labelKey: string;
    handler: () => void;
  };
}

/** Persisted state for the onboarding tutorial */
export interface OnboardingState {
  /** Whether the tutorial has been completed or skipped */
  completed: boolean;
  /** Timestamp of completion/skip (ISO string) */
  completedAt: string | null;
  /** Whether it was skipped (vs fully completed) */
  skipped: boolean;
  /** Step index where user left off (for resume) */
  lastStepIndex: number;
  /** Step index where user skipped (if skipped) */
  skippedAtStep: number | null;
  /** Number of times the tutorial has been shown */
  showCount: number;
  /** App version when tutorial was last shown */
  appVersion: string;
}

/** Values exposed by the OnboardingContext */
export interface OnboardingContextValue {
  /** Whether the tutorial is currently active */
  isActive: boolean;
  /** Current step index (0-based) */
  currentStep: number;
  /** Total number of steps */
  totalSteps: number;
  /** Current step configuration */
  stepConfig: TutorialStep | null;
  /** Progress as 0-1 fraction */
  progress: number;
  /** Whether tutorial was completed (not skipped) */
  isCompleted: boolean;
  /** Whether the user is in interactive try-it mode */
  interactionMode: boolean;
  /** Advance to next step */
  next: () => void;
  /** Go back to previous step */
  back: () => void;
  /** Jump to a specific step */
  goToStep: (index: number) => void;
  /** Skip/dismiss the entire tutorial */
  skip: () => void;
  /** Restart the tutorial from the beginning */
  restart: () => void;
  /** Enter try-it interaction mode */
  enterTryIt: () => void;
  /** Exit try-it mode and advance to next step */
  exitTryIt: () => void;
}

/** Computed spotlight rectangle for the overlay cutout */
export interface SpotlightRect {
  /** X position (px) */
  x: number;
  /** Y position (px) */
  y: number;
  /** Width (px) */
  width: number;
  /** Height (px) */
  height: number;
  /** Cutout shape */
  shape: "rect" | "circle" | "pill";
  /** Border radius (px) */
  borderRadius: number;
}
