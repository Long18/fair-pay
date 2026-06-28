import { memo, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { CheckIcon, ChevronsUpDownIcon } from "@/components/ui/icons";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  WEB_LLM_FAMILY_ORDER,
  WEB_LLM_MODEL_LIST,
  getWebLlmModelEntry,
  type WebLlmModelId,
} from "@/lib/local-llm/types";
import { cn } from "@/lib/utils";

interface ModelPickerProps {
  value: WebLlmModelId;
  onValueChange: (value: WebLlmModelId) => void;
  disabled?: boolean;
}

/** Format VRAM bytes to a compact human-readable string. */
function formatVram(mb: number): string {
  if (mb >= 1000) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb} MB`;
}

export const ModelPicker = memo(function ModelPicker({
  value,
  onValueChange,
  disabled = false,
}: ModelPickerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const selectedEntry = useMemo(() => getWebLlmModelEntry(value), [value]);

  // Pre-group models by family in display order, filtering to chat-capable ones.
  const groupedModels = useMemo(() => {
    return WEB_LLM_FAMILY_ORDER.map((family) => ({
      family,
      models: WEB_LLM_MODEL_LIST.filter((m) => m.family === family),
    })).filter((g) => g.models.length > 0);
  }, []);

  const handleSelect = (modelId: string) => {
    onValueChange(modelId as WebLlmModelId);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-label={t("aiChat.selectModelAria")}
          disabled={disabled}
          className={cn(
            "flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "hover:bg-accent hover:text-accent-foreground transition-colors",
            "gap-2 text-left",
          )}
        >
          <span className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
            <span className="truncate font-medium">
              {selectedEntry?.label ?? value}
            </span>
            {selectedEntry && (
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatVram(selectedEntry.vramMB)}
              </span>
            )}
          </span>
          <ChevronsUpDownIcon size={14} className="shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[340px] p-0"
        align="start"
        side="bottom"
        sideOffset={4}
      >
        <Command>
          <CommandInput placeholder={t("aiChat.modelPicker.searchPlaceholder")} />
          <CommandList className="max-h-[340px]">
            <CommandEmpty>{t("aiChat.modelPicker.noResults")}</CommandEmpty>

            {groupedModels.map(({ family, models }) => (
              <CommandGroup key={family} heading={family}>
                {models.map((model) => (
                  <CommandItem
                    key={model.id}
                    value={`${model.family} ${model.label} ${model.id}`}
                    onSelect={() => handleSelect(model.id)}
                    className="flex items-center justify-between gap-2 py-2"
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
                      {/* Checkmark for selected model */}
                      <CheckIcon
                        size={14}
                        className={cn(
                          "shrink-0",
                          value === model.id ? "text-primary" : "text-transparent",
                        )}
                      />
                      <span className="truncate text-sm">{model.label}</span>
                    </span>

                    {/* Right side: metadata badges */}
                    <span className="flex shrink-0 items-center gap-1">
                      {model.lowResource && (
                        <Badge
                          variant="secondary"
                          className="h-4 px-1 py-0 text-[10px] leading-none"
                        >
                          {t("aiChat.modelPicker.lowVram")}
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className="h-4 px-1 py-0 text-[10px] leading-none text-muted-foreground"
                      >
                        {formatVram(model.vramMB)}
                      </Badge>
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
});

export default ModelPicker;
