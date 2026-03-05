import { ColumnDef } from "@tanstack/react-table";
import { useTranslation } from "react-i18next";
import { Group } from "../types";
import { Button } from "@/components/ui/button";
import { useGo } from "@refinedev/core";
import { formatDate } from "@/lib/locale-utils";
import { useHaptics } from "@/hooks/use-haptics";

import { EyeIcon, PencilIcon } from "@/components/ui/icons";

export const useGroupColumns = (): ColumnDef<Group>[] => {
  const { t } = useTranslation();
  const go = useGo();
  const { tap } = useHaptics();

  return [
    {
      accessorKey: "name",
      header: t("groups.groupName"),
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("name")}</div>
      ),
    },
    {
      accessorKey: "description",
      header: t("groups.description"),
      cell: ({ row }) => {
        const description = row.getValue("description") as string | null;
        return (
          <div className="text-sm text-muted-foreground truncate max-w-md">
            {description || t("expenses.noDescription")}
          </div>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: t("groups.created"),
      cell: ({ row }) => {
        const date = new Date(row.getValue("created_at"));
        return (
          <div className="text-sm">
            {formatDate(date, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: t("groups.actions"),
      cell: ({ row }) => {
        const group = row.original;
        return (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { tap(); go({ to: `/groups/show/${group.id}` }); }}
            >
              <EyeIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { tap(); go({ to: `/groups/edit/${group.id}` }); }}
            >
              <PencilIcon className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];
};
