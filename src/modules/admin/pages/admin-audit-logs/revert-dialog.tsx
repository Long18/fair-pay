import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2Icon, Undo2Icon } from "@/components/ui/icons";
import { useAdminTranslation } from "../../i18n";
import type { AuditLogEntry } from "../../types";
import { SETTLEMENT_SUMMARY_ACTIONS } from "./constants";

export function RevertAuditDialog({
  entry,
  open,
  onOpenChange,
  onConfirm,
  isReverting,
}: {
  entry: AuditLogEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isReverting: boolean;
}) {
  const { tAdmin } = useAdminTranslation();
  if (!entry) return null;

  const actionLabel =
    entry.action_type === "DELETE"
      ? tAdmin("auditLogs.revertAction.delete")
      : entry.action_type === "UPDATE"
        ? tAdmin("auditLogs.revertAction.update")
        : SETTLEMENT_SUMMARY_ACTIONS.has(entry.action_type)
          ? "Settle Up"
          : tAdmin("auditLogs.revertAction.insert");

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{tAdmin("auditLogs.confirmRevertTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {tAdmin("auditLogs.confirmRevertDetailed", { action: actionLabel, table: entry.table_name })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isReverting}>{tAdmin("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isReverting}>
            {isReverting ? (
              <>
                <Loader2Icon className="h-4 w-4 animate-spin mr-2" />
                {tAdmin("auditLogs.reverting")}
              </>
            ) : (
              <>
                <Undo2Icon className="h-4 w-4 mr-2" />
                {tAdmin("auditLogs.revert")}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

