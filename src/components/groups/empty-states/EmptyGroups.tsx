import React from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export function EmptyGroups() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <span className="text-5xl mb-4" role="img" aria-label="group">
        👥
      </span>
      <h3 className="text-lg font-semibold mb-1">
        {t("emptyState.groups.title", { defaultValue: "No groups yet" })}
      </h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-xs">
        {t("emptyState.groups.description", {
          defaultValue:
            "Create a group to split expenses with friends, housemates, or colleagues.",
        })}
      </p>
      <Button asChild>
        <Link to="/groups/create">
          {t("emptyState.groups.cta", { defaultValue: "Create your first group" })}
        </Link>
      </Button>
    </div>
  );
}
