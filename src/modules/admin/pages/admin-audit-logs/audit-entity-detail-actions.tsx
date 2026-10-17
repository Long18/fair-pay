import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAdminTranslation } from "../../i18n";
import type { AuditPreviewTarget } from "./audit-entity-preview";

export function AuditEntityDetailActions({
  target,
  onNavigate,
  onPreview,
  className,
}: {
  target: AuditPreviewTarget;
  /** Called when a link is followed (e.g. close parent dialog). */
  onNavigate?: () => void;
  /** Opens full preview modal (email, member count, …). */
  onPreview?: () => void;
  className?: string;
}) {
  const { tAdmin } = useAdminTranslation();
  const id = target.id;

  return (
    <div
      className={cn(
        "flex flex-col gap-2 pt-3 sm:flex-row sm:flex-wrap sm:items-center",
        className,
      )}
    >
      {target.kind === "user" ? (
        <>
          <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
            <Link to={`/admin/people/${id}/journey`} onClick={onNavigate}>
              {tAdmin("auditLogs.openUserJourney")}
            </Link>
          </Button>
          <Button size="sm" asChild className="w-full sm:w-auto">
            <Link to="/admin/people?tab=users" onClick={onNavigate}>
              {tAdmin("auditLogs.openInPeople")}
            </Link>
          </Button>
        </>
      ) : null}

      {target.kind === "group" ? (
        <>
          <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
            <Link to={`/groups/show/${id}`} onClick={onNavigate}>
              {tAdmin("auditLogs.openGroupApp")}
            </Link>
          </Button>
          <Button size="sm" asChild className="w-full sm:w-auto">
            <Link to="/admin/people?tab=groups" onClick={onNavigate}>
              {tAdmin("auditLogs.openInPeople")}
            </Link>
          </Button>
        </>
      ) : null}

      {target.kind === "expense" ? (
        <>
          <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
            <Link to={`/expenses/show/${id}`} onClick={onNavigate}>
              {tAdmin("auditLogs.openExpenseApp")}
            </Link>
          </Button>
          <Button size="sm" asChild className="w-full sm:w-auto">
            <Link to="/admin/transactions?tab=expenses" onClick={onNavigate}>
              {tAdmin("auditLogs.openInTransactions")}
            </Link>
          </Button>
        </>
      ) : null}

      {onPreview ? (
        <Button type="button" variant="secondary" size="sm" className="w-full sm:w-auto" onClick={onPreview}>
          {tAdmin("common.preview")}
        </Button>
      ) : null}
    </div>
  );
}
