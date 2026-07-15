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
import { UsersIcon } from "@/components/ui/icons";

export function EmptyGroups() {
  const { t } = useTranslation();

  return (
    <Empty className="py-16 border-0">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <UsersIcon className="h-6 w-6" />
        </EmptyMedia>
        <EmptyTitle>
          {t("emptyState.groups.title", { defaultValue: "No groups yet" })}
        </EmptyTitle>
        <EmptyDescription>
          {t("emptyState.groups.description", {
            defaultValue:
              "Create a group to split expenses with friends, housemates, or colleagues.",
          })}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild>
          <Link to="/groups/create">
            {t("emptyState.groups.cta", { defaultValue: "Create your first group" })}
          </Link>
        </Button>
      </EmptyContent>
    </Empty>
  );
}
