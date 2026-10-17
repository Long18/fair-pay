import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatRecipientEmails } from "./helpers";
import type { AdminT, DebtReminderRow } from "./types";

export interface EmailConfirmBulkDialogProps {
  tAdmin: AdminT;
  sendingUserId: string | null;
  selectedRows: DebtReminderRow[];
  recipientSelections: Record<string, string[]>;
  confirmBulkOpen: boolean;
  setConfirmBulkOpen: (open: boolean) => void;
  handleRemindSelected: () => Promise<void>;
}

export function EmailConfirmBulkDialog({
  tAdmin,
  sendingUserId,
  selectedRows,
  recipientSelections,
  confirmBulkOpen,
  setConfirmBulkOpen,
  handleRemindSelected,
}: EmailConfirmBulkDialogProps) {
  return (
    <AlertDialog open={confirmBulkOpen} onOpenChange={setConfirmBulkOpen}>
      <AlertDialogContent className="max-h-[min(90dvh,720px)] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>{tAdmin("devtool.confirmBulkTitle", { count: selectedRows.length })}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>{tAdmin("devtool.emailRecipients")}</p>
              <ScrollArea className="h-40 max-h-40 rounded-md border pr-2">
                <ol className="list-inside list-decimal space-y-1 px-3 py-2 text-left text-sm">
                  {selectedRows.map((r) => (
                    <li key={r.user_id} className="min-w-0 break-words" translate="no">
                      {r.full_name} — {formatRecipientEmails(r, recipientSelections)}
                    </li>
                  ))}
                </ol>
              </ScrollArea>
              <p className="text-xs text-muted-foreground">
                {tAdmin("devtool.confirmBulkDescription")}
              </p>
              <p className="text-xs text-muted-foreground">
                {tAdmin("devtool.confirmBulkTimingHint")}
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={sendingUserId === "__bulk__"}>{tAdmin("common.cancel")}</AlertDialogCancel>
          <Button
            type="button"
            disabled={sendingUserId === "__bulk__"}
            onClick={() => {
              void handleRemindSelected();
            }}
          >
            {sendingUserId === "__bulk__" ? tAdmin("devtool.sending") : tAdmin("devtool.sendEmail")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
