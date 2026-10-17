import { useId } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdminTranslation } from "../../i18n";

interface BaseFilterField {
  key: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Small muted note rendered next to the label */
  hint?: string;
}

export type FilterField =
  | (BaseFilterField & { kind: "date" })
  | (BaseFilterField & { kind: "number"; placeholder?: string })
  | (BaseFilterField & {
      kind: "select";
      options: ReadonlyArray<{ value: string; label: string }>;
    });

interface FilterPopoverFormProps {
  fields: FilterField[];
  onClear: () => void;
  onDone: () => void;
  canClear: boolean;
}

/** Filter form shown inside `AdminPageToolbar`'s filter popover. Values apply as they change. */
export function FilterPopoverForm({ fields, onClear, onDone, canClear }: FilterPopoverFormProps) {
  const { tAdmin } = useAdminTranslation();
  const idPrefix = useId();

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{tAdmin("layout.shell.filters")}</p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
        {fields.map((field) => {
          const id = `${idPrefix}-${field.key}`;
          return (
            <div key={field.key} className="min-w-0 space-y-1">
              <Label htmlFor={id} className="gap-1 text-xs font-normal text-muted-foreground">
                <span className="truncate">{field.label}</span>
                {field.hint ? (
                  <span className="truncate text-[10px] text-muted-foreground/70">({field.hint})</span>
                ) : null}
              </Label>
              {field.kind === "select" ? (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id={id} size="sm" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id={id}
                  type={field.kind}
                  inputMode={field.kind === "number" ? "decimal" : undefined}
                  placeholder={field.kind === "number" ? field.placeholder : undefined}
                  value={field.value}
                  onChange={(event) => field.onChange(event.target.value)}
                  className="h-8 text-sm"
                />
              )}
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-end gap-2 border-t pt-3">
        <Button variant="ghost" size="sm" className="cursor-pointer" onClick={onClear} disabled={!canClear}>
          {tAdmin("common.clearFilters")}
        </Button>
        <Button size="sm" className="cursor-pointer" onClick={onDone}>
          {tAdmin("layout.transactions.done")}
        </Button>
      </div>
    </div>
  );
}
