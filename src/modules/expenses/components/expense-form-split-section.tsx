import { UsersIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";

interface ExpenseFormSplitSectionProps {
  children: ReactNode;
  className?: string;
}

/** Wireframe A split block — single border layer, no nested border-2 cards. */
export function ExpenseFormSplitSection({
  children,
  className,
}: ExpenseFormSplitSectionProps) {
  const { t } = useTranslation();

  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-card shadow-sm",
        className
      )}
      aria-label={t("expenses.splitBetween")}
    >
      <div className="border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <UsersIcon className="h-5 w-5 shrink-0 text-primary" aria-hidden />
          <h2 className="text-base font-semibold">{t("expenses.splitBetween")}</h2>
        </div>
        <p className="mt-1 pl-7 text-sm text-muted-foreground">
          {t("expenses.splitBetweenHint")}
        </p>
      </div>
      <div className="space-y-4 overflow-x-hidden p-4 pt-3">{children}</div>
    </section>
  );
}
