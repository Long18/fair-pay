import { useState } from "react";
import { useGetIdentity } from "@refinedev/core";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X, RotateCcw, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useOnboardingProgress } from "../hooks/use-onboarding-progress";
import { useOnboarding } from "./onboarding-provider";
import { useTrackEvent } from "@/hooks/use-track-event";
import type { Profile } from "@/modules/profile/types";

// ─── Step definitions ─────────────────────────────────────────────────────────

function useChecklistSteps(userId: string | undefined) {
  return [
    { key: "profile",  labelKey: "onboarding.steps.profile",  href: userId ? `/profile/${userId}` : "/settings/profile" },
    { key: "friend",   labelKey: "onboarding.steps.friend",   href: "/friends" },
    { key: "group",    labelKey: "onboarding.steps.group",    href: "/groups/create" },
    { key: "expense",  labelKey: "onboarding.steps.expense",  href: "/expenses/create" },
    { key: "settle",   labelKey: "onboarding.steps.settle",   href: "/balances" },
  ];
}

// ─── Circular progress ring ───────────────────────────────────────────────────

function ProgressRing({ completed, total }: { completed: number; total: number }) {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? completed / total : 0;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <svg width="44" height="44" className="absolute inset-0 -rotate-90">
      <circle
        cx="22" cy="22" r={radius}
        fill="none" stroke="currentColor"
        strokeWidth="3" className="text-muted/30"
      />
      <circle
        cx="22" cy="22" r={radius}
        fill="none" stroke="currentColor"
        strokeWidth="3"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        className="text-primary transition-all duration-500"
      />
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * Floating checklist widget — fixed bottom-right, expands into a popover.
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

  if (isLoading || isCompleted) return null;

  const completedCount = checklistSteps.filter((s) => !!steps[s.key]).length;
  const totalCount = checklistSteps.length;

  const handleSkip = async () => {
    track("onboarding_checklist_skipped", { completedCount, totalCount });
    await markComplete();
    setOpen(false);
  };

  const handleReplayTutorial = () => {
    setOpen(false);
    restart();
  };

  return (
    <div className="fixed bottom-24 right-4 z-50 flex flex-col items-end gap-2">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-72 rounded-2xl border bg-card shadow-xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <div>
                <p className="text-sm font-semibold leading-tight">
                  {t("onboarding.checklist.title", "Get started with FairPay")}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("onboarding.checklist.progress", {
                    completed: completedCount,
                    total: totalCount,
                    defaultValue: `${completedCount} of ${totalCount} steps complete`,
                  })}
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-full p-1 hover:bg-muted transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Progress bar */}
            <div className="mx-4 mb-3 h-1.5 w-auto rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${Math.round((completedCount / totalCount) * 100)}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>

            {/* Steps */}
            <div className="divide-y divide-border mx-4">
              {checklistSteps.map((s) => {
                const done = !!steps[s.key];
                return (
                  <a
                    key={s.key}
                    href={s.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 py-2.5 text-sm transition-colors",
                      done
                        ? "text-muted-foreground line-through"
                        : "hover:text-primary",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                        done
                          ? "border-green-500 bg-green-500 text-white"
                          : "border-muted-foreground/40 text-muted-foreground",
                      )}
                    >
                      {done ? <Check className="h-3 w-3" /> : null}
                    </span>
                    <span className="flex-1">{t(s.labelKey)}</span>
                    {!done && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />}
                  </a>
                );
              })}
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-between px-4 py-3 border-t mt-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 text-xs text-muted-foreground"
                onClick={handleReplayTutorial}
              >
                <RotateCcw className="h-3 w-3" />
                {t("onboarding.checklist.replayTutorial", "Replay tutorial")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground"
                onClick={handleSkip}
              >
                {t("onboarding.checklist.skip", "Skip")}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB trigger button */}
      <motion.button
        onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="relative flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
        aria-label={t("onboarding.checklist.title", "Get started")}
      >
        <ProgressRing completed={completedCount} total={totalCount} />
        <Sparkles className="h-5 w-5 relative z-10" />
        {/* Badge */}
        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-background border text-[10px] font-bold text-primary">
          {completedCount}
        </span>
      </motion.button>
    </div>
  );
}
