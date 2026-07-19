import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCwIcon } from "@/components/ui/icons";
import { useAdminTranslation } from "../../i18n";
import { cn } from "@/lib/utils";
import type {
  AgentOperationStatus,
  ExternalAgentSubmissionStatus,
} from "../../types";
import {
  STATUS_VALUES,
  EXTERNAL_STATUS_VALUES,
  type AgentOpsFeed,
} from "./constants";
import { useAgentSourceLabel } from "./badges";

export function FiltersBar({
  feed,
  onFeedChange,
  search,
  onSearchChange,
  status,
  onStatusChange,
  source,
  onSourceChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  onRefresh,
  isFetching,
}: {
  feed: AgentOpsFeed;
  onFeedChange: (v: AgentOpsFeed) => void;
  search: string;
  onSearchChange: (v: string) => void;
  status: string;
  onStatusChange: (v: string) => void;
  source: string;
  onSourceChange: (v: string) => void;
  dateFrom: string;
  onDateFromChange: (v: string) => void;
  dateTo: string;
  onDateToChange: (v: string) => void;
  onRefresh: () => void;
  isFetching: boolean;
}) {
  const { tAdmin } = useAdminTranslation();
  const sourceLabel = useAgentSourceLabel();

  return (
    <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
      <div className="min-w-[180px]">
        <Label className="text-xs text-muted-foreground">
          {tAdmin("agentOperations.columns.agent")}
        </Label>
        <Select value={feed} onValueChange={(v) => onFeedChange(v as AgentOpsFeed)}>
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="external">
              {tAdmin("agentOperations.feed.external")}
            </SelectItem>
            <SelectItem value="operations">
              {tAdmin("agentOperations.feed.operations")}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex-1 min-w-[180px]">
        <Label className="text-xs text-muted-foreground">
          {tAdmin("common.search")}
        </Label>
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={tAdmin("agentOperations.searchPlaceholder")}
          className="mt-1"
        />
      </div>
      <div className="min-w-[160px]">
        <Label className="text-xs text-muted-foreground">
          {tAdmin("common.status")}
        </Label>
        <Select value={status} onValueChange={onStatusChange}>
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tAdmin("agentOperations.allStatuses")}</SelectItem>
            {feed === "external"
              ? EXTERNAL_STATUS_VALUES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {tAdmin(
                      `agentOperations.externalStatus.${s}` as `agentOperations.externalStatus.${ExternalAgentSubmissionStatus}`
                    )}
                  </SelectItem>
                ))
              : STATUS_VALUES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {tAdmin(
                      `agentOperations.status.${s}` as `agentOperations.status.${AgentOperationStatus}`
                    )}
                  </SelectItem>
                ))}
          </SelectContent>
        </Select>
      </div>
      {feed === "external" ? (
        <div className="min-w-[160px]">
          <Label className="text-xs text-muted-foreground">
            {tAdmin("agentOperations.columns.agent")}
          </Label>
          <Select value={source} onValueChange={onSourceChange}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tAdmin("agentOperations.allSources")}</SelectItem>
              {(["chatgpt", "external_agent"] as const).map((s) => (
                <SelectItem key={s} value={s}>
                  {sourceLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      <div>
        <Label className="text-xs text-muted-foreground">
          {tAdmin("common.fromDate")}
        </Label>
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => onDateFromChange(e.target.value)}
          className="mt-1"
        />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">
          {tAdmin("common.toDate")}
        </Label>
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
          className="mt-1"
        />
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onRefresh}
        aria-label={tAdmin("common.refresh")}
        disabled={isFetching}
      >
        <RefreshCwIcon className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
        {tAdmin("common.refresh")}
      </Button>
    </div>
  );
}
