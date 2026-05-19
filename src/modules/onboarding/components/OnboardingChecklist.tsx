import React from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useOnboardingProgress } from "../hooks/use-onboarding-progress";
import { OnboardingChecklistItem } from "./OnboardingChecklistItem";
import { useTrackEvent } from "@/hooks/use-track-event";
import { cn } from "@/lib/utils";

interface ChecklistStep {
  key: string;
  href: string;
  descriptionKey: string;
}

const CHECKLIST_STEPS: ChecklistStep[] = [
  {
    key: "profile",
    href: "/settings/profile",
    descriptionKey: "onboarding.steps.profileDesc",
  },
  {
    key: "friend",
    href: "/friends",
    descriptionKey: "onboarding.steps.friendDesc",
  },
  {
    key: "group",
    href: "/groups/create",
    descriptionKey: "onboarding.steps.groupDesc",
  },
  {
    key: "expense",
    href: "/expenses/create",
    descriptionKey: "onboarding.steps.expenseDesc",
  },
  {
    key: "settle",
    href: "/balances",
    descriptionKey: "onboarding.steps.settleDesc",
  },
];

export function OnboardingChecklist() {
  const { t } = useTranslation();
  const { steps, isCompleted, isLoading, updateStep: _updateStep, markComplete } =
    useOnboardingProgress();
  const { track } = useTrackEvent();

  if (isLoading || isCompleted) return null;

  const completedCount = CHECKLIST_STEPS.filter(
    (s) => steps[s.key],
  ).length;
  const totalCount = CHECKLIST_STEPS.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  const handleSkip = async () => {
    track("onboarding_checklist_skipped", { completedCount, totalCount });
    await markComplete();
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">
          {t("onboarding.checklist.title")}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {t("onboarding.checklist.progress", {
            completed: completedCount,
            total: totalCount,
          })}
        </p>
        {/* Progress bar */}
        <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full bg-green-500 transition-all duration-500",
            )}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="divide-y divide-border">
          {CHECKLIST_STEPS.map((s, idx) => (
            <OnboardingChecklistItem
              key={s.key}
              step={idx + 1}
              label={t(`onboarding.steps.${s.key}`)}
              description={t(s.descriptionKey, { defaultValue: "" })}
              href={s.href}
              completed={!!steps[s.key]}
            />
          ))}
        </div>
        <div className="mt-3 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={handleSkip}
          >
            {t("onboarding.checklist.skip")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
