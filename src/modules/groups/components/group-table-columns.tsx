import { ColumnDef } from "@tanstack/react-table";
import { Group } from "../types";
import { Button } from "@/components/ui/button";
import { Eye, Pencil } from "lucide-react";
import { useGo } from "@refinedev/core";

export const useGroupColumns = (): ColumnDef<Group>[] => {
  const go = useGo();

  return [
    {
      accessorKey: "name",
      header: "Group Name",
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("name")}</div>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => {
        const description = row.getValue("description") as string | null;
        return (
          <div className="text-sm text-muted-foreground truncate max-w-md">
            {description || "No description"}
          </div>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: "Created",
      cell: ({ row }) => {
        const date = new Date(row.getValue("created_at"));
        return (
          <div className="text-sm">
            {date.toLocaleDateString("vi-VN", {
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
      header: "Actions",
      cell: ({ row }) => {
        const group = row.original;
        return (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => go({ to: `/groups/show/${group.id}` })}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => go({ to: `/groups/edit/${group.id}` })}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];
};
