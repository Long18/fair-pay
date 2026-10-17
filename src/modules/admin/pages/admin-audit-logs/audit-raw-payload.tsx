import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CodeIcon, ChevronDownIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { useAdminTranslation } from "../../i18n";

export function AuditRawPayloadToggle({ data }: { data: unknown }) {
  const { tAdmin } = useAdminTranslation();
  const [open, setOpen] = useState(false);

  return (
    <div className="pt-2 border-t">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 text-xs text-muted-foreground"
        onClick={() => setOpen((v) => !v)}
      >
        <CodeIcon className="h-3.5 w-3.5" />
        {tAdmin("auditLogs.viewRawData")}
        <ChevronDownIcon className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </Button>
      {open ? (
        <pre className="mt-2 text-[11px] leading-relaxed bg-muted rounded-md p-3 overflow-x-auto max-h-56 whitespace-pre-wrap break-all font-mono">
          {JSON.stringify(data, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
