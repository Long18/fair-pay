import { memo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useGo } from "@refinedev/core";
import { Button } from "@/components/ui/button";
import { useHaptics } from "@/hooks/use-haptics";
import { BALANCE_TABLE_GLASS_PANEL } from "@/components/dashboard/balance/balance-table-surface";
import { cn } from "@/lib/utils";

interface AssistantCapabilitiesCardProps {
  language?: string;
  onQuickPrompt?: (prompt: string) => void;
  className?: string;
}

function digestLng(language?: string): "vi" | "en" | undefined {
  if (!language) return undefined;
  if (language.startsWith("vi")) return "vi";
  if (language.startsWith("en")) return "en";
  return undefined;
}

export const AssistantCapabilitiesCard = memo(function AssistantCapabilitiesCard({
  language,
  onQuickPrompt,
  className,
}: AssistantCapabilitiesCardProps) {
  const lng = digestLng(language);
  const { t } = useTranslation(undefined, { lng });
  const go = useGo();
  const { tap } = useHaptics();

  const digestPrompt = t("aiChat.capabilitiesCard.digestPrompt", {
    defaultValue: lng === "vi" ? "Tổng hợp FairPay" : "FairPay summary",
  });

  const items = [
    { key: "debt", label: t("aiChat.capabilitiesCard.debt", { defaultValue: "Balances & debts" }) },
    { key: "groups", label: t("aiChat.capabilitiesCard.groups", { defaultValue: "Your groups" }) },
    { key: "friends", label: t("aiChat.capabilitiesCard.friends", { defaultValue: "Friends" }) },
    { key: "expenses", label: t("aiChat.capabilitiesCard.expenses", { defaultValue: "Recent expenses" }) },
    { key: "comments", label: t("aiChat.capabilitiesCard.comments", { defaultValue: "Expense comments" }) },
    { key: "preview", label: t("aiChat.capabilitiesCard.preview", { defaultValue: "Group expense preview" }) },
  ];

  const quickPrompts = [
    {
      key: "digest",
      label: t("aiChat.capabilitiesCard.actionDigest", {
        defaultValue: lng === "vi" ? "Tổng hợp đầy đủ" : "Full summary",
      }),
      prompt: digestPrompt,
      primary: true,
    },
    {
      key: "debt",
      label: t("aiChat.suggestions.whoOwes"),
      prompt: t("aiChat.suggestions.whoOwes"),
    },
    {
      key: "groups",
      label: t("aiChat.suggestions.myGroups"),
      prompt: t("aiChat.suggestions.myGroups"),
    },
    {
      key: "friends",
      label: t("aiChat.suggestions.myFriends"),
      prompt: t("aiChat.suggestions.myFriends"),
    },
    {
      key: "spending",
      label: t("aiChat.suggestions.topSpending"),
      prompt: t("aiChat.suggestions.topSpending"),
    },
  ];

  const openBalances = useCallback(() => {
    tap();
    go({ to: "/" });
  }, [go, tap]);

  const openConnections = useCallback(() => {
    tap();
    go({ to: "/connections" });
  }, [go, tap]);

  return (
    <article
      className={cn(BALANCE_TABLE_GLASS_PANEL, "overflow-hidden", className)}
      data-testid="assistant-capabilities-card"
    >
      <header className="border-b border-border/60 px-3 py-3 sm:px-4">
        <h2 className="text-sm font-semibold tracking-tight">
          {t("aiChat.capabilitiesCard.title")}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
          {t("aiChat.capabilitiesCard.subtitle")}
        </p>
      </header>

      <ul className="divide-y divide-border/60 px-3 py-1 sm:px-4">
        {items.map((item) => (
          <li key={item.key} className="py-2 text-sm">
            {item.label}
          </li>
        ))}
      </ul>

      <p className="border-t border-border/60 px-3 py-2 text-xs text-muted-foreground sm:px-4">
        {t("aiChat.capabilitiesCard.notInChat")}
      </p>

      <div className="flex flex-wrap gap-2 border-t border-border/60 px-3 py-3 sm:px-4">
        {quickPrompts.map((action) => (
          <Button
            key={action.key}
            type="button"
            size="sm"
            variant={action.primary ? "default" : "outline"}
            className="h-8 text-xs"
            disabled={!onQuickPrompt}
            onClick={() => {
              tap();
              onQuickPrompt?.(action.prompt);
            }}
          >
            {action.label}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-border/60 bg-muted/20 px-3 py-2.5 sm:px-4">
        <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={openBalances}>
          {t("aiChat.capabilitiesCard.openDashboard")}
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={openConnections}>
          {t("aiChat.capabilitiesCard.openConnections")}
        </Button>
      </div>
    </article>
  );
});

export default AssistantCapabilitiesCard;
