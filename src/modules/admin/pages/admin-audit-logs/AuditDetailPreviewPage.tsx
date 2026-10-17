import { AuditDetailDialog } from "./detail-dialog";
import { AUDIT_PREVIEW_ENTITY_HINTS, AUDIT_PREVIEW_ENTRY } from "./audit-preview.fixture";

/** DEV-only full-page preview for audit detail UI (no auth). */
export function AuditDetailPreviewPage() {
  if (!import.meta.env.DEV) {
    return null;
  }

  return (
    <div className="min-h-svh bg-muted/30 p-6 flex items-start justify-center">
      <AuditDetailDialog
        entry={AUDIT_PREVIEW_ENTRY}
        entityHints={AUDIT_PREVIEW_ENTITY_HINTS}
        open
        onOpenChange={() => undefined}
      />
    </div>
  );
}
