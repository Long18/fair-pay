import React from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export function EmptyDashboard() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <span className="text-5xl mb-4" role="img" aria-label="wallet">
        💸
      </span>
      <h3 className="text-lg font-semibold mb-1">
        {t("emptyState.dashboard.title")}
      </h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-xs">
        {t("emptyState.dashboard.description", {
          defaultValue: "Track shared expenses and settle debts with friends.",
        })}
      </p>
      <Button asChild>
        <Link to="/expenses/create">{t("emptyState.dashboard.cta")}</Link>
      </Button>
    </div>
  );
}
