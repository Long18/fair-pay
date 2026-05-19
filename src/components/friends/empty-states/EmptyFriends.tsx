import React from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export function EmptyFriends() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <span className="text-5xl mb-4" role="img" aria-label="friends">
        🤝
      </span>
      <h3 className="text-lg font-semibold mb-1">
        {t("emptyState.friends.title", { defaultValue: "No friends added yet" })}
      </h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-xs">
        {t("emptyState.friends.description", {
          defaultValue: "Add friends to start splitting expenses together.",
        })}
      </p>
      <Button asChild>
        <Link to="/friends">
          {t("emptyState.friends.cta", { defaultValue: "Add a friend" })}
        </Link>
      </Button>
    </div>
  );
}
