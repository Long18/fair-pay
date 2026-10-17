import type { RefObject } from "react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyMedia,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { Loader2Icon, AlertCircleIcon, CheckCircle2Icon } from "@/components/ui/icons";
import { AdminMobilePagination } from "@/modules/admin/components/AdminMobileCards";
import { AdminTableScroll } from "@/modules/admin/components/AdminTableScroll";
import { useAdminTranslation } from "../../i18n";
import type { AgentOperationRow, ExternalAgentSubmissionRow } from "../../types";
import type { AgentOpsFeed } from "./constants";
import {
  OperationsTable,
  ExternalSubmissionsTable,
  OperationsCardsList,
  ExternalCardsList,
} from "./tables-and-cards";

function FeedPager({
  summary,
  page,
  totalPages,
  onPage,
}: {
  summary: string;
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
}) {
  const { tAdmin } = useAdminTranslation();
  const canPrevious = page > 0;
  const canNext = page < totalPages - 1;

  return (
    <>
      <div className="hidden shrink-0 items-center justify-between gap-3 md:flex">
        <span className="text-xs text-muted-foreground">{summary}</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8" disabled={!canPrevious} onClick={() => onPage(page - 1)}>
            {tAdmin("common.previous")}
          </Button>
          <span className="text-xs tabular-nums text-muted-foreground">
            {page + 1} / {totalPages}
          </span>
          <Button variant="outline" size="sm" className="h-8" disabled={!canNext} onClick={() => onPage(page + 1)}>
            {tAdmin("common.next")}
          </Button>
        </div>
      </div>
      <div className="md:hidden">
        <AdminMobilePagination
          summary={summary}
          previousLabel={tAdmin("common.previous")}
          nextLabel={tAdmin("common.next")}
          canPrevious={canPrevious}
          canNext={canNext}
          onPrevious={() => onPage(page - 1)}
          onNext={() => onPage(page + 1)}
        />
      </div>
    </>
  );
}

export function AgentOpsFeedList({
  feed,
  isLoading,
  error,
  hasFilters,
  isMobile,
  opRows,
  extRows,
  onSelectOp,
  onSelectExt,
  selectedId,
  compact,
  scrollRef,
  tableOffset,
  page,
  total,
  pageSize,
  onPage,
}: {
  feed: AgentOpsFeed;
  isLoading: boolean;
  /** `undefined` when the query succeeded */
  error: unknown;
  hasFilters: boolean;
  isMobile: boolean;
  opRows: AgentOperationRow[];
  extRows: ExternalAgentSubmissionRow[];
  onSelectOp: (row: AgentOperationRow) => void;
  onSelectExt: (row: ExternalAgentSubmissionRow) => void;
  selectedId: string | null;
  compact: boolean;
  scrollRef: RefObject<HTMLDivElement | null>;
  tableOffset: string;
  page: number;
  total: number;
  pageSize: number;
  onPage: (page: number) => void;
}) {
  const { tAdmin } = useAdminTranslation();
  const isExternal = feed === "external";
  const rowCount = isExternal ? extRows.length : opRows.length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-md border py-12 text-muted-foreground">
        <Loader2Icon className="h-5 w-5 animate-spin" />
        {tAdmin("common.loading")}
      </div>
    );
  }

  if (error !== undefined) {
    return (
      <Empty className="min-h-[200px] rounded-md border">
        <EmptyMedia variant="icon">
          <AlertCircleIcon className="h-6 w-6 text-destructive" />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>
            {tAdmin("common.errorWithMessage", {
              message: error instanceof Error ? error.message : "",
            })}
          </EmptyTitle>
        </EmptyHeader>
      </Empty>
    );
  }

  if (rowCount === 0) {
    return (
      <Empty className="min-h-[200px] rounded-md border">
        <EmptyMedia variant="icon">
          <CheckCircle2Icon className="h-6 w-6 text-muted-foreground" />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>
            {isExternal
              ? tAdmin("agentOperations.externalNoResultsTitle")
              : tAdmin("agentOperations.noResultsTitle")}
          </EmptyTitle>
          <EmptyDescription>
            {hasFilters
              ? tAdmin("agentOperations.noResultsFiltered")
              : isExternal
                ? tAdmin("agentOperations.externalNoResultsEmpty")
                : tAdmin("agentOperations.noResultsEmpty")}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const summary = tAdmin("agentOperations.showingResults", {
    from: total === 0 ? 0 : page * pageSize + 1,
    to: Math.min(total, (page + 1) * pageSize),
    total,
  });

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {isMobile ? (
        isExternal ? (
          <ExternalCardsList rows={extRows} onRowClick={onSelectExt} />
        ) : (
          <OperationsCardsList rows={opRows} onRowClick={onSelectOp} />
        )
      ) : (
        <AdminTableScroll ref={scrollRef} offset={tableOffset}>
          {isExternal ? (
            <ExternalSubmissionsTable
              rows={extRows}
              onRowClick={onSelectExt}
              selectedId={selectedId}
              compact={compact}
            />
          ) : (
            <OperationsTable
              rows={opRows}
              onRowClick={onSelectOp}
              selectedId={selectedId}
              compact={compact}
            />
          )}
        </AdminTableScroll>
      )}
      <FeedPager
        summary={summary}
        page={page}
        totalPages={totalPages}
        onPage={(p) => onPage(Math.min(totalPages - 1, Math.max(0, p)))}
      />
    </div>
  );
}
