import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  FilterIcon,
  XIcon,
} from "@/components/ui/icons";
import { useAdminTranslation } from "../../i18n";
import type { AuditFilterOptions } from "../../types";

export function AuditFilterPopover({
  filterCount,
  actionFilter, setActionFilter,
  tableFilter, setTableFilter,
  actorFilter, setActorFilter,
  dateFrom, setDateFrom,
  dateTo, setDateTo,
  filterOptions,
  onClear,
  tap,
}: {
  filterCount: number;
  actionFilter: string; setActionFilter: (v: string) => void;
  tableFilter: string; setTableFilter: (v: string) => void;
  actorFilter: string; setActorFilter: (v: string) => void;
  dateFrom: string; setDateFrom: (v: string) => void;
  dateTo: string; setDateTo: (v: string) => void;
  filterOptions: AuditFilterOptions | undefined;
  onClear: () => void;
  tap: () => void;
}) {
  const { tAdmin } = useAdminTranslation();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-10 sm:h-9 gap-2 shrink-0">
          <FilterIcon className="h-4 w-4" />
          <span className="hidden min-[420px]:inline">{tAdmin("common.filter")}</span>
          {filterCount > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-xs">{filterCount}</Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-4" align="start">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold">Filters</p>
          {filterCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground" onClick={() => { onClear(); setOpen(false); }}>
              <XIcon className="h-3 w-3 mr-1" />
              {tAdmin("common.clearAll")}
            </Button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{tAdmin("auditLogs.actionType")}</Label>
            <Select value={actionFilter} onValueChange={(v) => { tap(); setActionFilter(v); }}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder={tAdmin("common.all")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tAdmin("auditLogs.allActions")}</SelectItem>
                {(filterOptions?.action_types ?? []).map((t) => (
                  <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{tAdmin("auditLogs.tableEntity")}</Label>
            <Select value={tableFilter} onValueChange={(v) => { tap(); setTableFilter(v); }}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder={tAdmin("common.all")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tAdmin("auditLogs.allTables")}</SelectItem>
                {(filterOptions?.tables ?? []).map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label className="text-xs text-muted-foreground">{tAdmin("auditLogs.actor")}</Label>
            <Select value={actorFilter} onValueChange={(v) => { tap(); setActorFilter(v); }}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder={tAdmin("common.all")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tAdmin("auditLogs.allActors")}</SelectItem>
                {(filterOptions?.actors ?? []).map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{tAdmin("common.fromDate")}</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-8 text-xs" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{tAdmin("common.toDate")}</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-8 text-xs" />
          </div>
        </div>
        <Separator className="my-3" />
        <Button size="sm" className="w-full h-8 text-xs" onClick={() => setOpen(false)}>
          Apply
        </Button>
      </PopoverContent>
    </Popover>
  );
}
