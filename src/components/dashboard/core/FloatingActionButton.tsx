import { useEffect, useState } from "react";
import { useGo } from "@refinedev/core";
import { useHaptics } from "@/hooks/use-haptics";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/ui/use-reduced-motion";
import { FAB_RIGHT_STACK, PILL_STAGGER_MS } from "@/lib/floating-tokens";
import {
  FloatingActionStack,
  FloatingPill,
  useRightFabLane,
} from "@/components/ui/floating-stack";
import { PlusCircleIcon, UserPlusIcon } from "@/components/ui/icons";
import { journeyTracking } from "@/lib/journey-tracking";
interface FloatingActionButtonProps {
  disabled?: boolean;
}

interface FabAction {
  key: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  accent?: boolean;
  "data-track-id": string;
}

function FabIcon({ src, alt = "" }: { src: string; alt?: string }) {
  return (
    <img
      src={src}
      alt={alt}
      aria-hidden={alt === ""}
      className="h-[22px] w-[22px] object-contain"
    />
  );
}

/**
 * Dashboard Quick Actions — Native FloatingActionStack speed-dial (proven layout).
 * Lab create-menu block is demo-only; it breaks inside fixed FAB lanes (narrow column).
 */
export function FloatingActionButton({ disabled = false }: FloatingActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const go = useGo();
  const { t } = useTranslation();
  const { tap } = useHaptics();
  const reducedMotion = useReducedMotion();
  const { setPrimaryQuickActionsOpen } = useRightFabLane();

  useEffect(
    () => () => {
      setPrimaryQuickActionsOpen(false);
    },
    [setPrimaryQuickActionsOpen],
  );

  const actions: FabAction[] = [
    {
      key: "addExpense",
      icon: <PlusCircleIcon className="h-5 w-5" />,
      label: t("dashboard.addExpense"),
      accent: true,
      onClick: () => {
        tap();
        go({ to: "/expenses/create" });
        setIsOpen(false);
      },
      "data-track-id": "cta:fab:expenses:create",
    },
    {
      key: "settleUp",
      icon: <FabIcon src="/assets/fab/fab-settle-up.png" />,
      label: t("dashboard.settleUp"),
      onClick: () => {
        tap();
        go({ to: "/payments/create" });
        setIsOpen(false);
      },
      "data-track-id": "cta:fab:payments:create",
    },
    {
      key: "createGroup",
      icon: <FabIcon src="/assets/fab/fab-create-group.png" />,
      label: t("dashboard.createGroup"),
      onClick: () => {
        tap();
        go({ to: "/groups/create" });
        setIsOpen(false);
      },
      "data-track-id": "cta:fab:groups:create",
    },
    {
      key: "inviteFriend",
      icon: <UserPlusIcon className="h-5 w-5" />,
      label: t("dashboard.inviteFriend"),
      onClick: () => {
        tap();
        go({ to: "/friends" });
        setIsOpen(false);
      },
      "data-track-id": "cta:fab:friends",
    },
  ];

  if (disabled) return null;

  return (
    <FloatingActionStack
      side="right"
      stackIndex={FAB_RIGHT_STACK.primary}
      isOpen={isOpen}
      onClose={() => {
        setIsOpen(false);
        setPrimaryQuickActionsOpen(false);
      }}
      showBackdrop
      className="max-md:hidden"
      entranceDelay={0.3}
      trigger={
        <FloatingPill
          variant="bare"
          size="lg"
          ariaLabel={isOpen ? t("dashboard.closeMenu") : t("dashboard.quickActions")}
          ariaExpanded={isOpen}
          ariaHasPopup="menu"
          onClick={() => {
            tap();
            const next = !isOpen;
            if (next) {
              journeyTracking.trackEvent({
                event_name: "dashboard_fab_clicked",
                event_category: "dashboard",
                page_path: window.location.pathname,
                flow_name: "dashboard",
                step_name: "fab-open",
              });
            }
            setIsOpen(next);
            setPrimaryQuickActionsOpen(next);
          }}
          dataAttributes={{ "data-onboarding-target": "fab-button" }}
          data-track-id="cta:fab:toggle"
          data-track-event="cta_click"
          data-track-type="button"
          data-track-category="dashboard"
          className={cn(
            "!rounded-full !bg-background border-[3px]",
            isOpen ? "!border-foreground" : "border-primary",
          )}
        >
          <img
            src={isOpen ? "/assets/fab/fab-close.png" : "/assets/fab/fab-quick-actions.png"}
            alt=""
            aria-hidden="true"
            className="h-8 w-8 object-contain"
          />
        </FloatingPill>
      }
    >
      <AnimatePresence>
        {isOpen ? (
          <motion.div
            className="grid w-56 grid-cols-2 gap-2 rounded-2xl border border-border bg-card p-3 shadow-lg"
            initial={reducedMotion ? false : { opacity: 0, scale: 0.82 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.82 }}
            transition={{ duration: 0.22 }}
          >
            {actions.map((action, index) => (
              <motion.button
                key={action.key}
                type="button"
                onClick={action.onClick}
                aria-label={action.label}
                data-track-id={action["data-track-id"]}
                data-track-event="cta_click"
                data-track-type="button"
                data-track-category="dashboard"
                className="flex h-[88px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl bg-muted/60 transition-colors hover:bg-muted"
                initial={reducedMotion ? false : { opacity: 0, y: 8, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  duration: 0.28,
                  delay: reducedMotion ? 0 : (index * PILL_STAGGER_MS) / 1000,
                }}
              >
                <span
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full",
                    action.accent ? "bg-primary/15" : "bg-background shadow-sm",
                  )}
                >
                  {action.icon}
                </span>
                <span className="px-1 text-center text-[11px] font-semibold leading-tight text-foreground">
                  {action.label}
                </span>
              </motion.button>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </FloatingActionStack>
  );
}
