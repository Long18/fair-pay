import { useGo } from "@refinedev/core";
import { useTable } from "@refinedev/react-table";
import { DataTable } from "@/components/refine-ui/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useGroupColumns } from "../components/group-table-columns";
import { Group } from "../types";

export const GroupList = () => {
  const go = useGo();
  const columns = useGroupColumns();

  const table = useTable<Group>({
    columns,
    refineCoreProps: {
      resource: "groups",
      meta: {
        select: "*",
      },
    },
  });

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Groups</h1>
          <p className="text-muted-foreground">
            Manage your expense groups
          </p>
        </div>
        <Button onClick={() => go({ to: "/groups/create" })}>
          <Plus className="h-4 w-4 mr-2" />
          Create Group
        </Button>
      </div>

      <DataTable table={table} />
    </div>
  );
};
