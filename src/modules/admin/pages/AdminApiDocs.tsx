import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useDefaultLayout } from "react-resizable-panels";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/ui/use-mobile";
import { AdminPageHeader } from "../components/AdminPageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { FilterIcon, InfoIcon, SearchIcon } from "@/components/ui/icons";
import { useHaptics } from "@/hooks/use-haptics";
import { catalog, filterCatalog, getCatalogStats } from "../api-docs/catalog";
import type { ApiCatalogEntry, ApiFilterState } from "../api-docs/types";
import { DEFAULT_FILTER_STATE } from "../api-docs/types";
import { matchesCategory, type ApiDocsCategory } from "../api-docs/api-docs-helpers";
import { CATEGORIES, categoryLabel } from "./admin-api-docs/shared";
import { CatalogList } from "./admin-api-docs/catalog-list";
import { DetailPane, EmptyPane } from "./admin-api-docs/detail-pane";

export function AdminApiDocs({ embedded = false }: { embedded?: boolean }) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [filters, setFilters] = useState<ApiFilterState>(DEFAULT_FILTER_STATE);
  const [category, setCategory] = useState<ApiDocsCategory>("safe");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { tap } = useHaptics();
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({ id: "fairpay-admin-api-docs" });

  const stats = useMemo(() => getCatalogStats(catalog), []);

  const filteredEntries = useMemo(() => {
    const base = filterCatalog(catalog, filters);
    return base.filter((e) => matchesCategory(e, category));
  }, [filters, category]);

  const selectedEntry = useMemo(
    () => (selectedId ? catalog.find((e) => e.id === selectedId) ?? null : null),
    [selectedId]
  );

  const handleSelect = useCallback(
    (entry: ApiCatalogEntry) => {
      tap();
      setSelectedId(entry.id);
      if (isMobile) setSheetOpen(false);
    },
    [isMobile, tap]
  );

  const listPane = (
    <div className="flex flex-col h-full min-h-0 border rounded-xl bg-card overflow-hidden">
      <div className="p-2.5 border-b space-y-2 shrink-0">
        <div className="relative">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t("adminApiDocs.searchPlaceholder")}
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-muted-foreground">
            {t("adminApiDocs.endpointsCount", {
              filtered: filteredEntries.length,
              total: stats.total,
            })}
          </span>
          <button
            type="button"
            onClick={() => {
              tap();
              setFilters((f) => ({
                ...f,
                showAll: !f.showAll,
                usedInCode: !f.showAll ? "all" : true,
              }));
            }}
            className={cn(
              "flex items-center gap-1.5 text-[11px] rounded-full px-2.5 py-1 border transition-colors",
              filters.showAll
                ? "bg-primary/10 text-primary border-primary/20"
                : "text-muted-foreground border-border hover:bg-accent"
            )}
          >
            <FilterIcon className="w-3 h-3" />
            {filters.showAll ? t("adminApiDocs.allApis") : t("adminApiDocs.inUseOnly")}
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                tap();
                setCategory(c);
              }}
              className={cn(
                "text-[11px] rounded-full px-2.5 py-1 border transition-colors",
                category === c
                  ? "bg-primary text-primary-foreground border-primary"
                  : "text-muted-foreground border-border hover:bg-accent"
              )}
            >
              {categoryLabel(t, c)}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        <CatalogList
          entries={filteredEntries}
          selectedId={selectedId}
          onSelect={handleSelect}
          t={t}
        />
      </div>
    </div>
  );

  const headerDescription = t("adminApiDocs.headerDescription", {
    total: stats.total,
    http: stats.http,
    rpc: stats.rpc,
    usedInCode: stats.usedInCode,
  });

  const headerActions = (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2 text-xs text-muted-foreground">
            <InfoIcon className="h-4 w-4" />
            <span className="hidden sm:inline">{t("adminApiDocs.howToTitle")}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 space-y-1 p-3">
          <p className="text-sm font-medium">{t("adminApiDocs.howToTitle")}</p>
          <p className="text-xs leading-relaxed text-muted-foreground">{t("adminApiDocs.howToBody")}</p>
        </PopoverContent>
      </Popover>
      {isMobile ? (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="h-8" onClick={() => tap()}>
              <FilterIcon className="w-4 h-4 mr-2" />
              {t("adminApiDocs.browse")}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] p-0 flex flex-col">
            <SheetHeader className="p-3 border-b shrink-0">
              <SheetTitle className="text-sm">{t("adminApiDocs.endpointsSheetTitle")}</SheetTitle>
            </SheetHeader>
            <div className="flex-1 min-h-0">{listPane}</div>
          </SheetContent>
        </Sheet>
      ) : null}
    </>
  );

  const detailPane = selectedEntry ? (
    <DetailPane key={selectedEntry.id} entry={selectedEntry} t={t} />
  ) : (
    <EmptyPane t={t} />
  );

  return (
    <div className={embedded ? "space-y-3" : "container max-w-7xl space-y-3 px-2 py-4 md:px-4 md:py-6"}>
      {embedded ? (
        <div className="flex min-w-0 items-center justify-between gap-2">
          <p className="truncate text-xs text-muted-foreground tabular-nums">{headerDescription}</p>
          <div className="flex shrink-0 items-center gap-1.5">{headerActions}</div>
        </div>
      ) : (
        <AdminPageHeader
          title={t("adminApiDocs.title")}
          description={headerDescription}
          actions={headerActions}
        />
      )}

      {isMobile ? (
        <section className="min-h-[24rem]">{detailPane}</section>
      ) : (
        <ResizablePanelGroup
          orientation="horizontal"
          defaultLayout={defaultLayout}
          onLayoutChanged={onLayoutChanged}
          className={cn(
            "h-[calc(100dvh-var(--admin-nav-h)-10rem)] min-h-[28rem]",
            !embedded && "h-[calc(100dvh-var(--admin-nav-h)-12rem)]"
          )}
        >
          <ResizablePanel id="list" defaultSize="32%" minSize="16rem" maxSize="50%" className="min-w-0">
            <aside className="h-full min-h-0">{listPane}</aside>
          </ResizablePanel>
          <ResizableHandle withHandle className="mx-1.5" />
          <ResizablePanel id="detail" minSize="40%" className="min-w-0">
            <section className="h-full min-h-0">{detailPane}</section>
          </ResizablePanel>
        </ResizablePanelGroup>
      )}
    </div>
  );
}
