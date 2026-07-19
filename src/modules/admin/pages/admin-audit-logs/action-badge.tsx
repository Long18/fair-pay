import { Badge } from "@/components/ui/badge";
import {
  PlusIcon,
  PencilIcon,
  Trash2Icon,
} from "@/components/ui/icons";
import { SETTLEMENT_SUMMARY_ACTIONS } from "./constants";

export function ActionBadge({ action }: { action: string }) {
  if (action === "DELETE") return (
    <Badge className="gap-1 text-xs font-medium border bg-[var(--status-error-bg)] text-[var(--status-error-foreground)] border-[var(--status-error-border)] hover:bg-[var(--status-error-bg)]">
      <Trash2Icon className="size-3" aria-hidden="true" />DELETE
    </Badge>
  );
  if (action === "INSERT") return (
    <Badge className="gap-1 text-xs font-medium border bg-[var(--status-success-bg)] text-[var(--status-success-foreground)] border-[var(--status-success-border)] hover:bg-[var(--status-success-bg)]">
      <PlusIcon className="size-3" aria-hidden="true" />INSERT
    </Badge>
  );
  if (action === "UPDATE") return (
    <Badge className="gap-1 text-xs font-medium border bg-[var(--status-warning-bg)] text-[var(--status-warning-foreground)] border-[var(--status-warning-border)] hover:bg-[var(--status-warning-bg)]">
      <PencilIcon className="size-3" aria-hidden="true" />UPDATE
    </Badge>
  );
  if (SETTLEMENT_SUMMARY_ACTIONS.has(action)) {
    return (
      <Badge className="gap-1 text-xs font-medium border bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">
        Settle Up
      </Badge>
    );
  }
  return <Badge variant="outline" className="text-xs">{action}</Badge>;
}
