import { useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { useAdminTranslation } from "../../i18n";
import type {
  AgentOperationStatus,
  ExternalAgentSubmissionStatus,
} from "../../types";
import {
  STATUS_VARIANT,
  EXTERNAL_STATUS_VARIANT,
  isKnownAgentSource,
  normalizeAgentSource,
} from "../admin-agent-operations.utils";

export function useAgentSourceLabel() {
  const { tAdmin } = useAdminTranslation();
  return useCallback(
    (source: string | null | undefined) => {
      const normalized = normalizeAgentSource(source);
      if (!normalized) return tAdmin("agentOperations.sources.unknown");
      if (isKnownAgentSource(normalized)) {
        return tAdmin(
          `agentOperations.sources.${normalized}` as `agentOperations.sources.${typeof normalized}`
        );
      }
      return normalized;
    },
    [tAdmin]
  );
}

export function AgentSourceBadge({ source }: { source: string | null | undefined }) {
  const label = useAgentSourceLabel()(source);
  return (
    <Badge variant="outline" className="font-normal">
      {label}
    </Badge>
  );
}

export function StatusBadge({ status }: { status: AgentOperationStatus }) {
  const { tAdmin } = useAdminTranslation();
  return (
    <Badge variant={STATUS_VARIANT[status]} className="capitalize">
      {tAdmin(`agentOperations.status.${status}` as `agentOperations.status.${AgentOperationStatus}`)}
    </Badge>
  );
}

export function ExternalStatusBadge({ status }: { status: ExternalAgentSubmissionStatus }) {
  const { tAdmin } = useAdminTranslation();
  return (
    <Badge variant={EXTERNAL_STATUS_VARIANT[status]} className="capitalize">
      {tAdmin(
        `agentOperations.externalStatus.${status}` as `agentOperations.externalStatus.${ExternalAgentSubmissionStatus}`
      )}
    </Badge>
  );
}
