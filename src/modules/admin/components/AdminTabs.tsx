import { Fragment, type ComponentType, type ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface AdminTabItem {
  value: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  /** When false, tab is omitted from list (e.g. feature-flagged) */
  enabled?: boolean;
  /** Optional group heading used by the `rail` layout and the mobile select */
  group?: string;
}

export interface AdminTabsProps {
  items: AdminTabItem[];
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
  className?: string;
  /** Show Select instead of TabsList below `md` */
  mobileAsSelect?: boolean;
  /**
   * - `inline` (default): compact tab strip that shares a row with `header`
   * - `scroll`: same as inline, kept for backwards compatibility
   * - `grid`: same as inline, kept for backwards compatibility
   * - `rail`: vertical tab rail beside the content on `lg+`
   */
  layout?: "inline" | "grid" | "scroll" | "rail";
  /** Page title block rendered on the same row as the tab strip (md+) */
  header?: ReactNode;
  /** Extra classes for the TabsList */
  listClassName?: string;
}

function groupItems(items: AdminTabItem[]) {
  const groups: { name: string | undefined; items: AdminTabItem[] }[] = [];
  for (const item of items) {
    const last = groups.at(-1);
    if (last && last.name === item.group) last.items.push(item);
    else groups.push({ name: item.group, items: [item] });
  }
  return groups;
}

function MobileTabSelect({
  items,
  value,
  onValueChange,
}: Pick<AdminTabsProps, "items" | "value" | "onValueChange">) {
  const groups = groupItems(items);
  return (
    <div className="md:hidden">
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {groups.map((group) => (
            <SelectGroup key={group.items[0].value}>
              {group.name ? <SelectLabel>{group.name}</SelectLabel> : null}
              {group.items.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function AdminTabs({
  items,
  value,
  onValueChange,
  children,
  className,
  mobileAsSelect = true,
  layout = "inline",
  header,
  listClassName,
}: AdminTabsProps) {
  const visible = items.filter((item) => item.enabled !== false);

  if (layout === "rail") {
    const groups = groupItems(visible);
    return (
      <Tabs
        value={value}
        onValueChange={onValueChange}
        className={cn("gap-3", className)}
      >
        {header}
        {mobileAsSelect ? (
          <MobileTabSelect items={visible} value={value} onValueChange={onValueChange} />
        ) : null}
        <div className="flex min-w-0 flex-col gap-3 lg:grid lg:grid-cols-[12.5rem_minmax(0,1fr)] lg:items-start lg:gap-5">
          <TabsList
            variant="underline"
            className={cn(
              "w-full justify-start overflow-x-auto scrollbar-none",
              "lg:sticky lg:top-[calc(var(--admin-nav-h)+0.75rem)] lg:flex-col lg:items-stretch lg:gap-0.5 lg:overflow-visible lg:border-b-0",
              mobileAsSelect && "hidden md:flex",
              listClassName
            )}
          >
            {groups.map((group, index) => (
              <Fragment key={group.items[0].value}>
                {group.name ? (
                  <span
                    className={cn(
                      "hidden px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80 lg:block",
                      index > 0 && "pt-3"
                    )}
                  >
                    {group.name}
                  </span>
                ) : null}
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <TabsTrigger
                      key={item.value}
                      value={item.value}
                      className={cn(
                        "shrink-0 flex-none gap-2",
                        "lg:justify-start lg:rounded-md lg:border-b-0 lg:px-3 lg:py-2",
                        "lg:data-[state=active]:bg-primary/10 lg:data-[state=active]:text-primary",
                        "lg:hover:bg-accent/60"
                      )}
                    >
                      {Icon ? <Icon className="h-4 w-4" /> : null}
                      {item.label}
                    </TabsTrigger>
                  );
                })}
              </Fragment>
            ))}
          </TabsList>
          <div className="min-w-0">{children}</div>
        </div>
      </Tabs>
    );
  }

  return (
    <Tabs
      value={value}
      onValueChange={onValueChange}
      className={cn("gap-3", className)}
    >
      <div
        className={cn(
          "flex min-w-0 flex-col gap-2",
          header && "md:flex-row md:items-center md:justify-between md:gap-4"
        )}
      >
        {header}
        {mobileAsSelect ? (
          <MobileTabSelect items={visible} value={value} onValueChange={onValueChange} />
        ) : null}
        <TabsList
          className={cn(
            "max-w-full shrink-0 justify-start overflow-x-auto scrollbar-none",
            mobileAsSelect && "hidden md:inline-flex",
            listClassName
          )}
        >
          {visible.map((item) => {
            const Icon = item.icon;
            return (
              <TabsTrigger
                key={item.value}
                value={item.value}
                className="flex-none gap-2 px-3"
              >
                {Icon ? <Icon className="h-4 w-4" /> : null}
                {item.label}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </div>

      {children}
    </Tabs>
  );
}

export { TabsContent as AdminTabsContent };
