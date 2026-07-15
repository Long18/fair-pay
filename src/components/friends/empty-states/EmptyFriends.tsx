import React from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { UserPlusIcon } from "@/components/ui/icons";

export function EmptyFriends() {
  const { t } = useTranslation();

  return (
    <Empty className="py-16 border-0">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <UserPlusIcon className="h-6 w-6" />
        </EmptyMedia>
        <EmptyTitle>
          {t("emptyState.friends.title", { defaultValue: "No friends added yet" })}
        </EmptyTitle>
        <EmptyDescription>
          {t("emptyState.friends.description", {
            defaultValue: "Add friends to start splitting expenses together.",
          })}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild>
          <Link to="/friends">
            {t("emptyState.friends.cta", { defaultValue: "Add a friend" })}
          </Link>
        </Button>
      </EmptyContent>
    </Empty>
  );
}
