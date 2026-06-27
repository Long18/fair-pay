import { useState } from "react";
import { useGo } from "@refinedev/core";
import { useHaptics } from "@/hooks/use-haptics";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import {
  FloatingActionStack,
  FloatingPillGroup,
  FloatingPill,
  type PillGroupItem,
} from "@/components/ui/floating-stack";
import {
  PlusCircleIcon,
  UserPlusIcon,
} from "@/components/ui/icons";

interface FloatingActionButtonProps {
  disabled?: boolean;
}

// ─── Asset icon helpers ────────────────────────────────────────────────────────

function FabIcon({ src, alt = "" }: { src: string; alt?: string }) {
  return (
    <img
      src={src}
      alt={alt}
      aria-hidden={alt === ""}
      className="h-5 w-5 object-contain"
    />
  );
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function FloatingActionButton({ disabled = false }: FloatingActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const go = useGo();
  const { t } = useTranslation();
  const { tap } = useHaptics();

  const actions: PillGroupItem[] = [
    {
      icon: <PlusCircleIcon className="h-5 w-5" />,
      label: t("dashboard.addExpense"),
      onClick: () => { tap(); go({ to: "/expenses/create" }); setIsOpen(false); },
      ariaLabel: t("dashboard.addExpense"),
      "data-track-id": "cta:fab:expenses:create",
      "data-track-category": "dashboard",
    },
    {
      icon: <FabIcon src="/assets/fab/fab-settle-up.png" />,
      label: t("dashboard.settleUp"),
      onClick: () => { tap(); go({ to: "/payments/create" }); setIsOpen(false); },
      ariaLabel: t("dashboard.settleUp"),
      "data-track-id": "cta:fab:payments:create",
      "data-track-category": "dashboard",
    },
    {
      icon: <FabIcon src="/assets/fab/fab-create-group.png" />,
      label: t("dashboard.createGroup"),
      onClick: () => { tap(); go({ to: "/groups/create" }); setIsOpen(false); },
      ariaLabel: t("dashboard.createGroup"),
      "data-track-id": "cta:fab:groups:create",
      "data-track-category": "dashboard",
    },
    {
      icon: <UserPlusIcon className="h-5 w-5" />,
      label: t("dashboard.inviteFriend"),
      onClick: () => { tap(); go({ to: "/friends" }); setIsOpen(false); },
      ariaLabel: t("dashboard.inviteFriend"),
      "data-track-id": "cta:fab:friends",
      "data-track-category": "dashboard",
    },
    {
      icon: <FabIcon src="/assets/fab/fab-financial-assistant.png" />,
      label: t("dashboard.financialAssistant"),
      onClick: () => {
        tap();
        window.dispatchEvent(new CustomEvent("fairpay:open-chat"));
        setIsOpen(false);
      },
      ariaLabel: t("dashboard.financialAssistant"),
      "data-track-id": "cta:fab:ai-chat",
      "data-track-category": "dashboard",
    },
  ];

  // Hide FAB for unauthenticated users
  if (disabled) return null;

  return (
    <FloatingActionStack
      side="right"
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      trigger={
        <FloatingPill
          variant="primary"
          size="lg"
          ariaLabel={isOpen ? t("dashboard.closeMenu") : t("dashboard.quickActions")}
          ariaExpanded={isOpen}
          ariaHasPopup="menu"
          onClick={() => { tap(); setIsOpen(!isOpen); }}
          dataAttributes={{ "data-onboarding-target": "fab-button" }}
          data-track-id="cta:fab:toggle"
          data-track-event="cta_click"
          data-track-type="button"
          data-track-category="dashboard"
          className={cn(isOpen && "ring-4 ring-primary/30 shadow-2xl")}
        >
          {/* Animated glow ring behind button */}
          <div
            className={cn(
              "absolute inset-0 rounded-full bg-primary/20 blur-md -z-10",
              "transition-opacity duration-300",
              isOpen ? "opacity-100 animate-pulse" : "opacity-0"
            )}
          />

          {/* Trigger icon — swaps between quick-actions and close asset */}
          <div className="relative z-10 transition-all duration-200">
            <img
              src={isOpen ? "/assets/fab/fab-close.png" : "/assets/fab/fab-quick-actions.png"}
              alt=""
              aria-hidden="true"
              className="h-6 w-6 object-contain"
            />
          </div>
        </FloatingPill>
      }
    >
      <FloatingPillGroup pills={actions} isOpen={isOpen} direction="up" />
    </FloatingActionStack>
  );
}
