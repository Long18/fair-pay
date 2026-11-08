import { memo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { CheckIcon, ChevronDownIcon, Loader2Icon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import type { AssistantToolTraceStep } from "../orchestrator/tool-trace";
import { toolTraceLabelKey } from "../utils/tool-trace-i18n";

interface AssistantToolTraceProps {
  steps: readonly AssistantToolTraceStep[];
  language?: string;
  className?: string;
  defaultOpen?: boolean;
}

function digestLng(language?: string): "vi" | "en" | undefined {
  if (!language) return undefined;
  if (language.startsWith("vi")) return "vi";
  if (language.startsWith("en")) return "en";
  return undefined;
}

export const AssistantToolTrace = memo(function AssistantToolTrace({
  steps,
  language,
  className,
  defaultOpen = false,
}: AssistantToolTraceProps) {
  const lng = digestLng(language);
  const { t } = useTranslation(undefined, { lng });
  const [open, setOpen] = useState(defaultOpen);

  if (steps.length === 0) return null;

  const running = steps.some((s) => s.status === "running");
  const doneCount = steps.filter((s) => s.status === "done").length;
  const errorCount = steps.filter((s) => s.status === "error").length;
  const totalCount = doneCount || steps.length;

  const triggerLabel = running
    ? t("aiChat.toolTrace.running", {
        defaultValue: lng === "vi" ? "Đang lấy dữ liệu FairPay…" : "Fetching FairPay data…",
      })
    : errorCount > 0
      ? t("aiChat.toolTrace.usedWithErrors", {
          defaultValue:
            lng === "vi"
              ? `Đã dùng ${steps.length} công cụ, ${errorCount} lỗi`
              : `Used ${steps.length} tools, ${errorCount} failed`,
          count: steps.length,
          errors: errorCount,
        })
      : t("aiChat.toolTrace.used", {
          defaultValue: lng === "vi" ? `Đã dùng ${totalCount} công cụ` : `Used ${totalCount} tools`,
          count: totalCount,
        });

  return (
    <Collapsible open={open} onOpenChange={setOpen} className={cn("mb-2", className)}>
      <CollapsibleTrigger
        className={cn(
          "flex w-full items-center gap-1.5 text-left text-sm text-muted-foreground",
          "hover:text-foreground transition-colors select-none",
        )}
      >
        {running ? (
          <Loader2Icon size={14} className="shrink-0 animate-spin" />
        ) : (
          <ChevronDownIcon
            size={14}
            className={cn("shrink-0 transition-transform", open && "rotate-180")}
          />
        )}
        <span>{triggerLabel}</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="ml-[7px] mt-2 space-y-2 border-l border-border/60 pl-4">
          {steps.map((step, idx) => {
            const label = t(toolTraceLabelKey(step.name), {
              defaultValue: step.name,
            });
            const status = step.status ?? "done";
            return (
              <li key={`${step.name}-${idx}`} className="flex gap-2 text-xs">
                <span className="mt-0.5 shrink-0 text-muted-foreground">
                  {status === "running" ? (
                    <Loader2Icon size={14} className="animate-spin" />
                  ) : status === "error" ? (
                    <span className="text-destructive">!</span>
                  ) : (
                    <CheckIcon size={14} className="text-muted-foreground" />
                  )}
                </span>
                <span className="text-foreground">{label}</span>
              </li>
            );
          })}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
});

export default AssistantToolTrace;
