import { useCallback, useEffect, useEffectEvent, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useMediaQuery } from "@/hooks/ui/use-media-query";
import { useHaptics } from "@/hooks/use-haptics";
import { themeIntentTones } from "@/lib/theme-intents";
import { cn } from "@/lib/utils";

import type { TutorialStep } from "../types";

export interface OnboardingTutorialShellProps {
  open: boolean;
  steps: TutorialStep[];
  currentIndex: number;
  onGoToStep: (index: number) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  onTryIt?: () => void;
}

function TealDots({
  currentIndex,
  totalSteps,
}: {
  currentIndex: number;
  totalSteps: number;
}) {
  const { t } = useTranslation();

  return (
    <div
      className="flex items-center justify-center gap-1.5"
      role="progressbar"
      aria-valuenow={currentIndex + 1}
      aria-valuemin={1}
      aria-valuemax={totalSteps}
      aria-label={t("onboarding.a11y.stepProgress", {
        current: currentIndex + 1,
        total: totalSteps,
        defaultValue: `Step ${currentIndex + 1} of ${totalSteps}`,
      })}
    >
      {Array.from({ length: totalSteps }, (_, i) => (
        <span
          key={i}
          className={cn(
            "size-2 rounded-full transition-colors duration-200",
            i === currentIndex ? "bg-primary" : "bg-muted-foreground/30",
          )}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

function StepSlide({ step }: { step: TutorialStep }) {
  const { t } = useTranslation();
  const tone = themeIntentTones[step.intent];
  const Icon = step.icon;

  return (
    <div className="flex flex-col items-center gap-4 px-1 py-2 text-center">
      <div
        className={cn(
          "flex size-14 items-center justify-center rounded-full",
          tone.surface,
        )}
      >
        <Icon className={cn("size-7", tone.icon)} aria-hidden="true" />
      </div>
      <div className="flex flex-col items-center gap-2">
        <p className={cn("text-lg font-semibold", tone.text)}>
          {t(step.titleKey)}
        </p>
        <p className="max-w-sm text-sm text-muted-foreground">
          {t(step.descriptionKey)}
        </p>
      </div>
    </div>
  );
}

function TutorialActions({
  currentIndex,
  totalSteps,
  step,
  onNext,
  onBack,
  onRequestSkip,
  onTryIt,
}: {
  currentIndex: number;
  totalSteps: number;
  step: TutorialStep;
  onNext: () => void;
  onBack: () => void;
  onRequestSkip: () => void;
  onTryIt?: () => void;
}) {
  const { t } = useTranslation();
  const { tap } = useHaptics();
  const isFirstStep = currentIndex === 0;
  const isLastStep = currentIndex === totalSteps - 1;
  const hasAction = !!step.action && !!onTryIt;

  return (
    <div className="flex w-full flex-col gap-3">
      {hasAction && (
        <Button
          variant="outline"
          className="min-h-[44px] w-full"
          onClick={() => {
            tap();
            onTryIt?.();
          }}
          aria-label={t("onboarding.actions.tryIt", "Try it")}
        >
          {t("onboarding.actions.tryIt", "Try it")}
        </Button>
      )}

      <div className="flex w-full items-center justify-between gap-2">
        {isFirstStep ? (
          <div className="min-h-[44px] min-w-[44px]" aria-hidden="true" />
        ) : (
          <Button
            variant="ghost"
            className="min-h-[44px]"
            onClick={() => {
              tap();
              onBack();
            }}
            aria-label={t("onboarding.actions.back", "Back")}
          >
            {t("onboarding.actions.back", "Back")}
          </Button>
        )}

        {!isLastStep ? (
          <Button
            variant="ghost"
            className="min-h-[44px] text-muted-foreground"
            onClick={() => {
              tap();
              onRequestSkip();
            }}
            aria-label={t("onboarding.actions.skip", "Skip")}
          >
            {t("onboarding.actions.skip", "Skip")}
          </Button>
        ) : (
          <div className="min-h-[44px] min-w-[44px]" aria-hidden="true" />
        )}

        <Button
          className="min-h-[44px]"
          onClick={() => {
            tap();
            onNext();
          }}
          aria-label={
            isLastStep
              ? t("onboarding.actions.done", "Get started")
              : t("onboarding.actions.next", "Next")
          }
        >
          {isLastStep
            ? t("onboarding.actions.done", "Get started")
            : t("onboarding.actions.next", "Next")}
        </Button>
      </div>
    </div>
  );
}

/**
 * Auth-gated onboarding shell: Dialog on desktop (≥768px), Drawer on mobile.
 * Multi-step content uses shadcn Carousel with teal progress dots.
 */
export function OnboardingTutorialShell({
  open,
  steps,
  currentIndex,
  onGoToStep,
  onNext,
  onBack,
  onSkip,
  onTryIt,
}: OnboardingTutorialShellProps) {
  const { t } = useTranslation();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [api, setApi] = useState<CarouselApi>();
  const [skipConfirmOpen, setSkipConfirmOpen] = useState(false);
  /** Hide shell while confirm is open so AlertDialog is not trapped under Dialog/Drawer overlay */
  const shellOpen = open && !skipConfirmOpen;
  const step = steps[currentIndex] ?? steps[0];
  const onGoToStepEvent = useEffectEvent(onGoToStep);

  useEffect(() => {
    if (!api) return;
    api.scrollTo(currentIndex, true);
  }, [api, currentIndex]);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => {
      const selected = api.selectedScrollSnap();
      if (selected !== currentIndex) {
        onGoToStepEvent(selected);
      }
    };
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api, currentIndex]);

  const requestSkipConfirm = useCallback(() => {
    setSkipConfirmOpen(true);
  }, []);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        requestSkipConfirm();
      }
    },
    [requestSkipConfirm],
  );

  const handleConfirmSkip = useCallback(() => {
    setSkipConfirmOpen(false);
    onSkip();
  }, [onSkip]);

  const handleSkipConfirmOpenChange = useCallback((nextOpen: boolean) => {
    setSkipConfirmOpen(nextOpen);
  }, []);

  if (!step || steps.length === 0) {
    return null;
  }

  const title = t(step.titleKey);
  const description = t(step.descriptionKey);
  const dialogLabel = t("onboarding.a11y.dialogLabel", "Onboarding tutorial");

  const body = (
    <div className="flex flex-col gap-4">
      <Carousel
        setApi={setApi}
        opts={{ align: "start", loop: false }}
        className="w-full"
        aria-label={t("onboarding.a11y.carouselLabel", "Tutorial steps")}
      >
        <CarouselContent>
          {steps.map((s) => (
            <CarouselItem key={s.id}>
              <StepSlide step={s} />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      <TealDots currentIndex={currentIndex} totalSteps={steps.length} />
    </div>
  );

  const actions = (
    <TutorialActions
      currentIndex={currentIndex}
      totalSteps={steps.length}
      step={step}
      onNext={onNext}
      onBack={onBack}
      onRequestSkip={requestSkipConfirm}
      onTryIt={onTryIt}
    />
  );

  const skipConfirmDialog = (
    <AlertDialog
      open={skipConfirmOpen}
      onOpenChange={handleSkipConfirmOpenChange}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("onboarding.skipConfirm.title", "Skip tutorial?")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t(
              "onboarding.skipConfirm.description",
              "You can replay it anytime from Settings.",
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>
            {t("onboarding.skipConfirm.cancel", "Keep going")}
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmSkip}>
            {t("onboarding.skipConfirm.confirm", "Skip")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (isDesktop) {
    return (
      <>
        <Dialog open={shellOpen} onOpenChange={handleOpenChange}>
          <DialogContent
            className="flex max-h-[90dvh] w-full max-w-md flex-col gap-4 overflow-hidden rounded-lg border bg-card sm:max-w-lg"
            aria-label={dialogLabel}
          >
            <DialogHeader className="sr-only">
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </DialogHeader>
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
              {body}
            </div>
            <DialogFooter className="sm:justify-stretch">{actions}</DialogFooter>
          </DialogContent>
        </Dialog>
        {skipConfirmDialog}
      </>
    );
  }

  return (
    <>
      <Drawer open={shellOpen} onOpenChange={handleOpenChange}>
        <DrawerContent
          className="max-h-[85dvh] rounded-t-lg bg-card"
          aria-label={dialogLabel}
        >
          <DrawerHeader className="sr-only text-left">
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 pb-2">
            {body}
          </div>
          <DrawerFooter className="pt-2">{actions}</DrawerFooter>
        </DrawerContent>
      </Drawer>
      {skipConfirmDialog}
    </>
  );
}
