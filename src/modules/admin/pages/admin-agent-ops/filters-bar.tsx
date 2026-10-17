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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { XIcon } from "@/components/ui/icons";
import { useAdminTranslation } from "../../i18n";
import {
  STATUS_VALUES,
  EXTERNAL_STATUS_VALUES,
  type AgentOpsFeed,
} from "./constants";
import { useAgentSourceLabel, useStatusLabel } from "./badges";

/** Segmented External / In-app switch for the toolbar. */
export function AgentOpsFeedToggle({
  feed,
  onFeedChange,
}: {
  feed: AgentOpsFeed;
  onFeedChange: (v: AgentOpsFeed) => void;
}) {
  const { tAdmin } = useAdminTranslation();
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      value={feed}
      onValueChange={(v) => {
        if (v) onFeedChange(v as AgentOpsFeed);
      }}
      aria-label={tAdmin("layout.devtool.feed")}
      className="h-10 sm:h-9"
    >
      <ToggleGroupItem
        value="external"
        className="h-full px-3 text-xs data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
      >
        {tAdmin("agentOperations.feed.external")}
      </ToggleGroupItem>
      <ToggleGroupItem
        value="operations"
        className="h-full px-3 text-xs data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
      >
        {tAdmin("agentOperations.feed.operations")}
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

/** Filter form rendered in the toolbar filter popover. */
export function AgentOpsFilterFields({
  feed,
  status,
  onStatusChange,
  source,
  onSourceChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  filterCount,
  onClear,
  onDone,
}: {
  feed: AgentOpsFeed;
  status: string;
  onStatusChange: (v: string) => void;
  source: string;
  onSourceChange: (v: string) => void;
  dateFrom: string;
  onDateFromChange: (v: string) => void;
  dateTo: string;
  onDateToChange: (v: string) => void;
  filterCount: number;
  onClear: () => void;
  onDone: () => void;
}) {
  const { tAdmin } = useAdminTranslation();
  const sourceLabel = useAgentSourceLabel();
  const statusLabel = useStatusLabel(feed);
  const statuses = feed === "external" ? EXTERNAL_STATUS_VALUES : STATUS_VALUES;

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold">{tAdmin("layout.shell.filters")}</p>
        {filterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground"
            onClick={() => {
              onClear();
              onDone();
            }}
          >
            <XIcon className="mr-1 h-3 w-3" />
            {tAdmin("common.clearAll")}
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className={feed === "external" ? "space-y-1.5" : "col-span-2 space-y-1.5"}>
          <Label className="text-xs text-muted-foreground">{tAdmin("common.status")}</Label>
          <Select value={status} onValueChange={onStatusChange}>
            <SelectTrigger className="h-8 w-full text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tAdmin("agentOperations.allStatuses")}</SelectItem>
              {statuses.map((s) => (
                <SelectItem key={s} value={s}>
                  {statusLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {feed === "external" ? (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              {tAdmin("agentOperations.columns.agent")}
            </Label>
            <Select value={source} onValueChange={onSourceChange}>
              <SelectTrigger className="h-8 w-full text-xs">
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
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{tAdmin("common.fromDate")}</Label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{tAdmin("common.toDate")}</Label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
      </div>
      <Button size="sm" className="mt-3 h-8 w-full text-xs" onClick={onDone}>
        {tAdmin("layout.devtool.applyFilters")}
      </Button>
    </>
  );
}
