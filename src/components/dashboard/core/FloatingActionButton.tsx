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
          variant="bare"
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
          <img
            src={isOpen ? "/assets/fab/fab-close.png" : "/assets/fab/fab-quick-actions.png"}
            alt=""
            aria-hidden="true"
            className="h-8 w-8 object-contain"
          />
        </FloatingPill>
      }
    >
      <FloatingPillGroup pills={actions} isOpen={isOpen} direction="up" />
    </FloatingActionStack>
  );
}
