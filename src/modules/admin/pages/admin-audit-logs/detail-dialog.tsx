import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { AuditLogEntry } from "../../types";
import type { AuditEntityHints } from "./use-audit-entities";
import { AuditDetailBody, AuditDetailMeta, AuditDetailTitle } from "./audit-detail-body";

export function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

/**
 * Standalone dialog wrapper around `AuditDetailBody`. The audit log page uses
 * `AdminMasterDetail`; this remains for the DEV preview route.
 */
export function AuditDetailDialog({
  entry,
  open,
  onOpenChange,
  entityHints,
}: {
  entry: AuditLogEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityHints?: AuditEntityHints | null;
}) {
  if (!entry) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92vh,52rem)] w-[min(100vw-1.5rem,42rem)] flex-col gap-3 sm:max-w-3xl">
        <DialogHeader className="shrink-0 space-y-1.5 pr-8">
          <DialogTitle className="text-left">
            <AuditDetailTitle entry={entry} />
          </DialogTitle>
          <DialogDescription asChild>
            <div className="text-left">
              <AuditDetailMeta entry={entry} />
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="-mx-1 min-h-0 flex-1 overflow-y-auto overscroll-contain px-1">
          {open ? <AuditDetailBody entry={entry} entityHints={entityHints} /> : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
