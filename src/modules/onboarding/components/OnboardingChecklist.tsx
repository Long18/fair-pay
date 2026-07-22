import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useGetIdentity } from "@refinedev/core";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "framer-motion";
import { X, RotateCcw, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { FloatingActionStack, FloatingPill } from "@/components/ui/floating-stack";
import { useOnboardingProgress } from "../hooks/use-onboarding-progress";
import { useOnboarding } from "./onboarding-provider";
import { useTrackEvent } from "@/hooks/use-track-event";
import type { Profile } from "@/modules/profile/types";

// ─── Step definitions ─────────────────────────────────────────────────────────

function useChecklistSteps(userId: string | undefined) {
  return [
    {
      key: "profile",
      labelKey: "onboarding.steps.profile",
      descKey: "onboarding.steps.profileDesc",
      href: userId ? `/profile/${userId}` : "/settings/profile",
    },
    {
      key: "friend",
      labelKey: "onboarding.steps.friend",
      descKey: "onboarding.steps.friendDesc",
      href: "/friends",
    },
    {
      key: "group",
      labelKey: "onboarding.steps.group",
      descKey: "onboarding.steps.groupDesc",
      href: "/groups/create",
    },
    {
      key: "expense",
      labelKey: "onboarding.steps.expense",
      descKey: "onboarding.steps.expenseDesc",
      href: "/expenses/create",
    },
    {
      key: "settle",
      labelKey: "onboarding.steps.settle",
      descKey: "onboarding.steps.settleDesc",
      href: "/balances",
    },
  ] as const;
}

// ─── Circular progress ring (FAB overlay) ─────────────────────────────────────

function ProgressRing({ completed, total }: { completed: number; total: number }) {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? completed / total : 0;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <svg width="44" height="44" className="absolute inset-0 -rotate-90" aria-hidden="true">
      <circle
        cx="22"
        cy="22"
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        className="text-primary-foreground/25"
      />
      <circle
        cx="22"
        cy="22"
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        className="text-primary-foreground transition-all duration-500"
      />
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * Floating checklist widget — right-side FloatingActionStack, expands into a panel.
 * Integrates with OnboardingProvider to replay the spotlight tutorial.
 */
export function OnboardingChecklist() {
  const { t } = useTranslation();
  const { data: identity } = useGetIdentity<Profile>();
  const { steps, isCompleted, isLoading, markComplete } = useOnboardingProgress();
  const { restart } = useOnboarding();
  const { track } = useTrackEvent();
  const [open, setOpen] = useState(false);

  const checklistSteps = useChecklistSteps(identity?.id);
  const completedCount = checklistSteps.filter((s) => !!steps[s.key]).length;
  const totalCount = checklistSteps.length;

  useEffect(() => {
    if (open) {
      track("onboarding_checklist_viewed", { completedCount, totalCount });
    }
  }, [open, completedCount, totalCount, track]);

  if (isLoading || isCompleted) return null;

  const allDone = completedCount === totalCount;
  const progressValue = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const handleDismiss = async () => {
    const confirmed = window.confirm(
      t(
        "onboarding.checklist.dismissConfirm",
        "Skip the getting started checklist? You can reopen it from settings.",
      ),
    );
    if (!confirmed) return;
    track("onboarding_checklist_dismissed", { completedCount, totalCount });
    await markComplete();
    setOpen(false);
  };

  const handleReplayTutorial = () => {
    setOpen(false);
    restart();
  };

  return (
    <FloatingActionStack
      side="right"
      // Sit above the dashboard Quick Actions FAB (same corner, stackIndex 0).
      stackIndex={1}
      isOpen={open}
      onClose={() => setOpen(false)}
      showBackdrop={false}
      trigger={
        <FloatingPill
          variant="primary"
          onClick={() => setOpen((v) => !v)}
          badge={completedCount}
          ariaLabel={t("onboarding.checklist.title", "Get started")}
        >
          <ProgressRing completed={completedCount} total={totalCount} />
          <img
            src="/assets/fab/fab-onboarding-checklist.png"
            alt=""
            aria-hidden="true"
            className="relative z-10 h-5 w-5 object-contain"
          />
        </FloatingPill>
      }
    >
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="w-72 overflow-hidden rounded-lg border bg-card p-0 shadow-sm"
            role="dialog"
            aria-label={t("onboarding.checklist.title", "Get started with FairPay")}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2 px-4 pt-4 pb-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-tight">
                  {t("onboarding.checklist.title", "Get started with FairPay")}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {allDone
                    ? t("onboarding.checklist.allDone", "You're all set!")
                    : t("onboarding.checklist.progress", {
                        completed: completedCount,
                        total: totalCount,
                        defaultValue: `${completedCount} of ${totalCount} steps complete`,
                      })}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => setOpen(false)}
                aria-label={t("onboarding.checklist.close", "Close")}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Progress */}
            <div className="px-4 pb-3">
              <Progress value={progressValue} className="h-1.5" />
            </div>

            {/* Steps */}
            <ul className="mx-4 mb-1 divide-y divide-border">
              {checklistSteps.map((s) => {
                const done = !!steps[s.key];
                return (
                  <li key={s.key}>
                    <Link
                      to={s.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex min-h-11 items-start gap-3 py-2.5 text-sm transition-colors",
                        done
                          ? "text-muted-foreground"
                          : "hover:text-primary",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                          done
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/40 text-muted-foreground",
                        )}
                        aria-hidden="true"
                      >
                        {done ? <Check className="h-3 w-3" /> : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "block font-medium leading-tight",
                            done && "line-through",
                          )}
                        >
                          {t(s.labelKey)}
                        </span>
                        <span className="mt-0.5 block text-xs font-normal text-muted-foreground no-underline">
                          {t(s.descKey)}
                        </span>
                      </span>
                      {!done && (
                        <ChevronRight
                          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/60"
                          aria-hidden="true"
                        />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* Footer */}
            <div className="mt-2 flex items-center justify-between gap-2 border-t px-3 py-2.5">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 gap-1.5 px-2 text-xs text-muted-foreground"
                onClick={handleReplayTutorial}
              >
                <RotateCcw className="h-3 w-3" />
                {t("onboarding.checklist.replayTutorial", "Replay tutorial")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-2 text-xs text-muted-foreground"
                onClick={handleDismiss}
              >
                {t("onboarding.checklist.dismiss", "I'll explore myself")}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </FloatingActionStack>
  );
}
